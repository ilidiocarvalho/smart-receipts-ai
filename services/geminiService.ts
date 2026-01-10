import { GoogleGenAI, Type } from "@google/genai";
import { UserContext, ReceiptData, ChatMessage } from "../types";

// A chave é injetada via processo de build ou variáveis de ambiente do Vercel
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY não configurada. Adicione-a às variáveis de ambiente.");
  }
  return new GoogleGenAI({ apiKey });
};

export async function processReceipt(
  base64Image: string,
  userContext: UserContext
): Promise<ReceiptData> {
  const ai = getAIClient();
  
  const prompt = `
    Analyze the provided receipt image and the user's personal context.
    
    # User Context
    ${JSON.stringify(userContext, null, 2)}

    # Core Tasks:
    1. OCR: Extract store, date, items, prices.
    2. Normalize: Clean product names (e.g. "P. Queijo" -> "Pão de Queijo").
    3. Categorize: Assign one of (Dairy, Produce, Bakery, Butcher, Pantry, Frozen, Snacks, Beverages, Household, Personal Care, Pets).
    4. Compliance: Check if items fit the ${userContext.dietary_regime} diet.
    5. Coaching: Provide a supportive message as a personal coach.

    # Strict Output Format:
    Return a single JSON object.
  `;

  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image,
    },
  };

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      meta: {
        type: Type.OBJECT,
        properties: {
          store: { type: Type.STRING },
          date: { type: Type.STRING },
          total_spent: { type: Type.NUMBER },
          total_saved: { type: Type.NUMBER },
          scan_quality: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
        },
        required: ["store", "date", "total_spent", "total_saved", "scan_quality"],
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
    model: "gemini-3-pro-preview",
    contents: [{ parts: [imagePart, { text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.1, // Mais determinístico para OCR
    },
  });

  const text = response.text;
  if (!text) throw new Error("A IA não retornou dados.");
  
  return JSON.parse(text);
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
    
    # Knowledge Base:
    - User Profile: ${JSON.stringify(userProfile)}
    - Recent Shopping History: ${JSON.stringify(history.slice(0, 5).map(h => ({
        date: h.meta.date,
        store: h.meta.store,
        total: h.meta.total_spent,
        items: h.items.map(i => i.name_clean)
      })))}

    # Rules:
    1. Be concise.
    2. If asked about spending, use the provided history.
    3. If asked for recipes, only suggest ones that use ingredients found in the history or typical pantry staples.
    4. Always stay within the context of finance and nutrition.
  `;

  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction,
    }
  });

  const response = await chat.sendMessage({ message });
  return response.text || "Desculpe, não consegui processar a sua pergunta.";
}