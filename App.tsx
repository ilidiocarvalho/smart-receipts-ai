
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

const STORAGE_KEY_PROD = 'smart_receipts_v110_auth';
const APP_VERSION = "1.1.0";

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

  // 1. Boot up: Carregar e-mail da sessão local e fazer PULL da Cloud
  useEffect(() => {
    const bootApp = async () => {
      setIsInitializing(true);
      const savedAuth = localStorage.getItem(STORAGE_KEY_PROD);
      
      if (savedAuth) {
        try {
          const localData = JSON.parse(savedAuth);
          // Tenta atualizar da Cloud se tivermos um e-mail
          if (localData.userProfile?.email) {
            setIsSyncing(true);
            const cloudData = await firebaseService.syncPull(localData.userProfile.email);
            if (cloudData) {
              setState(prev => ({ ...prev, ...cloudData }));
              console.log("✅ Cloud Sync: Dados recuperados automaticamente.");
            } else {
              // Se não houver na Cloud mas houver local, mantém local
              setState(prev => ({ ...prev, ...localData }));
            }
            setIsSyncing(false);
          }
        } catch (e) {
          console.error("Erro na inicialização", e);
        }
      }
      setIsInitializing(false);
    };

    bootApp();
  }, []);

  // 2. Auto-Save & Cloud Push (Debounced)
  useEffect(() => {
    if (isInitializing || !state.userProfile.email) return;

    // Guardar Localmente para persistência de aba/crash
    localStorage.setItem(STORAGE_KEY_PROD, JSON.stringify({
      userProfile: state.userProfile,
      history: state.history,
      chatHistory: state.chatHistory,
      isCloudEnabled: state.isCloudEnabled
    }));

    // Push para Cloud
    if (state.isCloudEnabled) {
      setIsSyncing(true);
      const timer = setTimeout(async () => {
        await firebaseService.syncPush(state.userProfile.email, {
          userProfile: state.userProfile,
          history: state.history,
          chatHistory: state.chatHistory
        });
        setIsSyncing(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.userProfile, state.history, state.chatHistory, state.isCloudEnabled, isInitializing]);

  const handleLogin = async (email: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const cloudData = await firebaseService.syncPull(email);
      if (cloudData) {
        // Utilizador Existente
        setState(prev => ({ ...prev, ...cloudData }));
        setActiveTab('dashboard');
      } else {
        // Novo Utilizador
        setState(prev => ({ 
          ...prev, 
          userProfile: { ...INITIAL_PROFILE, email: email.toLowerCase() } 
        }));
        setActiveTab('settings');
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, error: "Falha na ligação à Cloud." }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleLogout = () => {
    if (confirm("Tens a certeza que queres sair? Os teus dados estão seguros na Cloud.")) {
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
      setState(prev => ({ ...prev, isLoading: false, error: err.message || "Erro na análise." }));
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Sincronizando Inteligência...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8 bg-slate-50 flex flex-col">
      <Header activeTab={activeTab} onTabChange={setActiveTab} isSyncing={isSyncing} />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 md:py-8">
        {/* Auth Screen (Se não houver e-mail) */}
        {!state.userProfile.email && (
          <EmailLoginScreen onLogin={handleLogin} isLoading={state.isLoading} error={state.error} />
        )}

        {activeTab === 'dashboard' && state.userProfile.email && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {state.userProfile.user_name ? (
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Olá, {state.userProfile.user_name}! 👋</h2>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">{state.userProfile.email}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${isSyncing ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                  {isSyncing ? 'Sincronizando' : 'Nuvem Atualizada'}
                </div>
              </header>
            ) : (
              <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Perfil Quase Pronto!</h3>
                  <p className="text-indigo-100 text-sm">Completa o teu nome e dieta para começar.</p>
                </div>
                <button onClick={() => setActiveTab('settings')} className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:scale-105 transition">Configurar</button>
              </div>
            )}
            
            <BudgetForecast profile={state.userProfile} history={state.history} />
            <ReceiptUploader onUpload={handleUpload} isLoading={state.isLoading} />
            
            {state.error && (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex gap-3 text-rose-700 items-start shadow-sm">
                <i className="fa-solid fa-circle-exclamation mt-1"></i>
                <p className="text-xs font-medium">{state.error}</p>
              </div>
            )}
            
            {state.lastAnalysis && <AnalysisView data={state.lastAnalysis} />}
          </div>
        )}

        {activeTab === 'history' && <div className="space-y-6 animate-in fade-in duration-500">
           <h2 className="text-2xl font-bold text-slate-900">Teu Histórico Cloud</h2>
           {state.history.length === 0 ? (
             <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
               <i className="fa-solid fa-cloud-sun text-4xl text-slate-200 mb-4 block"></i>
               <p className="text-slate-500 text-sm">Ainda não tens talões na tua conta.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {state.history.map((item) => (
                 <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:border-indigo-300 transition-all shadow-sm cursor-pointer" onClick={() => { setState(prev => ({ ...prev, lastAnalysis: item })); setActiveTab('dashboard'); }}>
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center font-bold text-sm">
                       {new Date(item.meta.date).getDate()}
                     </div>
                     <div className="truncate max-w-[140px]">
                        <p className="font-bold text-sm truncate">{item.meta.store}</p>
                        <p className="text-[10px] text-slate-400">{item.meta.date}</p>
                     </div>
                   </div>
                   <p className="font-bold text-indigo-600 text-sm">€{item.meta.total_spent.toFixed(2)}</p>
                 </div>
               ))}
             </div>
           )}
        </div>}

        {activeTab === 'chat' && <ChatAssistant history={state.history} userProfile={state.userProfile} chatLog={state.chatHistory} onNewMessage={(msg) => setState(prev => ({ ...prev, chatHistory: [...prev.chatHistory, msg].slice(-20) }))} />}
        {activeTab === 'reports' && <ReportsView history={state.history} />}
        
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <ProfileForm 
               profile={state.userProfile} 
               onUpdate={(p) => setState(prev => ({ ...prev, userProfile: p }))}
               onImportData={(data) => setState(prev => ({ ...prev, ...data }))}
               fullHistory={state.history}
               isCloudEnabled={state.isCloudEnabled}
               onToggleCloud={() => setState(prev => ({ ...prev, isCloudEnabled: !prev.isCloudEnabled }))}
               version={APP_VERSION}
             />
             <button onClick={handleLogout} className="w-full py-4 text-rose-500 font-bold text-sm hover:bg-rose-50 rounded-2xl transition flex items-center justify-center gap-2 border border-rose-100">
               <i className="fa-solid fa-right-from-bracket"></i> Sair da Conta
             </button>
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 flex justify-around items-center z-50 px-4 rounded-t-3xl shadow-2xl">
        <NavBtnMobile icon="fa-house" label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <NavBtnMobile icon="fa-clock" label="História" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        <NavBtnMobile icon="fa-robot" label="AI Coach" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
        <NavBtnMobile icon="fa-chart-pie" label="Relatos" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        <NavBtnMobile icon="fa-user-gear" label="Conta" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
};

const EmailLoginScreen = ({ onLogin, isLoading, error }: any) => {
  const [email, setEmail] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.includes('@')) onLogin(email);
  };

  return (
    <div className="max-w-md mx-auto py-16 space-y-12 animate-in fade-in zoom-in duration-700">
      <div className="text-center space-y-4">
        <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 rotate-6 transform hover:rotate-0 transition-transform duration-500">
          <i className="fa-solid fa-receipt text-4xl"></i>
        </div>
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">SmartReceipts</h1>
          <p className="text-slate-500 font-medium">A tua inteligência omnipresente.</p>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 space-y-8">
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-bold text-slate-800">Bem-vindo de volta</h2>
          <p className="text-slate-400 text-sm leading-relaxed">Introduz o teu e-mail para sincronizar os teus dados em qualquer dispositivo.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Teu E-mail Cloud</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="exemplo@gmail.com"
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-semibold text-slate-700"
            />
          </div>
          <button 
            disabled={!email.includes('@') || isLoading}
            className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-3 group"
          >
            {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-bolt-lightning group-hover:animate-pulse"></i>}
            Entrar e Sincronizar
          </button>
        </form>

        <div className="flex items-center gap-2 justify-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
           <i className="fa-solid fa-shield-halved text-indigo-300"></i>
           Identidade Protegida por Cloud AI
        </div>
      </div>

      {error && <p className="text-center text-rose-500 text-xs font-bold animate-shake">{error}</p>}
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
