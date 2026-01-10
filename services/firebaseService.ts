
/**
 * FIREBASE INTEGRATION SERVICE
 * 
 * To activate:
 * 1. Go to console.firebase.google.com
 * 2. Create a project
 * 3. Add a "Web App"
 * 4. Paste your config here
 */

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// This is a mock/placeholder service. 
// It simulates what would happen if you had a real Firebase backend.
export const firebaseService = {
  async uploadImage(base64: string): Promise<string> {
    console.info("☁️ [Cloud Sync] Iniciando upload da imagem para o Firebase Storage...");
    // Simula um atraso de rede
    await new Promise(r => setTimeout(r, 1200));
    console.info("✅ [Cloud Sync] Imagem guardada na nuvem com sucesso.");
    return "https://images.unsplash.com/photo-1540340061722-9293d5163008?auto=format&fit=crop&q=80&w=400";
  },

  async saveReceipt(data: any): Promise<void> {
    console.info("☁️ [Cloud Sync] A sincronizar dados da fatura com o Firestore...");
    await new Promise(r => setTimeout(r, 800));
    console.info("✅ [Cloud Sync] Fatura sincronizada.");
  },

  async fetchHistory(): Promise<any[]> {
    console.info("☁️ [Cloud Sync] A descarregar histórico remoto...");
    return [];
  }
};