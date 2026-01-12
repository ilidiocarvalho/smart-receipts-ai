
import React, { useState, useMemo } from 'react';
import { ReceiptData } from '../types';
import AnalysisView from './AnalysisView';

interface HistoryViewProps {
  history: ReceiptData[];
  isCloudActive: boolean;
  onSelectReceipt: (receipt: ReceiptData) => void;
  onEditReceipt: (receipt: ReceiptData) => void;
}

const MONTHS = [
  { val: '01', label: 'Janeiro' }, { val: '02', label: 'Fevereiro' }, { val: '03', label: 'Março' },
  { val: '04', label: 'Abril' }, { val: '05', label: 'Maio' }, { val: '06', label: 'Junho' },
  { val: '07', label: 'Julho' }, { val: '08', label: 'Agosto' }, { val: '09', label: 'Setembro' },
  { val: '10', label: 'Outubro' }, { val: '11', label: 'Novembro' }, { val: '12', label: 'Dezembro' }
];

const HistoryView: React.FC<HistoryViewProps> = ({ history, isCloudActive, onSelectReceipt, onEditReceipt }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Filter States
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const currentYear = new Date().getFullYear().toString();
  
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterYear, setFilterYear] = useState(currentYear);

  const toggleExpand = (item: ReceiptData) => {
    if (expandedId === item.id) {
      setExpandedId(null);
    } else {
      setExpandedId(item.id);
      onSelectReceipt(item);
    }
  };

  const yearsAvailable = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    history.forEach(h => {
      const year = h.meta.date.split('-')[0];
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const [year, month] = item.meta.date.split('-');
      return year === filterYear && month === filterMonth;
    });
  }, [history, filterMonth, filterYear]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">O Teu Histórico</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            {isCloudActive ? 'Cofre Sincronizado' : 'Cofre Local'}
          </p>
        </div>

        {/* Filters UI */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
           <div className="relative">
             <select 
               value={filterMonth}
               onChange={(e) => setFilterMonth(e.target.value)}
               className="appearance-none bg-slate-50 border border-slate-100 pl-3 pr-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all cursor-pointer"
             >
               {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
             </select>
             <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-slate-400 pointer-events-none"></i>
           </div>

           <div className="relative">
             <select 
               value={filterYear}
               onChange={(e) => setFilterYear(e.target.value)}
               className="appearance-none bg-slate-50 border border-slate-100 pl-3 pr-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all cursor-pointer"
             >
               {yearsAvailable.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
             <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-slate-400 pointer-events-none"></i>
           </div>
        </div>
      </div>
      
      {filteredHistory.length === 0 ? (
        <div className="bg-white p-16 text-center rounded-[3rem] border border-slate-200 shadow-sm border-dashed">
          <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-calendar-day text-3xl"></i>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Sem faturas neste período</p>
          <p className="text-slate-300 text-xs font-medium">Experimenta mudar o filtro de mês ou ano.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredHistory.map((item) => (
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
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       {item.meta.time} • {new Date(item.meta.date).toLocaleDateString()}
                     </p>
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
