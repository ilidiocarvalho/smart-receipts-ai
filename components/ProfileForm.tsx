
import React, { useState, useEffect } from 'react';
import { UserContext, AppState } from '../types';

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

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_name.trim()) {
      alert("Por favor, introduza o seu nome.");
      return;
    }
    onUpdate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Cloud Account Header */}
      <div className="bg-white rounded-3xl border border-indigo-100 p-8 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl shrink-0">
          <i className="fa-solid fa-cloud-check"></i>
        </div>
        <div className="text-center md:text-left">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Sessão Ativa na Nuvem</h3>
          <p className="text-sm font-bold text-indigo-600 mt-1">{profile.email}</p>
          <p className="text-xs text-slate-400 mt-1">O teu histórico está a ser sincronizado automaticamente.</p>
        </div>
      </div>

      {/* Main Profile Settings */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Definições de Perfil</h4>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teu Nome</label>
              <input 
                type="text" 
                required
                value={formData.user_name}
                placeholder="Como te devemos chamar?"
                onChange={e => setFormData({ ...formData, user_name: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Regime Alimentar</label>
              <select 
                value={formData.dietary_regime}
                onChange={e => setFormData({ ...formData, dietary_regime: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none font-semibold"
              >
                <option>None / Mixed</option>
                <option>Ovo-Lacto Vegetariano</option>
                <option>Vegan</option>
                <option>Paleo</option>
                <option>Low Carb</option>
                <option>Keto</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Orçamento Mensal (€)</label>
              <input 
                type="number" 
                value={formData.monthly_budget || ''}
                onChange={e => setFormData({ ...formData, monthly_budget: parseFloat(e.target.value) || 0 })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contexto Familiar</label>
              <input 
                type="text" 
                value={formData.family_context}
                placeholder="Ex: 2 adultos, 1 cão"
                onChange={e => setFormData({ ...formData, family_context: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none font-semibold"
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2">
            <i className="fa-solid fa-floppy-disk"></i> Atualizar Informações
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between px-6">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">SmartReceipts v{version}</p>
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
             <i className="fa-solid fa-fingerprint text-emerald-500"></i> 
             Identidade Sincronizada
          </div>
      </div>
    </div>
  );
};

export default ProfileForm;
