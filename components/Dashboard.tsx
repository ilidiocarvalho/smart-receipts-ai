
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
  onUpload: (base64: string) => void;
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
  onNavigateToSettings
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
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Olá, {userProfile.user_name}! 👋</h2>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
               <i className={`fa-solid ${isCloudActive ? 'fa-cloud' : 'fa-hard-drive'} text-indigo-500`}></i> 
               {isCloudActive ? 'Armazenamento Cloud Firestore' : 'Armazenamento Local (Offline)'}
            </span>
          </div>
        </div>
        <div className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-3 transition-all duration-500 ${isSyncing ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-emerald-600 border-slate-200'}`}>
           <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></div>
           {isSyncing ? 'A Sincronizar...' : isCloudActive ? 'Cloud Online' : 'Local Guardado'}
        </div>
      </header>
      
      <BudgetForecast profile={userProfile} history={history} />
      <ReceiptUploader onUpload={onUpload} isLoading={isLoading} />
      
      {error && <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl text-rose-700 text-xs font-black animate-shake">{error}</div>}
      {lastAnalysis && <AnalysisView data={lastAnalysis} />}
    </div>
  );
};

export default Dashboard;
