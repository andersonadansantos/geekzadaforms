
import React, { useState } from 'react';
import { Lock, User, ShieldCheck, LoaderCircle } from 'lucide-react';
import { api, saveSession, AdminUser } from '../apiClient';

interface AdminLoginProps {
  onLogin: (user: AdminUser) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      // As credenciais sao conferidas no servidor; o hash da senha fica
      // apenas no MySQL e nunca e enviado ao navegador.
      const res = await api.login(username.trim(), password);
      saveSession(res.token, res.user);
      onLogin(res.user);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível entrar. Tente novamente.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-[#83E509]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#83E509]/20">
            <ShieldCheck className="w-8 h-8 text-[#83E509]" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Acesso Restrito</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Painel Administrativo Geekzada</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                disabled={loading}
                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:ring-2 focus:ring-[#83E509]/50 transition-all disabled:opacity-60"
                placeholder="admin_kpop"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:ring-2 focus:ring-[#83E509]/50 transition-all disabled:opacity-60"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest text-center animate-pulse">{error}</p>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#83E509] hover:bg-[#83E509]/90 text-slate-950 font-black py-5 rounded-2xl shadow-xl shadow-[#83E509]/10 transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-xs disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin" />
                Entrando
              </>
            ) : (
              'Entrar no Painel'
            )}
          </button>
        </form>

        <button 
          onClick={() => window.location.hash = ''}
          className="w-full text-slate-500 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
        >
          Voltar ao Início
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
