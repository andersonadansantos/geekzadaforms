
import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { AppRoute, ContestType } from './types';

const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.LANDING);
  const [activeContest, setActiveContest] = useState<ContestType>('kpop');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#admin')) {
        const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
        setCurrentRoute(isLoggedIn ? AppRoute.ADMIN_DASHBOARD : AppRoute.ADMIN_LOGIN);
      } else if (hash === '#cospobre') {
        setActiveContest('cospobre');
        setCurrentRoute(AppRoute.LANDING);
      } else if (hash === '#cosplayer') {
        setActiveContest('cosplayer');
        setCurrentRoute(AppRoute.LANDING);
      } else if (hash === '#arena') {
        setActiveContest('arena');
        setCurrentRoute(AppRoute.LANDING);
      } else {
        setActiveContest('kpop');
        setCurrentRoute(AppRoute.LANDING);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (route: string) => {
    window.location.hash = route;
  };

  const renderContent = () => {
    switch (currentRoute) {
      case AppRoute.ADMIN_LOGIN:
        return <AdminLogin onLogin={() => navigate('admin')} />;
      case AppRoute.ADMIN_DASHBOARD:
        return <AdminDashboard onLogout={() => {
          sessionStorage.removeItem('admin_logged_in');
          navigate('');
        }} />;
      case AppRoute.LANDING:
      default:
        return (
          <LandingPage 
            activeContest={activeContest} 
            setActiveContest={(type) => navigate(type === 'kpop' ? '' : type)}
            onGoAdmin={() => navigate('admin')} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {renderContent()}
    </div>
  );
};

export default App;
