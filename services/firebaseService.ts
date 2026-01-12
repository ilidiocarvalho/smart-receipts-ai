
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  writeBatch,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

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
 * Helper to process cloud data
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
      const batch = writeBatch(db);
      
      // 1. Save Main User Document (Profile, Chat, Stats)
      const userDocRef = doc(db, "users", key);
      const userPayload: any = {
        userProfile: data.userProfile,
        chatHistory: data.chatHistory || [],
        isCloudEnabled: data.isCloudEnabled,
        updatedAt: new Date().toISOString(),
        role: data.userProfile?.role || 'user'
      };
      batch.set(userDocRef, userPayload);

      // 2. Save Receipts to Sub-collection (Solution B)
      // We only sync the last 100 receipts to maintain performance
      const receipts = (data.history || []).slice(0, 100);
      const historyColRef = collection(db, "users", key, "history");
      
      for (const receipt of receipts) {
        const receiptDocRef = doc(historyColRef, receipt.id);
        batch.set(receiptDocRef, receipt);
      }

      await batch.commit();
    } catch (error) {
      console.error("❌ Erro ao sincronizar com Firestore (Solution B):", error);
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
      // 1. Get Main User Data
      const docSnap = await getDoc(doc(db, "users", key));
      if (!docSnap.exists()) return null;

      const mainData = docSnap.data();
      
      // 2. Get Receipts from Sub-collection
      const historyColRef = collection(db, "users", key, "history");
      const q = query(historyColRef, orderBy("meta.date", "desc"), limit(100));
      const querySnapshot = await getDocs(q);
      
      const history = querySnapshot.docs.map(doc => doc.data());

      return processCloudData({
        ...mainData,
        history
      });
    } catch (error) {
      console.error("❌ Erro ao puxar dados da Cloud:", error);
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

  async listAllUsers(): Promise<any[]> {
    if (!db) {
      const mock = JSON.parse(localStorage.getItem(LOCAL_FALLBACK_KEY) || '{}');
      return Object.values(mock).map((m: any) => processCloudData(m));
    }
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const users = [];
      for (const d of querySnapshot.docs) {
        // For admin list, we usually just need the profile, but let's fetch summary if needed
        users.push(processCloudData(d.data()));
      }
      return users;
    } catch (error) {
      console.error("Erro ao listar todos os utilizadores:", error);
      return [];
    }
  }
};
