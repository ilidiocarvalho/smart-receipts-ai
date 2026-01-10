
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

  const addGoal = () => {
    setFormData(prev => ({ ...prev, goals: [...prev.goals, ''] }));
  };

  const updateGoal = (index: number, val: string) => {
    const newGoals = [...formData.goals];
    newGoals[index] = val;
    setFormData(prev => ({ ...prev, goals: newGoals }));
  };

  const removeGoal = (index: number) => {
    setFormData(prev => ({ ...prev, goals: prev.goals.filter((_, i) => i !== index) }));
  };

  const handleExport = () => {
    const dataStr = JSON.stringify({ userProfile: profile, history: fullHistory }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `smart_receipts_backup_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (confirm("Isto irá substituir o histórico atual. Continuar?")) {
          onImportData(json);
        }
      } catch (err) {
        alert("Ficheiro inválido.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Message for Empty Profile */}
      {!profile.user_name && (
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 rounded-2xl shadow-xl animate-in zoom-in duration-300">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-rocket text-xl"></i>
            </div>
            <h3 className="text-xl font-bold">Configuração Inicial</h3>
          </div>
          <p className="text-sm opacity-90 leading-relaxed">Personaliza a tua experiência! Diz-nos o teu nome e orçamento para que o Coach IA possa dar-te dicas reais.</p>
        </div>
      )}

      {/* Cloud Sync Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCloudEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
              <i className="fa-solid fa-cloud-arrow-up"></i>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Cloud Sync & Backup</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sincronização com Firebase</p>
            </div>
          </div>
          <button 
            onClick={onToggleCloud}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ${isCloudEnabled ? 'bg-indigo-600 ring-indigo-50' : 'bg-slate-200 ring-slate-50'}`}
          >
            <span className={`${isCloudEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
          </button>
        </div>
        {isCloudEnabled && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-3 text-emerald-700 items-start animate-in fade-in slide-in-from-top-2">
            <i className="fa-solid fa-check-circle mt-0.5"></i>
            <p className="text-[11px] leading-tight font-medium">As tuas faturas e dados de perfil estão a ser guardados de forma segura na tua conta Firebase.</p>
          </div>
        )}
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
              {profile.user_name ? `Perfil de ${profile.user_name}` : 'Identidade & Orçamento'}
            </span>
          </div>
          <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-slate-400`}></i>
        </button>

        {isOpen && (
          <form onSubmit={handleSubmit} className="p-6 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">O Teu Nome</label>
                <input 
                  type="text" 
                  required
                  value={formData.user_name}
                  placeholder="Ex: Bruno"
                  onChange={e => setFormData({ ...formData, user_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Regime Alimentar</label>
                <select 
                  value={formData.dietary_regime}
                  onChange={e => setFormData({ ...formData, dietary_regime: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Orçamento Mensal (€)</label>
                <input 
                  type="number" 
                  value={formData.monthly_budget || ''}
                  placeholder="Ex: 300"
                  onChange={e => setFormData({ ...formData, monthly_budget: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Contexto Familiar</label>
                <input 
                  type="text" 
                  value={formData.family_context}
                  placeholder="Ex: Vive com parceiro"
                  onChange={e => setFormData({ ...formData, family_context: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Os Teus Objetivos</label>
              <div className="space-y-2">
                {formData.goals.map((goal, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      type="text" 
                      value={goal}
                      onChange={e => updateGoal(idx, e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button type="button" onClick={() => removeGoal(idx)} className="text-rose-500 px-2 hover:bg-rose-50 rounded-lg transition-colors">
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addGoal} className="text-xs text-indigo-600 font-bold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">+ Adicionar Objetivo</button>
              </div>
            </div>

            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
              <i className="fa-solid fa-floppy-disk"></i> Guardar Perfil
            </button>
          </form>
        )}
      </div>

      {/* Tools Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Gestão de Dados Local</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={handleExport} className="flex items-center justify-center gap-2 p-3 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
              <i className="fa-solid fa-file-export text-indigo-500"></i> Exportar JSON
            </button>
            <label className="flex items-center justify-center gap-2 p-3 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 cursor-pointer transition-colors">
              <i className="fa-solid fa-file-import text-indigo-500"></i> Importar JSON
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>
        
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Build {version}</p>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
             <i className="fa-solid fa-lock text-emerald-500"></i> 
             Encriptação Local Ativa
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;