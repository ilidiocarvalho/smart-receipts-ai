
import React, { useState, useEffect } from 'react';
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

const SESSION_KEY = 'SR_SESSION_V115';
const APP_VERSION = "1.3.1";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [migratedData, setMigratedData] = useState<any>(null);
  const [draftReceipt, setDraftReceipt] = useState<ReceiptData | null>(null);
  
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

  useEffect(() => {
    const boot = async () => {
      setIsInitializing(true);
      
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
      
      setState(prev => ({
        ...prev,
        userProfile: profile,
        isLoading: false,
        error: null
      }));

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
      const aiResult = await processReceipt(base64, state.userProfile);
      const newDraft: ReceiptData = { 
        ...aiResult, 
        id: crypto.randomUUID(),
        imageUrl: `data:image/jpeg;base64,${base64}` 
      };
      setDraftReceipt(newDraft);
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (err: any) {
      console.error("Erro no processamento:", err);
      setState(prev => ({ ...prev, isLoading: false, error: "Erro ao processar imagem. Tente uma foto mais nítida." }));
    }
  };

  const handleSaveDraft = (finalReceipt: ReceiptData) => {
    setState(prev => ({
      ...prev,
      lastAnalysis: finalReceipt,
      history: [finalReceipt, ...prev.history].slice(0, 50)
    }));
    setDraftReceipt(null);
    setActiveTab('dashboard');
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
            
            {activeTab === 'admin' && canAccessAdmin && <AdminDashboard />}

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

      {/* v1.3.0 Receipt Editor Overlay */}
      {draftReceipt && (
        <ReceiptEditor 
          receipt={draftReceipt} 
          onSave={handleSaveDraft} 
          onCancel={() => setDraftReceipt(null)}
        />
      )}

      {state.userProfile.email && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </div>
  );
};

export default App;
