
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

const STORAGE_KEY = 'smart_receipts_prod_v1';
const APP_VERSION = "1.0.7";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [state, setState] = useState<AppState>({
    userProfile: INITIAL_PROFILE,
    lastAnalysis: null,
    history: [],
    isLoading: false,
    error: null,
    chatHistory: [],
    isCloudEnabled: false,
  });

  const isKeyMissing = !process.env.API_KEY || process.env.API_KEY === '';

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(prev => ({ ...prev, ...parsed }));
        if (!parsed.userProfile?.user_name) {
          setActiveTab('settings');
        }
      } catch (e) {
        console.error("Failed to load saved state", e);
      }
    } else {
      setActiveTab('settings');
    }
  }, []);

  useEffect(() => {
    if (state.userProfile.user_name === "" && state.history.length === 0) return;

    setIsSyncing(true);
    const timeout = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        userProfile: state.userProfile,
        history: state.history,
        chatHistory: state.chatHistory,
        isCloudEnabled: state.isCloudEnabled
      }));
      setIsSyncing(false);
    }, 1200); // Ligeiramente mais longo para dar feedback visual de sync
    return () => clearTimeout(timeout);
  }, [state.userProfile, state.history, state.chatHistory, state.isCloudEnabled]);

  const handleUpload = async (base64: string) => {
    if (isKeyMissing) {
      setState(prev => ({ ...prev, error: "API Key não encontrada." }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const aiResult = await processReceipt(base64, state.userProfile);
      const newReceipt: ReceiptData = { ...aiResult, id: crypto.randomUUID() };

      if (state.isCloudEnabled) {
        setIsSyncing(true);
        const imageUrl = await firebaseService.uploadImage(base64);
        newReceipt.imageUrl = imageUrl;
        await firebaseService.saveReceipt(newReceipt);
        setIsSyncing(false);
      }

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
        error: err.message || "Erro ao digitalizar."
      }));
    }
  };

  const handleProfileUpdate = (newProfile: UserContext) => {
    setState(prev => ({ ...prev, userProfile: newProfile }));
    setActiveTab('dashboard');
  };

  const handleImportData = (data: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...data, lastAnalysis: null }));
  };

  const toggleCloud = () => {
    setState(prev => ({ ...prev, isCloudEnabled: !prev.isCloudEnabled }));
  };

  const handleNewChatMessage = (msg: ChatMessage) => {
    setState(prev => ({ ...prev, chatHistory: [...prev.chatHistory, msg].slice(-20) }));
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8 bg-slate-50 flex flex-col">
      <Header activeTab={activeTab} onTabChange={setActiveTab} isSyncing={isSyncing} />
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 md:py-8">
        {!state.userProfile.user_name && activeTab !== 'settings' && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between text-indigo-800 animate-in slide-in-from-top duration-300">
             <div className="flex items-center gap-3">
               <i className="fa-solid fa-circle-info text-indigo-400"></i>
               <p className="text-sm font-bold">Configura o teu perfil para uma análise personalizada.</p>
             </div>
             <button onClick={() => setActiveTab('settings')} className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-md">Configurar</button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <section className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="text-center md:text-left space-y-1">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Olá{state.userProfile.user_name ? `, ${state.userProfile.user_name}` : ''}! 👋
                </h2>
                <p className="text-slate-500 text-sm md:text-base">
                  {state.userProfile.user_name ? 'A analisar os teus gastos e nutrição.' : 'Bem-vindo ao SmartReceipts AI.'}
                </p>
              </div>
              
              {state.isCloudEnabled && (
                <div className="self-center md:self-auto flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm animate-in zoom-in duration-300">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Cloud Sync Ativo</span>
                </div>
              )}
            </section>
            
            <BudgetForecast profile={state.userProfile} history={state.history} />
            <ReceiptUploader onUpload={handleUpload} isLoading={state.isLoading} />
            
            {state.error && (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex gap-3 text-rose-700 items-start shadow-sm">
                <i className="fa-solid fa-circle-exclamation mt-1"></i>
                <p className="text-xs">{state.error}</p>
              </div>
            )}
            
            {state.lastAnalysis && <AnalysisView data={state.lastAnalysis} />}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-slate-900">Histórico de Compras</h2>
            {state.history.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                <i className="fa-solid fa-receipt text-3xl text-slate-200 mb-4 block"></i>
                <p className="text-slate-500 text-sm">Ainda não tens talões registados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.history.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:border-indigo-300 transition-all shadow-sm cursor-pointer" onClick={() => { setState(prev => ({ ...prev, lastAnalysis: item })); setActiveTab('dashboard'); }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                        <i className="fa-solid fa-bag-shopping text-xs"></i>
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
          <ChatAssistant history={state.history} userProfile={state.userProfile} chatLog={state.chatHistory} onNewMessage={handleNewChatMessage} />
        )}

        {activeTab === 'reports' && <ReportsView history={state.history} />}

        {activeTab === 'settings' && (
          <ProfileForm 
            profile={state.userProfile} 
            onUpdate={handleProfileUpdate} 
            onImportData={handleImportData}
            fullHistory={state.history}
            isCloudEnabled={state.isCloudEnabled}
            onToggleCloud={toggleCloud}
            version={APP_VERSION}
          />
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-md border-t border-slate-200 py-2 flex justify-around items-center z-50">
        <NavBtnMobile icon="fa-house" label="Início" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <NavBtnMobile icon="fa-clock" label="História" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        <NavBtnMobile icon="fa-robot" label="Coach" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
        <NavBtnMobile icon="fa-chart-pie" label="Relat." active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        <NavBtnMobile icon="fa-user-gear" label="Ajustes" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
};

const NavBtnMobile = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 w-full py-1 transition-colors ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
    <i className={`fa-solid ${icon} text-lg`}></i>
    <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
  </button>
);

export default App;