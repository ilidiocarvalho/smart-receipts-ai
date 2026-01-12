
import React from 'react';
import { UserContext, ReceiptData } from '../types';
import BudgetForecast from './BudgetForecast';
import ReceiptUploader from './ReceiptUploader';
import AnalysisView from './AnalysisView';

interface DashboardProps {
  userProfile: UserContext;
  history: ReceiptData[];
  lastAnalysis: ReceiptData | null;
  isLoading: boolean;
  isSyncing: boolean;
  isCloudActive: boolean;
  error: string | null;
  onUpload: (files: { data: string, type: string }[]) => void;
  onManualEntry: () => void;
  processingStep?: 'idle' | 'compressing' | 'analyzing' | 'finalizing';
  currentProcessIndex?: number;
  totalInBatch?: number;
  onNavigateToSettings: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  userProfile, 
  history, 
  lastAnalysis, 
  isLoading, 
  isSyncing,
  isCloudActive,
  error,
  onUpload,
  onManualEntry,
  processingStep,
  currentProcessIndex,
  totalInBatch,
  onNavigateToSettings
}) => {
  const isOwner = userProfile.role === 'owner';

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
      <header className="flex flex-col space-y-1 mb-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis">
            Olá, {userProfile.user_name}! 👋
          </h2>
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
               <i className={`fa-solid ${isCloudActive ? 'fa-cloud' : 'fa-hard-drive'} text-indigo-500`}></i> 
               {isCloudActive ? 'Armazenamento Cloud Firestore' : 'Armazenamento Local (Offline)'}
            </span>
          </div>
          
          {isOwner && (
            <span className="bg-indigo-950 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1.5 border border-indigo-800">
              <i className="fa-solid fa-crown text-amber-400"></i> Owner
            </span>
          )}
        </div>
      </header>
      
      <BudgetForecast profile={userProfile} history={history} />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <ReceiptUploader 
            onUpload={onUpload} 
            isLoading={isLoading} 
            processingStep={processingStep}
            currentProcessIndex={currentProcessIndex}
            totalInBatch={totalInBatch}
          />
        </div>
        <button 
          onClick={onManualEntry}
          disabled={isLoading}
          className="bg-white border-2 border-slate-100 text-slate-900 p-8 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-indigo-600 hover:bg-indigo-50/30 transition-all shadow-sm group active:scale-95 disabled:opacity-50"
        >
          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
            <i className="fa-solid fa-keyboard text-xl"></i>
          </div>
          <p className="font-black text-xs uppercase tracking-widest text-center">Entrada Manual</p>
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
      
      {!isLoading && lastAnalysis && <AnalysisView data={lastAnalysis} />}
    </div>
  );
};

export default Dashboard;
