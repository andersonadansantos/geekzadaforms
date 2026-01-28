
import React from 'react';
import { ContestType } from '../types';

interface HeaderProps {
  activeContest: ContestType;
  setActiveContest: (type: ContestType) => void;
}

const Header: React.FC<HeaderProps> = ({ activeContest, setActiveContest }) => {
  return (
    <header className="w-full bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center py-4">
          <img 
            src="https://geekzada.com.br/wp-content/uploads/elementor/thumbs/logo-Geekzada26-1-ri1ioubbp1dybect7ciboteekxwmsenbfzooro2k4o.png" 
            alt="Geekzada Logo" 
            className="h-10 md:h-12 object-contain cursor-pointer hover:scale-105 transition-transform"
            onClick={() => window.location.hash = ''}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
