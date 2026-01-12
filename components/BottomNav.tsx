
import React from 'react';
import { ViewTab } from '../types';

interface BottomNavProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="md:hidden fixed bottom-6 inset-x-6 bg-slate-900/95 backdrop-blur-2xl py-4 flex justify-around items-center z-50 px-6 rounded-[2.5rem] shadow-2xl border border-white/10">
      <NavBtnMobile icon="fa-house" label="Home" active={activeTab === 'dashboard'} onClick={() => onTabChange('dashboard')} />
      <NavBtnMobile icon="fa-clock" label="History" active={activeTab === 'history'} onClick={() => onTabChange('history')} />
      <NavBtnMobile icon="fa-robot" label="Coach" active={activeTab === 'chat'} onClick={() => onTabChange('chat')} />
      <NavBtnMobile icon="fa-chart-pie" label="Stats" active={activeTab === 'reports'} onClick={() => onTabChange('reports')} />
    </nav>
  );
};

const NavBtnMobile = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center gap-1 w-full py-1.5 transition-all rounded-2xl ${active ? 'text-indigo-400 bg-white/5 shadow-inner' : 'text-slate-500'}`}
  >
    <i className={`fa-solid ${icon} ${active ? 'text-lg' : 'text-base'}`}></i>
    <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default BottomNav;
