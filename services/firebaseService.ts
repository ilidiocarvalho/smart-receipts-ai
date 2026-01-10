
/**
 * FIREBASE INTEGRATION SERVICE (PROD SIMULATION)
 * Em produção real, estes métodos interagem com o Firestore.
 */

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Mock Database em memória para simular o comportamento da rede
const MOCK_CLOUD_DB: Record<string, any> = {};

export const firebaseService = {
  async uploadImage(base64: string): Promise<string> {
    await new Promise(r => setTimeout(r, 800));
    return "https://images.unsplash.com/photo-1540340061722-9293d5163008?auto=format&fit=crop&q=80&w=400";
  },

  async saveUserData(syncKey: string, data: any): Promise<void> {
    console.info(`☁️ [Cloud] A sincronizar dados para a chave: ${syncKey}`);
    MOCK_CLOUD_DB[syncKey] = JSON.parse(JSON.stringify(data)); 
    await new Promise(r => setTimeout(r, 500));
  },

  async fetchUserData(syncKey: string): Promise<any | null> {
    console.info(`☁️ [Cloud] A procurar dados para a chave: ${syncKey}`);
    await new Promise(r => setTimeout(r, 1200));
    return MOCK_CLOUD_DB[syncKey] || null;
  },

  async saveReceipt(syncKey: string, receipt: any): Promise<void> {
    // No Firestore real, isto seria uma sub-coleção
    console.info(`☁️ [Cloud] Nova fatura guardada na conta ${syncKey}`);
  }
};