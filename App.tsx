
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import HistoryView from './components/HistoryView';
import AuthScreen from './components/AuthScreen';
import ProfileForm from './components/ProfileForm';
import ReportsView from './components/ReportsView';
import ChatAssistant from './components/ChatAssistant';
import AdminDashboard from './components/AdminDashboard';
import BottomNav from './components/BottomNav';
import ReceiptEditor from './components/ReceiptEditor';
import { UserContext, AppState, ReceiptData, ViewTab } from './types';
import { processReceipt } from './services/geminiService';
import { firebaseService } from './services/firebaseService';
import { accessService } from './services/accessService';

export const DEFAULT_CATEGORIES = [
  'Laticínios', 'Frutas e Legumes', 'Padaria', 'Talho/Peixaria', 'Mercearia', 'Congelados', 
  'Snacks', 'Bebidas', 'Limpeza', 'Higiene e Cuidado', 'Animais', 'Outros'
];

const INITIAL_PROFILE: UserContext = {
  user_name: "", 
  email: "",
  dietary_regime: "Misto / Tudo",
  monthly_budget: 0, 
  current_month_spend: 0, 
  family_context: "",
  goals: [],
  account_status: 'trial',
  joined_at: new Date().toISOString(),
  role: 'user',
  custom_categories: DEFAULT_CATEGORIES
};

const SESSION_KEY = 'SR_SESSION_PERSISTENT_V1';
const CACHE_KEY = 'SR_LOCAL_CACHE_V1';
const APP_VERSION = "1.3.8";

// v1.3.8: Synchronous initial state helper to prevent "empty-state flash"
const getInitialState = (): AppState => {
  const cached = localStorage.getItem(CACHE_KEY);
  const initialState: AppState = {
    userProfile: INITIAL_PROFILE,
    lastAnalysis: null,
    history: [],
    isLoading: false,
    error: null,
    chatHistory: [],
    isCloudEnabled: true,
  };

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Ensure defaults for critical arrays
      if (parsed.userProfile && !parsed.userProfile.custom_categories) {
        parsed.userProfile.custom_categories = DEFAULT_CATEGORIES;
      }
      return { ...initialState, ...parsed };
    } catch (e) {
      console.error("Failed to parse initial cache", e);
    }
  }
  return initialState;
};

interface PendingFile {
  data: string;
  type: string;
}

export type ProcessingStep = 'idle' | 'compressing' | 'analyzing' | 'finalizing';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [draftQueue, setDraftQueue] = useState<ReceiptData[]>([]);
  const [editingReceipt, setEditingReceipt] = useState<ReceiptData | null>(null);
  const [currentProcessIndex, setCurrentProcessIndex] = useState(0);
  const [totalInBatch, setTotalInBatch] = useState(0);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  
  const wakeLockRef = useRef<any>(null);
  const [state, setState] = useState<AppState>(getInitialState);

  const isCloudActive = firebaseService.isUsingCloud();
  const canAccessAdmin = state.userProfile.role === 'owner';

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try { wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); } catch (err) {}
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; }
  };

  // v1.3.8: Boot only handles Cloud Sync and Session Restoration
  useEffect(() => {
    const restoreSession = async () => {
      setIsInitializing(true);
      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        try {
          const { email } = JSON.parse(session);
          if (email) {
            setIsSyncing(true);
            const cloudData = await firebaseService.syncPull(email);
            if (cloudData) {
              setState(prev => ({ ...prev, ...cloudData }));
            }
          }
        } catch (e) {
          console.error("Session restore error", e);
        } finally {
          setIsSyncing(false);
        }
      }
      setIsInitializing(false);
    };
    restoreSession();
  }, []);

  // v1.3.8: Atomic Local Persistence + Debounced Cloud Sync
  useEffect(() => {
    if (!state.userProfile.email) return;

    // 1. Instant Local Save (Non-destructive check)
    const dataToSave = {
      userProfile: state.userProfile,
      history: state.history,
      chatHistory: state.chatHistory,
      isCloudEnabled: state.isCloudEnabled
    };

    // Safety: if state has 0 history but storage has more, don't overwrite yet
    // unless it's a deliberate logout (which clears keys first)
    const rawCache = localStorage.getItem(CACHE_KEY);
    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      if (parsed.history?.length > 0 && state.history.length === 0 && !isInitializing) {
        console.warn("Blocking potential data loss overwrite...");
        return;
      }
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: state.userProfile.email }));
    localStorage.setItem(CACHE_KEY, JSON.stringify(dataToSave));

    // 2. Debounced Cloud Sync
    const cloudTimer = setTimeout(async () => {
      if (state.isCloudEnabled && state.userProfile.email) {
        setIsSyncing(true);
        try { await firebaseService.syncPush(state.userProfile.email, dataToSave); } 
        catch(e) { console.error("Cloud sync failed", e); }
        finally { setIsSyncing(false); }
      }
    }, 5000);

    return () => clearTimeout(cloudTimer);
  }, [state.userProfile, state.history, state.chatHistory, state.isCloudEnabled, isInitializing]);

  const handleSignIn = async (email: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await firebaseService.syncPull(email);
      if (data) {
        setState(prev => ({ ...prev, ...data, isLoading: false }));
        setActiveTab('dashboard');
      } else {
        setState(prev => ({ ...prev, error: "USER_NOT_FOUND", isLoading: false }));
      }
    } catch (err) {
      setState(prev => ({ ...prev, error: "Erro de conexão com a Cloud.", isLoading: false }));
    }
  };

  const handleSignUp = async (email: string, promoCode?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    const access = accessService.validateCode(promoCode || '');
    if (!access) {
      setState(prev => ({ ...prev, error: "INVALID_PROMO", isLoading: false }));
      return;
    }
    try {
      const exists = await firebaseService.userExists(email);
      if (exists) {
        setState(prev => ({ ...prev, error: "USER_ALREADY_EXISTS", isLoading: false }));
        return;
      }
      const profile: UserContext = {
        ...INITIAL_PROFILE,
        email: email.toLowerCase(),
        promo_code: promoCode?.toUpperCase(),
        account_status: access.status,
        role: access.role,
        joined_at: new Date().toISOString()
      };
      setState(prev => ({ ...prev, userProfile: profile, isLoading: false }));
      setActiveTab('settings');
    } catch (err) {
      setState(prev => ({ ...prev, error: "Falha ao criar conta.", isLoading: false }));
    }
  };

  const handleLogout = () => {
    if (confirm("Terminar sessão global? Todos os dados locais serão limpos.")) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(CACHE_KEY);
      window.location.reload();
    }
  };

  const handleUpload = (files: PendingFile[]) => {
    processNextInQueue(files);
  };

  const processNextInQueue = async (files: PendingFile[]) => {
    if (files.length === 0) return;
    setTotalInBatch(files.length);
    setCurrentProcessIndex(0);
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    await requestWakeLock();
    const analyzedDrafts: ReceiptData[] = [];
    let lastError: string | null = null;
    
    for (let i = 0; i < files.length; i++) {
      setCurrentProcessIndex(i + 1);
      const file = files[i];
      try {
        const aiResult = await processReceipt(file.data, file.type, state.userProfile, (step) => setProcessingStep(step));
        const receipt: ReceiptData = {
          ...aiResult,
          id: crypto.randomUUID(),
          imageUrl: file.type.startsWith('image/') ? `data:${file.type};base64,${file.data}` : undefined
        };
        analyzedDrafts.push(receipt);
      } catch (err: any) {
        lastError = "Erro na leitura da IA. Verifique a legibilidade.";
        break; 
      }
    }
    releaseWakeLock();
    setProcessingStep('idle');
    setDraftQueue(analyzedDrafts);
    setState(prev => ({ ...prev, isLoading: false, error: lastError }));
  };

  const handleSaveDraft = (finalReceipt: ReceiptData) => {
    const isEdit = !!editingReceipt;
    setState(prev => {
      const newHistory = isEdit 
        ? prev.history.map(r => r.id === finalReceipt.id ? finalReceipt : r)
        : [finalReceipt, ...prev.history].slice(0, 100);
      return { ...prev, lastAnalysis: finalReceipt, history: newHistory };
    });
    if (isEdit) setEditingReceipt(null); else setDraftQueue(prev => prev.slice(1));
    setActiveTab('dashboard');
  };

  const handleCancelDraft = () => {
    if (editingReceipt) setEditingReceipt(null); else setDraftQueue(prev => prev.slice(1));
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-16 h-16 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
        <p className="font-black text-[10px] uppercase tracking-[0.3em] text-indigo-400">Ligando ao Cofre...</p>
      </div>
    );
  }

  const currentEditorData = editingReceipt || draftQueue[0] || null;

  return (
    <div className="min-h-screen pb-20 md:pb-8 bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Header activeTab={activeTab} onTabChange={setActiveTab} isSyncing={isSyncing} isAdmin={canAccessAdmin} />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 md:py-8">
        {!state.userProfile.email ? (
          <AuthScreen onSignIn={handleSignIn} onSignUp={handleSignUp} isLoading={state.isLoading} error={state.error} legacyDetected={false} isCloudActive={isCloudActive} onClearError={() => setState(prev => ({ ...prev, error: null }))} version={APP_VERSION} />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard userProfile={state.userProfile} history={state.history} lastAnalysis={state.lastAnalysis} isLoading={state.isLoading} isSyncing={isSyncing} isCloudActive={isCloudActive} error={state.error} onUpload={handleUpload} processingStep={processingStep} currentProcessIndex={currentProcessIndex} totalInBatch={totalInBatch} onNavigateToSettings={() => setActiveTab('settings')} />
            )}
            {activeTab === 'history' && (
              <HistoryView history={state.history} isCloudActive={isCloudActive} onSelectReceipt={(r) => { setState(p => ({ ...p, lastAnalysis: r })); setActiveTab('dashboard'); }} onEditReceipt={setEditingReceipt} />
            )}
            {activeTab === 'chat' && <ChatAssistant history={state.history} userProfile={state.userProfile} chatLog={state.chatHistory} onNewMessage={(msg) => setState(p => ({ ...p, chatHistory: [...p.chatHistory, msg].slice(-30) }))} />}
            {activeTab === 'reports' && <ReportsView history={state.history} />}
            {activeTab === 'admin' && canAccessAdmin && <AdminDashboard />}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                 <ProfileForm profile={state.userProfile} onUpdate={(p) => setState(prev => ({ ...prev, userProfile: p }))} onImportData={(d) => setState(p => ({ ...p, ...d }))} fullHistory={state.history} isCloudEnabled={state.isCloudEnabled} onToggleCloud={() => setState(p => ({ ...p, isCloudEnabled: !p.isCloudEnabled }))} version={APP_VERSION} />
                 <button onClick={handleLogout} className="w-full py-6 text-rose-500 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-rose-50 rounded-[1.5rem] transition-all border border-rose-100 flex items-center justify-center gap-3">
                   <i className="fa-solid fa-power-off"></i> Terminar Sessão Global
                 </button>
              </div>
            )}
          </>
        )}
      </main>

      {currentEditorData && (
        <ReceiptEditor receipt={currentEditorData} onSave={handleSaveDraft} onCancel={handleCancelDraft} categories={state.userProfile.custom_categories || DEFAULT_CATEGORIES} />
      )}
      {state.userProfile.email && <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  );
};

export default App;
