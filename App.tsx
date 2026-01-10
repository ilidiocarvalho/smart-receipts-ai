
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import HistoryView from './components/HistoryView';
import AuthScreen from './components/AuthScreen';
import ProfileForm from './components/ProfileForm';
import ReportsView from './components/ReportsView';
import ChatAssistant from './components/ChatAssistant';
import BottomNav from './components/BottomNav';
import { UserContext, AppState, ReceiptData, ViewTab } from './types';
import { processReceipt } from './services/geminiService';
import { firebaseService } from './services/firebaseService';

const INITIAL_PROFILE: UserContext = {
  user_name: "", 
  email: "",
  dietary_regime: "None / Mixed",
  monthly_budget: 0, 
  current_month_spend: 0, 
  family_context: "",
  goals: [],
  account_status: 'trial',
  joined_at: new Date().toISOString()
};

const VALID_PROMOS = ['BRUNO_VIP', 'PROMO2025', 'MASTER_KEY', 'BETA_TESTER'];
const LEGACY_KEYS = ['v1.0.0', 'smart_receipts_v111_auth', 'smart_receipts_v112_auth'];
const SESSION_KEY = 'SR_SESSION_V115';
const APP_VERSION = "1.1.8";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [migratedData, setMigratedData] = useState<any>(null);
  
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

  useEffect(() => {
    const boot = async () => {
      setIsInitializing(true);
      
      let foundLegacy: any = null;
      for (const key of LEGACY_KEYS) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.history?.length > 0 || parsed.userProfile?.user_name) {
              foundLegacy = parsed;
              break; 
            }
          } catch (e) {}
        }
      }
      if (foundLegacy) setMigratedData(foundLegacy);

      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        try {
          const { email } = JSON.parse(session);
          setIsSyncing(true);
          const cloudData = await firebaseService.syncPull(email);
          if (cloudData) {
            setState(prev => ({ ...prev, ...cloudData, isLoading: false }));
          }
        } catch (e) { console.error("Erro ao restaurar sessão", e); }
      }
      
      setIsSyncing(false);
      setIsInitializing(false);
    };
    boot();
  }, []);

  useEffect(() => {
    if (isInitializing || !state.userProfile.email) return;

    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: state.userProfile.email }));

    if (state.isCloudEnabled) {
      setIsSyncing(true);
      const timer = setTimeout(async () => {
        try {
          await firebaseService.syncPush(state.userProfile.email, {
            userProfile: state.userProfile,
            history: state.history,
            chatHistory: state.chatHistory,
            isCloudEnabled: state.isCloudEnabled
          });
        } finally {
          setIsSyncing(false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.userProfile, state.history, state.chatHistory, state.isCloudEnabled, isInitializing]);

  const handleSignIn = async (email: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const exists = await firebaseService.userExists(email);
      if (!exists) {
        setState(prev => ({ ...prev, error: "USER_NOT_FOUND", isLoading: false }));
        return;
      }
      const data = await firebaseService.syncPull(email);
      if (data) {
        setState(prev => ({ ...prev, ...data, isLoading: false }));
        setActiveTab('dashboard');
      }
    } catch (err) {
      setState(prev => ({ ...prev, error: "Erro na Cloud. Verifica a net.", isLoading: false }));
    }
  };

  const handleSignUp = async (email: string, promoCode?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    // Validação de Promo Code (v1.1.8 Gate)
    if (!VALID_PROMOS.includes(promoCode || '')) {
      setState(prev => ({ ...prev, error: "INVALID_PROMO", isLoading: false }));
      return;
    }

    try {
      const exists = await firebaseService.userExists(email);
      if (exists) {
        setState(prev => ({ ...prev, error: "USER_ALREADY_EXISTS", isLoading: false }));
        return;
      }

      const profile = migratedData?.userProfile 
        ? { ...migratedData.userProfile, email: email.toLowerCase(), promo_code: promoCode, account_status: 'active' as const }
        : { ...INITIAL_PROFILE, email: email.toLowerCase(), promo_code: promoCode, account_status: 'active' as const };
      
      setState(prev => ({
        ...prev,
        userProfile: profile,
        history: migratedData?.history || [],
        chatHistory: migratedData?.chatHistory || [],
        isLoading: false,
        error: null
      }));

      LEGACY_KEYS.forEach(k => localStorage.removeItem(k));
      setMigratedData(null);
      setActiveTab('settings');
    } catch (err) {
      setState(prev => ({ ...prev, error: "Erro ao criar conta.", isLoading: false }));
    }
  };

  const handleLogout = () => {
    if (confirm("Tens a certeza? Os dados estão seguros na Cloud.")) {
      localStorage.removeItem(SESSION_KEY);
      window.location.reload();
    }
  };

  const handleUpload = async (base64: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // processReceipt agora trata compressão e retries internamente (v1.1.8)
      const aiResult = await processReceipt(base64, state.userProfile);
      const newReceipt: ReceiptData = { ...aiResult, id: crypto.randomUUID() };
      setState(prev => ({
        ...prev,
        lastAnalysis: newReceipt,
        history: [newReceipt, ...prev.history].slice(0, 50),
        isLoading: false
      }));
    } catch (err: any) {
      setState(prev => ({ ...prev, isLoading: false, error: "Erro ao processar imagem. Tente uma foto mais nítida." }));
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-16 h-16 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
        <p className="font-black text-[10px] uppercase tracking-[0.3em] text-indigo-400 animate-pulse">Acedendo ao Cofre Global...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8 bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Header activeTab={activeTab} onTabChange={setActiveTab} isSyncing={isSyncing} />
      
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
              />
            )}

            {activeTab === 'chat' && (
              <ChatAssistant 
                history={state.history} 
                userProfile={state.userProfile} 
                chatLog={state.chatHistory} 
                onNewMessage={(msg) => setState(prev => ({ ...prev, chatHistory: [...prev.chatHistory, msg].slice(-20) }))} 
              />
            )}

            {activeTab === 'reports' && <ReportsView history={state.history} />}
            
            {activeTab === 'settings' && (
              <div className="space-y-6 animate-in fade-in">
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

      {state.userProfile.email && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </div>
  );
};

export default App;
