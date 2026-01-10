
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
  user_name: "Bruno",
  dietary_regime: "Ovo-Lacto Vegetariano",
  monthly_budget: 280.00,
  current_month_spend: 150.00,
  family_context: "Filho de 8 anos a cada 2 weeks",
  goals: ["Reduzir processados", "Evitar compras diárias", "Economizar 10%"]
};

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
    const saved = localStorage.getItem('smart_receipt_state_v5');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to load saved state", e);
      }
    }
  }, []);

  useEffect(() => {
    setIsSyncing(true);
    const timeout = setTimeout(() => {
      localStorage.setItem('smart_receipt_state_v5', JSON.stringify({
        userProfile: state.userProfile,
        history: state.history,
        chatHistory: state.chatHistory,
        isCloudEnabled: state.isCloudEnabled
      }));
      setIsSyncing(false);
    }, 800);
    return () => clearTimeout(timeout);
  }, [state.userProfile, state.history, state.chatHistory, state.isCloudEnabled]);

  const handleUpload = async (base64: string) => {
    if (isKeyMissing) {
      setState(prev => ({ ...prev, error: "API Key não encontrada. Verifique as configurações do Vercel." }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const aiResult = await processReceipt(base64, state.userProfile);
      
      const newReceipt: ReceiptData = {
        ...aiResult,
        id: crypto.randomUUID(),
      };

      if (state.isCloudEnabled) {
        const imageUrl = await firebaseService.uploadImage(base64);
        newReceipt.imageUrl = imageUrl;
        await firebaseService.saveReceipt(newReceipt);
      }

      setState(prev => ({
        ...prev,
        lastAnalysis: newReceipt,
        history: [newReceipt, ...prev.history].slice(0, 50),
        isLoading: false
      }));
    } catch (err: any) {
      console.error(err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || "Erro ao digitalizar. Tente uma foto mais clara."
      }));
    }
  };

  const handleProfileUpdate = (newProfile: UserContext) => {
    setState(prev => ({ ...prev, userProfile: newProfile }));
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
        {isKeyMissing && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-4 text-amber-800 animate-pulse-subtle">
            <i className="fa-solid fa-key text-xl"></i>
            <div>
              <p className="font-bold text-sm">Chave API Pendente</p>
              <p className="text-xs">Aguardando configuração da API_KEY no Vercel para ativar o motor de IA.</p>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="text-center md:text-left space-y-1">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Olá, {state.userProfile.user_name}! 👋
                </h2>
                <p className="text-slate-500 text-sm md:text-base">
                  A acompanhar os teus objetivos de <span className="text-indigo-600 font-semibold">{new Date().toLocaleString('pt-PT', { month: 'long' })}</span>.
                </p>
              </div>
              {state.isCloudEnabled && (
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100 flex items-center gap-2 self-center md:self-auto">
                  <i className="fa-solid fa-cloud-check"></i> Cloud Sync Ativo
                </div>
              )}
            </section>
            
            <BudgetForecast profile={state.userProfile} history={state.history} />
            <ReceiptUploader onUpload={handleUpload} isLoading={state.isLoading} />
            {state.error && (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex gap-3 text-rose-700 items-start shadow-sm">
                <i className="fa-solid fa-circle-exclamation mt-1"></i>
                <div><p className="font-bold text-sm">Erro</p><p className="text-xs">{state.error}</p></div>
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
                <i className="fa-solid fa-receipt text-4xl text-slate-200 mb-4 block"></i>
                <p className="text-slate-500">Ainda não tens compras registadas. Começa por digitalizar um talão.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.history.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:border-indigo-300 transition-all shadow-sm cursor-pointer group"
                    onClick={() => { setState(prev => ({ ...prev, lastAnalysis: item })); setActiveTab('dashboard'); }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        {new Date(item.meta.date).getDate()}
                      </div>
                      <div className="truncate max-w-[120px] md:max-w-[180px]">
                        <p className="font-bold text-slate-900 text-sm truncate">{item.meta.store}</p>
                        <p className="text-[10px] text-slate-400">{new Date(item.meta.date).toLocaleDateString('pt-PT')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-sm">€{item.meta.total_spent.toFixed(2)}</p>
                      {item.imageUrl && <i className="fa-solid fa-image text-[10px] text-indigo-400"></i>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-slate-900">Assistente IA Coach</h2>
            <ChatAssistant history={state.history} userProfile={state.userProfile} chatLog={state.chatHistory} onNewMessage={handleNewChatMessage} />
          </div>
        )}

        {activeTab === 'reports' && <ReportsView history={state.history} />}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-slate-900">Configurações</h2>
            <ProfileForm 
              profile={state.userProfile} 
              onUpdate={handleProfileUpdate} 
              onImportData={handleImportData}
              fullHistory={state.history}
              isCloudEnabled={state.isCloudEnabled}
              onToggleCloud={toggleCloud}
            />
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 py-2 px-2 flex justify-around items-center z-50 shadow-lg">
        <NavBtnMobile icon="fa-house" label="Início" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <NavBtnMobile icon="fa-clock" label="Histórico" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        <NavBtnMobile icon="fa-robot" label="Coach" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
        <NavBtnMobile icon="fa-chart-pie" label="Relatórios" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        <NavBtnMobile icon="fa-user" label="Ajustes" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
};

const NavBtnMobile = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 w-full py-1 ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
    <i className={`fa-solid ${icon} text-lg`}></i>
    <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
  </button>
);

export default App;