
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
    alert("Perfil guardado com sucesso na Cloud!");
  };

  return (
    <div className="space-y-6">
      {/* Cloud Account Header */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center text-3xl shrink-0 shadow-inner">
          <i className="fa-solid fa-cloud-bolt"></i>
        </div>
        <div className="text-center md:text-left z-10">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
             <h3 className="text-xl font-black text-slate-900 tracking-tight">Sessão Sincronizada</h3>
             <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1 self-center md:self-auto">
               <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> Online
             </span>
          </div>
          <p className="text-base font-bold text-indigo-600 mt-1">{profile.email}</p>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">O SmartReceipts AI está a monitorizar e a guardar o teu histórico permanentemente na nuvem.</p>
        </div>
        
        {/* Background Accent */}
        <div className="absolute top-[-30px] right-[-30px] text-slate-50 opacity-50">
           <i className="fa-solid fa-fingerprint text-[180px]"></i>
        </div>
      </div>

      {/* Main Profile Settings */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Definições da Tua Identidade</h4>
           <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Cloud Push:</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
           </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Como te chamas?</label>
              <input 
                type="text" 
                required
                value={formData.user_name}
                placeholder="Ex: Bruno"
                onChange={e => setFormData({ ...formData, user_name: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-bold text-slate-800"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estilo de Alimentação</label>
              <select 
                value={formData.dietary_regime}
                onChange={e => setFormData({ ...formData, dietary_regime: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-slate-800"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Budget Mensal (€)</label>
              <input 
                type="number" 
                value={formData.monthly_budget || ''}
                onChange={e => setFormData({ ...formData, monthly_budget: parseFloat(e.target.value) || 0 })}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-slate-800"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Família / Agregado</label>
              <input 
                type="text" 
                value={formData.family_context}
                placeholder="Ex: 2 adultos, 1 cão"
                onChange={e => setFormData({ ...formData, family_context: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-slate-800"
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-black transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-3">
            <i className="fa-solid fa-cloud-arrow-up"></i> Atualizar e Sincronizar Agora
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between px-8 py-4 bg-slate-100/50 rounded-2xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Build v{version} • Cloud Engine 1.1</p>
          <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600">
             <i className="fa-solid fa-lock"></i> 
             Encriptação de Ponta-a-Ponta
          </div>
      </div>
    </div>
  );
};

export default ProfileForm;
