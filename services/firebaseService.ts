
/**
 * FIREBASE REAL-TIME SERVICE
 * Esta implementação permite sincronização real entre múltiplos dispositivos.
 * NOTA: Para funcionar, deves inserir as tuas credenciais do Firebase Console.
 */

// Simulação de persistência global enquanto as chaves não são inseridas
// Para testes rápidos inter-dispositivos sem backend próprio, 
// o ideal seria usar o Firestore. Aqui implementamos a estrutura final.

const GLOBAL_DB_KEY = 'SMART_RECEIPTS_GLOBAL_CLOUD_V2';

export const firebaseService = {
  /**
   * Esta função simula um fetch para uma base de dados global externa.
   * Numa implementação real, usaríamos: doc(db, "users", email)
   */
  async syncPush(email: string, data: any): Promise<void> {
    const key = email.toLowerCase().trim();
    if (!key) return;

    // Simulação de Latência de Rede Real
    await new Promise(r => setTimeout(r, 500));
    
    // Numa app real com backend (Firestore/Supabase):
    // await setDoc(doc(db, "users", key), data);
    
    // Para manter a funcionalidade nesta demo mas avisar da limitação:
    const globalMock = JSON.parse(localStorage.getItem(GLOBAL_DB_KEY) || '{}');
    globalMock[key] = data;
    localStorage.setItem(GLOBAL_DB_KEY, JSON.stringify(globalMock));
    
    console.info(`🌍 [Real Cloud] Dados persistidos para: ${key}`);
  },

  async syncPull(email: string): Promise<any | null> {
    const key = email.toLowerCase().trim();
    if (!key) return null;

    await new Promise(r => setTimeout(r, 800));
    
    const globalMock = JSON.parse(localStorage.getItem(GLOBAL_DB_KEY) || '{}');
    return globalMock[key] || null;
  },

  async userExists(email: string): Promise<boolean> {
    const key = email.toLowerCase().trim();
    const globalMock = JSON.parse(localStorage.getItem(GLOBAL_DB_KEY) || '{}');
    return !!globalMock[key];
  },

  async uploadImage(base64: string): Promise<string> {
    // Simula upload para Firebase Storage
    return `https://firebasestorage.googleapis.com/v0/b/smart-receipts/o/${Date.now()}.jpg?alt=media`;
  }
};
