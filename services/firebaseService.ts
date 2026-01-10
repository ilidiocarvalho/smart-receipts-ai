
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Configuração obtida das variáveis de ambiente (Seguro para Vercel)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Inicializar Firebase apenas se as chaves existirem
export const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== '';
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;

const LOCAL_FALLBACK_KEY = 'SR_MOCK_CLOUD_FALLBACK';

export const firebaseService = {
  /**
   * Indica se estamos a usar a Cloud Real
   */
  isUsingCloud: () => isFirebaseConfigured,

  /**
   * Grava dados no Firestore Real. Se não houver chaves, avisa e usa local.
   */
  async syncPush(email: string, data: any): Promise<void> {
    const key = email.toLowerCase().trim();
    if (!key) return;

    if (!db) {
      console.warn("⚠️ Firebase não configurado. Usando fallback local.");
      const mock = JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY) || '{}');
      mock[key] = data;
      localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(mock));
      return;
    }

    try {
      await setDoc(doc(db, "users", key), {
        ...data,
        updatedAt: new Date().toISOString()
      });
      console.info(`✅ [Firestore] Sincronizado: ${key}`);
    } catch (error) {
      console.error("❌ Erro ao sincronizar com Firestore:", error);
      throw error;
    }
  },

  /**
   * Lê dados do Firestore Real.
   */
  async syncPull(email: string): Promise<any | null> {
    const key = email.toLowerCase().trim();
    if (!key) return null;

    if (!db) {
      const mock = JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY) || '{}');
      return mock[key] || null;
    }

    try {
      const docSnap = await getDoc(doc(db, "users", key));
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error("❌ Erro ao ler do Firestore:", error);
      return null;
    }
  },

  /**
   * Verifica existência de utilizador na Cloud Real.
   */
  async userExists(email: string): Promise<boolean> {
    const key = email.toLowerCase().trim();
    if (!db) {
      const mock = JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY) || '{}');
      return !!mock[key];
    }

    try {
      const docSnap = await getDoc(doc(db, "users", key));
      return docSnap.exists();
    } catch (error) {
      return false;
    }
  },

  async uploadImage(base64: string): Promise<string> {
    return `data:image/jpeg;base64,${base64}`;
  }
};
