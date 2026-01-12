
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ReceiptData, ShoppingItem } from '../types';

interface ShoppingListViewProps {
  history: ReceiptData[];
  shoppingList: ShoppingItem[];
  onUpdate: (items: ShoppingItem[]) => void;
}

interface ProductSummary {
  name: string;
  preferredStore: string;
  bestPrice: number;
  count: number;
  category?: string;
}

const ShoppingListView: React.FC<ShoppingListViewProps> = ({ history, shoppingList, onUpdate }) => {
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedInCatalog, setSelectedInCatalog] = useState<Set<string>>(new Set());
  const [catalogStoreFilter, setCatalogStoreFilter] = useState('ALL');
  
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Full product catalog from history
  const allHistoryProducts = useMemo(() => {
    const stats: Record<string, { count: number; stores: Record<string, number>; minPrice: number; displayName: string; category?: string }> = {};

    history.forEach(receipt => {
      receipt.items.forEach(item => {
        const rawName = item.name_clean.trim();
        if (!rawName) return;
        const key = rawName.toLowerCase();

        if (!stats[key]) {
          stats[key] = { 
            count: 0, 
            stores: {}, 
            minPrice: Infinity, 
            displayName: rawName,
            category: item.category
          };
        }
        stats[key].count += 1;
        stats[key].minPrice = Math.min(stats[key].minPrice, item.unit_price);
        stats[key].stores[receipt.meta.store] = (stats[key].stores[receipt.meta.store] || 0) + 1;
      });
    });

    return Object.entries(stats).map(([_, s]) => ({
      name: s.displayName,
      preferredStore: Object.entries(s.stores).sort((a, b) => b[1] - a[1])[0][0],
      bestPrice: s.minPrice === Infinity ? 0 : s.minPrice,
      count: s.count,
      category: s.category
    })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [history]);

  // Stores for filtering in catalog
  const availableStores = useMemo(() => {
    const stores = new Set<string>();
    allHistoryProducts.forEach(p => stores.add(p.preferredStore));
    return Array.from(stores).sort();
  }, [allHistoryProducts]);

  // Top suggestions (Top 10 most frequent)
  const topSuggestions = useMemo(() => {
    return allHistoryProducts.slice(0, 10);
  }, [allHistoryProducts]);

  // Predictive search results (autocomplete)
  const predictiveResults = useMemo(() => {
    if (!newItemName.trim() || newItemName.length < 2) return [];
    const term = newItemName.toLowerCase();
    return allHistoryProducts
      .filter(p => p.name.toLowerCase().includes(term))
      .slice(0, 5);
  }, [allHistoryProducts, newItemName]);

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
    setShowDropdown(false);
  };

  const addMultipleFromCatalog = () => {
    const newItems: ShoppingItem[] = [];
    allHistoryProducts.forEach(p => {
      if (selectedInCatalog.has(p.name)) {
        newItems.push({
          id: crypto.randomUUID(),
          name: p.name,
          preferredStore: p.preferredStore,
          bestPrice: p.bestPrice,
          isChecked: false,
          addedAt: new Date().toISOString()
        });
      }
    });
    onUpdate([...newItems, ...shoppingList]);
    setSelectedInCatalog(new Set());
    setShowCatalog(false);
  };

  const toggleItem = (id: string) => {
    onUpdate(shoppingList.map(item => item.id === id ? { ...item, isChecked: !item.isChecked } : item));
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

  const filteredCatalog = useMemo(() => {
    return allHistoryProducts.filter(p => {
      const nameMatch = p.name.toLowerCase().includes(catalogSearch.toLowerCase());
      const storeMatch = catalogStoreFilter === 'ALL' || p.preferredStore === catalogStoreFilter;
      return nameMatch && storeMatch;
    });
  }, [allHistoryProducts, catalogSearch, catalogStoreFilter]);

  const activeItems = shoppingList.filter(i => !i.isChecked);
  const checkedItems = shoppingList.filter(i => i.isChecked);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Lista de Compras</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Planeamento Inteligente v1.5.2</p>
        </div>
        
        {checkedItems.length > 0 && (
          <button onClick={clearChecked} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">
            Limpar Comprados
          </button>
        )}
      </div>

      {/* Manual Input Area with Predictive Dropdown */}
      <div className="relative" ref={searchDropdownRef}>
        <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-3 focus-within:ring-4 focus-within:ring-indigo-50 transition-all">
          <input 
            type="text" 
            value={newItemName}
            onChange={(e) => {
              setNewItemName(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={(e) => e.key === 'Enter' && addItem(newItemName)}
            placeholder="O que precisas de comprar?"
            className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none placeholder:text-slate-300"
          />
          <button onClick={() => addItem(newItemName)} className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 active:scale-90 transition-all shadow-lg shadow-indigo-100">
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>

        {/* Predictive Search Dropdown */}
        {showDropdown && predictiveResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-[2rem] shadow-2xl z-[150] overflow-hidden animate-in slide-in-from-top-2">
            <div className="p-3">
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-4 py-2">No teu histórico:</p>
               {predictiveResults.map((p, idx) => (
                 <button 
                   key={idx}
                   onClick={() => addItem(p.name, p.preferredStore, p.bestPrice)}
                   className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-50 rounded-2xl transition-colors text-left group"
                 >
                   <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                      <span className="text-[9px] font-bold text-slate-400 group-hover:text-indigo-400 uppercase">{p.preferredStore}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-xs font-black text-emerald-600">€{p.bestPrice.toFixed(2)}</span>
                      <i className="fa-solid fa-plus ml-3 text-indigo-300"></i>
                   </div>
                 </button>
               ))}
            </div>
          </div>
        )}
      </div>

      {/* Top Suggestions Shelf */}
      {topSuggestions.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mais Comprados</h3>
            <button 
              onClick={() => setShowCatalog(true)}
              className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 hover:underline"
            >
              <i className="fa-solid fa-book-open"></i> Ver Catálogo Completo
            </button>
          </div>
          <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar -mx-1 px-1">
            {topSuggestions.map((s, idx) => {
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
                    <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter truncate">
                      <i className="fa-solid fa-shop mr-1"></i> {s.preferredStore}
                    </span>
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">
                      <i className="fa-solid fa-tag mr-1"></i> €{s.bestPrice.toFixed(2)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Shopping List UI */}
      <div className="space-y-4">
        {activeItems.length === 0 && checkedItems.length === 0 ? (
          <div className="bg-white p-16 text-center rounded-[3rem] border border-slate-200 shadow-sm border-dashed">
            <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-cart-plus text-2xl"></i>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">A tua lista está vazia</p>
            <p className="text-slate-300 text-xs font-medium">Usa a pesquisa preditiva ou o catálogo para adicionar itens.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {activeItems.map((item) => (
                <div key={item.id} className="bg-white p-5 rounded-[1.8rem] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                  <div className="flex items-center gap-4 flex-1">
                    <button onClick={() => toggleItem(item.id)} className="w-8 h-8 rounded-xl border-2 border-slate-100 flex items-center justify-center text-white hover:bg-slate-50 transition-colors">
                      <i className="fa-solid fa-check text-[10px] opacity-0 group-hover:opacity-30 text-indigo-500"></i>
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

            {checkedItems.length > 0 && (
              <div className="pt-6 space-y-3">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Comprados</h4>
                {checkedItems.map((item) => (
                  <div key={item.id} className="bg-slate-100/50 p-4 rounded-2xl flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-4">
                      <button onClick={() => toggleItem(item.id)} className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
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

      {/* Catalog Modal */}
      {showCatalog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl h-[90vh] md:h-[80vh] rounded-t-[3rem] md:rounded-[3rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-12 duration-500 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Catálogo de Histórico</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pesquisa & Seleção Múltipla</p>
              </div>
              <button onClick={() => setShowCatalog(false)} className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 shadow-sm transition-all">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Catalog Filters */}
            <div className="p-6 bg-white border-b border-slate-100 flex flex-col gap-4">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input 
                  type="text" 
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Procurar no histórico..."
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none font-bold text-slate-800 transition-all"
                />
              </div>
              <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
                <button 
                  onClick={() => setCatalogStoreFilter('ALL')}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${catalogStoreFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                >
                  Todas as Lojas
                </button>
                {availableStores.map(store => (
                  <button 
                    key={store}
                    onClick={() => setCatalogStoreFilter(store)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${catalogStoreFilter === store ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    {store}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2 bg-slate-50/30">
              {filteredCatalog.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-slate-300 font-black text-xs uppercase tracking-widest">Sem resultados para a pesquisa</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {filteredCatalog.map((p, idx) => {
                    const isSelected = selectedInCatalog.has(p.name);
                    const alreadyInList = shoppingList.some(item => item.name.toLowerCase() === p.name.toLowerCase() && !item.isChecked);
                    return (
                      <button 
                        key={idx}
                        disabled={alreadyInList}
                        onClick={() => {
                          const newSet = new Set(selectedInCatalog);
                          if (newSet.has(p.name)) newSet.delete(p.name); else newSet.add(p.name);
                          setSelectedInCatalog(newSet);
                        }}
                        className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left group ${alreadyInList ? 'opacity-40 cursor-not-allowed border-transparent bg-slate-50' : isSelected ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-transparent hover:border-slate-200'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200'}`}>
                            {isSelected && <i className="fa-solid fa-check text-[10px]"></i>}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                            <div className="flex gap-3 text-[8px] font-black uppercase tracking-widest text-slate-400">
                               <span>{p.preferredStore}</span>
                               <span className="text-indigo-400">{p.category}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-emerald-600 text-xs">€{p.bestPrice.toFixed(2)}</p>
                          {alreadyInList && <p className="text-[7px] font-black uppercase text-indigo-400 mt-1">Já na lista</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Catalog Footer Actions */}
            <div className="p-8 bg-white border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
               <div className="text-center md:text-left">
                  <p className="font-black text-slate-900 text-lg tracking-tight">{selectedInCatalog.size} Selecionados</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Para adicionar à lista ativa</p>
               </div>
               <div className="flex items-center gap-3 w-full md:w-auto">
                  <button onClick={() => setSelectedInCatalog(new Set())} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all flex-1 md:flex-none">Limpar</button>
                  <button 
                    disabled={selectedInCatalog.size === 0}
                    onClick={addMultipleFromCatalog}
                    className="flex-[2] md:flex-none px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 disabled:opacity-50 transition-all"
                  >
                    Adicionar Selecionados
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
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
                  <button type="button" onClick={() => setEditingItem(null)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                  <button type="submit" className="flex-[2] py-4 text-[10px] font-black uppercase tracking-widest text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">Atualizar Item</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingListView;
