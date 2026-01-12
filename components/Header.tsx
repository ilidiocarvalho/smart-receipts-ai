
import React from 'react';
import { ViewTab, UserRole } from '../types';

interface HeaderProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  isSyncing?: boolean;
  isAdmin?: boolean; 
  isCloudActive?: boolean;
  role?: UserRole;
}

const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  onTabChange, 
  isSyncing = false, 
  isAdmin = false,
  isCloudActive = false,
  role
}) => {
  const isOwner = role === 'owner';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => onTabChange('dashboard')}
        >
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
            <i className="fa-solid fa-receipt text-sm"></i>
          </div>
          <div className="block">
            <h1 className="text-lg font-bold text-slate-900 leading-none tracking-tight">SmartReceipts</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">AI Engine</p>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <NavBtn label="Home" icon="fa-house" active={activeTab === 'dashboard'} onClick={() => onTabChange('dashboard')} />
          <NavBtn label="Histórico" icon="fa-clock" active={activeTab === 'history'} onClick={() => onTabChange('history')} />
          <NavBtn label="Lista" icon="fa-list-check" active={activeTab === 'shopping-list'} onClick={() => onTabChange('shopping-list')} />
          <NavBtn label="Coach IA" icon="fa-robot" active={activeTab === 'chat'} onClick={() => onTabChange('chat')} />
          <NavBtn label="Relatórios" icon="fa-chart-pie" active={activeTab === 'reports'} onClick={() => onTabChange('reports')} />
          {isAdmin && (
            <NavBtn label="Admin" icon="fa-shield-halved" active={activeTab === 'admin'} onClick={() => onTabChange('admin')} />
          )}
        </nav>

        <div className="flex items-center gap-3">
          {isOwner && (
            <div className="flex items-center gap-1.5 bg-indigo-950 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border border-indigo-800 shadow-sm">
              <i className="fa-solid fa-crown text-amber-400"></i> Owner
            </div>
          )}
          
          <div className="relative">
            <button 
              onClick={() => onTabChange('settings')}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg ring-4 ring-indigo-50' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 shadow-sm'}`}
              title="Definições do Perfil"
            >
              <i className="fa-solid fa-sliders text-xs"></i>
            </button>
            <div 
              className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white transition-all duration-500 ${
                isSyncing 
                  ? 'bg-amber-400 animate-pulse' 
                  : isCloudActive ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            ></div>
          </div>
        </div>
      </div>
    </header>
  );
};

const NavBtn = ({ label, icon, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
      active ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600 hover:bg-white/50'
    }`}
  >
    <i className={`fa-solid ${icon}`}></i>
    {label}
  </button>
);

export default Header;
