
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

import { AnimatePresence, motion } from 'framer-motion';

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
        const userData = JSON.parse(savedUser) as UserProfile;
        setUser(userData);
        // Navigate to appropriate page based on onboarding status
        if (!userData.onboarded) {
          navigate(AppRoute.ONBOARDING);
        } else {
          // Restore last route or go to dashboard
          const lastRoute = localStorage.getItem('last_route') as AppRoute;
          navigate(lastRoute && lastRoute !== AppRoute.AUTH ? lastRoute : AppRoute.DASHBOARD);
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
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

  // Helper to update user in localStorage
  const updateUserInStorage = (updatedUser: UserProfile) => {
    const users = JSON.parse(localStorage.getItem('prep_ai_users') || '[]');
    const userIndex = users.findIndex((u: UserProfile) => u.email === updatedUser.email);

    if (userIndex !== -1) {
      users[userIndex] = updatedUser;
    } else {
      users.push(updatedUser);
    }

    localStorage.setItem('prep_ai_users', JSON.stringify(users));
  };

  const handleLogin = (userData: UserProfile) => {
    setUser(userData);
    localStorage.setItem('current_user', JSON.stringify(userData));

    // Smart Check: If user has skills/experience but flag is false, treat as onboarded
    // This fixes "existing users getting asked again"
    const hasData = (userData.skills && userData.skills.length > 0) ||
      (userData.experience && userData.experience.length > 5);

    if (userData.onboarded || hasData) {
      // Auto-repair flag if needed
      if (!userData.onboarded) {
        const fixedUser = { ...userData, onboarded: true };
        setUser(fixedUser);
        updateUserInStorage(fixedUser);
        localStorage.setItem('current_user', JSON.stringify(fixedUser));
      }
      navigate(AppRoute.DASHBOARD);
    } else {
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
    setUser(updatedUser);
    updateUserInStorage(updatedUser); // Save to localStorage
    // Update current session
    localStorage.setItem('current_user', JSON.stringify(updatedUser));
    navigate(AppRoute.DASHBOARD);
  };

  const handleProfileUpdate = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    updateUserInStorage(updatedUser); // Save to localStorage
    // Update current session
    localStorage.setItem('current_user', JSON.stringify(updatedUser));
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
