
import React from 'react';
import { ContestType } from '../types';
import { Music, Camera, Gamepad2, Mic, Store, Zap, Home } from 'lucide-react';

interface HeaderProps {
  activeContest: ContestType | 'home';
  setActiveContest: (type: ContestType | 'home') => void;
}

const Header: React.FC<HeaderProps> = ({ activeContest, setActiveContest }) => {
  const menuItems: { id: ContestType | 'home'; label: string; icon: any }[] = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'kpop', label: 'K-Pop', icon: Music },
    { id: 'cosplayer', label: 'CosplayerPerf.', icon: Camera },
    { id: 'arena', label: 'Arena Gamer', icon: Gamepad2 },
    { id: 'imprensa', label: 'Imprensa', icon: Mic },
    { id: 'estandista', label: 'Expositores', icon: Store },
    { id: 'usinageek', label: 'Usina Geek', icon: Zap },
  ];

  return (
    <header className="bg-slate-900/50 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveContest('home')}>
            <img 
              src="https://geekzada.com.br/wp-content/uploads/elementor/thumbs/logo-Geekzada26-1-ri1ioubbp1dybect7ciboteekxwmsenbfzooro2k4o.png" 
              alt="Geekzada" 
              className="h-10 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <nav className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveContest(item.id)}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  activeContest === item.id 
                    ? 'bg-[#83E509] text-slate-950 shadow-lg shadow-[#83E509]/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-3 h-3" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="lg:hidden">
            {/* Mobile menu could go here, but keeping it simple for now to restore build */}
            <select 
              value={activeContest} 
              onChange={(e) => setActiveContest(e.target.value as any)}
              className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none"
            >
              {menuItems.map(item => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
