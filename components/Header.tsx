
import React from 'react';
import { ViewTab } from '../types';

interface HeaderProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  isSyncing?: boolean;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, isSyncing = false }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Branding */}
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => onTabChange('dashboard')}
        >
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
            <i className="fa-solid fa-receipt text-sm"></i>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-slate-900 leading-none">SmartReceipts</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">AI Engine</p>
          </div>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <NavBtn label="Home" icon="fa-house" active={activeTab === 'dashboard'} onClick={() => onTabChange('dashboard')} />
          <NavBtn label="History" icon="fa-clock" active={activeTab === 'history'} onClick={() => onTabChange('history')} />
          <NavBtn label="AI Chat" icon="fa-robot" active={activeTab === 'chat'} onClick={() => onTabChange('chat')} />
          <NavBtn label="Reports" icon="fa-chart-pie" active={activeTab === 'reports'} onClick={() => onTabChange('reports')} />
        </nav>

        {/* Sync & User Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter hidden xs:block">
              {isSyncing ? 'Syncing...' : 'Encrypted & Local'}
            </span>
          </div>
          <div 
            onClick={() => onTabChange('settings')}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer hover:scale-110 ${activeTab === 'settings' ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-4 ring-indigo-50' : 'bg-slate-900 text-white border-slate-700 shadow-sm'}`}
            title="User Profile"
          >
            <i className="fa-solid fa-user text-xs"></i>
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