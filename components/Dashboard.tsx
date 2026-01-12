
import React from 'react';
import { UserContext, ReceiptData } from '../types';
import BudgetForecast from './BudgetForecast';

interface DashboardProps {
  userProfile: UserContext;
  history: ReceiptData[];
  lastAnalysis: ReceiptData | null;
  isLoading: boolean;
  isSyncing: boolean;
  isCloudActive: boolean;
  error: string | null;
  onUploadTrigger: () => void;
  onManualEntry: () => void;
  processingStep?: 'idle' | 'compressing' | 'analyzing' | 'finalizing';
  currentProcessIndex?: number;
  totalInBatch?: number;
  onNavigateToSettings: () => void;
  shoppingListCount: number;
  onNavigateToList: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  userProfile, 
  history, 
  isLoading, 
  error,
  onUploadTrigger,
  onManualEntry,
  processingStep,
  currentProcessIndex,
  totalInBatch,
  onNavigateToSettings,
  shoppingListCount,
  onNavigateToList
}) => {
  if (!userProfile.user_name) {
    return (
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200/50 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
        <div className="z-10 text-center md:text-left space-y-3">
          <h3 className="text-3xl font-black tracking-tight">Configura o teu Perfil 🎯</h3>
          <p className="text-indigo-100 font-medium max-w-sm text-lg opacity-90 leading-relaxed">Diz-nos os teus objetivos para que a IA possa analisar as tuas faturas com precisão.</p>
        </div>
        <button onClick={onNavigateToSettings} className="z-10 bg-white text-indigo-700 px-10 py-5 rounded-[1.5rem] font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all duration-300">Começar Agora</button>
        <i className="fa-solid fa-rocket absolute right-[-20px] bottom-[-20px] text-[180px] opacity-10 -rotate-12 group-hover:rotate-0 transition-transform duration-1000"></i>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col space-y-2 mb-6">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter truncate">
          Olá, {userProfile.user_name}! 👋
        </h2>
      </header>
      
      <BudgetForecast profile={userProfile} history={history} />

      {/* Shopping List Widget */}
      <button 
        onClick={onNavigateToList}
        className="w-full bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between hover:border-indigo-300 transition-all active:scale-[0.99] group"
      >
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
             <i className="fa-solid fa-list-check"></i>
           </div>
           <div className="text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A tua Lista</p>
              <p className="text-sm font-black text-slate-900">{shoppingListCount > 0 ? `${shoppingListCount} itens por comprar` : 'Lista completa!'}</p>
           </div>
        </div>
        <i className="fa-solid fa-chevron-right text-slate-300 group-hover:text-indigo-600 transition-colors"></i>
      </button>
      
      {/* Action Buttons Row */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={onUploadTrigger}
          disabled={isLoading}
          className={`group relative overflow-hidden bg-indigo-600 text-white py-6 px-4 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-100 disabled:bg-indigo-900 disabled:cursor-not-allowed active:scale-[0.98] h-32`}
        >
          {isLoading ? (
            <>
              <div className="relative">
                <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black">
                  {currentProcessIndex}/{totalInBatch}
                </div>
              </div>
              <div className="text-center">
                <p className="font-black text-xs tracking-tight">IA Lendo...</p>
                <p className="text-indigo-300 text-[8px] font-bold uppercase tracking-widest">{processingStep}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-camera text-xl"></i>
              </div>
              <div className="text-center">
                <p className="font-black text-sm tracking-tight">Nova Despesa</p>
                <p className="text-indigo-100 text-[9px] font-medium opacity-80">Digitalizar Talão</p>
              </div>
            </>
          )}
        </button>
        
        <button 
          onClick={onManualEntry}
          disabled={isLoading}
          className="bg-white border-2 border-slate-100 text-slate-900 py-6 px-4 rounded-3xl flex flex-col items-center justify-center gap-2 hover:border-indigo-600 hover:bg-indigo-50/30 transition-all shadow-sm group active:scale-95 disabled:opacity-50 h-32"
        >
          <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
            <i className="fa-solid fa-keyboard text-xl"></i>
          </div>
          <div className="text-center">
            <p className="font-black text-sm tracking-tight">Manual</p>
            <p className="text-slate-400 text-[9px] font-medium opacity-80">Inserir Dados</p>
          </div>
        </button>
      </div>
      
      {error && (
        <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl text-rose-700 text-xs font-black animate-shake flex items-center gap-3">
          <i className="fa-solid fa-circle-exclamation text-lg"></i>
          <div>
            <p className="uppercase tracking-widest mb-1">Erro de Processamento</p>
            <p className="opacity-80 font-bold">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
