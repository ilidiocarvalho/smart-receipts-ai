
import React, { useState, useMemo } from 'react';
import { ReceiptData, ReceiptItem } from '../types';

interface ReceiptEditorProps {
  receipt: ReceiptData;
  onSave: (updated: ReceiptData) => void;
  onCancel: () => void;
  categories: string[];
  queueInfo?: string;
}

const ReceiptEditor: React.FC<ReceiptEditorProps> = ({ receipt, onSave, onCancel, categories, queueInfo }) => {
  const [draft, setDraft] = useState<ReceiptData>(receipt);

  const calculatedTotal = useMemo(() => {
    return draft.items.reduce((sum, item) => sum + item.total_price, 0);
  }, [draft.items]);

  const handleUpdateMeta = (field: keyof ReceiptData['meta'], value: any) => {
    setDraft(prev => ({
      ...prev,
      meta: { ...prev.meta, [field]: value }
    }));
  };

  const handleUpdateItem = (index: number, field: keyof ReceiptItem, value: any) => {
    const newItems = [...draft.items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'qty' || field === 'unit_price' || field === 'total_price') {
      if (field === 'total_price') {
        item.total_price = parseFloat(value) || 0;
      } else {
        item.total_price = (item.qty || 0) * (item.unit_price || 0);
      }
    }
    
    newItems[index] = item;
    setDraft(prev => ({ ...prev, items: newItems }));
  };

  const handleRemoveItem = (index: number) => {
    setDraft(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleAddItem = () => {
    const newItem: ReceiptItem = {
      name_raw: '',
      name_clean: 'Novo Item',
      category: categories[0] || 'Outros',
      qty: 1,
      unit_price: 0,
      total_price: 0,
      is_discounted: false,
      tags: []
    };
    setDraft(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const totalsMatch = Math.abs(calculatedTotal - draft.meta.total_spent) < 0.01;

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col animate-in slide-in-from-bottom-full duration-300">
      <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
        
        <div className="p-6 md:p-12 border-b border-slate-200 bg-white space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-[1rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                <i className="fa-solid fa-receipt text-xl"></i>
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Validar Compras</h2>
                {queueInfo && (
                  <p className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                    {queueInfo}
                  </p>
                )}
              </div>
            </div>
            <button 
              onClick={onCancel} 
              className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center"
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Estabelecimento</label>
              <input 
                type="text" 
                value={draft.meta.store}
                onChange={e => handleUpdateMeta('store', e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-600 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data</label>
              <input 
                type="date" 
                value={draft.meta.date}
                onChange={e => handleUpdateMeta('date', e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-600 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Hora</label>
              <input 
                type="time" 
                value={draft.meta.time}
                onChange={e => handleUpdateMeta('time', e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-600 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="p-6 md:p-12 space-y-6 flex-1">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Lista de Itens ({draft.items.length})</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {draft.items.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group relative overflow-hidden"
              >
                <div className="space-y-4 relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <label className="text-[9px] font-black uppercase text-indigo-400 tracking-widest ml-1 mb-1 block">Designação</label>
                      <input 
                        type="text" 
                        value={item.name_clean}
                        onChange={e => handleUpdateItem(idx, 'name_clean', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-xl font-bold text-slate-800 outline-none"
                      />
                    </div>
                    <button 
                      onClick={() => handleRemoveItem(idx)} 
                      className="mt-6 w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-inner"
                    >
                      <i className="fa-solid fa-trash-can text-sm"></i>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Categoria</label>
                      <select 
                        value={item.category}
                        onChange={e => handleUpdateItem(idx, 'category', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-indigo-100"
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Valor Linha (€)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={item.total_price}
                        onChange={e => handleUpdateItem(idx, 'total_price', e.target.value)}
                        className="w-full px-3 py-2 bg-indigo-50/50 border-2 border-indigo-100 rounded-xl text-right font-black text-indigo-900 outline-none focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                         <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Qtd</label>
                         <input 
                            type="number" 
                            step="0.01"
                            value={item.qty}
                            onChange={e => handleUpdateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1 bg-white border border-slate-100 rounded-lg text-xs font-bold text-slate-500 outline-none"
                         />
                      </div>
                      <div className="flex-1 text-right">
                         <label className="text-[8px] font-black uppercase text-slate-400 mr-1">Unit.</label>
                         <p className="text-[10px] font-bold text-slate-400 px-1 pt-1">€{item.unit_price.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-[-20px] left-[-20px] text-slate-50 opacity-10 select-none font-black text-6xl italic group-hover:scale-110 transition-transform">
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={handleAddItem}
            className="w-full py-10 bg-white border-4 border-dashed border-slate-200 rounded-[2.5rem] text-indigo-600 text-[11px] font-black uppercase tracking-[0.4em] hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-4 group shadow-sm hover:shadow-xl"
          >
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform">
               <i className="fa-solid fa-plus"></i>
            </div>
            Adicionar Novo Item
          </button>
        </div>
      </div>

      <div className="p-6 md:p-10 bg-slate-900 border-t border-white/10 text-white flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-8 w-full md:w-auto">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Total Validado</p>
            <p className="text-4xl font-black tracking-tight">€{calculatedTotal.toFixed(2)}</p>
          </div>
          
          {!totalsMatch && (
            <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-2xl flex items-center gap-3 animate-pulse">
               <i className="fa-solid fa-triangle-exclamation text-amber-500 text-xl"></i>
               <div className="text-[10px] font-black uppercase text-amber-400 leading-tight">
                 Dif. €{Math.abs(calculatedTotal - draft.meta.total_spent).toFixed(2)}
               </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={onCancel} 
            className="flex-1 md:flex-none px-8 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest text-slate-400 border border-white/10 hover:bg-white/5 transition-all active:scale-95"
          >
            Descartar
          </button>
          <button 
            onClick={() => onSave({ ...draft, meta: { ...draft.meta, total_spent: calculatedTotal } })} 
            className="flex-[2] md:flex-none px-12 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-[0_15px_30px_rgba(79,70,229,0.3)] hover:bg-indigo-500 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-4"
          >
            <i className="fa-solid fa-circle-check text-xl"></i> Finalizar Fatura
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptEditor;
