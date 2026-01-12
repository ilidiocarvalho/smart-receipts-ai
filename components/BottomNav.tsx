
import React, { useState, useRef, useEffect } from 'react';
import { ViewTab } from '../types';

interface BottomNavProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onUploadClick: () => void;
  isAdmin?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, onUploadClick, isAdmin }) => {
  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(event.target as Node)) {
        setShowOverflow(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOverflowTab = (tab: ViewTab) => {
    onTabChange(tab);
    setShowOverflow(false);
  };

  return (
    <div className="md:hidden fixed bottom-6 inset-x-6 z-50">
      {/* Overflow Menu Overlay */}
      {showOverflow && (
        <div 
          ref={overflowRef}
          className="absolute bottom-full mb-4 right-0 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden min-w-[160px] animate-in slide-in-from-bottom-2 duration-200"
        >
          <button 
            onClick={() => handleOverflowTab('reports')}
            className={`w-full px-6 py-4 flex items-center gap-3 text-left transition-colors border-b border-white/5 ${activeTab === 'reports' ? 'text-indigo-400 bg-white/5' : 'text-slate-300 hover:bg-white/5'}`}
          >
            <i className="fa-solid fa-chart-pie w-5"></i>
            <span className="text-[10px] font-black uppercase tracking-widest">Relatórios</span>
          </button>
          {isAdmin && (
            <button 
              onClick={() => handleOverflowTab('admin')}
              className={`w-full px-6 py-4 flex items-center gap-3 text-left transition-colors ${activeTab === 'admin' ? 'text-indigo-400 bg-white/5' : 'text-slate-300 hover:bg-white/5'}`}
            >
              <i className="fa-solid fa-shield-halved w-5"></i>
              <span className="text-[10px] font-black uppercase tracking-widest">Admin</span>
            </button>
          )}
        </div>
      )}

      {/* Main Thinner Floating Bar */}
      <nav className="bg-slate-900/95 backdrop-blur-2xl py-2 flex justify-between items-center px-4 rounded-[2rem] shadow-2xl border border-white/10">
        <NavBtnMobile 
          icon="fa-house" 
          label="Home" 
          active={activeTab === 'dashboard'} 
          onClick={() => onTabChange('dashboard')} 
        />
        <NavBtnMobile 
          icon="fa-clock" 
          label="History" 
          active={activeTab === 'history'} 
          onClick={() => onTabChange('history')} 
        />
        
        {/* Central Quick Action: Upload */}
        <div className="px-2 -mt-8">
           <button 
             onClick={onUploadClick}
             className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 active:scale-90 transition-transform ring-4 ring-slate-900"
           >
             <i className="fa-solid fa-camera text-xl"></i>
           </button>
        </div>

        <NavBtnMobile 
          icon="fa-robot" 
          label="Coach" 
          active={activeTab === 'chat'} 
          onClick={() => onTabChange('chat')} 
        />
        
        {/* Overflow / More Button */}
        <button 
          onClick={() => setShowOverflow(!showOverflow)} 
          className={`flex flex-col items-center justify-center gap-1 w-full py-1.5 transition-all rounded-xl ${showOverflow || activeTab === 'reports' || activeTab === 'admin' ? 'text-indigo-400' : 'text-slate-500'}`}
        >
          <i className="fa-solid fa-ellipsis text-base"></i>
          <span className="text-[7px] font-black uppercase tracking-tighter">Mais</span>
        </button>
      </nav>
    </div>
  );
};

const NavBtnMobile = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center gap-1 w-full py-1.5 transition-all rounded-xl ${active ? 'text-indigo-400 bg-white/5 shadow-inner' : 'text-slate-500'}`}
  >
    <i className={`fa-solid ${icon} text-base`}></i>
    <span className="text-[7px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default BottomNav;
