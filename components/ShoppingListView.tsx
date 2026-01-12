
import React, { useState, useMemo } from 'react';
import { ReceiptData, ShoppingItem } from '../types';

interface ShoppingListViewProps {
  history: ReceiptData[];
  shoppingList: ShoppingItem[];
  onUpdate: (items: ShoppingItem[]) => void;
}

const ShoppingListView: React.FC<ShoppingListViewProps> = ({ history, shoppingList, onUpdate }) => {
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);

  // Identify frequent products and their best price/store
  const suggestions = useMemo(() => {
    const productStats: Record<string, { count: number; stores: Record<string, number>; minPrice: number; displayName: string }> = {};

    history.forEach(receipt => {
      receipt.items.forEach(item => {
        const rawName = item.name_clean.trim();
        if (!rawName) return;
        
        // Normalize name for better grouping (case-insensitive)
        const normalizedName = rawName.toLowerCase();

        if (!productStats[normalizedName]) {
          productStats[normalizedName] = { 
            count: 0, 
            stores: {}, 
            minPrice: Infinity,
            displayName: rawName // Use original casing from the first occurrence
          };
        }

        productStats[normalizedName].count += 1;
        productStats[normalizedName].minPrice = Math.min(productStats[normalizedName].minPrice, item.unit_price);
        
        const store = receipt.meta.store;
        productStats[normalizedName].stores[store] = (productStats[normalizedName].stores[store] || 0) + 1;
      });
    });

    return Object.entries(productStats)
      .filter(([_, stats]) => stats.count >= 1) // Lowered to 1 to show suggestions immediately
      .map(([_, stats]) => {
        // Find most frequent store for this item
        const preferredStore = Object.entries(stats.stores).sort((a, b) => b[1] - a[1])[0][0];
        return {
          name: stats.displayName,
          preferredStore,
          bestPrice: stats.minPrice === Infinity ? 0 : stats.minPrice,
          count: stats.count
        };
      })
      // Sort by frequency (descending) then by name
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [history]);

  const addItem = (name: string, store = 'Qualquer', price = 0) => {
    if (!name.trim()) return;
    const newItem: ShoppingItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      preferredStore: store,
      bestPrice: price,
      isChecked: false,
      addedAt: new Date().toISOString()
    };
    onUpdate([newItem, ...shoppingList]);
    setNewItemName('');
  };

  const toggleItem = (id: string) => {
    onUpdate(shoppingList.map(item => 
      item.id === id ? { ...item, isChecked: !item.isChecked } : item
    ));
  };

  const deleteItem = (id: string) => {
    onUpdate(shoppingList.filter(item => item.id !== id));
  };

  const clearChecked = () => {
    if (confirm("Remover todos os itens marcados?")) {
      onUpdate(shoppingList.filter(item => !item.isChecked));
    }
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    onUpdate(shoppingList.map(item => item.id === editingItem.id ? editingItem : item));
    setEditingItem(null);
  };

  const activeItems = shoppingList.filter(i => !i.isChecked);
  const checkedItems = shoppingList.filter(i => i.isChecked);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Lista de Compras</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Planeamento Inteligente</p>
        </div>
        
        {checkedItems.length > 0 && (
          <button 
            onClick={clearChecked}
            className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
          >
            Limpar Comprados
          </button>
        )}
      </div>

      {/* Manual Input Area */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-3">
        <input 
          type="text" 
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem(newItemName)}
          placeholder="O que precisas de comprar?"
          className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none placeholder:text-slate-300"
        />
        <button 
          onClick={() => addItem(newItemName)}
          className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 active:scale-90 transition-all shadow-lg shadow-indigo-100"
        >
          <i className="fa-solid fa-plus"></i>
        </button>
      </div>

      {/* Frequent Suggestions Shelf */}
      {suggestions.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
            Sugestões do teu Histórico
          </h3>
          <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar -mx-1 px-1">
            {suggestions.map((s, idx) => {
              const alreadyInList = shoppingList.some(item => item.name.toLowerCase() === s.name.toLowerCase() && !item.isChecked);
              return (
                <button
                  key={idx}
                  onClick={() => !alreadyInList && addItem(s.name, s.preferredStore, s.bestPrice)}
                  disabled={alreadyInList}
                  className={`flex-shrink-0 bg-white border border-slate-200 p-4 rounded-3xl text-left transition-all hover:border-indigo-300 hover:shadow-md active:scale-95 group max-w-[160px] ${alreadyInList ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <p className="font-black text-slate-800 text-xs truncate mb-1">{s.name}</p>
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter">
                      <i className="fa-solid fa-shop mr-1"></i> {s.preferredStore}
                    </span>
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">
                      <i className="fa-solid fa-tag mr-1"></i> Melhor: €{s.bestPrice.toFixed(2)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Shopping List */}
      <div className="space-y-4">
        {activeItems.length === 0 && checkedItems.length === 0 ? (
          <div className="bg-white p-16 text-center rounded-[3rem] border border-slate-200 shadow-sm border-dashed">
            <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-cart-plus text-2xl"></i>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">A tua lista está vazia</p>
            <p className="text-slate-300 text-xs font-medium">Adiciona itens manualmente ou através das sugestões.</p>
          </div>
        ) : (
          <>
            {/* Active Items */}
            <div className="flex flex-col gap-3">
              {activeItems.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-white p-5 rounded-[1.8rem] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <button 
                      onClick={() => toggleItem(item.id)}
                      className="w-8 h-8 rounded-xl border-2 border-slate-100 flex items-center justify-center text-white hover:bg-slate-50 transition-colors"
                    >
                      <i className="fa-solid fa-check text-[10px] opacity-0 group-hover:opacity-30"></i>
                    </button>
                    <div className="flex-1 cursor-pointer" onClick={() => setEditingItem(item)}>
                       <p className="font-bold text-slate-900 text-sm tracking-tight">{item.name}</p>
                       <div className="flex gap-3 mt-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <i className="fa-solid fa-shop text-[7px]"></i> {item.preferredStore}
                          </span>
                          {item.bestPrice > 0 && (
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                              <i className="fa-solid fa-tag text-[7px]"></i> Ref: €{item.bestPrice.toFixed(2)}
                            </span>
                          )}
                       </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => setEditingItem(item)} className="p-2 text-slate-300 hover:text-indigo-500"><i className="fa-solid fa-pen text-[10px]"></i></button>
                     <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-300 hover:text-rose-500"><i className="fa-solid fa-trash text-[10px]"></i></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Checked Items Section */}
            {checkedItems.length > 0 && (
              <div className="pt-6 space-y-3">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Comprados</h4>
                {checkedItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-slate-100/50 p-4 rounded-2xl flex items-center justify-between opacity-60"
                  >
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => toggleItem(item.id)}
                        className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-white"
                      >
                        <i className="fa-solid fa-check text-[10px]"></i>
                      </button>
                      <p className="font-medium text-slate-500 text-sm line-through tracking-tight">{item.name}</p>
                    </div>
                    <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-300 hover:text-rose-500"><i className="fa-solid fa-trash text-[10px]"></i></button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editar Item da Lista</h3>
            </div>
            <form onSubmit={handleEditSave} className="p-8 space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Produto</label>
                 <input 
                   type="text" 
                   value={editingItem.name}
                   onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                   className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-indigo-600"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Loja de Preferência</label>
                 <input 
                   type="text" 
                   value={editingItem.preferredStore}
                   onChange={e => setEditingItem({ ...editingItem, preferredStore: e.target.value })}
                   className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-indigo-600"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Preço de Referência (€)</label>
                 <input 
                   type="number" 
                   step="0.01"
                   value={editingItem.bestPrice}
                   onChange={e => setEditingItem({ ...editingItem, bestPrice: parseFloat(e.target.value) || 0 })}
                   className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:border-indigo-600"
                 />
               </div>
               
               <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setEditingItem(null)}
                    className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 text-[10px] font-black uppercase tracking-widest text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                  >
                    Atualizar Item
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingListView;
