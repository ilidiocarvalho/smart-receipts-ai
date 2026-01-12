
import { GoogleGenAI, Type } from "@google/genai";
import { UserContext, ReceiptData, ChatMessage } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY não configurada.");
  }
  return new GoogleGenAI({ apiKey });
};

export async function compressImage(base64Str: string, maxWidth = 1200, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `data:image/jpeg;base64,${base64Str}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxWidth) {
          width *= maxWidth / height;
          height = maxWidth;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("Canvas context error");
      
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed.split(',')[1]);
    };
    img.onerror = () => reject("Erro ao carregar imagem para compressão.");
  });
}

export async function processReceipt(
  base64Data: string,
  mimeType: string,
  userContext: UserContext,
  onStep?: (step: 'compressing' | 'analyzing' | 'finalizing') => void,
  retryCount = 0
): Promise<ReceiptData> {
  try {
    const ai = getAIClient();
    let finalData = base64Data;

    if (mimeType.startsWith('image/')) {
      onStep?.('compressing');
      try {
        finalData = await compressImage(base64Data);
      } catch (e) {
        console.warn("Falha na compressão, enviando original...", e);
      }
    }

    onStep?.('analyzing');
    const categoriesList = userContext.custom_categories?.join(', ') || 'Laticínios, Frutas e Legumes, Padaria, Talho, Congelados, Snacks, Bebidas, Limpeza, Higiene, Animais, Outros';

    const promptText = `
      Analise este talão de compras. Retorne APENAS JSON.
      Perfil: ${userContext.user_name}, Orçamento: €${userContext.monthly_budget}, Dieta: ${userContext.dietary_regime}.
      
      Tarefa:
      1. OCR: Extraia loja, data (YYYY-MM-DD), hora (HH:MM), totais.
      2. Normalize produtos e use EXCLUSIVAMENTE estas categorias: [${categoriesList}].
      3. Verifique conformidade com ${userContext.dietary_regime}.
      4. Coaching em Português de Portugal (PT-PT).
      5. IMPORTANTE - Lógica de Tags:
         - 'healthy': Alimentos frescos, naturais, proteínas magras.
         - 'processed': Alimentos industriais, refeições prontas, ultra-processados. 
         - 'sugar': Doces, sobremesas (ex: Petit Gâteau, Gelados), bolachas doces.
         - 'impulse': Compras supérfluas, snacks na caixa, guloseimas.
         REGRAS DE OURO: 
         - Um item como "Petit Gâteau" DEVE ter tags ['processed', 'sugar', 'impulse']. 
         - NÃO use tags de conformidade dietética (ex: vegetariano) para justificar junk food. Priorize o perfil nutricional real.
      6. BEST EFFORT para imagens difíceis.

      Schema: JSON matching meta, items, analysis, coach_message.
    `;

    const mediaPart = {
      inlineData: { mimeType, data: finalData },
    };

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        meta: {
          type: Type.OBJECT,
          properties: {
            store: { type: Type.STRING },
            date: { type: Type.STRING },
            time: { type: Type.STRING },
            total_spent: { type: Type.NUMBER },
            total_saved: { type: Type.NUMBER },
            scan_quality: { type: Type.STRING },
          },
          required: ["store", "date", "total_spent"],
        },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name_raw: { type: Type.STRING },
              name_clean: { type: Type.STRING },
              category: { type: Type.STRING },
              qty: { type: Type.NUMBER },
              unit_price: { type: Type.NUMBER },
              total_price: { type: Type.NUMBER },
              is_discounted: { type: Type.BOOLEAN },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["name_clean", "category", "total_price"],
          },
        },
        analysis: {
          type: Type.OBJECT,
          properties: {
            budget_impact_percentage: { type: Type.NUMBER },
            dietary_compliance: { type: Type.BOOLEAN },
            flagged_items: { type: Type.ARRAY, items: { type: Type.STRING } },
            insights: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
        coach_message: { type: Type.STRING },
      },
      required: ["meta", "items", "analysis", "coach_message"],
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [mediaPart, { text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1,
      },
    });

    onStep?.('finalizing');
    const resultText = response.text;
    if (!resultText) throw new Error("A IA não retornou dados.");
    
    const parsed = JSON.parse(resultText);
    if (!['High', 'Medium', 'Low'].includes(parsed.meta.scan_quality)) {
      parsed.meta.scan_quality = 'Medium';
    }
    return parsed;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (retryCount < 1) {
      return processReceipt(base64Data, mimeType, userContext, onStep, retryCount + 1);
    }
    throw error;
  }
}

export async function chatWithAssistant(
  message: string,
  history: ReceiptData[],
  userProfile: UserContext,
  chatLog: ChatMessage[]
): Promise<string> {
  const ai = getAIClient();
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const historyThisMonth = history.filter(r => {
    const d = new Date(r.meta.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  
  const spentThisMonth = historyThisMonth.reduce((acc, r) => acc + r.meta.total_spent, 0);
  
  const historySummary = history.slice(0, 10).map(r => ({
    loja: r.meta.store,
    data: r.meta.date,
    total: r.meta.total_spent,
    principais_categorias: Array.from(new Set(r.items.map(i => i.category))).slice(0, 3)
  }));

  const systemInstruction = `És o SmartReceipts AI Coach. Responde em PT-PT. 
  Perfil do Utilizador: ${JSON.stringify(userProfile)}
  ESTADO ATUAL (Mês ${currentMonth + 1}):
  - Total Gasto: €${spentThisMonth.toFixed(2)}
  - Orçamento Mensal: €${userProfile.monthly_budget}
  
  RESUMO DO HISTÓRICO RECENTE:
  ${JSON.stringify(historySummary)}
  
  Responde com base nestes dados. Se o utilizador perguntar sobre gastos ou tendências, usa estes valores reais.`;

  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: { systemInstruction }
  });
  
  const response = await chat.sendMessage({ message });
  return response.text || "Desculpe, não consegui processar a sua pergunta.";
}
