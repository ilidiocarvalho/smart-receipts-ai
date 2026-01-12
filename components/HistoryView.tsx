
import React, { useState } from 'react';
import { ReceiptData } from '../types';
import AnalysisView from './AnalysisView';

interface HistoryViewProps {
  history: ReceiptData[];
  isCloudActive: boolean;
  onSelectReceipt: (receipt: ReceiptData) => void;
  onEditReceipt: (receipt: ReceiptData) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, isCloudActive, onSelectReceipt, onEditReceipt }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (item: ReceiptData) => {
    if (expandedId === item.id) {
      setExpandedId(null);
    } else {
      setExpandedId(item.id);
      onSelectReceipt(item);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <h2 className="text-3xl font-black text-slate-900 tracking-tight">O Teu Histórico {isCloudActive ? 'Global' : 'Local'}</h2>
      
      {history.length === 0 ? (
        <div className="bg-white p-24 text-center rounded-[3rem] border border-slate-200 shadow-sm border-dashed">
          <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
            <i className={`fa-solid ${isCloudActive ? 'fa-cloud-arrow-up' : 'fa-database'} text-4xl`}></i>
          </div>
          <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Sem faturas guardadas</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {history.map((item) => (
            <div key={item.id} className="space-y-4">
              <div 
                className={`bg-white p-6 rounded-[2rem] border transition-all cursor-pointer group relative overflow-hidden flex items-center justify-between ${
                  expandedId === item.id 
                    ? 'border-indigo-600 shadow-xl shadow-indigo-100/50' 
                    : 'border-slate-200 hover:border-indigo-300 hover:shadow-lg'
                }`} 
                onClick={() => toggleExpand(item)}
              >
                <div className="flex items-center gap-5 relative z-10">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg transition-all duration-500 shrink-0 ${
                    expandedId === item.id 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                  }`}>
                    {new Date(item.meta.date).getDate()}
                  </div>
                  <div className="truncate max-w-[140px] md:max-w-xs space-y-1">
                     <p className="font-black text-slate-900 truncate text-lg tracking-tight">{item.meta.store}</p>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.meta.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 relative z-10">
                   <div className="text-right hidden sm:block">
                      <p className="font-black text-indigo-600 text-xl">€{item.meta.total_spent.toFixed(2)}</p>
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Saved €{item.meta.total_saved.toFixed(2)}</p>
                   </div>
                   
                   <div className="flex flex-col items-center gap-2">
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         onEditReceipt(item);
                       }}
                       className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                       title="Editar este registo"
                     >
                       <i className="fa-solid fa-pencil text-[10px]"></i>
                     </button>
                     <i className={`fa-solid fa-chevron-down text-[10px] text-slate-300 transition-transform duration-300 ${expandedId === item.id ? 'rotate-180 text-indigo-500' : ''}`}></i>
                   </div>
                </div>

                {/* Mobile Price Overlay */}
                <div className="sm:hidden absolute bottom-3 right-6 text-right">
                   <p className="font-black text-indigo-600 text-sm">€{item.meta.total_spent.toFixed(2)}</p>
                </div>
              </div>

              {/* Expanded Content Area */}
              {expandedId === item.id && (
                <div className="bg-white rounded-[2.5rem] border border-indigo-100 p-6 md:p-8 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                  <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Relatório Detalhado de IA</h3>
                    <button 
                      onClick={() => setExpandedId(null)}
                      className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline"
                    >
                      Fechar Detalhes
                    </button>
                  </div>
                  <AnalysisView data={item} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
