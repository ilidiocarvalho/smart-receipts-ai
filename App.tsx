
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ReceiptUploader from './components/ReceiptUploader';
import ProfileForm from './components/ProfileForm';
import AnalysisView from './components/AnalysisView';
import BudgetForecast from './components/BudgetForecast';
import ReportsView from './components/ReportsView';
import ChatAssistant from './components/ChatAssistant';
import { UserContext, AppState, ReceiptData, ViewTab, ChatMessage } from './types';
import { processReceipt } from './services/geminiService';
import { firebaseService } from './services/firebaseService';

const INITIAL_PROFILE: UserContext = {
  user_name: "", 
  email: "",
  dietary_regime: "None / Mixed",
  monthly_budget: 0, 
  current_month_spend: 0, 
  family_context: "",
  goals: []
};

const STORAGE_KEY_PROD = 'smart_receipts_v111_auth';
const APP_VERSION = "1.1.1";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [state, setState] = useState<AppState>({
    userProfile: INITIAL_PROFILE,
    lastAnalysis: null,
    history: [],
    isLoading: false,
    error: null,
    chatHistory: [],
    isCloudEnabled: true,
  });

  // 1. Boot: Recuperar sessão e Sincronizar
  useEffect(() => {
    const bootApp = async () => {
      setIsInitializing(true);
      const savedAuth = localStorage.getItem(STORAGE_KEY_PROD);
      
      if (savedAuth) {
        try {
          const localData = JSON.parse(savedAuth);
          if (localData.userProfile?.email) {
            setIsSyncing(true);
            const cloudData = await firebaseService.syncPull(localData.userProfile.email);
            if (cloudData) {
              setState(prev => ({ ...prev, ...cloudData }));
            } else {
              setState(prev => ({ ...prev, ...localData }));
            }
          }
        } catch (e) {
          console.error("Erro no boot", e);
        } finally {
          setIsSyncing(false);
        }
      }
      setIsInitializing(false);
    };
    bootApp();
  }, []);

  // 2. Persistência Automática
  useEffect(() => {
    if (isInitializing || !state.userProfile.email) return;

    localStorage.setItem(STORAGE_KEY_PROD, JSON.stringify({
      userProfile: state.userProfile,
      history: state.history,
      chatHistory: state.chatHistory,
      isCloudEnabled: state.isCloudEnabled
    }));

    if (state.isCloudEnabled) {
      setIsSyncing(true);
      const timer = setTimeout(async () => {
        await firebaseService.syncPush(state.userProfile.email, {
          userProfile: state.userProfile,
          history: state.history,
          chatHistory: state.chatHistory
        });
        setIsSyncing(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.userProfile, state.history, state.chatHistory, state.isCloudEnabled, isInitializing]);

  const handleSignIn = async (email: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const exists = await firebaseService.userExists(email);
      if (!exists) {
        throw new Error("Esta conta não existe. Criar uma nova?");
      }
      const cloudData = await firebaseService.syncPull(email);
      if (cloudData) {
        setState(prev => ({ ...prev, ...cloudData }));
        setActiveTab('dashboard');
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSignUp = async (email: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const exists = await firebaseService.userExists(email);
      if (exists) {
        throw new Error("Este e-mail já está registado. Tente Entrar.");
      }
      // Criar novo perfil localmente primeiro
      setState(prev => ({ 
        ...prev, 
        userProfile: { ...INITIAL_PROFILE, email: email.toLowerCase() },
        history: [],
        chatHistory: []
      }));
      setActiveTab('settings');
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleLogout = () => {
    if (confirm("Tens a certeza que queres sair? Os teus dados estão guardados na Cloud.")) {
      localStorage.removeItem(STORAGE_KEY_PROD);
      window.location.reload();
    }
  };

  const handleUpload = async (base64: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const aiResult = await processReceipt(base64, state.userProfile);
      const newReceipt: ReceiptData = { ...aiResult, id: crypto.randomUUID() };
      setState(prev => ({
        ...prev,
        lastAnalysis: newReceipt,
        history: [newReceipt, ...prev.history].slice(0, 50),
        isLoading: false
      }));
    } catch (err: any) {
      setState(prev => ({ ...prev, isLoading: false, error: err.message }));
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8 bg-slate-50 flex flex-col">
      <Header activeTab={activeTab} onTabChange={setActiveTab} isSyncing={isSyncing} />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 md:py-8">
        {!state.userProfile.email && (
          <AuthScreen onSignIn={handleSignIn} onSignUp={handleSignUp} isLoading={state.isLoading} error={state.error} />
        )}

        {activeTab === 'dashboard' && state.userProfile.email && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {state.userProfile.user_name ? (
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Olá, {state.userProfile.user_name}! 👋</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{state.userProfile.email}</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${isSyncing ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                   {isSyncing ? <><i className="fa-solid fa-cloud-arrow-up mr-2 animate-bounce"></i>Sincronizando...</> : <><i className="fa-solid fa-cloud-check mr-2"></i>Nuvem Atualizada</>}
                </div>
              </header>
            ) : (
              <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-2xl shadow-indigo-200 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-black">Vamos Começar! 🚀</h3>
                  <p className="text-indigo-100 opacity-90">Completa o teu perfil para que a IA possa dar-te conselhos personalizados.</p>
                </div>
                <button onClick={() => setActiveTab('settings')} className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black text-sm shadow-xl hover:scale-105 transition-all">Configurar Agora</button>
              </div>
            )}
            
            {state.userProfile.user_name && (
              <>
                <BudgetForecast profile={state.userProfile} history={state.history} />
                <ReceiptUploader onUpload={handleUpload} isLoading={state.isLoading} />
              </>
            )}
            
            {state.error && <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-700 text-xs font-bold">{state.error}</div>}
            {state.lastAnalysis && <AnalysisView data={state.lastAnalysis} />}
          </div>
        )}

        {activeTab === 'history' && <div className="space-y-6 animate-in fade-in">
           <h2 className="text-2xl font-bold text-slate-900">Histórico de Faturas</h2>
           {state.history.length === 0 ? (
             <div className="bg-white p-16 text-center rounded-3xl border border-slate-200">
               <i className="fa-solid fa-receipt text-5xl text-slate-100 mb-4 block"></i>
               <p className="text-slate-400 text-sm font-bold">Ainda não tens talões guardados.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {state.history.map((item) => (
                 <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between hover:border-indigo-500 transition-all shadow-sm cursor-pointer" onClick={() => { setState(prev => ({ ...prev, lastAnalysis: item })); setActiveTab('dashboard'); }}>
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-sm">
                       {new Date(item.meta.date).getDate()}
                     </div>
                     <div className="truncate max-w-[160px]">
                        <p className="font-black text-slate-800 truncate">{item.meta.store}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.meta.date}</p>
                     </div>
                   </div>
                   <p className="font-black text-indigo-600">€{item.meta.total_spent.toFixed(2)}</p>
                 </div>
               ))}
             </div>
           )}
        </div>}

        {activeTab === 'chat' && <ChatAssistant history={state.history} userProfile={state.userProfile} chatLog={state.chatHistory} onNewMessage={(msg) => setState(prev => ({ ...prev, chatHistory: [...prev.chatHistory, msg].slice(-20) }))} />}
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
             <button onClick={handleLogout} className="w-full py-4 text-rose-500 font-black text-sm hover:bg-rose-50 rounded-2xl transition-all border border-rose-100 flex items-center justify-center gap-2">
               <i className="fa-solid fa-right-from-bracket"></i> Sair da Conta
             </button>
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 flex justify-around items-center z-50 px-4 rounded-t-3xl shadow-2xl">
        <NavBtnMobile icon="fa-house" label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <NavBtnMobile icon="fa-clock" label="História" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        <NavBtnMobile icon="fa-robot" label="Coach" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
        <NavBtnMobile icon="fa-chart-pie" label="Dados" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        <NavBtnMobile icon="fa-user-gear" label="Conta" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
};

const AuthScreen = ({ onSignIn, onSignUp, isLoading, error }: any) => {
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup' | null>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    if (mode === 'signin') onSignIn(email);
    else onSignUp(email);
  };

  if (!mode) {
    return (
      <div className="max-w-md mx-auto py-20 space-y-12 animate-in zoom-in fade-in duration-500">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-100 rotate-6">
             <i className="fa-solid fa-receipt text-4xl"></i>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">SmartReceipts</h1>
        </div>

        <div className="space-y-4">
          <button onClick={() => setMode('signin')} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3">
             <i className="fa-solid fa-right-to-bracket"></i> Entrar na Minha Conta
          </button>
          <button onClick={() => setMode('signup')} className="w-full bg-white text-slate-900 border-2 border-slate-100 font-black py-5 rounded-2xl hover:border-indigo-600 transition-all flex items-center justify-center gap-3">
             <i className="fa-solid fa-user-plus"></i> Sou Novo Aqui
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-16 space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
      <button onClick={() => setMode(null)} className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:text-indigo-600">
        <i className="fa-solid fa-arrow-left"></i> Voltar
      </button>

      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-slate-900">{mode === 'signin' ? 'Bem-vindo de volta' : 'Cria o teu perfil'}</h2>
          <p className="text-slate-400 text-sm font-medium">{mode === 'signin' ? 'Introduz o teu e-mail para recuperar os teus dados.' : 'Usa o teu e-mail como a tua identidade Cloud.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Teu E-mail</label>
            <input 
              type="email" 
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="exemplo@gmail.com"
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-bold text-slate-700"
            />
          </div>
          <button 
            disabled={!email.includes('@') || isLoading}
            className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-bolt-lightning"></i>}
            {mode === 'signin' ? 'Entrar e Sincronizar' : 'Continuar Registo'}
          </button>
        </form>

        {error && <div className="text-center bg-rose-50 p-3 rounded-xl border border-rose-100 text-rose-500 text-xs font-bold animate-shake">{error}</div>}
      </div>
    </div>
  );
};

const NavBtnMobile = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 w-full py-2 transition-all rounded-2xl ${active ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-400'}`}>
    <i className={`fa-solid ${icon} ${active ? 'text-xl' : 'text-lg'}`}></i>
    <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
