
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
  const [isOpen, setIsOpen] = useState(!profile.user_name);
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
    setIsOpen(false);
  };

  const copyKey = () => {
    if (profile.syncKey) {
      navigator.clipboard.writeText(profile.syncKey);
      alert("Chave copiada! Usa-a no telemóvel para entrar neste perfil.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Cloud Identity Card */}
      <div className="bg-white rounded-3xl border border-indigo-100 p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="font-black text-slate-900 text-lg tracking-tight">Identidade de Nuvem</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              Esta é a tua chave de acesso. Guarda-a para poderes aceder aos teus dados em qualquer browser ou telemóvel.
            </p>
          </div>
          
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between gap-4 group cursor-pointer" onClick={copyKey}>
            <div className="space-y-1">
               <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">A Tua Chave Única</span>
               <p className="text-xl font-mono font-black text-indigo-700">{profile.syncKey || 'GERAR NO PERFIL'}</p>
            </div>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <i className="fa-solid fa-copy"></i>
            </div>
          </div>
        </div>
        
        <div className="absolute top-[-40px] right-[-40px] text-indigo-50/50">
          <i className="fa-solid fa-cloud text-[140px]"></i>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-3">
            <i className={`fa-solid fa-user-circle ${profile.user_name ? 'text-indigo-500' : 'text-slate-300'} text-xl`}></i>
            <span className="font-semibold text-slate-800">
              {profile.user_name ? `Perfil de ${profile.user_name}` : 'Configuração do Perfil'}
            </span>
          </div>
          <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-slate-400`}`} />
        </button>

        {isOpen && (
          <form onSubmit={handleSubmit} className="p-6 border-t border-slate-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">O Teu Nome</label>
                <input 
                  type="text" 
                  required
                  value={formData.user_name}
                  placeholder="Ex: Bruno"
                  onChange={e => setFormData({ ...formData, user_name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Dieta Principal</label>
                <select 
                  value={formData.dietary_regime}
                  onChange={e => setFormData({ ...formData, dietary_regime: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Budget Mensal (€)</label>
                <input 
                  type="number" 
                  value={formData.monthly_budget || ''}
                  onChange={e => setFormData({ ...formData, monthly_budget: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Família</label>
                <input 
                  type="text" 
                  value={formData.family_context}
                  placeholder="Ex: 2 adultos, 1 criança"
                  onChange={e => setFormData({ ...formData, family_context: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none"
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
              <i className="fa-solid fa-cloud-arrow-up"></i> {profile.user_name ? 'Guardar e Sincronizar' : 'Criar e Sincronizar'}
            </button>
          </form>
        )}
      </div>

      <div className="pt-4 flex items-center justify-between px-4">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Versão Build {version}</p>
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
             <i className="fa-solid fa-shield-halved text-emerald-500"></i> 
             Encriptação Ativa
          </div>
      </div>
    </div>
  );
};

export default ProfileForm;