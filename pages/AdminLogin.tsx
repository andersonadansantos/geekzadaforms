
import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';

interface AdminLoginProps {
  onLogin: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple admin credentials updated to 2026
    if (username === 'admin' && password === 'geekzada2026') {
      sessionStorage.setItem('admin_logged_in', 'true');
      onLogin();
    } else {
      setError('Credenciais inválidas. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="bg-purple-600/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
            <Lock className="text-purple-500 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Painel Admin</h2>
          <p className="text-slate-400">Acesse para gerenciar as inscrições</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Usuário</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-slate-500 w-5 h-5" />
              <input 
                required 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Usuário" 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white outline-none focus:ring-2 focus:ring-purple-500" 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-slate-500 w-5 h-5" />
              <input 
                required 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white outline-none focus:ring-2 focus:ring-purple-500" 
              />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm text-center font-medium">{error}</p>}
          <button 
            type="submit" 
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-purple-500/20 transition-all transform active:scale-[0.98]"
          >
            ENTRAR NO PAINEL
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <button 
            onClick={() => window.location.hash = ''} 
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Voltar para o site
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
