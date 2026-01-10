
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
  // Se não houver nome, começa com o form aberto
  const [isOpen, setIsOpen] = useState(!profile.user_name);
  const [formData, setFormData] = useState(profile);

  // Sincroniza o form se o perfil mudar externamente (ex: import)
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
      {!profile.user_name && (
        <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg animate-in zoom-in duration-300">
          <h3 className="text-xl font-bold mb-2">Primeira vez por aqui? 🚀</h3>
          <p className="text-sm opacity-90">Diz-nos o teu nome e o teu orçamento mensal para podermos começar a ajudar-te!</p>
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-3">
            <i className={`fa-solid fa-user-circle ${profile.user_name ? 'text-indigo-500' : 'text-slate-300'} text-xl`}></i>
            <span className="font-semibold text-slate-800">
              {profile.user_name ? `Perfil de ${profile.user_name}` : 'Configurar Perfil'}
            </span>
          </div>
          <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-slate-400`}></i>
        </button>

        {isOpen && (
          <form onSubmit={handleSubmit} className="p-6 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input 
                  type="text" 
                  required
                  value={formData.user_name}
                  placeholder="Ex: Bruno"
                  onChange={e => setFormData({ ...formData, user_name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Regime Alimentar</label>
                <select 
                  value={formData.dietary_regime}
                  onChange={e => setFormData({ ...formData, dietary_regime: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Orçamento Mensal (€)</label>
                <input 
                  type="number" 
                  value={formData.monthly_budget || ''}
                  placeholder="Ex: 300"
                  onChange={e => setFormData({ ...formData, monthly_budget: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contexto Familiar</label>
                <input 
                  type="text" 
                  value={formData.family_context}
                  placeholder="Ex: Com filho pequeno"
                  onChange={e => setFormData({ ...formData, family_context: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Objetivos</label>
              <div className="space-y-2">
                {formData.goals.map((goal, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      type="text" 
                      value={goal}
                      onChange={e => updateGoal(idx, e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button type="button" onClick={() => removeGoal(idx)} className="text-rose-500 px-2">
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addGoal} className="text-sm text-indigo-600 font-bold hover:underline">+ Adicionar Objetivo</button>
              </div>
            </div>

            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100">
              Guardar Perfil
            </button>
          </form>
        )}
      </div>

      {/* Tools Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Dados & Backup</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={handleExport} className="flex items-center justify-center gap-2 p-3 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50">
              <i className="fa-solid fa-download text-indigo-500"></i> Exportar JSON
            </button>
            <label className="flex items-center justify-center gap-2 p-3 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 cursor-pointer">
              <i className="fa-solid fa-upload text-indigo-500"></i> Importar JSON
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>
        
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Build {version}</p>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
             <i className="fa-solid fa-shield-halved text-emerald-500"></i> 
             Armazenamento Local Seguro
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;