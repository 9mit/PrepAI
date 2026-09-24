import React, { useState } from 'react';
import { AppRoute, UserProfile } from '../types';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  currentRoute: AppRoute;
  user: UserProfile | null;
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
}

const ROUTE_NAMES: Record<AppRoute, string> = {
  [AppRoute.AUTH]: 'Authentication',
  [AppRoute.ONBOARDING]: 'Onboarding',
  [AppRoute.DASHBOARD]: 'Overview Dashboard',
  [AppRoute.INTERVIEW]: 'Mock Interview',
  [AppRoute.QUIZ]: 'Practice Quizzes',
  [AppRoute.ANALYTICS]: 'Analytics & History',
  [AppRoute.PROFILE]: 'Candidate Profile',
  [AppRoute.PRIVACY]: 'Privacy Policy',
  [AppRoute.TERMS]: 'Terms of Service',
};

const Layout: React.FC<LayoutProps> = ({ children, currentRoute, user, onNavigate, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-deep)] text-[var(--text-primary)]">
      {/* Sidebar with responsive mobile overlay */}
      <Sidebar
        currentRoute={currentRoute}
        user={user}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)] bg-[var(--bg-charcoal)]/90 backdrop-blur-md z-30">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-white rounded-md focus:outline-none"
            aria-label="Open navigation menu"
          >
            <i className="fa-solid fa-bars text-lg"></i>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-white tracking-tight">
              {ROUTE_NAMES[currentRoute] || 'PrepAI'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate(AppRoute.PROFILE)}
            className="w-8 h-8 rounded-sm border border-[var(--glass-border)] flex items-center justify-center text-xs font-mono font-bold bg-[var(--bg-accent)] text-[var(--neon-cyan)]"
            aria-label="Open profile"
          >
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </button>
        </header>

        {/* Ambient Focal Glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <div className="absolute top-[-10%] right-[-5%] w-[45%] h-[45%] bg-[var(--neon-cyan)] opacity-[0.035] blur-[140px] rounded-full"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[35%] bg-[var(--neon-emerald)] opacity-[0.025] blur-[120px] rounded-full"></div>
        </div>

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide flex flex-col">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 lg:p-10 relative z-10 w-full flex-1">
            {children}
          </div>

          {/* Clean SaaS Footer */}
          <footer className="relative z-10 border-t border-[var(--glass-border)] bg-[rgba(5,7,13,0.5)] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[10px] text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-emerald)]"></span>
              <span>PrepAI · 100% Free AI Interview Coach</span>
            </div>
            <div className="flex items-center gap-6 uppercase tracking-wider">
              <button
                type="button"
                className="hover:text-white transition-colors"
                onClick={() => onNavigate(AppRoute.PRIVACY)}
              >
                Privacy
              </button>
              <button
                type="button"
                className="hover:text-white transition-colors"
                onClick={() => onNavigate(AppRoute.TERMS)}
              >
                Terms
              </button>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors flex items-center gap-1.5"
              >
                <i className="fa-brands fa-github text-xs"></i>
                Open Source
              </a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default Layout;
