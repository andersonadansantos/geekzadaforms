
import React, { useState, useEffect, useCallback } from 'react';
import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { api, getToken, getStoredUser, clearSession, setUnauthorizedHandler, AdminUser } from './apiClient';
import { AppRoute, ContestType } from './types';

const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.LANDING);
  const [activeContest, setActiveContest] = useState<ContestType | 'home'>('home');
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => getStoredUser());

  const handleRouteUpdate = useCallback(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#admin')) {
      // O token no sessionStorage e so a copia local; quem vale e o
      // servidor. Checamos com /me para nao aceitar sessao ja expirada.
      const token = getToken();
      if (!token) {
        setAdminUser(null);
        setCurrentRoute(AppRoute.ADMIN_LOGIN);
        return;
      }

      setCurrentRoute(AppRoute.ADMIN_DASHBOARD);

      api
        .me()
        .then(({ user }) => setAdminUser(user))
        .catch(() => {
          // Token recusado: volta para o login.
          clearSession();
          setAdminUser(null);
          setCurrentRoute(AppRoute.ADMIN_LOGIN);
        });
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

  // Se qualquer chamada ao painel voltar 401 (sessao expirada, senha
  // trocada em outro navegador), o app volta para a tela de login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAdminUser(null);
      setCurrentRoute(AppRoute.ADMIN_LOGIN);
      navigate('admin');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const navigate = (route: string) => {
    const hash = route === 'cosplayer' ? 'cosplayerperformance' : route;
    window.location.hash = hash;
  };

  const renderContent = () => {
    switch (currentRoute) {
      case AppRoute.ADMIN_LOGIN:
        return (
          <AdminLogin 
            onLogin={(user) => {
              setAdminUser(user);
              handleRouteUpdate();
            }} 
          />
        );
      case AppRoute.ADMIN_DASHBOARD:
        return (
          <AdminDashboard 
            user={adminUser}
            onLogout={() => {
              // Encerra a sessao no servidor antes de limpar o token local.
              api.logout().catch(() => {});
              clearSession();
              setAdminUser(null);
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
