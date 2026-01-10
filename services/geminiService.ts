
import { GoogleGenAI, Type } from "@google/genai";
import { UserContext, ReceiptData, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function processReceipt(
  base64Image: string,
  userContext: UserContext
): Promise<ReceiptData> {
  const prompt = `
    Analyze the provided receipt image and the user's personal context.
    
    # User Context
    ${JSON.stringify(userContext, null, 2)}

    # Goals
    Extract all items, categorize them, and provide specific health/financial coaching.
    
    # Strict Output Requirements:
    1. Extract Clean Names: Normalize abbreviations.
    2. Categorize: (Dairy, Produce, Bakery, Butcher, Pantry, Frozen, Snacks, Beverages, Household, Personal Care, Pets).
    3. Coaching: Supportive message in "coach_message".
  `;

  const imagePart = {
    inlineData: { mimeType: "image/jpeg", data: base64Image },
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

  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [imagePart, { text: prompt }] }],
    config: { responseMimeType: "application/json", responseSchema: responseSchema },
  });

  return JSON.parse(result.text.trim());
}

export async function chatWithAssistant(
  message: string,
  history: ReceiptData[],
  userProfile: UserContext,
  chatLog: ChatMessage[]
): Promise<string> {
  const systemInstruction = `
    You are a Personal Finance & Nutrition Assistant.
    You have access to the user's receipt history and profile.
    
    # History Context
    ${JSON.stringify(history.map(h => ({ date: h.meta.date, store: h.meta.store, total: h.meta.total_spent, items: h.items.map(i => i.name_clean) })), null, 2)}
    
    # User Profile
    ${JSON.stringify(userProfile, null, 2)}
    
    # Rules
    - Be concise and actionable.
    - If asked for recipes, suggest them based on items actually found in history.
    - If asked about spending, calculate totals from the history provided.
    - Maintain a supportive, coaching tone.
  `;

  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: { systemInstruction }
  });

  // Reconstruct chat history for Gemini
  // In a real app we might pass the full chatLog, here we send the new message
  const result = await chat.sendMessage({ message });
  return result.text || "I'm sorry, I couldn't process that.";
}
