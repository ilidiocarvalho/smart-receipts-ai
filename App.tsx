
import React, { useState, useEffect, useRef } from 'react';
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

const INITIAL_PROFILE: UserContext = {
  user_name: "", 
  email: "",
  dietary_regime: "None / Mixed",
  monthly_budget: 0, 
  current_month_spend: 0, 
  family_context: "",
  goals: [],
  account_status: 'trial',
  joined_at: new Date().toISOString(),
  role: 'user'
};

const SESSION_KEY = 'SR_SESSION_PERSISTENT_V1';
const CACHE_KEY = 'SR_LOCAL_CACHE_V1';
const APP_VERSION = "1.3.5";

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
  const migratedData = localStorage.getItem('SR_LEGACY_DATA') || localStorage.getItem('SR_MOCK_CLOUD_FALLBACK');

  const [state, setState] = useState<AppState>({
    userProfile: INITIAL_PROFILE,
    lastAnalysis: null,
    history: [],
    isLoading: false,
    error: null,
    chatHistory: [],
    isCloudEnabled: true,
  });

  const isCloudActive = firebaseService.isUsingCloud();
  const canAccessAdmin = state.userProfile.role === 'owner' || (state as any).role === 'owner';

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  useEffect(() => {
    const boot = async () => {
      setIsInitializing(true);
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          setState(prev => ({ ...prev, ...parsedCache, isLoading: false }));
        } catch (e) { console.error("Cache error", e); }
      }
      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        try {
          const { email } = JSON.parse(session);
          setIsSyncing(true);
          const cloudData = await firebaseService.syncPull(email);
          if (cloudData) {
            setState(prev => ({ ...prev, ...cloudData, isLoading: false }));
            localStorage.setItem(CACHE_KEY, JSON.stringify(cloudData));
          }
        } catch (e) { 
          console.error("Session restoration error", e); 
        } finally {
          setIsSyncing(false);
        }
      }
      setIsInitializing(false);
    };
    boot();
  }, []);

  useEffect(() => {
    if (isInitializing || !state.userProfile.email) return;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: state.userProfile.email }));
    const timer = setTimeout(async () => {
      const dataToSync = {
        userProfile: state.userProfile,
        history: state.history,
        chatHistory: state.chatHistory,
        isCloudEnabled: state.isCloudEnabled
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(dataToSync));
      if (state.isCloudEnabled) {
        setIsSyncing(true);
        try {
          await firebaseService.syncPush(state.userProfile.email, dataToSync);
        } finally {
          setIsSyncing(false);
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
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
    if (confirm("Terminar sessão global?")) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(CACHE_KEY);
      window.location.reload();
    }
  };

  const processWithTimeout = async (file: PendingFile): Promise<ReceiptData> => {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("TIMEOUT_ERROR"));
      }, 90000); 
      try {
        const result = await processReceipt(
          file.data, 
          file.type, 
          state.userProfile, 
          (step) => setProcessingStep(step)
        );
        clearTimeout(timeout);
        resolve(result);
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
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
        const aiResult = await processWithTimeout(file);
        const receipt: ReceiptData = {
          ...aiResult,
          id: crypto.randomUUID(),
          imageUrl: file.type.startsWith('image/') ? `data:${file.type};base64,${file.data}` : undefined
        };
        analyzedDrafts.push(receipt);
      } catch (err: any) {
        console.error(`Erro ao processar ficheiro ${i + 1}:`, err);
        if (err.message === 'TIMEOUT_ERROR') {
          lastError = "A IA demorou demasiado tempo (>90s). Tente novamente com uma foto mais nítida ou aproximada.";
        } else {
          lastError = "Erro na leitura da IA. Verifique se o talão está legível e se tem internet.";
        }
        break; 
      }
    }
    releaseWakeLock();
    setProcessingStep('idle');
    setDraftQueue(analyzedDrafts);
    setState(prev => ({ ...prev, isLoading: false, error: lastError }));
  };

  const handleUpload = (files: PendingFile[]) => {
    processNextInQueue(files);
  };

  const handleSaveDraft = (finalReceipt: ReceiptData) => {
    const isEdit = !!editingReceipt;
    
    setState(prev => {
      const newHistory = isEdit 
        ? prev.history.map(r => r.id === finalReceipt.id ? finalReceipt : r)
        : [finalReceipt, ...prev.history].slice(0, 100);
      
      return {
        ...prev,
        lastAnalysis: finalReceipt,
        history: newHistory
      };
    });

    if (isEdit) {
      setEditingReceipt(null);
    } else {
      setDraftQueue(prev => prev.slice(1));
    }
    setActiveTab('dashboard');
  };

  const handleCancelDraft = () => {
    if (editingReceipt) {
      setEditingReceipt(null);
    } else {
      setDraftQueue(prev => prev.slice(1));
    }
  };

  const handleEditHistory = (receipt: ReceiptData) => {
    setEditingReceipt(receipt);
  };

  if (isInitializing && !state.userProfile.email) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-16 h-16 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
        <p className="font-black text-[10px] uppercase tracking-[0.3em] text-indigo-400 animate-pulse">Sincronizando Cofre...</p>
      </div>
    );
  }

  const currentEditorData = editingReceipt || draftQueue[0] || null;

  return (
    <div className="min-h-screen pb-20 md:pb-8 bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        isSyncing={isSyncing} 
        isAdmin={canAccessAdmin}
      />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 md:py-8">
        {!state.userProfile.email ? (
          <AuthScreen 
            onSignIn={handleSignIn} 
            onSignUp={handleSignUp} 
            isLoading={state.isLoading} 
            error={state.error} 
            legacyDetected={!!migratedData}
            isCloudActive={isCloudActive}
            onClearError={() => setState(prev => ({ ...prev, error: null }))}
            version={APP_VERSION}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard 
                userProfile={state.userProfile}
                history={state.history}
                lastAnalysis={state.lastAnalysis}
                isLoading={state.isLoading}
                isSyncing={isSyncing}
                isCloudActive={isCloudActive}
                error={state.error}
                onUpload={handleUpload}
                processingStep={processingStep}
                currentProcessIndex={currentProcessIndex}
                totalInBatch={totalInBatch}
                onNavigateToSettings={() => setActiveTab('settings')}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView 
                history={state.history} 
                isCloudActive={isCloudActive} 
                onSelectReceipt={(receipt) => {
                  setState(prev => ({ ...prev, lastAnalysis: receipt }));
                  setActiveTab('dashboard');
                }}
                onEditReceipt={handleEditHistory}
              />
            )}

            {activeTab === 'chat' && (
              <ChatAssistant 
                history={state.history} 
                userProfile={state.userProfile} 
                chatLog={state.chatHistory} 
                onNewMessage={(msg) => setState(prev => ({ ...prev, chatHistory: [...prev.chatHistory, msg].slice(-30) }))} 
              />
            )}

            {activeTab === 'reports' && <ReportsView history={state.history} />}
            {activeTab === 'admin' && canAccessAdmin && <AdminDashboard />}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                 <ProfileForm 
                   profile={state.userProfile} 
                   onUpdate={(p) => setState(prev => ({ ...prev, userProfile: p }))}
                   onImportData={(data) => setState(prev => ({ ...prev, ...data }))}
                   fullHistory={state.history}
                   isCloudEnabled={state.isCloudEnabled}
                   onToggleCloud={() => setState(prev => ({ ...prev, isCloudEnabled: !prev.isCloudEnabled }))}
                   version={APP_VERSION}
                 />
                 <button onClick={handleLogout} className="w-full py-6 text-rose-500 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-rose-50 rounded-[1.5rem] transition-all border border-rose-100 flex items-center justify-center gap-3">
                   <i className="fa-solid fa-power-off"></i> Terminar Sessão Global
                 </button>
              </div>
            )}
          </>
        )}
      </main>

      {currentEditorData && (
        <ReceiptEditor 
          receipt={currentEditorData} 
          onSave={handleSaveDraft} 
          onCancel={handleCancelDraft}
          queueInfo={editingReceipt ? "Modo Edição" : (draftQueue.length > 1 ? `Restam ${draftQueue.length - 1} documentos` : undefined)}
        />
      )}

      {state.userProfile.email && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </div>
  );
};

export default App;
