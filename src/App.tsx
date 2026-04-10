
import React, { useState, useEffect, useCallback } from 'react';
import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { AppRoute, ContestType } from './types';

const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.LANDING);
  const [activeContest, setActiveContest] = useState<ContestType | 'home'>('home');

  const handleRouteUpdate = useCallback(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#admin')) {
      const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
      setCurrentRoute(isLoggedIn ? AppRoute.ADMIN_DASHBOARD : AppRoute.ADMIN_LOGIN);
    } else if (hash === '#cosplayerperformance') {
      setActiveContest('cosplayer');
      setCurrentRoute(AppRoute.LANDING);
    } else if (hash === '#arena') {
      setActiveContest('arena');
      setCurrentRoute(AppRoute.LANDING);
    } else if (hash === '#imprensa') {
      setActiveContest('imprensa');
      setCurrentRoute(AppRoute.LANDING);
    } else if (hash === '#estandista') {
      setActiveContest('estandista');
      setCurrentRoute(AppRoute.LANDING);
    } else if (hash === '#usinageek') {
      setActiveContest('usinageek');
      setCurrentRoute(AppRoute.LANDING);
    } else if (hash === '#kpop') {
      setActiveContest('kpop');
      setCurrentRoute(AppRoute.LANDING);
    } else {
      setActiveContest('home');
      setCurrentRoute(AppRoute.LANDING);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('hashchange', handleRouteUpdate);
    handleRouteUpdate();

    return () => window.removeEventListener('hashchange', handleRouteUpdate);
  }, [handleRouteUpdate]);

  const navigate = (route: string) => {
    const hash = route === 'cosplayer' ? 'cosplayerperformance' : route;
    window.location.hash = hash;
  };

  const renderContent = () => {
    switch (currentRoute) {
      case AppRoute.ADMIN_LOGIN:
        return (
          <AdminLogin 
            onLogin={() => {
              handleRouteUpdate();
            }} 
          />
        );
      case AppRoute.ADMIN_DASHBOARD:
        return (
          <AdminDashboard 
            onLogout={() => {
              sessionStorage.removeItem('admin_logged_in');
              navigate('');
            }} 
          />
        );
      case AppRoute.LANDING:
      default:
        return (
          <LandingPage 
            activeContest={activeContest} 
            setActiveContest={(type) => navigate(type)}
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
