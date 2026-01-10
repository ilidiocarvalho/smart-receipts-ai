
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
  dietary_regime: "None / Mixed",
  monthly_budget: 0, 
  current_month_spend: 0, 
  family_context: "",
  goals: []
};

const STORAGE_KEY_PROD = 'smart_receipts_prod_v1';
const APP_VERSION = "1.0.9";

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
    isCloudEnabled: true, // Cloud ativada por defeito para fluidez
  });

  const isKeyMissing = !process.env.API_KEY || process.env.API_KEY === '';

  // 1. Inicialização: Local -> Cloud Pull
  useEffect(() => {
    const initApp = async () => {
      setIsInitializing(true);
      const savedLocal = localStorage.getItem(STORAGE_KEY_PROD);
      
      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal);
          setState(prev => ({ ...prev, ...parsed }));

          // Se tiver SyncKey, tenta atualizar da Cloud imediatamente
          if (parsed.userProfile?.syncKey) {
            setIsSyncing(true);
            const cloudData = await firebaseService.fetchUserData(parsed.userProfile.syncKey);
            if (cloudData) {
              setState(prev => ({ ...prev, ...cloudData }));
              console.log("✅ Dados sincronizados da Cloud no arranque.");
            }
            setIsSyncing(false);
          }
        } catch (e) {
          console.error("Failed to load state", e);
        }
      }
      setIsInitializing(false);
    };

    initApp();
  }, []);

  // 2. Persistência Automática: Local + Cloud Push
  useEffect(() => {
    if (isInitializing) return;
    if (state.userProfile.user_name === "" && state.history.length === 0) return;

    localStorage.setItem(STORAGE_KEY_PROD, JSON.stringify({
      userProfile: state.userProfile,
      history: state.history,
      chatHistory: state.chatHistory,
      isCloudEnabled: state.isCloudEnabled
    }));

    if (state.isCloudEnabled && state.userProfile.syncKey) {
      setIsSyncing(true);
      const timer = setTimeout(async () => {
        await firebaseService.saveUserData(state.userProfile.syncKey!, {
          userProfile: state.userProfile,
          history: state.history,
          chatHistory: state.chatHistory
        });
        setIsSyncing(false);
      }, 2000); // Debounce para não sobrecarregar a rede
      return () => clearTimeout(timer);
    }
  }, [state.userProfile, state.history, state.chatHistory, state.isCloudEnabled, isInitializing]);

  const handleUpload = async (base64: string) => {
    if (isKeyMissing) {
      setState(prev => ({ ...prev, error: "API Key não configurada." }));
      return;
    }

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
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || "Erro na análise."
      }));
    }
  };

  const handleCloudConnect = async (key: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const cloudData = await firebaseService.fetchUserData(key);
      if (cloudData) {
        setState(prev => ({ ...prev, ...cloudData }));
        setActiveTab('dashboard');
      } else {
        throw new Error("Perfil não encontrado para esta chave.");
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleProfileUpdate = (newProfile: UserContext) => {
    // Se for um perfil novo, gera uma chave aleatória se não tiver
    if (!newProfile.syncKey) {
      newProfile.syncKey = `SR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }
    setState(prev => ({ ...prev, userProfile: newProfile }));
    setActiveTab('dashboard');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold animate-pulse">A preparar a tua inteligência financeira...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8 bg-slate-50 flex flex-col">
      <Header activeTab={activeTab} onTabChange={setActiveTab} isSyncing={isSyncing} />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 md:py-8">
        {/* Ecrã de Identificação (se perfil vazio) */}
        {!state.userProfile.user_name && activeTab !== 'settings' && (
          <CloudLoginView onConnect={handleCloudConnect} onStartNew={() => setActiveTab('settings')} isLoading={state.isLoading} error={state.error} />
        )}

        {activeTab === 'dashboard' && state.userProfile.user_name && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Olá, {state.userProfile.user_name}! 👋
                </h2>
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                   <i className="fa-solid fa-key text-[10px]"></i>
                   <span>ID: {state.userProfile.syncKey}</span>
                </div>
              </div>
              
              <div className="self-center md:self-auto flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-100 shadow-sm">
                <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-indigo-500'}`}></div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Sincronização Ativa</span>
              </div>
            </header>
            
            <BudgetForecast profile={state.userProfile} history={state.history} />
            <ReceiptUploader onUpload={handleUpload} isLoading={state.isLoading} />
            
            {state.error && (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex gap-3 text-rose-700 items-start shadow-sm animate-in slide-in-from-top-2">
                <i className="fa-solid fa-circle-exclamation mt-1"></i>
                <p className="text-xs">{state.error}</p>
              </div>
            )}
            
            {state.lastAnalysis && <AnalysisView data={state.lastAnalysis} />}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-slate-900">Histórico</h2>
            {state.history.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                <i className="fa-solid fa-receipt text-3xl text-slate-200 mb-4 block"></i>
                <p className="text-slate-500 text-sm">Nenhum talão na nuvem para este perfil.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.history.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:border-indigo-300 transition-all shadow-sm cursor-pointer" onClick={() => { setState(prev => ({ ...prev, lastAnalysis: item })); setActiveTab('dashboard'); }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 text-[10px] font-bold">
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
          </div>
        )}

        {activeTab === 'chat' && (
          <ChatAssistant history={state.history} userProfile={state.userProfile} chatLog={state.chatHistory} onNewMessage={(msg) => setState(prev => ({ ...prev, chatHistory: [...prev.chatHistory, msg].slice(-20) }))} />
        )}

        {activeTab === 'reports' && <ReportsView history={state.history} />}

        {activeTab === 'settings' && (
          <ProfileForm 
            profile={state.userProfile} 
            onUpdate={handleProfileUpdate} 
            onImportData={(data) => setState(prev => ({ ...prev, ...data }))}
            fullHistory={state.history}
            isCloudEnabled={state.isCloudEnabled}
            onToggleCloud={() => setState(prev => ({ ...prev, isCloudEnabled: !prev.isCloudEnabled }))}
            version={APP_VERSION}
          />
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 py-2 flex justify-around items-center z-50 px-2">
        <NavBtnMobile icon="fa-house" label="Início" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <NavBtnMobile icon="fa-clock" label="História" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        <NavBtnMobile icon="fa-robot" label="Coach" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
        <NavBtnMobile icon="fa-chart-pie" label="Relat." active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        <NavBtnMobile icon="fa-user-gear" label="Ajustes" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
};

const CloudLoginView = ({ onConnect, onStartNew, isLoading, error }: any) => {
  const [key, setKey] = useState('');
  return (
    <div className="max-w-md mx-auto py-12 space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 rotate-3">
          <i className="fa-solid fa-cloud-bolt text-3xl"></i>
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">SmartReceipts Cloud</h2>
          <p className="text-slate-500 text-sm mt-2">Acede ao teu perfil e histórico em qualquer lugar.</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Já tens uma Chave?</label>
          <div className="relative">
            <input 
              type="text" 
              value={key}
              onChange={e => setKey(e.target.value.toUpperCase())}
              placeholder="Ex: SR-A1B2C3"
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-mono font-bold text-lg text-center"
            />
          </div>
          <button 
            disabled={!key || isLoading}
            onClick={() => onConnect(key)}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-plug-circle-check"></i>}
            Recuperar Perfil da Nuvem
          </button>
        </div>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <div className="relative flex justify-center"><span className="bg-white px-4 text-[10px] font-black uppercase text-slate-300">Ou</span></div>
        </div>

        <button 
          onClick={onStartNew}
          className="w-full bg-slate-50 text-slate-600 font-bold py-4 rounded-2xl border-2 border-slate-100 hover:bg-white hover:border-indigo-100 transition flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-plus-circle"></i>
          Criar Novo Perfil Local
        </button>
      </div>

      {error && (
        <p className="text-center text-rose-500 text-xs font-bold animate-bounce">
          <i className="fa-solid fa-circle-xmark mr-1"></i> {error}
        </p>
      )}
    </div>
  );
};

const NavBtnMobile = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 w-full py-1.5 transition-all rounded-xl ${active ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-400'}`}>
    <i className={`fa-solid ${icon} ${active ? 'text-lg' : 'text-base'}`}></i>
    <span className="text-[8px] font-bold uppercase tracking-wider">{label}</span>
  </button>
);

export default App;