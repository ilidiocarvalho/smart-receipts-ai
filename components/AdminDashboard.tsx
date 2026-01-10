
import React, { useEffect, useState } from 'react';
import { firebaseService } from '../services/firebaseService';
import { UserContext } from '../types';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserContext[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!firebaseService.isUsingCloud()) {
        setLoading(false);
        return;
      }
      try {
        // O firebaseService precisa de um método para listar todos, 
        // mas como não o temos nativo no exemplo, vamos simular ou 
        // mostrar como seria a lógica de agregação.
        // No Firestore real, farias: collection(db, "users")
        const allUsers = await firebaseService.listAllUsers();
        setUsers(allUsers || []);
      } catch (e) {
        console.error("Erro ao listar utilizadores", e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const stats = {
    total: users.length,
    active: users.filter(u => u.account_status === 'active' || u.account_status === 'admin').length,
    codes: Array.from(new Set(users.map(u => u.promo_code).filter(Boolean)))
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">Command Center</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Gestão de utilizadores & Promo Codes</p>
        </div>
        <div className="bg-indigo-600 text-white p-4 rounded-3xl shadow-xl shadow-indigo-100 flex items-center gap-4">
           <i className="fa-solid fa-shield-halved text-2xl"></i>
           <div className="text-right">
             <p className="text-[10px] font-black uppercase opacity-60">Admin Access</p>
             <p className="font-black">Ativo</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon="fa-users" label="Utilizadores" value={stats.total} color="indigo" />
        <StatCard icon="fa-bolt" label="Contas Ativas" value={stats.active} color="emerald" />
        <StatCard icon="fa-ticket" label="Códigos em Uso" value={stats.codes.length} color="amber" />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
           <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Registos na Cloud</h3>
           <button onClick={() => window.location.reload()} className="text-indigo-600 font-black text-[10px] uppercase hover:underline">Atualizar <i className="fa-solid fa-rotate-right ml-1"></i></button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-50">
                <th className="px-8 py-5">Utilizador / E-mail</th>
                <th className="px-8 py-5">Promo Code</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Desde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-black animate-pulse">A carregar base de dados...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-black italic">Sem utilizadores na cloud real.</td></tr>
              ) : users.map((u, i) => (
                <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-900">{u.user_name || 'Anónimo'}</p>
                    <p className="text-xs text-slate-400 font-medium">{u.email}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border border-indigo-100">
                      {u.promo_code || '---'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${u.account_status === 'active' || u.account_status === 'admin' ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                       <span className="font-black text-[10px] uppercase tracking-tighter text-slate-600">{u.account_status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-xs text-slate-400 font-bold">
                    {u.joined_at ? new Date(u.joined_at).toLocaleDateString() : 'Desconhecido'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: any) => {
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100'
  };
  return (
    <div className={`p-8 rounded-[2.5rem] border ${colors[color]} shadow-sm space-y-3`}>
      <i className={`fa-solid ${icon} text-2xl`}></i>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
        <p className="text-4xl font-black tracking-tighter">{value}</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
