import React from 'react';
import { AppRoute, UserProfile } from '../types';
import { NAVIGATION_ITEMS } from '../constants';
import GithubSidebar from './GithubSidebar';

interface SidebarProps {
  currentRoute: AppRoute;
  user: UserProfile | null;
  isOpen?: boolean;
  onClose?: () => void;
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  user,
  isOpen = false,
  onClose,
  onNavigate,
  onLogout,
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleNavClick = (route: AppRoute) => {
    onNavigate(route);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed md:static top-0 bottom-0 left-0 z-50
          w-72 flex flex-col border-r border-[var(--glass-border)] bg-[var(--bg-charcoal)]
          transition-transform duration-300 ease-in-out md:translate-x-0
          ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
          h-full overflow-y-auto scrollbar-hide
        `}
      >
        {/* Brand Area */}
        <div className="p-6 border-b border-[var(--glass-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm border border-[var(--neon-emerald)] flex items-center justify-center bg-[var(--neon-emerald)]/10 shadow-[var(--glow-emerald)]">
              <i className="fa-solid fa-code text-base text-[var(--neon-emerald)]"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-mono font-black tracking-tight text-white block leading-none">
                  PrepAI
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider bg-[var(--neon-emerald)]/15 text-[var(--neon-emerald)] border border-[var(--neon-emerald)]/30">
                  Free
                </span>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-[var(--text-muted)] mt-1 block">
                AI Interview Coach
              </span>
            </div>
          </div>

          {/* Close button for mobile */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="md:hidden p-2 text-[var(--text-secondary)] hover:text-white"
              aria-label="Close menu"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          )}
        </div>

        {/* Live Engine Indicator */}
        <div className="px-6 py-3 bg-[rgba(255,255,255,0.02)] border-b border-[var(--glass-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--neon-emerald)] animate-pulse"></span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">
              Engine: <strong className="text-white">Llama 3.3 70B</strong>
            </span>
          </div>
          <span className="text-[8px] font-mono text-[var(--neon-cyan)] uppercase tracking-widest">
            Ready
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1.5 py-6">
          <div className="text-[9px] font-mono font-bold uppercase tracking-[0.3em] px-4 py-2 text-[var(--text-muted)]">
            Platform Navigation
          </div>
          {NAVIGATION_ITEMS.map((item) => {
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id as AppRoute)}
                className={`
                  w-full flex items-center gap-3.5 px-4 py-3 rounded-md transition-all duration-200 group relative text-left
                  ${
                    isActive
                      ? 'bg-[var(--bg-accent)] text-white border border-[rgba(255,255,255,0.08)] shadow-[0_2px_12px_rgba(0,0,0,0.4)]'
                      : 'text-[var(--text-secondary)] hover:text-white hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
                  }
                `}
              >
                <span
                  className={`text-lg transition-transform duration-200 flex items-center justify-center w-6 ${
                    isActive ? 'text-[var(--neon-cyan)] scale-110' : 'group-hover:text-[var(--neon-cyan)]'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="font-mono text-xs uppercase tracking-wider font-medium leading-none">
                  {item.label}
                </span>

                {isActive && (
                  <>
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[var(--neon-cyan)] rounded-r shadow-[0_0_10px_var(--neon-cyan)]" />
                    <div className="ml-auto w-1.5 h-1.5 bg-[var(--neon-cyan)] rounded-full"></div>
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Area */}
        <div className="mt-auto border-t border-[var(--glass-border)] bg-[rgba(0,0,0,0.2)]">
          {/* GitHub Integration */}
          {user && user.githubUrl && (
            <div className="p-4 border-b border-[var(--glass-border)]">
              <GithubSidebar user={user} />
            </div>
          )}

          {/* User Profile Card */}
          <div className="p-4">
            <div className="p-3.5 bg-[var(--bg-surface)] border border-[var(--glass-border)] rounded-md">
              <button
                onClick={() => handleNavClick(AppRoute.PROFILE)}
                className="flex items-center gap-3 mb-3.5 w-full text-left group transition-all"
              >
                <div className="w-9 h-9 rounded-sm border border-[rgba(255,255,255,0.12)] flex items-center justify-center text-xs font-mono font-bold bg-[var(--bg-accent)] text-white group-hover:border-[var(--neon-cyan)] group-hover:text-[var(--neon-cyan)] transition-colors">
                  {user ? getInitials(user.name) : 'GC'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-bold truncate text-white uppercase group-hover:text-[var(--neon-cyan)] transition-colors">
                    {user?.name || 'Guest Candidate'}
                  </p>
                  <p className="text-[10px] font-mono truncate tracking-tight text-[var(--text-muted)] lowercase">
                    {user?.email || 'free-tier@prepai.local'}
                  </p>
                </div>
              </button>

              <button
                onClick={onLogout}
                className="w-full py-2 px-3 text-[10px] font-mono font-semibold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2
                   rounded-sm border border-red-500/20 text-red-400/80 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400"
              >
                <i className="fa-solid fa-power-off text-xs"></i>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
