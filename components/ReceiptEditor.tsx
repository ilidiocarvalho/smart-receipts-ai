
import React, { useState, useMemo } from 'react';
import { ReceiptData, ReceiptItem } from '../types';

interface ReceiptEditorProps {
  receipt: ReceiptData;
  onSave: (updated: ReceiptData) => void;
  onCancel: () => void;
}

const CATEGORIES = [
  'Dairy', 'Produce', 'Bakery', 'Butcher', 'Pantry', 'Frozen', 
  'Snacks', 'Beverages', 'Household', 'Personal Care', 'Pets', 'Other'
];

const ReceiptEditor: React.FC<ReceiptEditorProps> = ({ receipt, onSave, onCancel }) => {
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
    if (field === 'qty' || field === 'unit_price') {
      item.total_price = (item.qty || 0) * (item.unit_price || 0);
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
        
        {/* Header Section */}
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-end justify-between gap-6 bg-slate-50/50">
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <i className="fa-solid fa-pen-to-square text-indigo-600"></i>
              Validar Dados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Supermercado</label>
                <input 
                  type="text" 
                  value={draft.meta.store}
                  onChange={e => handleUpdateMeta('store', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Data</label>
                <input 
                  type="date" 
                  value={draft.meta.date}
                  onChange={e => handleUpdateMeta('date', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Hora</label>
                <input 
                  type="time" 
                  value={draft.meta.time}
                  onChange={e => handleUpdateMeta('time', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">Cancelar</button>
            <button 
              onClick={() => onSave({ ...draft, meta: { ...draft.meta, total_spent: calculatedTotal } })} 
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              Guardar Talão
            </button>
          </div>
        </div>

        {/* Scrollable Content (Items) */}
        <div className="flex-1 overflow-y-auto p-0 md:p-8">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <tr>
                  <th className="px-6 py-4">Descrição do Produto</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4 w-20 text-center">Qtd</th>
                  <th className="px-6 py-4 w-32 text-right">Preço Un.</th>
                  <th className="px-6 py-4 w-32 text-right">Total</th>
                  <th className="px-6 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {draft.items.map((item, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50/50">
                    <td className="px-6 py-3">
                      <input 
                        type="text" 
                        value={item.name_clean}
                        onChange={e => handleUpdateItem(idx, 'name_clean', e.target.value)}
                        className="w-full bg-transparent font-bold text-slate-800 outline-none focus:bg-white px-2 py-1 rounded"
                      />
                      <p className="text-[9px] text-slate-400 font-mono px-2 truncate max-w-[200px]">{item.name_raw}</p>
                    </td>
                    <td className="px-6 py-3">
                      <select 
                        value={item.category}
                        onChange={e => handleUpdateItem(idx, 'category', e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-600 outline-none focus:bg-white px-2 py-1 rounded w-full border border-transparent focus:border-slate-200"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-3">
                      <input 
                        type="number" 
                        step="0.01"
                        value={item.qty}
                        onChange={e => handleUpdateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                        className="w-full text-center bg-transparent font-bold text-slate-500 outline-none focus:bg-white px-2 py-1 rounded"
                      />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <input 
                        type="number" 
                        step="0.01"
                        value={item.unit_price}
                        onChange={e => handleUpdateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full text-right bg-transparent font-bold text-slate-500 outline-none focus:bg-white px-2 py-1 rounded"
                      />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <input 
                        type="number" 
                        step="0.01"
                        value={item.total_price}
                        onChange={e => handleUpdateItem(idx, 'total_price', parseFloat(e.target.value) || 0)}
                        className="w-full text-right bg-transparent font-black text-slate-900 outline-none focus:bg-white px-2 py-1 rounded"
                      />
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button onClick={() => handleRemoveItem(idx)} className="text-slate-300 hover:text-rose-500 transition-colors">
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <button 
              onClick={handleAddItem}
              className="w-full py-4 bg-slate-50 hover:bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 border-t border-slate-100"
            >
              <i className="fa-solid fa-plus"></i> Adicionar Novo Item
            </button>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="p-8 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Calculado</p>
              <p className="text-3xl font-black">€{calculatedTotal.toFixed(2)}</p>
            </div>
            {!totalsMatch && (
              <div className="bg-amber-400 text-slate-900 px-4 py-2 rounded-2xl flex items-center gap-2 animate-pulse">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <p className="text-[9px] font-black uppercase leading-none">Diferença de €{Math.abs(calculatedTotal - draft.meta.total_spent).toFixed(2)}<br/>face ao original</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
             <i className="fa-solid fa-circle-info text-indigo-400"></i>
             <p className="text-xs text-slate-300 max-w-xs leading-relaxed">Verifica se as categorias e preços coincidem com o papel para uma análise nutricional correta.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptEditor;
