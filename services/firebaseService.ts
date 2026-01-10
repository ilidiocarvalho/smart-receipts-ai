
/**
 * FIREBASE INTEGRATION SERVICE (PROD SIMULATION)
 * Sincronização centralizada baseada em E-mail.
 */

// Simulação de base de dados global na Cloud (em memória do runtime)
const GLOBAL_CLOUD_STORAGE: Record<string, any> = {};

export const firebaseService = {
  async uploadImage(base64: string): Promise<string> {
    await new Promise(r => setTimeout(r, 600));
    return "https://images.unsplash.com/photo-1540340061722-9293d5163008?auto=format&fit=crop&q=80&w=400";
  },

  /**
   * Guarda os dados completos do utilizador associados ao e-mail
   */
  async syncPush(email: string, data: any): Promise<void> {
    const key = email.toLowerCase().trim();
    console.info(`☁️ [Cloud Sync] PUSH para: ${key}`);
    GLOBAL_CLOUD_STORAGE[key] = JSON.parse(JSON.stringify(data));
    await new Promise(r => setTimeout(r, 400));
  },

  /**
   * Recupera os dados associados a um e-mail
   */
  async syncPull(email: string): Promise<any | null> {
    const key = email.toLowerCase().trim();
    console.info(`☁️ [Cloud Sync] PULL de: ${key}`);
    await new Promise(r => setTimeout(r, 1000));
    return GLOBAL_CLOUD_STORAGE[key] || null;
  },

  /**
   * Verifica se um utilizador já existe na nuvem
   */
  async userExists(email: string): Promise<boolean> {
    const key = email.toLowerCase().trim();
    return !!GLOBAL_CLOUD_STORAGE[key];
  }
};
