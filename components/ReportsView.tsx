import React, { useState, useMemo } from 'react';
import { ReceiptData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ReportsViewProps {
  history: ReceiptData[];
}

const MONTHS = [
  { val: '01', label: 'Janeiro' }, { val: '02', label: 'Fevereiro' }, { val: '03', label: 'Março' },
  { val: '04', label: 'Abril' }, { val: '05', label: 'Maio' }, { val: '06', label: 'Junho' },
  { val: '07', label: 'Julho' }, { val: '08', label: 'Agosto' }, { val: '09', label: 'Setembro' },
  { val: '10', label: 'Outubro' }, { val: '11', label: 'Novembro' }, { val: '12', label: 'Dezembro' }
];

const ReportsView: React.FC<ReportsViewProps> = ({ history }) => {
  // Filter States
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const currentYear = new Date().getFullYear().toString();
  
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterStore, setFilterStore] = useState('ALL');

  const yearsAvailable = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    history.forEach(h => {
      const year = h.meta.date.split('-')[0];
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [history]);

  const storesAvailable = useMemo(() => {
    const stores = new Set<string>();
    history.forEach(h => {
      if (h.meta.store) stores.add(h.meta.store);
    });
    return Array.from(stores).sort();
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const [year, month] = item.meta.date.split('-');
      const monthMatch = year === filterYear && month === filterMonth;
      const storeMatch = filterStore === 'ALL' || item.meta.store === filterStore;
      return monthMatch && storeMatch;
    });
  }, [history, filterMonth, filterYear, filterStore]);

  // 1. Spending over time (Based on filtered period)
  const trendData = useMemo(() => {
    return [...filteredHistory].reverse().map(h => ({
      name: new Date(h.meta.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
      spent: h.meta.total_spent
    })).slice(-10); 
  }, [filteredHistory]);

  // 2. Category totals (Filtered period)
  const categoryData = useMemo(() => {
    const catTotals = filteredHistory.reduce((acc, receipt) => {
      receipt.items.forEach(item => {
        acc[item.category] = (acc[item.category] || 0) + item.total_price;
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(catTotals)
      // Fix: Cast 'value' as number to ensure correct type inference for downstream sorting
      .map(([name, value]) => ({ name, value: value as number }))
      // Fix: Removing explicit type annotations in sort parameters to rely on correctly inferred types from the map result
      .sort((a, b) => b.value - a.value);
  }, [filteredHistory]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Relatórios de Inteligência</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Visão Analítica Mensal</p>
        </div>

        {/* Filters UI */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
           <div className="relative">
             <select 
               value={filterStore}
               onChange={(e) => setFilterStore(e.target.value)}
               className="appearance-none bg-slate-50 border border-slate-100 pl-3 pr-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all cursor-pointer min-w-[100px]"
             >
               <option value="ALL">Lojas (Todas)</option>
               {storesAvailable.map(s => <option key={s} value={s}>{s}</option>)}
             </select>
             <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-slate-400 pointer-events-none"></i>
           </div>

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
        <div className="bg-white p-24 text-center rounded-[3rem] border border-slate-200 shadow-sm border-dashed">
          <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-chart-line text-3xl"></i>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Sem dados analíticos para este período</p>
          <p className="text-slate-300 text-xs font-medium">Experimenta mudar o filtro de mês, ano ou supermercado.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending Trend */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Tendência de Gastos</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} />
                    <YAxis fontSize={9} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px'}}
                    />
                    <Bar dataKey="spent" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Global Category Breakdown */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Gastos por Categoria</h3>
              <div className="space-y-5 px-2">
                {categoryData.slice(0, 6).map((cat, idx) => {
                  const max = categoryData[0]?.value || 1;
                  const percentage = (cat.value / max) * 100;
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                        <span className="text-slate-700">{cat.name}</span>
                        <span className="text-indigo-600 font-black">€{cat.value.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Shopping Habits Summary */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Hábitos de Consumo do Período</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-xl">
                  <i className="fa-solid fa-basket-shopping"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Média por Fatura</p>
                  <p className="text-xl font-black text-slate-900">€{(filteredHistory.reduce((acc: number, curr) => acc + curr.meta.total_spent, 0) / (filteredHistory.length || 1)).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl">
                  <i className="fa-solid fa-piggy-bank"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Poupado</p>
                  <p className="text-xl font-black text-emerald-600">€{filteredHistory.reduce((acc: number, curr) => acc + curr.meta.total_saved, 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl">
                  <i className="fa-solid fa-receipt"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Registos</p>
                  <p className="text-xl font-black text-indigo-600">{filteredHistory.length} Talões</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsView;