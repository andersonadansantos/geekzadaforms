
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
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9ff] p-4">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-xl p-10 shadow-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Acesso Restrito</h2>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Painel Administrativo Geekzada</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Usuário</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-12 pr-4 py-4 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all disabled:opacity-60"
                placeholder="seu usuário"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-12 pr-4 py-4 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all disabled:opacity-60"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-xs font-medium text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-lg shadow-sm transition-all active:scale-[0.98] uppercase tracking-wider text-xs disabled:opacity-60 flex items-center justify-center gap-2"
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
          className="w-full text-slate-400 hover:text-blue-600 text-xs font-medium uppercase tracking-wider transition-colors"
        >
          Voltar ao Início
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
