
import React, { useState } from 'react';
import { UserContext, AppState } from '../types';

interface ProfileFormProps {
  profile: UserContext;
  onUpdate: (profile: UserContext) => void;
  onImportData: (data: Partial<AppState>) => void;
  fullHistory: any[];
  isCloudEnabled: boolean;
  onToggleCloud: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ 
  profile, 
  onUpdate, 
  onImportData, 
  fullHistory,
  isCloudEnabled,
  onToggleCloud 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(profile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        if (confirm("This will overwrite your current history and profile. Continue?")) {
          onImportData(json);
          alert("Data imported successfully!");
        }
      } catch (err) {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-user-circle text-indigo-500 text-xl"></i>
            <span className="font-semibold text-slate-800">User Profile: {profile.user_name}</span>
          </div>
          <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-slate-400`}></i>
        </button>

        {isOpen && (
          <form onSubmit={handleSubmit} className="p-6 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input 
                  type="text" 
                  value={formData.user_name}
                  onChange={e => setFormData({ ...formData, user_name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dietary Regime</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Budget (€)</label>
                <input 
                  type="number" 
                  value={formData.monthly_budget}
                  onChange={e => setFormData({ ...formData, monthly_budget: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Family Context</label>
                <input 
                  type="text" 
                  value={formData.family_context}
                  placeholder="e.g., Living alone, with kids..."
                  onChange={e => setFormData({ ...formData, family_context: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Goals</label>
              <div className="space-y-2">
                {formData.goals.map((goal, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      type="text" 
                      value={goal}
                      onChange={e => updateGoal(idx, e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button type="button" onClick={() => removeGoal(idx)} className="text-rose-500 hover:bg-rose-50 px-3 rounded-lg">
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={addGoal}
                  className="text-sm text-indigo-600 font-semibold hover:underline"
                >
                  + Add Goal
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition"
            >
              Save Profile
            </button>
          </form>
        )}
      </div>

      {/* Cloud & Data Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
            <i className="fa-solid fa-cloud text-indigo-500"></i>
            Sync & Security
          </h3>
          <div className={`p-4 rounded-xl border transition-all flex items-center justify-between ${isCloudEnabled ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isCloudEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                <i className={`fa-solid ${isCloudEnabled ? 'fa-cloud-check' : 'fa-cloud'}`}></i>
              </div>
              <div>
                <p className={`text-sm font-bold ${isCloudEnabled ? 'text-emerald-900' : 'text-slate-900'}`}>
                  {isCloudEnabled ? 'Cloud Sync Active' : 'Offline Mode (Local Only)'}
                </p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                  {isCloudEnabled ? 'Data backed up to Google Cloud' : 'Data stored on this device only'}
                </p>
              </div>
            </div>
            <button 
              onClick={onToggleCloud}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
                isCloudEnabled 
                  ? 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isCloudEnabled ? 'Disconnect' : 'Connect Cloud'}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
            <i className="fa-solid fa-database text-slate-400"></i>
            Manual Backups
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
              onClick={handleExport}
              className="bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all"
            >
              <i className="fa-solid fa-download text-indigo-500"></i>
              Export JSON
            </button>
            
            <label className="bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all cursor-pointer text-center">
              <i className="fa-solid fa-upload text-indigo-500"></i>
              Import JSON
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;