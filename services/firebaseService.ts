
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

export const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== '';
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;

const LOCAL_FALLBACK_KEY = 'SR_MOCK_CLOUD_FALLBACK';

export const firebaseService = {
  isUsingCloud: () => isFirebaseConfigured,

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
    } catch (error) {
      console.error("❌ Erro ao sincronizar com Firestore:", error);
      throw error;
    }
  },

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
      return null;
    }
  },

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

  /**
   * NOVO v1.1.9: Lista todos os utilizadores (Apenas para uso Admin)
   */
  async listAllUsers(): Promise<any[]> {
    if (!db) {
      const mock = JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY) || '{}');
      return Object.values(mock).map((m: any) => m.userProfile);
    }
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      return querySnapshot.docs.map(doc => doc.data().userProfile);
    } catch (error) {
      console.error("Erro ao listar todos os utilizadores:", error);
      return [];
    }
  },

  async uploadImage(base64: string): Promise<string> {
    return `data:image/jpeg;base64,${base64}`;
  }
};
