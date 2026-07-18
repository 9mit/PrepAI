
import React, { useState, useEffect } from 'react';
import { AppRoute, UserProfile } from './types';
import AuthPage from './pages/Auth';
import OnboardingPage from './pages/Onboarding';
import DashboardPage from './pages/Dashboard';
import InterviewRoom from './pages/InterviewRoom';
import AnalyticsPage from './pages/Analytics';
import ProfilePage from './pages/ProfilePage';
import QuizPage from './pages/Quiz';
import Layout from './components/Layout';
import { stripPassword } from './services/authCrypto';

import { AnimatePresence, motion } from 'framer-motion';

type StoredUser = UserProfile & { password?: string };

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: 'easeInOut' }
};

const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.AUTH);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Restore user session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      try {
        const userData = stripPassword(JSON.parse(savedUser) as StoredUser) as UserProfile;
        setUser(userData);
        localStorage.setItem('current_user', JSON.stringify(userData));
        if (!userData.onboarded) {
          navigate(AppRoute.ONBOARDING);
        } else {
          const lastRoute = localStorage.getItem('last_route') as AppRoute;
          navigate(lastRoute && lastRoute !== AppRoute.AUTH ? lastRoute : AppRoute.DASHBOARD);
        }
      } catch {
        localStorage.removeItem('current_user');
      }
    }
  }, []);

  // Simple hash-based router simulation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (Object.values(AppRoute).includes(hash as AppRoute)) {
        const route = hash as AppRoute;
        setCurrentRoute(route);
        // Save last route (but not auth)
        if (route !== AppRoute.AUTH && user) {
          localStorage.setItem('last_route', route);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user]);

  const navigate = (route: AppRoute) => {
    window.location.hash = `#/${route}`;
    setCurrentRoute(route);
  };

  // Merge profile fields into prep_ai_users without wiping hashed password
  const updateUserInStorage = (updatedUser: UserProfile) => {
    const users = JSON.parse(localStorage.getItem('prep_ai_users') || '[]') as StoredUser[];
    const userIndex = users.findIndex((u) => u.email === updatedUser.email);
    const safeProfile = stripPassword(updatedUser as StoredUser) as UserProfile;

    if (userIndex !== -1) {
      const existingPassword = users[userIndex].password;
      users[userIndex] = { ...users[userIndex], ...safeProfile, password: existingPassword };
    } else {
      users.push(safeProfile);
    }

    localStorage.setItem('prep_ai_users', JSON.stringify(users));
  };

  const persistSessionUser = (userData: UserProfile) => {
    const safe = stripPassword(userData as StoredUser) as UserProfile;
    setUser(safe);
    localStorage.setItem('current_user', JSON.stringify(safe));
    return safe;
  };

  const handleLogin = (userData: UserProfile) => {
    const hasData = (userData.skills && userData.skills.length > 0) ||
      (userData.experience && userData.experience.length > 5);

    if (userData.onboarded || hasData) {
      const fixedUser = userData.onboarded ? userData : { ...userData, onboarded: true };
      persistSessionUser(fixedUser);
      if (!userData.onboarded) {
        updateUserInStorage(fixedUser);
      }
      navigate(AppRoute.DASHBOARD);
    } else {
      persistSessionUser(userData);
      navigate(AppRoute.ONBOARDING);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('current_user');
    localStorage.removeItem('last_route');
    navigate(AppRoute.AUTH);
  };

  const handleOnboardingComplete = (updatedUser: UserProfile) => {
    updateUserInStorage(updatedUser);
    persistSessionUser(updatedUser);
    navigate(AppRoute.DASHBOARD);
  };

  const handleProfileUpdate = (updatedUser: UserProfile) => {
    updateUserInStorage(updatedUser);
    persistSessionUser(updatedUser);
  };

  const renderRoute = () => {
    let component;
    if (!user && currentRoute !== AppRoute.AUTH) {
      component = <AuthPage onLogin={handleLogin} />;
    } else {
      switch (currentRoute) {
        case AppRoute.AUTH:
          component = <AuthPage onLogin={handleLogin} />;
          break;
        case AppRoute.ONBOARDING:
          component = user ? (
            <OnboardingPage user={user} onComplete={handleOnboardingComplete} />
          ) : <AuthPage onLogin={handleLogin} />;
          break;
        case AppRoute.DASHBOARD:
          component = user ? <DashboardPage user={user} onStartInterview={() => navigate(AppRoute.INTERVIEW)} /> : null;
          break;
        case AppRoute.INTERVIEW:
          component = user ? <InterviewRoom user={user} onFinish={() => navigate(AppRoute.ANALYTICS)} /> : null;
          break;
        case AppRoute.ANALYTICS:
          component = user ? <AnalyticsPage /> : null;
          break;
        case AppRoute.QUIZ:
          component = user ? <QuizPage onNavigate={navigate} /> : null;
          break;
        case AppRoute.PROFILE:
          component = user ? <ProfilePage user={user} onUpdateUser={handleProfileUpdate} /> : null;
          break;
        default:
          component = <AuthPage onLogin={handleLogin} />;
      }
    }

    return (
      <motion.div
        key={currentRoute}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        className="w-full h-full"
      >
        {component}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-deep)]">
      <AnimatePresence mode="wait">
        {currentRoute === AppRoute.AUTH || currentRoute === AppRoute.ONBOARDING || currentRoute === AppRoute.INTERVIEW ? (
          renderRoute()
        ) : (
          <Layout currentRoute={currentRoute} user={user} onNavigate={navigate} onLogout={handleLogout}>
            {renderRoute()}
          </Layout>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
