
import { GoogleGenAI, Type } from "@google/genai";
import { UserContext, ReceiptData, ChatMessage } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY não configurada.");
  }
  return new GoogleGenAI({ apiKey });
};

export async function compressImage(base64Str: string, maxWidth = 1600, quality = 0.85): Promise<string> {
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
  retryCount = 0
): Promise<ReceiptData> {
  try {
    const ai = getAIClient();
    let finalData = base64Data;

    // Apenas comprimimos se for imagem. PDFs são enviados tal como estão.
    if (mimeType.startsWith('image/')) {
      try {
        finalData = await compressImage(base64Data);
      } catch (e) {
        console.warn("Falha na compressão, enviando original...", e);
      }
    }

    const promptText = `
      Analyze the provided document (receipt image or PDF) and the user's personal context.
      
      # User Context
      ${JSON.stringify(userContext, null, 2)}

      # Core Tasks:
      1. OCR: Extract store, date (YYYY-MM-DD), time (HH:MM), items, prices.
      2. Normalize: Clean product names (e.g. "P. Queijo" -> "Pão de Queijo").
      3. Categorize: Assign one of (Dairy, Produce, Bakery, Butcher, Pantry, Frozen, Snacks, Beverages, Household, Personal Care, Pets).
      4. Compliance: Check if items fit the ${userContext.dietary_regime} diet.
      5. Coaching: Provide a supportive message as a personal coach in Portuguese (PT-PT).

      # Strict Output Format:
      Return a single JSON object matching the defined schema.
    `;

    const mediaPart = {
      inlineData: {
        mimeType: mimeType,
        data: finalData,
      },
    };

    const textPart = {
      text: promptText
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
            scan_quality: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
          },
          required: ["store", "date", "time", "total_spent", "total_saved", "scan_quality"],
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
            required: ["name_raw", "name_clean", "category", "qty", "unit_price", "total_price"],
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
          required: ["budget_impact_percentage", "dietary_compliance", "flagged_items", "insights"],
        },
        coach_message: { type: Type.STRING },
      },
      required: ["meta", "items", "analysis", "coach_message"],
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [mediaPart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1,
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("A IA não retornou dados.");
    
    return JSON.parse(resultText);
  } catch (error: any) {
    console.group("Erro Gemini API");
    console.error("Mensagem:", error.message);
    console.error("Stack:", error.stack);
    console.groupEnd();

    if (retryCount < 1) {
      console.warn("Tentando novamente...");
      return processReceipt(base64Data, mimeType, userContext, retryCount + 1);
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
  
  const systemInstruction = `
    You are the "SmartReceipts AI Coach".
    Your tone is professional, encouraging, and data-driven.
    Response in Portuguese (PT-PT).
    
    # Knowledge Base:
    - User Profile: ${JSON.stringify(userProfile)}
    - Recent Shopping History: ${JSON.stringify(history.slice(0, 5).map(h => ({
        date: h.meta.date,
        store: h.meta.store,
        total: h.meta.total_spent,
        items: h.items.map(i => i.name_clean)
      })))}
  `;

  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction,
    }
  });

  const response = await chat.sendMessage({ message });
  return response.text || "Desculpe, não consegui processar a sua pergunta.";
}
