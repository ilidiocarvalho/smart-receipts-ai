
/**
 * FIREBASE INTEGRATION SERVICE (PROD SIMULATION)
 * Sincronização centralizada baseada em E-mail com persistência simulada.
 */

const CLOUD_STORAGE_KEY = 'SMART_RECEIPTS_MOCK_CLOUD_DB';

// Auxiliar para ler/escrever na "Nuvem" simulada (localStorage secundário)
const getCloudDB = (): Record<string, any> => {
  const db = localStorage.getItem(CLOUD_STORAGE_KEY);
  return db ? JSON.parse(db) : {};
};

const saveCloudDB = (db: Record<string, any>) => {
  localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify(db));
};

export const firebaseService = {
  async uploadImage(base64: string): Promise<string> {
    await new Promise(r => setTimeout(r, 600));
    return "https://images.unsplash.com/photo-1540340061722-9293d5163008?auto=format&fit=crop&q=80&w=400";
  },

  /**
   * PUSH: Envia dados locais para a Nuvem
   */
  async syncPush(email: string, data: any): Promise<void> {
    const key = email.toLowerCase().trim();
    if (!key) return;
    
    const db = getCloudDB();
    db[key] = JSON.parse(JSON.stringify(data));
    saveCloudDB(db);
    
    console.info(`☁️ [Cloud Sync] PUSH concluído para: ${key}`);
    await new Promise(r => setTimeout(r, 400));
  },

  /**
   * PULL: Recupera dados da Nuvem
   */
  async syncPull(email: string): Promise<any | null> {
    const key = email.toLowerCase().trim();
    if (!key) return null;

    const db = getCloudDB();
    const userData = db[key];
    
    console.info(`☁️ [Cloud Sync] PULL ${userData ? 'SUCESSO' : 'VAZIO'} para: ${key}`);
    await new Promise(r => setTimeout(r, 800));
    return userData || null;
  },

  /**
   * Check: Verifica existência de conta
   */
  async userExists(email: string): Promise<boolean> {
    const key = email.toLowerCase().trim();
    const db = getCloudDB();
    return !!db[key];
  }
};
