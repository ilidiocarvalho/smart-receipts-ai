
import React from 'react';
import { ReceiptData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ReportsViewProps {
  history: ReceiptData[];
}

const ReportsView: React.FC<ReportsViewProps> = ({ history }) => {
  // 1. Spending over time (Last 7 entries)
  const trendData = [...history].reverse().map(h => ({
    name: new Date(h.meta.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
    spent: h.meta.total_spent
  })).slice(-7);

  // 2. Category totals across ALL history
  const catTotals = history.reduce((acc, receipt) => {
    receipt.items.forEach(item => {
      acc[item.category] = (acc[item.category] || 0) + item.total_price;
    });
    return acc;
  }, {} as Record<string, number>);

  // Explicitly type categoryData to ensure TypeScript recognizes value as a number for arithmetic operations and toFixed()
  const categoryData: { name: string; value: number }[] = Object.entries(catTotals)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-slate-900">Intelligence Reports</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Recent Spending Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="spent" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Category Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Cumulative Spend by Category</h3>
          <div className="space-y-4">
            {categoryData.map((cat, idx) => {
              const max = categoryData[0]?.value || 1;
              const percentage = (cat.value / max) * 100;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700">{cat.name}</span>
                    <span className="text-slate-900">€{cat.value.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-indigo-500" 
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
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Shopping Habits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-basket-shopping"></i>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Avg per Trip</p>
              <p className="text-lg font-bold">€{(history.reduce((a,b) => a + b.meta.total_spent, 0) / (history.length || 1)).toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-piggy-bank"></i>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Saved</p>
              <p className="text-lg font-bold">€{history.reduce((a,b) => a + b.meta.total_saved, 0).toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-calendar-check"></i>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Scan Frequency</p>
              <p className="text-lg font-bold">~{history.length} per month</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
