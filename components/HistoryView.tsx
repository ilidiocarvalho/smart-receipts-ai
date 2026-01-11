
import React from 'react';
import { ReceiptData } from '../types';

interface HistoryViewProps {
  history: ReceiptData[];
  isCloudActive: boolean;
  onSelectReceipt: (receipt: ReceiptData) => void;
  onEditReceipt: (receipt: ReceiptData) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, isCloudActive, onSelectReceipt, onEditReceipt }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-black text-slate-900 tracking-tight">O Teu Histórico {isCloudActive ? 'Global' : 'Local'}</h2>
      {history.length === 0 ? (
        <div className="bg-white p-24 text-center rounded-[3rem] border border-slate-200 shadow-sm border-dashed">
          <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
            <i className={`fa-solid ${isCloudActive ? 'fa-cloud-arrow-up' : 'fa-database'} text-4xl`}></i>
          </div>
          <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Sem faturas guardadas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {history.map((item) => (
            <div 
              key={item.id} 
              className="bg-white p-7 rounded-[2rem] border border-slate-200 flex items-center justify-between hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all cursor-pointer group relative overflow-hidden" 
              onClick={() => onSelectReceipt(item)}
            >
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl flex items-center justify-center font-black text-lg transition-all duration-500 shrink-0">
                  {new Date(item.meta.date).getDate()}
                </div>
                <div className="truncate max-w-[140px] space-y-1">
                   <p className="font-black text-slate-900 truncate text-lg tracking-tight">{item.meta.store}</p>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.meta.date}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 relative z-10">
                 <div className="text-right">
                    <p className="font-black text-indigo-600 text-xl">€{item.meta.total_spent.toFixed(2)}</p>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Saved €{item.meta.total_saved.toFixed(2)}</p>
                 </div>
                 <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     onEditReceipt(item);
                   }}
                   className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                   title="Editar este registo"
                 >
                   <i className="fa-solid fa-pencil text-[10px]"></i>
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
