
import React from 'react';
import { AppRoute, UserProfile } from '../types';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  currentRoute: AppRoute;
  user: UserProfile | null;
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentRoute, user, onNavigate, onLogout }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-deep)] text-[var(--text-primary)]">
      <Sidebar currentRoute={currentRoute} user={user} onNavigate={onNavigate} onLogout={onLogout} />

      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        {/* Ambient Developer Background - Subtle Dot Grid is in Body, but we add a focal glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[var(--neon-cyan)] opacity-[0.03] blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-[var(--neon-emerald)] opacity-[0.02] blur-[100px] rounded-full"></div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
          <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12 relative z-10 w-full animate-fadeIn font-sans">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
