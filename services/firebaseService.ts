
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

/**
 * Helper para processar os dados vindos do Firestore
 * v1.2.1: Garante que se o 'role' estiver na raiz, ele é movido para dentro do userProfile
 */
const processCloudData = (data: any) => {
  if (!data) return null;
  const processed = { ...data };
  if (processed.role && processed.userProfile) {
    processed.userProfile.role = processed.role;
  }
  return processed;
};

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
      // v1.2.1: Ao gravar, também garantimos que o role atual do perfil vai para a raiz
      // para facilitar a visualização no Firebase Console e manter consistência
      const payload = {
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      if (data.userProfile?.role) {
        payload.role = data.userProfile.role;
      }

      await setDoc(doc(db, "users", key), payload);
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
      return processCloudData(mock[key]) || null;
    }

    try {
      const docSnap = await getDoc(doc(db, "users", key));
      if (docSnap.exists()) {
        return processCloudData(docSnap.data());
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
   * v1.1.9 / v1.2.1 / v1.2.2: Lista todos os documentos de utilizadores
   * Retorna o objeto completo processado para permitir estatísticas globais.
   */
  async listAllUsers(): Promise<any[]> {
    if (!db) {
      const mock = JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY) || '{}');
      return Object.values(mock).map((m: any) => processCloudData(m));
    }
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      return querySnapshot.docs.map(doc => processCloudData(doc.data()));
    } catch (error) {
      console.error("Erro ao listar todos os utilizadores:", error);
      return [];
    }
  },

  async uploadImage(base64: string): Promise<string> {
    return `data:image/jpeg;base64,${base64}`;
  }
};
