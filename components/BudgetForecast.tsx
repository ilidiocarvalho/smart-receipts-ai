
import React from 'react';
import { UserContext, ReceiptData } from '../types';

interface BudgetForecastProps {
  profile: UserContext;
  history: ReceiptData[];
}

const BudgetForecast: React.FC<BudgetForecastProps> = ({ profile, history }) => {
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Calcular despesa real deste mês baseada apenas no histórico
  const historySpendThisMonth = history.reduce((acc, receipt) => {
    const rDate = new Date(receipt.meta.date);
    if (rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear) {
      return acc + receipt.meta.total_spent;
    }
    return acc;
  }, 0);

  // O total gasto é a soma do saldo inicial manual (que agora é zero por defeito) + histórico
  const totalSpentSoFar = profile.current_month_spend + historySpendThisMonth;
  
  // Se não houver gastos, não mostramos projeções
  const hasData = totalSpentSoFar > 0;

  // Projeção Linear: (Gasto / Dias Passados) * Total de Dias do Mês
  const dailyAverage = hasData ? totalSpentSoFar / currentDay : 0;
  const projectedSpend = hasData ? dailyAverage * daysInMonth : 0;
  
  const isOverBudget = hasData && projectedSpend > profile.monthly_budget;
  const budgetUtilization = (totalSpentSoFar / profile.monthly_budget) * 100;
  const projectedUtilization = (projectedSpend / profile.monthly_budget) * 100;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <i className="fa-solid fa-chart-line text-indigo-500"></i>
            Budget Forecast
          </h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
            Dia {currentDay} de {daysInMonth}
          </span>
        </div>

        {!hasData ? (
          <div className="py-8 px-4 text-center border-2 border-dashed border-slate-100 rounded-2xl">
            <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="fa-solid fa-wallet text-xl"></i>
            </div>
            <p className="text-slate-500 font-medium text-sm">Sem despesas registadas este mês.</p>
            <p className="text-slate-400 text-xs mt-1">Digitalize o seu primeiro talão para ativar a projeção inteligente.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Barra de Progresso */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                <span className="text-slate-500">Gasto Atual (€{totalSpentSoFar.toFixed(2)})</span>
                <span className="text-slate-900">Orçamento (€{profile.monthly_budget.toFixed(2)})</span>
              </div>
              <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
                {/* Gasto Real */}
                <div 
                  className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-500" 
                  style={{ width: `${Math.min(100, budgetUtilization)}%` }}
                ></div>
                {/* Sobreposição de Projeção (Mais Clara) */}
                {projectedSpend > totalSpentSoFar && (
                  <div 
                    className={`absolute top-0 left-0 h-full opacity-30 transition-all duration-500 ${isOverBudget ? 'bg-rose-500' : 'bg-indigo-300'}`}
                    style={{ width: `${Math.min(100, projectedUtilization)}%` }}
                  ></div>
                )}
              </div>
            </div>

            {/* Grelha de Estatísticas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Média Diária</p>
                <p className="text-xl font-bold text-slate-900">€{dailyAverage.toFixed(2)}</p>
              </div>
              <div className={`p-4 rounded-xl border ${isOverBudget ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <p className={`text-[10px] font-bold uppercase mb-1 ${isOverBudget ? 'text-rose-500' : 'text-emerald-500'}`}>Total Projetado</p>
                <p className={`text-xl font-bold ${isOverBudget ? 'text-rose-700' : 'text-emerald-700'}`}>€{projectedSpend.toFixed(2)}</p>
              </div>
            </div>

            {/* Mensagem de Alerta */}
            {isOverBudget ? (
              <div className="flex gap-3 items-start p-4 bg-rose-100/50 border border-rose-200 rounded-xl text-rose-800">
                <i className="fa-solid fa-triangle-exclamation text-rose-500 mt-1"></i>
                <div className="text-sm">
                  <p className="font-bold">Aviso de Orçamento</p>
                  <p className="opacity-90">Ao ritmo atual, ultrapassará o orçamento em <span className="font-bold">€{(projectedSpend - profile.monthly_budget).toFixed(2)}</span>. Considere reduzir compras de "Impulso".</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 items-start p-4 bg-emerald-100/50 border border-emerald-200 rounded-xl text-emerald-800">
                <i className="fa-solid fa-circle-check text-emerald-500 mt-1"></i>
                <div className="text-sm">
                  <p className="font-bold">No Caminho Certo</p>
                  <p className="opacity-90">Excelente! Está projetado para terminar o mês <span className="font-bold">€{(profile.monthly_budget - projectedSpend).toFixed(2)}</span> abaixo do orçamento.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetForecast;