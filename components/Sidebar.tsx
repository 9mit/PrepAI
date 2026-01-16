
import React from 'react';
import { AppRoute, UserProfile } from '../types';
import { NAVIGATION_ITEMS } from '../constants';
import GithubSidebar from './GithubSidebar';

interface SidebarProps {
  currentRoute: AppRoute;
  user: UserProfile | null;
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentRoute, user, onNavigate, onLogout }) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <aside className="w-72 flex flex-col border-r border-[rgba(255,255,255,0.05)] bg-[var(--bg-surface)] backdrop-blur-xl relative z-20 h-full overflow-y-auto scrollbar-hide">
      {/* Logo Area */}
      <div className="p-8 mb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 border border-[var(--neon-emerald)] flex items-center justify-center bg-[var(--neon-emerald)]/5 shadow-[var(--glow-emerald)]">
            <i className="fa-solid fa-code text-lg text-[var(--neon-emerald)]"></i>
          </div>
          <div>
            <span className="text-xl font-mono font-black tracking-tighter text-white block leading-none">PrepAI</span>
            <span className="text-[9px] font-mono uppercase tracking-[0.4em] text-[var(--neon-emerald)]">OS_v1.0</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 py-4">
        <div className="text-[9px] font-mono font-bold uppercase tracking-[0.4em] px-4 py-3 text-[var(--text-muted)]">System.Navigation</div>
        {NAVIGATION_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as AppRoute)}
            className={`
              w-full flex items-center gap-4 px-4 py-3.5 rounded-sm transition-all duration-200 group relative
              ${currentRoute === item.id
                ? 'bg-[var(--bg-accent)] text-white border border-[rgba(255,255,255,0.05)]'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-[rgba(255,255,255,0.02)] border border-transparent'}
            `}
          >
            <span className={`text-xl transition-transform duration-200 ${currentRoute === item.id ? 'text-[var(--neon-cyan)]' : 'group-hover:text-[var(--neon-cyan)]'}`}>
              {item.icon}
            </span>
            <span className="font-mono text-xs uppercase tracking-widest leading-none">{item.label}</span>

            {currentRoute === item.id && (
              <>
                <div className="absolute left-0 w-[2px] h-3/5 bg-[var(--neon-cyan)] shadow-[0_0_10px_var(--neon-cyan)]"></div>
                <div className="ml-auto flex gap-1">
                  <div className="w-1 h-1 bg-[var(--neon-cyan)] rounded-full"></div>
                </div>
              </>
            )}
          </button>
        ))}
      </nav>

      <div className="mt-auto">
        {/* GitHub Integration */}
        {user && user.githubUrl && (
          <div className="px-4 mb-4">
            <GithubSidebar user={user} />
          </div>
        )}

        {/* User Profile Card */}
        <div className="p-4 mx-4 mb-8">
          <div className="p-4 bg-[var(--bg-charcoal)] border border-[rgba(255,255,255,0.05)] rounded-sm">
            <button
              onClick={() => onNavigate(AppRoute.PROFILE)}
              className="flex items-center gap-3 mb-6 w-full text-left group"
            >
              <div className="w-10 h-10 border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-xs font-mono font-bold bg-[rgba(255,255,255,0.02)] text-white group-hover:border-[var(--neon-cyan)] transition-colors">
                {user ? getInitials(user.name) : '??'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-mono font-bold truncate text-white uppercase">{user?.name || 'Local_Host'}</p>
                <p className="text-[10px] font-mono truncate tracking-tight text-[var(--text-muted)] lowercase">{user?.email || 'unauthorized'}</p>
              </div>
            </button>

            <button
              onClick={onLogout}
              className="w-full py-2.5 px-3 text-[10px] font-mono font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2
                 border border-red-500/20 text-red-500/50 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500"
            >
              <i className="fa-solid fa-power-off"></i>
              Terminate_Auth
            </button>
          </div>
        </div>
      </div>
    </aside >
  );
};

export default Sidebar;
