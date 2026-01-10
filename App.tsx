
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

// Chaves de todas as versões anteriores para migração profunda
const LEGACY_KEYS = ['v1.0.0', 'smart_receipts_v111_auth', 'smart_receipts_v112_auth'];
const SESSION_KEY = 'SR_SESSION_V113';
const APP_VERSION = "1.1.3";

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

  // 1. Boot: Migração e Recuperação de Sessão
  useEffect(() => {
    const boot = async () => {
      setIsInitializing(true);
      
      // A. Procurar dados legados em todas as versões possíveis
      let foundLegacy: any = null;
      for (const key of LEGACY_KEYS) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.history?.length > 0 || parsed.userProfile?.user_name) {
              foundLegacy = parsed;
              console.log(`📦 Legado detetado na chave: ${key}`);
              break; 
            }
          } catch (e) {}
        }
      }
      if (foundLegacy) setMigratedData(foundLegacy);

      // B. Verificar Sessão Ativa
      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        try {
          const { email } = JSON.parse(session);
          setIsSyncing(true);
          const cloudData = await firebaseService.syncPull(email);
          if (cloudData) {
            setState(prev => ({ ...prev, ...cloudData }));
          }
        } catch (e) { console.error("Erro ao restaurar sessão", e); }
      }
      
      setIsSyncing(false);
      setIsInitializing(false);
    };
    boot();
  }, []);

  // 2. Persistência Cloud Automática (Debounced)
  useEffect(() => {
    if (isInitializing || !state.userProfile.email) return;

    // Atualizar Session Local
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: state.userProfile.email }));

    // Sincronizar com a "Nuvem"
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
        setState(prev => ({ ...prev, ...data }));
        setActiveTab('dashboard');
      }
    } catch (err) {
      setState(prev => ({ ...prev, error: "Erro na Cloud. Verifica a net.", isLoading: false }));
    }
  };

  const handleSignUp = async (email: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const exists = await firebaseService.userExists(email);
      if (exists) {
        setState(prev => ({ ...prev, error: "USER_ALREADY_EXISTS", isLoading: false }));
        return;
      }

      // Migração: Se havia dados legados, eles são "adotados" pela nova conta
      const profile = migratedData?.userProfile 
        ? { ...migratedData.userProfile, email: email.toLowerCase() }
        : { ...INITIAL_PROFILE, email: email.toLowerCase() };
      
      setState(prev => ({
        ...prev,
        userProfile: profile,
        history: migratedData?.history || [],
        chatHistory: migratedData?.chatHistory || []
      }));

      // Limpar legados para não duplicar
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
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-16 h-16 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
        <p className="font-black text-[10px] uppercase tracking-[0.3em] text-indigo-400 animate-pulse">Sincronizando Cofre Global...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8 bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Header activeTab={activeTab} onTabChange={setActiveTab} isSyncing={isSyncing} />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 md:py-8">
        {!state.userProfile.email && (
          <AuthScreen 
            onSignIn={handleSignIn} 
            onSignUp={handleSignUp} 
            isLoading={state.isLoading} 
            error={state.error} 
            legacyDetected={!!migratedData}
            onClearError={() => setState(prev => ({ ...prev, error: null }))}
          />
        )}

        {activeTab === 'dashboard' && state.userProfile.email && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {state.userProfile.user_name ? (
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Olá, {state.userProfile.user_name}! 👋</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                       <i className="fa-solid fa-shield-halved text-indigo-500"></i> {state.userProfile.email}
                    </span>
                  </div>
                </div>
                <div className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-3 transition-all duration-500 ${isSyncing ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-emerald-600 border-slate-200'}`}>
                   <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></div>
                   {isSyncing ? 'Cloud Syncing...' : 'Live Connected'}
                </div>
              </header>
            ) : (
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200/50 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
                <div className="z-10 text-center md:text-left space-y-3">
                  <h3 className="text-3xl font-black tracking-tight">Configura o teu Perfil 🎯</h3>
                  <p className="text-indigo-100 font-medium max-w-sm text-lg opacity-90 leading-relaxed">Diz-nos os teus objetivos para que a IA possa analisar as tuas faturas com precisão.</p>
                </div>
                <button onClick={() => setActiveTab('settings')} className="z-10 bg-white text-indigo-700 px-10 py-5 rounded-[1.5rem] font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all duration-300">Começar Agora</button>
                <i className="fa-solid fa-rocket absolute right-[-20px] bottom-[-20px] text-[180px] opacity-10 -rotate-12 group-hover:rotate-0 transition-transform duration-1000"></i>
              </div>
            )}
            
            {state.userProfile.user_name && (
              <>
                <BudgetForecast profile={state.userProfile} history={state.history} />
                <ReceiptUploader onUpload={handleUpload} isLoading={state.isLoading} />
              </>
            )}
            
            {state.error && <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl text-rose-700 text-xs font-black animate-shake">{state.error}</div>}
            {state.lastAnalysis && <AnalysisView data={state.lastAnalysis} />}
          </div>
        )}

        {/* Outras Abas (History, Chat, Reports, Settings) */}
        {activeTab === 'history' && <div className="space-y-6 animate-in fade-in duration-500">
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">O Teu Histórico Global</h2>
           {state.history.length === 0 ? (
             <div className="bg-white p-24 text-center rounded-[3rem] border border-slate-200 shadow-sm border-dashed">
               <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                 <i className="fa-solid fa-cloud-arrow-up text-4xl"></i>
               </div>
               <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Sem faturas na cloud</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {state.history.map((item) => (
                 <div key={item.id} className="bg-white p-7 rounded-[2rem] border border-slate-200 flex items-center justify-between hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all cursor-pointer group" onClick={() => { setState(prev => ({ ...prev, lastAnalysis: item })); setActiveTab('dashboard'); }}>
                   <div className="flex items-center gap-5">
                     <div className="w-16 h-16 bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl flex items-center justify-center font-black text-lg transition-all duration-500">
                       {new Date(item.meta.date).getDate()}
                     </div>
                     <div className="truncate max-w-[160px] space-y-1">
                        <p className="font-black text-slate-900 truncate text-lg tracking-tight">{item.meta.store}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.meta.date}</p>
                     </div>
                   </div>
                   <div className="text-right">
                      <p className="font-black text-indigo-600 text-xl">€{item.meta.total_spent.toFixed(2)}</p>
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Saved €{item.meta.total_saved.toFixed(2)}</p>
                   </div>
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
             <button onClick={handleLogout} className="w-full py-6 text-rose-500 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-rose-50 rounded-[1.5rem] transition-all border border-rose-100 flex items-center justify-center gap-3">
               <i className="fa-solid fa-power-off"></i> Terminar Sessão Global
             </button>
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-6 inset-x-6 bg-slate-900/95 backdrop-blur-2xl py-4 flex justify-around items-center z-50 px-6 rounded-[2.5rem] shadow-2xl border border-white/10">
        <NavBtnMobile icon="fa-house" label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <NavBtnMobile icon="fa-clock" label="History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        <NavBtnMobile icon="fa-robot" label="Coach" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
        <NavBtnMobile icon="fa-chart-pie" label="Stats" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        <NavBtnMobile icon="fa-user-gear" label="Profile" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
};

const AuthScreen = ({ onSignIn, onSignUp, isLoading, error, legacyDetected, onClearError }: any) => {
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup' | null>(null);
  
  const handleAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    if (mode === 'signin') onSignIn(email);
    else onSignUp(email);
  };

  const switchToSignup = () => {
    onClearError();
    setMode('signup');
  };

  const switchToSignin = () => {
    onClearError();
    setMode('signin');
  };

  if (!mode) {
    return (
      <div className="max-w-md mx-auto py-24 space-y-16 animate-in zoom-in fade-in duration-1000">
        <div className="text-center space-y-8">
          <div className="w-28 h-28 bg-gradient-to-br from-indigo-600 to-indigo-900 text-white rounded-[3rem] flex items-center justify-center mx-auto shadow-[0_20px_50px_rgba(79,70,229,0.3)] rotate-6 transform hover:rotate-0 transition-all duration-700">
             <i className="fa-solid fa-receipt text-5xl"></i>
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">SmartReceipts</h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Cloud Sync Enabled v1.1.3</p>
          </div>
          {legacyDetected && (
            <div className="inline-flex items-center gap-3 bg-amber-50 text-amber-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-amber-100 shadow-sm animate-bounce">
              <i className="fa-solid fa-wand-magic-sparkles"></i> Dados Locais Prontos para Migrar
            </div>
          )}
        </div>

        <div className="space-y-5">
          <button onClick={() => setMode('signin')} className="w-full bg-slate-900 text-white font-black py-7 rounded-3xl hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-4 active:scale-95 group">
             <i className="fa-solid fa-fingerprint text-xl group-hover:scale-125 transition-transform"></i> Entrar na Minha Nuvem
          </button>
          <button onClick={() => setMode('signup')} className="w-full bg-white text-slate-900 border-2 border-slate-100 font-black py-7 rounded-3xl hover:border-indigo-600 transition-all flex items-center justify-center gap-4 active:scale-95">
             <i className="fa-solid fa-user-plus text-xl"></i> Criar Novo Cofre
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-16 space-y-8 animate-in slide-in-from-right-12 fade-in duration-500">
      <button onClick={() => { setMode(null); onClearError(); }} className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-3 hover:text-indigo-600 transition-all">
        <i className="fa-solid fa-chevron-left"></i> Voltar ao Início
      </button>

      <div className="bg-white p-14 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 space-y-12 relative overflow-hidden">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{mode === 'signin' ? 'Sincronizar' : 'Novo Registo'}</h2>
          <p className="text-slate-400 text-sm font-bold leading-relaxed opacity-80 uppercase tracking-widest text-[10px]">
            {mode === 'signin' ? 'Acede ao teu histórico de qualquer lugar.' : 'Os teus dados estarão sempre seguros e acessíveis.'}
          </p>
        </div>

        <form onSubmit={handleAction} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">E-mail da Conta</label>
            <input 
              type="email" 
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="exemplo@gmail.com"
              className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[1.8rem] focus:border-indigo-600 focus:ring-[12px] focus:ring-indigo-50 outline-none transition-all font-bold text-slate-900 text-lg"
            />
          </div>
          <button 
            disabled={!email.includes('@') || isLoading}
            className="w-full bg-indigo-600 text-white font-black py-6 rounded-[1.8rem] hover:bg-indigo-700 transition-all shadow-[0_15px_30px_rgba(79,70,229,0.3)] disabled:opacity-50 flex items-center justify-center gap-4 active:scale-95"
          >
            {isLoading ? <i className="fa-solid fa-spinner animate-spin text-xl"></i> : <i className="fa-solid fa-bolt-lightning text-xl"></i>}
            {mode === 'signin' ? 'Confirmar e Entrar' : 'Confirmar e Criar'}
          </button>
        </form>

        {error === 'USER_NOT_FOUND' && (
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-top-4">
            <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100 text-rose-500 text-xs font-black flex items-center gap-3">
              <i className="fa-solid fa-circle-xmark text-lg"></i>
              E-mail não registado no sistema global.
            </div>
            <button 
              type="button"
              onClick={switchToSignup}
              className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] hover:text-indigo-800 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              Cofre inexistente. Queres criar este novo? <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        )}

        {error === 'USER_ALREADY_EXISTS' && (
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-top-4">
            <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100 text-rose-500 text-xs font-black flex items-center gap-3">
              <i className="fa-solid fa-user-check text-lg"></i>
              Este e-mail já possui um cofre ativo.
            </div>
            <button 
              type="button"
              onClick={switchToSignin}
              className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] hover:text-indigo-800 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              Já existe. Tentar entrar com este? <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        )}

        {error && error !== 'USER_NOT_FOUND' && error !== 'USER_ALREADY_EXISTS' && (
          <div className="text-center bg-rose-50 p-5 rounded-3xl border border-rose-100 text-rose-500 text-xs font-black animate-shake flex items-center gap-3">
             <i className="fa-solid fa-triangle-exclamation text-lg"></i> {error}
          </div>
        )}
      </div>
    </div>
  );
};

const NavBtnMobile = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 w-full py-1.5 transition-all rounded-2xl ${active ? 'text-indigo-400 bg-white/5 shadow-inner' : 'text-slate-500'}`}>
    <i className={`fa-solid ${icon} ${active ? 'text-lg' : 'text-base'}`}></i>
    <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default App;
