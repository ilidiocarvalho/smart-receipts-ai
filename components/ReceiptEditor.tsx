
import React, { useState, useMemo } from 'react';
import { ReceiptData, ReceiptItem } from '../types';

interface ReceiptEditorProps {
  receipt: ReceiptData;
  onSave: (updated: ReceiptData) => void;
  onCancel: () => void;
  queueInfo?: string;
}

const CATEGORIES = [
  'Dairy', 'Produce', 'Bakery', 'Butcher', 'Pantry', 'Frozen', 
  'Snacks', 'Beverages', 'Household', 'Personal Care', 'Pets', 'Other'
];

const ReceiptEditor: React.FC<ReceiptEditorProps> = ({ receipt, onSave, onCancel, queueInfo }) => {
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
    
    // Auto calculate total if qty or unit_price changes
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
      category: 'Other',
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
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex flex-col md:items-center md:justify-center">
      <div className="bg-white w-full h-full md:h-auto md:max-w-4xl md:max-h-[90vh] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full md:zoom-in duration-300">
        
        {/* Header Section */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col gap-6 bg-slate-50/50 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <i className="fa-solid fa-pen-to-square"></i>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Validar Compras</h2>
              {queueInfo && (
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-200">
                  {queueInfo}
                </span>
              )}
            </div>
            <button onClick={onCancel} className="md:hidden text-slate-400 hover:text-slate-600 p-2">
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Estabelecimento</label>
              <input 
                type="text" 
                value={draft.meta.store}
                onChange={e => handleUpdateMeta('store', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Data da Fatura</label>
              <input 
                type="date" 
                value={draft.meta.date}
                onChange={e => handleUpdateMeta('date', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Hora</label>
              <input 
                type="time" 
                value={draft.meta.time}
                onChange={e => handleUpdateMeta('time', e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Items List (Mobile Optimized) */}
        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-6 space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Itens Detectados ({draft.items.length})</p>
          
          <div className="space-y-4">
            {draft.items.map((item, idx) => (
              <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 animate-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-black uppercase text-indigo-400 ml-0.5">Nome do Produto</label>
                    <input 
                      type="text" 
                      value={item.name_clean}
                      onChange={e => handleUpdateItem(idx, 'name_clean', e.target.value)}
                      className="w-full bg-slate-50 border-transparent border-b-slate-100 border-2 focus:bg-white focus:border-indigo-200 px-2 py-1.5 rounded-xl font-bold text-slate-800 outline-none"
                    />
                    {item.name_raw && <p className="text-[8px] text-slate-400 font-mono px-2 truncate">Original: {item.name_raw}</p>}
                  </div>
                  <button onClick={() => handleRemoveItem(idx)} className="mt-6 w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shrink-0">
                    <i className="fa-solid fa-trash text-[10px]"></i>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-0.5">Categoria</label>
                    <select 
                      value={item.category}
                      onChange={e => handleUpdateItem(idx, 'category', e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-600 outline-none focus:border-indigo-200"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-0.5">Total Linha (€)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={item.total_price}
                      onChange={e => handleUpdateItem(idx, 'total_price', e.target.value)}
                      className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-2 py-1.5 text-right font-black text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-0.5">Qtd</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={item.qty}
                      onChange={e => handleUpdateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border-2 border-slate-100 rounded-xl px-2 py-1.5 text-center font-bold text-slate-500 outline-none focus:border-indigo-200"
                    />
                  </div>
                  <div className="space-y-1 text-right">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-0.5">Preço Unitário</label>
                    <div className="text-xs font-bold text-slate-400 py-1.5">€{item.unit_price.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button 
            onClick={handleAddItem}
            className="w-full py-6 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center justify-center gap-3"
          >
            <i className="fa-solid fa-plus text-sm"></i> Novo Item
          </button>
        </div>

        {/* Desktop Controls (Floating on Mobile) */}
        <div className="p-6 md:p-8 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-6 sticky bottom-0 z-20">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Validado</p>
              <p className="text-3xl font-black">€{calculatedTotal.toFixed(2)}</p>
            </div>
            {!totalsMatch && (
              <div className="flex-1 bg-amber-400 text-slate-900 px-4 py-2.5 rounded-2xl flex items-center gap-2 animate-pulse shadow-lg shadow-amber-400/20">
                <i className="fa-solid fa-triangle-exclamation text-lg"></i>
                <p className="text-[9px] font-black uppercase leading-tight">Dif. de €{Math.abs(calculatedTotal - draft.meta.total_spent).toFixed(2)}<br/>face ao talão original</p>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
             <button onClick={onCancel} className="flex-1 md:flex-none px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 border border-white/10 hover:bg-white/5 transition-all">Cancelar</button>
             <button 
                onClick={() => onSave({ ...draft, meta: { ...draft.meta, total_spent: calculatedTotal } })} 
                className="flex-[2] md:flex-none px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
             >
                <i className="fa-solid fa-check-double text-lg"></i> Confirmar Tudo
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptEditor;
