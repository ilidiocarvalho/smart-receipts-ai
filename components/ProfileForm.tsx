
import React, { useState, useEffect } from 'react';
import { UserContext, AppState } from '../types';
import { firebaseService } from '../services/firebaseService';
import { DEFAULT_CATEGORIES } from '../App';

interface ProfileFormProps {
  profile: UserContext;
  onUpdate: (profile: UserContext) => void;
  onImportData: (data: Partial<AppState>) => void;
  fullHistory: any[];
  isCloudEnabled: boolean;
  onToggleCloud: () => void;
  version: string;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ 
  profile, 
  onUpdate, 
  onImportData, 
  fullHistory,
  isCloudEnabled,
  onToggleCloud,
  version
}) => {
  const [formData, setFormData] = useState(profile);
  const [newCat, setNewCat] = useState('');
  const isCloudActive = firebaseService.isUsingCloud();

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    alert("Definições de perfil guardadas.");
  };

  // v1.3.8: Immediate propagation for categories
  const addCategory = () => {
    if (!newCat.trim()) return;
    const currentCats = formData.custom_categories || DEFAULT_CATEGORIES;
    if (currentCats.includes(newCat.trim())) return;
    const updated = { ...formData, custom_categories: [...currentCats, newCat.trim()] };
    setFormData(updated);
    onUpdate(updated); // Propagate immediately
    setNewCat('');
  };

  const removeCategory = (cat: string) => {
    const currentCats = formData.custom_categories || DEFAULT_CATEGORIES;
    const updated = { ...formData, custom_categories: currentCats.filter(c => c !== cat) };
    setFormData(updated);
    onUpdate(updated); // Propagate immediately
  };

  const resetCategories = () => {
    if (confirm("Repor categorias originais em Português?")) {
      const updated = { ...formData, custom_categories: DEFAULT_CATEGORIES };
      setFormData(updated);
      onUpdate(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cloud Account Header */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className={`w-20 h-20 ${isCloudActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'} rounded-3xl flex items-center justify-center text-3xl shrink-0 shadow-inner transition-colors`}>
          <i className={`fa-solid ${isCloudActive ? 'fa-cloud-bolt' : 'fa-database'}`}></i>
        </div>
        <div className="text-center md:text-left z-10">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
             <h3 className="text-xl font-black text-slate-900 tracking-tight">
               {isCloudActive ? 'Sessão Sincronizada' : 'Sessão Local'}
             </h3>
             <span className={`${isCloudActive ? 'bg-emerald-500' : 'bg-slate-400'} text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1 self-center md:self-auto`}>
               <span className={`w-1.5 h-1.5 bg-white rounded-full ${isCloudActive ? 'animate-pulse' : ''}`}></span> 
               {isCloudActive ? 'Online' : 'Offline'}
             </span>
          </div>
          <p className="text-base font-bold text-indigo-600 mt-1">{profile.email}</p>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            As tuas alterações são guardadas instantaneamente no dispositivo.
          </p>
        </div>
        
        <div className="absolute top-[-30px] right-[-30px] text-slate-50 opacity-50">
           <i className="fa-solid fa-fingerprint text-[180px]"></i>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Definições da Tua Identidade</h4>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Como te chamas?</label>
              <input 
                type="text" 
                required
                value={formData.user_name}
                onChange={e => setFormData({ ...formData, user_name: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 outline-none transition-all font-bold text-slate-800"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estilo de Alimentação</label>
              <select 
                value={formData.dietary_regime}
                onChange={e => setFormData({ ...formData, dietary_regime: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 outline-none font-bold text-slate-800"
              >
                <option>Misto / Tudo</option>
                <option>Ovo-Lacto Vegetariano</option>
                <option>Vegan</option>
                <option>Paleo</option>
                <option>Low Carb</option>
                <option>Keto</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Budget Mensal (€)</label>
              <input 
                type="number" 
                value={formData.monthly_budget || ''}
                onChange={e => setFormData({ ...formData, monthly_budget: parseFloat(e.target.value) || 0 })}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 outline-none font-bold text-slate-800"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Família / Agregado</label>
              <input 
                type="text" 
                value={formData.family_context}
                placeholder="Ex: 2 adultos, 1 cão"
                onChange={e => setFormData({ ...formData, family_context: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 outline-none font-bold text-slate-800"
              />
            </div>
          </div>

          {/* Categorias Management */}
          <div className="space-y-4 pt-6 border-t border-slate-100">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gestão de Categorias (PT)</label>
                  <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-emerald-100">Auto-Save</span>
                </div>
                <button type="button" onClick={resetCategories} className="text-[9px] font-black uppercase text-indigo-500 hover:underline">Repor Padrão</button>
             </div>
             
             <div className="flex flex-wrap gap-2 min-h-[40px]">
                {(formData.custom_categories || DEFAULT_CATEGORIES).map(cat => (
                  <div key={cat} className="group flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-2 rounded-xl border border-indigo-100 hover:bg-white hover:shadow-md transition-all">
                    <span className="text-xs font-bold">{cat}</span>
                    <button type="button" onClick={() => removeCategory(cat)} className="text-indigo-300 hover:text-rose-500 transition-colors px-1">
                      <i className="fa-solid fa-circle-xmark text-[10px]"></i>
                    </button>
                  </div>
                ))}
             </div>

             <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newCat}
                  placeholder="Nova categoria..."
                  onChange={e => setNewCat(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                  className="flex-1 px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-600 outline-none transition-all"
                />
                <button 
                  type="button" 
                  onClick={addCategory}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100"
                >
                  Adicionar
                </button>
             </div>
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98]">
            <i className={`fa-solid ${isCloudActive ? 'fa-cloud-arrow-up' : 'fa-floppy-disk'}`}></i> 
            Guardar Dados do Perfil
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between px-8 py-4 bg-slate-100/50 rounded-2xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Build v{version} • Armazenamento Atómico</p>
          <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600">
             <i className="fa-solid fa-lock"></i> Dados Blindados Localmente
          </div>
      </div>
    </div>
  );
};

export default ProfileForm;
