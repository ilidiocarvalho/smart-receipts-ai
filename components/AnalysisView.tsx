
import React from 'react';
import { ReceiptData } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AnalysisViewProps {
  data: ReceiptData;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];

const AnalysisView: React.FC<AnalysisViewProps> = ({ data }) => {
  const categoryDataMap = data.items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.total_price;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(categoryDataMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* Coach Intro */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Personal Coach</span>
          </div>
          <p className="text-lg font-medium leading-relaxed italic">
            "{data.coach_message}"
          </p>
        </div>
        <div className="absolute top-[-20px] right-[-20px] opacity-10">
          <i className="fa-solid fa-quote-right text-[120px]"></i>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium mb-1">Total Spent</p>
          <p className="text-2xl font-bold text-slate-900">€{data.meta.total_spent.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1">{data.meta.store} • {data.meta.date}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium mb-1">Total Saved</p>
          <p className="text-2xl font-bold text-emerald-600">€{data.meta.total_saved.toFixed(2)}</p>
          <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
            <i className="fa-solid fa-tag"></i> Loyalty & Discounts
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium mb-1">Budget Impact</p>
          <p className="text-2xl font-bold text-indigo-600">{data.analysis.budget_impact_percentage.toFixed(1)}%</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, data.analysis.budget_impact_percentage)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Insights & Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-wand-sparkles text-amber-500"></i>
            Smart Insights
          </h3>
          <ul className="space-y-3">
            {data.analysis.insights.map((insight, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-slate-600 items-start">
                <i className="fa-solid fa-check text-emerald-500 mt-0.5"></i>
                {insight}
              </li>
            ))}
          </ul>
          
          {data.analysis.flagged_items.length > 0 && (
            <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-lg">
              <h4 className="text-sm font-bold text-rose-700 mb-2 flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation"></i>
                Goal/Dietary Conflicts
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.analysis.flagged_items.map((item, idx) => (
                  <span key={idx} className="bg-white px-2 py-1 rounded text-xs font-medium text-rose-600 border border-rose-100 uppercase">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-chart-pie text-indigo-500"></i>
            Spend by Category
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {chartData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                <span className="truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Extracted Items</h3>
          <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
            {data.items.length} items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-xs font-semibold border-b border-slate-50 uppercase tracking-tighter">
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-center">Qty</th>
                <th className="px-6 py-4 text-right">Price</th>
                <th className="px-6 py-4">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800 text-sm leading-tight">{item.name_clean}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.name_raw}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-slate-500">
                    {item.qty}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-bold text-slate-900">€{item.total_price.toFixed(2)}</p>
                    {item.is_discounted && <p className="text-[10px] text-emerald-500 font-medium">Applied Disc.</p>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag, tIdx) => (
                        <span key={tIdx} className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          tag === 'healthy' ? 'bg-emerald-50 text-emerald-600' : 
                          tag === 'processed' ? 'bg-orange-50 text-orange-600' : 
                          tag === 'impulse' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'
                        }`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;
