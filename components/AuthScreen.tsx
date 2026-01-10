
import React, { useState } from 'react';

interface AuthScreenProps {
  onSignIn: (email: string) => void;
  onSignUp: (email: string, promoCode?: string) => void;
  isLoading: boolean;
  error: string | null;
  legacyDetected: boolean;
  onClearError: () => void;
  isCloudActive: boolean;
  version: string;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ 
  onSignIn, 
  onSignUp, 
  isLoading, 
  error, 
  legacyDetected, 
  onClearError, 
  isCloudActive,
  version
}) => {
  const [email, setEmail] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup' | null>(null);
  
  const handleAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    if (mode === 'signin') {
      onSignIn(email);
    } else {
      onSignUp(email, promoCode);
    }
  };

  const switchToSignup = () => {
    onClearError();
    setMode('signup');
  };

  const switchToSignin = () => {
    onClearError();
    setMode('signin');
  };

  if (!mode) {
    return (
      <div className="max-w-md mx-auto py-24 space-y-16 animate-in zoom-in fade-in duration-1000">
        <div className="text-center space-y-8">
          <div className="w-28 h-28 bg-gradient-to-br from-indigo-600 to-indigo-900 text-white rounded-[3rem] flex items-center justify-center mx-auto shadow-[0_20px_50px_rgba(79,70,229,0.3)] rotate-6 transform hover:rotate-0 transition-all duration-700">
             <i className="fa-solid fa-receipt text-5xl"></i>
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">SmartReceipts</h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
              {isCloudActive ? `Cloud Engine Active v${version}` : 'Waiting for Cloud Keys...'}
            </p>
          </div>
          {legacyDetected && (
            <div className="inline-flex items-center gap-3 bg-amber-50 text-amber-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-amber-100 shadow-sm animate-bounce">
              <i className="fa-solid fa-wand-magic-sparkles"></i> Dados Locais Prontos para Migrar
            </div>
          )}
        </div>

        <div className="space-y-5">
          <button onClick={() => setMode('signin')} className="w-full bg-slate-900 text-white font-black py-7 rounded-3xl hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-4 active:scale-95 group">
             <i className={`fa-solid ${isCloudActive ? 'fa-fingerprint' : 'fa-circle-notch animate-spin'} text-xl group-hover:scale-125 transition-transform`}></i> 
             {isCloudActive ? 'Entrar na Minha Nuvem' : 'Sincronizar Localmente'}
          </button>
          <button onClick={() => setMode('signup')} className="w-full bg-white text-slate-900 border-2 border-slate-100 font-black py-7 rounded-3xl hover:border-indigo-600 transition-all flex items-center justify-center gap-4 active:scale-95">
             <i className="fa-solid fa-user-plus text-xl"></i> Criar Novo Cofre
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-16 space-y-8 animate-in slide-in-from-right-12 fade-in duration-500">
      <button onClick={() => { setMode(null); onClearError(); }} className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-3 hover:text-indigo-600 transition-all">
        <i className="fa-solid fa-chevron-left"></i> Voltar ao Início
      </button>

      <div className="bg-white p-14 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 space-y-12 relative overflow-hidden">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{mode === 'signin' ? 'Sincronizar' : 'Novo Registo'}</h2>
          <p className="text-slate-400 text-sm font-bold leading-relaxed opacity-80 uppercase tracking-widest text-[10px]">
            {mode === 'signup' ? 'Introduz o teu código de acesso para criar o cofre.' : 'Acede ao teu histórico de qualquer lugar.'}
          </p>
        </div>

        <form onSubmit={handleAction} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">E-mail da Conta</label>
              <input 
                type="email" 
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="exemplo@gmail.com"
                className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[1.8rem] focus:border-indigo-600 focus:ring-[12px] focus:ring-indigo-50 outline-none transition-all font-bold text-slate-900 text-lg"
              />
            </div>

            {mode === 'signup' && (
              <div className="space-y-3 animate-in slide-in-from-top-4 duration-500">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 ml-2 flex items-center gap-2">
                  <i className="fa-solid fa-ticket"></i> Promo Code / Access Key
                </label>
                <input 
                  type="text" 
                  required
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="EX: MASTER_KEY"
                  className="w-full px-8 py-6 bg-indigo-50/50 border-2 border-indigo-100 rounded-[1.8rem] focus:border-indigo-600 focus:ring-[12px] focus:ring-indigo-50 outline-none transition-all font-bold text-indigo-900 text-lg"
                />
              </div>
            )}
          </div>

          <button 
            disabled={!email.includes('@') || (mode === 'signup' && !promoCode) || isLoading}
            className="w-full bg-indigo-600 text-white font-black py-6 rounded-[1.8rem] hover:bg-indigo-700 transition-all shadow-[0_15px_30px_rgba(79,70,229,0.3)] disabled:opacity-50 flex items-center justify-center gap-4 active:scale-95"
          >
            {isLoading ? <i className="fa-solid fa-spinner animate-spin text-xl"></i> : <i className="fa-solid fa-bolt-lightning text-xl"></i>}
            {mode === 'signin' ? 'Confirmar e Entrar' : 'Confirmar e Criar'}
          </button>
        </form>

        {error === 'INVALID_PROMO' && (
          <div className="text-center bg-rose-50 p-5 rounded-3xl border border-rose-100 text-rose-500 text-xs font-black animate-shake flex items-center gap-3">
             <i className="fa-solid fa-lock text-lg"></i> Código de acesso inválido ou expirado.
          </div>
        )}

        {error === 'USER_NOT_FOUND' && (
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-top-4">
            <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100 text-rose-500 text-xs font-black flex items-center gap-3">
              <i className="fa-solid fa-circle-xmark text-lg"></i>
              E-mail não registado no sistema global.
            </div>
            <button 
              type="button"
              onClick={switchToSignup}
              className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] hover:text-indigo-800 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              Cofre inexistente. Queres criar este novo? <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        )}

        {error === 'USER_ALREADY_EXISTS' && (
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-top-4">
            <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100 text-rose-500 text-xs font-black flex items-center gap-3">
              <i className="fa-solid fa-user-check text-lg"></i>
              Este e-mail já possui um cofre ativo.
            </div>
            <button 
              type="button"
              onClick={switchToSignin}
              className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] hover:text-indigo-800 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              Já existe. Tentar entrar com este? <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        )}

        {error && !['USER_NOT_FOUND', 'USER_ALREADY_EXISTS', 'INVALID_PROMO'].includes(error) && (
          <div className="text-center bg-rose-50 p-5 rounded-3xl border border-rose-100 text-rose-500 text-xs font-black animate-shake flex items-center gap-3">
             <i className="fa-solid fa-triangle-exclamation text-lg"></i> {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;
