
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

const STORAGE_KEY_V111 = 'smart_receipts_v111_auth'; // Chave da versão anterior
const STORAGE_KEY_V112 = 'smart_receipts_v112_auth'; 
const APP_VERSION = "1.1.2";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [legacyData, setLegacyData] = useState<any>(null);
  const [state, setState] = useState<AppState>({
    userProfile: INITIAL_PROFILE,
    lastAnalysis: null,
    history: [],
    isLoading: false,
    error: null,
    chatHistory: [],
    isCloudEnabled: true,
  });

  // 1. Boot: Detectar Sessão e Dados Legados
  useEffect(() => {
    const bootApp = async () => {
      setIsInitializing(true);
      
      // Tentar recuperar sessão v1.1.2
      const savedAuth = localStorage.getItem(STORAGE_KEY_V112);
      // Verificar se existem dados da v1.1.1 (sem e-mail ou com estrutura antiga)
      const oldAuth = localStorage.getItem(STORAGE_KEY_V111);

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
        } catch (e) { console.error("Erro no boot", e); }
      } else if (oldAuth) {
        // Encontrou dados órfãos da versão anterior
        try {
          setLegacyData(JSON.parse(oldAuth));
        } catch (e) { console.error("Erro ao ler legado", e); }
      }
      
      setIsSyncing(false);
      setIsInitializing(false);
    };
    bootApp();
  }, []);

  // 2. Persistência Automática (Cloud + Local)
  useEffect(() => {
    if (isInitializing || !state.userProfile.email) return;

    localStorage.setItem(STORAGE_KEY_V112, JSON.stringify({
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
        // Agora o erro é tratado como uma sugestão ativa
        setState(prev => ({ ...prev, error: "USER_NOT_FOUND" }));
        return;
      }
      const cloudData = await firebaseService.syncPull(email);
      if (cloudData) {
        setState(prev => ({ ...prev, ...cloudData }));
        setActiveTab('dashboard');
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, error: "Falha na Cloud. Tente novamente." }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSignUp = async (email: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const exists = await firebaseService.userExists(email);
      if (exists) {
        setState(prev => ({ ...prev, error: "USER_ALREADY_EXISTS" }));
        return;
      }

      // Se houver legado, o novo utilizador herda esses dados!
      const profileToUse = legacyData?.userProfile ? { ...legacyData.userProfile, email: email.toLowerCase() } : { ...INITIAL_PROFILE, email: email.toLowerCase() };
      const historyToUse = legacyData?.history || [];

      setState(prev => ({ 
        ...prev, 
        userProfile: profileToUse,
        history: historyToUse,
        chatHistory: legacyData?.chatHistory || []
      }));
      
      // Limpar legado após migração
      localStorage.removeItem(STORAGE_KEY_V111);
      setLegacyData(null);
      
      setActiveTab('settings');
    } catch (err: any) {
      setState(prev => ({ ...prev, error: "Erro ao criar conta." }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleLogout = () => {
    if (confirm("Sair da conta? Os dados permanecem na Cloud.")) {
      localStorage.removeItem(STORAGE_KEY_V112);
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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest animate-pulse">A preparar o teu cofre digital...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8 bg-slate-50 flex flex-col font-sans">
      <Header activeTab={activeTab} onTabChange={setActiveTab} isSyncing={isSyncing} />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 md:py-8">
        {!state.userProfile.email && (
          <AuthScreen 
            onSignIn={handleSignIn} 
            onSignUp={handleSignUp} 
            isLoading={state.isLoading} 
            error={state.error} 
            legacyDetected={!!legacyData}
            onClearError={() => setState(prev => ({ ...prev, error: null }))}
          />
        )}

        {activeTab === 'dashboard' && state.userProfile.email && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
            {state.userProfile.user_name ? (
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Olá, {state.userProfile.user_name}! 👋</h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                    <i className="fa-solid fa-envelope text-indigo-400"></i> {state.userProfile.email}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm transition-all duration-500 ${isSyncing ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                   {isSyncing ? <><i className="fa-solid fa-cloud-arrow-up mr-2 animate-bounce"></i>Sincronizando...</> : <><i className="fa-solid fa-cloud-check mr-2"></i>Cofre Cloud Atualizado</>}
                </div>
              </header>
            ) : (
              <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-2xl shadow-indigo-200 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                <div className="z-10 text-center md:text-left">
                  <h3 className="text-2xl font-black mb-2">Quase lá! 🚀</h3>
                  <p className="text-indigo-100 font-medium max-w-sm">Diz-nos o teu nome e budget nas definições para ativares o teu Personal Coach AI.</p>
                </div>
                <button onClick={() => setActiveTab('settings')} className="z-10 bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all">Configurar Agora</button>
                <i className="fa-solid fa-sparkles absolute right-[-20px] top-[-20px] text-[150px] opacity-10 rotate-12"></i>
              </div>
            )}
            
            {state.userProfile.user_name && (
              <>
                <BudgetForecast profile={state.userProfile} history={state.history} />
                <ReceiptUploader onUpload={handleUpload} isLoading={state.isLoading} />
              </>
            )}
            
            {state.error && <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-700 text-xs font-bold animate-shake">{state.error}</div>}
            {state.lastAnalysis && <AnalysisView data={state.lastAnalysis} />}
          </div>
        )}

        {activeTab === 'history' && <div className="space-y-6 animate-in fade-in duration-500">
           <h2 className="text-2xl font-black text-slate-900 tracking-tight">Histórico Cloud</h2>
           {state.history.length === 0 ? (
             <div className="bg-white p-20 text-center rounded-[2.5rem] border border-slate-200 shadow-sm">
               <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                 <i className="fa-solid fa-receipt text-4xl"></i>
               </div>
               <p className="text-slate-400 text-sm font-black uppercase tracking-widest">Nenhuma fatura digitalizada</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {state.history.map((item) => (
                 <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-50 transition-all cursor-pointer group" onClick={() => { setState(prev => ({ ...prev, lastAnalysis: item })); setActiveTab('dashboard'); }}>
                   <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-2xl flex items-center justify-center font-black text-sm transition-colors">
                       {new Date(item.meta.date).getDate()}
                     </div>
                     <div className="truncate max-w-[160px]">
                        <p className="font-black text-slate-800 truncate text-base">{item.meta.store}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{item.meta.date}</p>
                     </div>
                   </div>
                   <p className="font-black text-indigo-600 text-lg">€{item.meta.total_spent.toFixed(2)}</p>
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
             <button onClick={handleLogout} className="w-full py-5 text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-50 rounded-2xl transition-all border border-rose-100 flex items-center justify-center gap-3">
               <i className="fa-solid fa-power-off"></i> Sair da Minha Conta
             </button>
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 py-3 flex justify-around items-center z-50 px-6 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <NavBtnMobile icon="fa-house" label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <NavBtnMobile icon="fa-clock" label="História" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        <NavBtnMobile icon="fa-robot" label="Coach" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
        <NavBtnMobile icon="fa-chart-pie" label="Dados" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        <NavBtnMobile icon="fa-user-gear" label="Conta" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
};

const AuthScreen = ({ onSignIn, onSignUp, isLoading, error, legacyDetected, onClearError }: any) => {
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
      <div className="max-w-md mx-auto py-20 space-y-12 animate-in zoom-in fade-in duration-700">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-100 rotate-6 transform hover:rotate-0 transition-all duration-500">
             <i className="fa-solid fa-receipt text-4xl"></i>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">SmartReceipts</h1>
          {legacyDetected && (
            <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100 animate-pulse">
              <i className="fa-solid fa-triangle-exclamation"></i> Dados Órfãos Detetados
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button onClick={() => setMode('signin')} className="w-full bg-slate-900 text-white font-black py-6 rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95">
             <i className="fa-solid fa-right-to-bracket"></i> Entrar na Minha Conta
          </button>
          <button onClick={() => setMode('signup')} className="w-full bg-white text-slate-900 border-2 border-slate-100 font-black py-6 rounded-2xl hover:border-indigo-600 transition-all flex items-center justify-center gap-3 active:scale-95">
             <i className="fa-solid fa-user-plus"></i> Criar Nova Identidade
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-16 space-y-8 animate-in slide-in-from-right-8 fade-in duration-500">
      <button onClick={() => { setMode(null); onClearError(); }} className="text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:text-indigo-600 transition-colors">
        <i className="fa-solid fa-arrow-left"></i> Voltar ao Início
      </button>

      <div className="bg-white p-12 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{mode === 'signin' ? 'Sincronizar Cofre' : 'Novo Cofre Cloud'}</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            {mode === 'signin' ? 'Recupera o teu histórico em qualquer dispositivo.' : 'Os teus dados estarão sempre seguros e acessíveis.'}
            {legacyDetected && mode === 'signup' && <span className="block text-amber-600 font-bold mt-2">Nota: O teu histórico atual será migrado para este e-mail!</span>}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Teu E-mail Identidade</label>
            <input 
              type="email" 
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="exemplo@gmail.com"
              className="w-full px-7 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:border-indigo-600 focus:ring-8 focus:ring-indigo-50 outline-none transition-all font-bold text-slate-800"
            />
          </div>
          <button 
            disabled={!email.includes('@') || isLoading}
            className="w-full bg-indigo-600 text-white font-black py-5 rounded-3xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
          >
            {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-bolt-lightning"></i>}
            {mode === 'signin' ? 'Entrar e Sincronizar' : 'Criar e Migrar Dados'}
          </button>
        </form>

        {error === 'USER_NOT_FOUND' && (
          <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-rose-500 text-xs font-bold">
              Não encontrámos nenhuma conta com este e-mail.
            </div>
            <button 
              onClick={() => { setMode('signup'); onClearError(); }}
              className="text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline"
            >
              Queres criar uma conta nova agora?
            </button>
          </div>
        )}

        {error === 'USER_ALREADY_EXISTS' && (
          <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-rose-500 text-xs font-bold">
              Este e-mail já está registado na nossa base.
            </div>
            <button 
              onClick={() => { setMode('signin'); onClearError(); }}
              className="text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline"
            >
              Tentar entrar em vez de registar?
            </button>
          </div>
        )}

        {error && error !== 'USER_NOT_FOUND' && error !== 'USER_ALREADY_EXISTS' && (
          <div className="text-center bg-rose-50 p-4 rounded-2xl border border-rose-100 text-rose-500 text-xs font-bold animate-shake">{error}</div>
        )}
      </div>
    </div>
  );
};

const NavBtnMobile = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 w-full py-2 transition-all rounded-2xl ${active ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-400 opacity-60'}`}>
    <i className={`fa-solid ${icon} ${active ? 'text-xl' : 'text-lg'}`}></i>
    <span className="text-[9px] font-black uppercase tracking-tight">{label}</span>
  </button>
);

export default App;
