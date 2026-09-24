/**
 * Auth page — Enterprise SaaS login/registration with client-side hashing & instant demo.
 */

import React, { useState } from 'react';
import { UserProfile } from '../types';
import { hashPassword, passwordsMatch, stripPassword, needsRehash } from '../services/authCrypto';

interface AuthPageProps {
  onLogin: (user: UserProfile) => void;
}

interface RegisteredUser extends UserProfile {
  password?: string;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRegisteredUsers = (): RegisteredUser[] => {
    const data = localStorage.getItem('prep_ai_users');
    return data ? (JSON.parse(data) as RegisteredUser[]) : [];
  };

  const persistUsers = (users: RegisteredUser[]) => {
    localStorage.setItem('prep_ai_users', JSON.stringify(users));
  };

  const handleInstantGuestDemo = () => {
    const guestUser: UserProfile = {
      name: 'Alex Rivera',
      email: 'alex.rivera@demo.prepai.local',
      skills: ['System Design', 'React', 'TypeScript', 'Node.js', 'Distributed Systems'],
      education: 'B.S. in Computer Science',
      experience: '4+ years building full-stack applications and distributed microservices',
      projects: 'Real-time collaborative whiteboard, High-throughput API gateway in Go',
      careerGoals: 'Staff Software Engineer at a fast-growing tech company',
      onboarded: true,
    };
    onLogin(guestUser);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const users = getRegisteredUsers();

      if (isLogin) {
        const existingUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (!existingUser || !(await passwordsMatch(password, existingUser.password))) {
          setError('Invalid email or password. You can also test with the Instant Guest Demo above.');
          return;
        }

        // Migrate legacy plaintext / unsalted SHA-256 to PBKDF2
        if (existingUser.password && needsRehash(existingUser.password)) {
          existingUser.password = await hashPassword(password);
          const idx = users.findIndex((u) => u.email === existingUser.email);
          if (idx !== -1) {
            users[idx] = existingUser;
            persistUsers(users);
          }
        }

        onLogin(stripPassword(existingUser) as UserProfile);
      } else {
        const emailExists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
        if (emailExists) {
          setError('That email is already registered. Sign in instead.');
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          return;
        }

        const hashed = await hashPassword(password);
        const newUser: RegisteredUser = {
          name: name || email.split('@')[0],
          email: email,
          password: hashed,
          skills: [],
          education: '',
          experience: '',
          projects: '',
          careerGoals: '',
          onboarded: false,
        };

        persistUsers([...users, newUser]);
        onLogin(stripPassword(newUser) as UserProfile);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden bg-[var(--bg-deep)]">
      {/* Ambient Focal Glows */}
      <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] bg-[var(--neon-cyan)] opacity-[0.035] blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-15%] left-[-10%] w-[45%] h-[45%] bg-[var(--neon-emerald)] opacity-[0.03] blur-[140px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-5xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: SaaS Value Proposition (Hidden on very small mobile) */}
        <div className="lg:col-span-6 space-y-8 p-4 sm:p-8">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[var(--neon-emerald)]/30 bg-[var(--neon-emerald)]/10 text-[var(--neon-emerald)] font-mono text-[10px] font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[var(--neon-emerald)] animate-pulse"></span>
            100% Free · Open-Source AI
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white font-mono leading-none">
              PrepAI <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--neon-emerald)] to-[var(--neon-cyan)]">
                Studio
              </span>
            </h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-sans max-w-md">
              Master technical and behavioral interviews with real-time audio conversations,
              adaptive follow-up questions, and STAR methodology feedback.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-md border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] space-y-1.5">
              <div className="text-[var(--neon-cyan)] text-base mb-1">
                <i className="fa-solid fa-microphone-lines"></i>
              </div>
              <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Voice Powered</h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-normal">
                Sub-second speech recognition and lifelike browser voice synthesis.
              </p>
            </div>

            <div className="p-4 rounded-md border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] space-y-1.5">
              <div className="text-[var(--neon-emerald)] text-base mb-1">
                <i className="fa-solid fa-brain"></i>
              </div>
              <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Llama 3.3 70B</h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-normal">
                High-intelligence evaluations matching real FAANG / top-firm standards.
              </p>
            </div>

            <div className="p-4 rounded-md border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] space-y-1.5">
              <div className="text-[var(--neon-orange)] text-base mb-1">
                <i className="fa-solid fa-chart-pie"></i>
              </div>
              <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Deep Analytics</h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-normal">
                STAR structure grading, filler word analysis, and printable PDF reports.
              </p>
            </div>

            <div className="p-4 rounded-md border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] space-y-1.5">
              <div className="text-[var(--neon-violet)] text-base mb-1">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Privacy First</h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-normal">
                Local-first architecture. Password hashed on device via PBKDF2.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="glass-panel p-6 sm:p-8 rounded-lg border border-[var(--glass-border)] shadow-2xl relative">
            {/* Quick Demo CTA Button */}
            <div className="mb-6">
              <button
                type="button"
                onClick={handleInstantGuestDemo}
                className="w-full py-3.5 px-4 rounded-md font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-3
                  bg-gradient-to-r from-[var(--neon-cyan)]/15 to-[var(--neon-emerald)]/15 border border-[var(--neon-cyan)]/40 text-white hover:border-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/25 shadow-lg"
              >
                <i className="fa-solid fa-bolt text-[var(--neon-cyan)] text-sm"></i>
                <span>Try Instant Demo (1-Click)</span>
              </button>
              <p className="font-mono text-[9px] text-[var(--text-muted)] text-center uppercase tracking-widest mt-2">
                No registration required · instant access
              </p>
            </div>

            <div className="relative flex py-2 items-center mb-6">
              <div className="flex-grow border-t border-[var(--glass-border)]"></div>
              <span className="flex-shrink mx-4 font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">
                Or sign in with account
              </span>
              <div className="flex-grow border-t border-[var(--glass-border)]"></div>
            </div>

            {/* Tab Switcher */}
            <div className="flex rounded-md p-1 bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                }}
                className={`flex-1 py-2 font-mono text-xs uppercase font-bold tracking-wider rounded transition-all ${
                  isLogin
                    ? 'bg-[var(--bg-accent)] text-white shadow-sm border border-[rgba(255,255,255,0.1)]'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                }}
                className={`flex-1 py-2 font-mono text-xs uppercase font-bold tracking-wider rounded transition-all ${
                  !isLogin
                    ? 'bg-[var(--bg-accent)] text-white shadow-sm border border-[rgba(255,255,255,0.1)]'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Notification */}
            {error && (
              <div
                role="alert"
                className="mb-6 p-3.5 rounded-sm border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-mono flex items-start gap-2.5 animate-fadeIn"
              >
                <i className="fa-solid fa-triangle-exclamation text-sm shrink-0 mt-0.5"></i>
                <span>{error}</span>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="label-premium">Full Name</label>
                  <input
                    type="text"
                    required
                    className="input-premium"
                    placeholder="e.g. Sarah Connor"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="label-premium">Email Address</label>
                <input
                  type="email"
                  required
                  className="input-premium"
                  placeholder="candidate@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="label-premium mb-0">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] hover:text-white"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-premium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  minLength={isLogin ? 1 : 6}
                />
                {!isLogin && (
                  <p className="font-mono text-[9px] text-[var(--text-muted)]">Minimum 6 characters</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-4 text-xs font-mono font-bold tracking-widest mt-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch animate-spin"></i>
                    <span>Authenticating…</span>
                  </>
                ) : (
                  <>
                    <i className={isLogin ? 'fa-solid fa-arrow-right-to-bracket' : 'fa-solid fa-user-plus'}></i>
                    <span>{isLogin ? 'Sign In to Workspace' : 'Create Free Account'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Bottom Utilities */}
            <div className="mt-8 pt-6 border-t border-[var(--glass-border)] flex items-center justify-between font-mono text-[9px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-lock text-[var(--neon-emerald)]"></i>
                PBKDF2 Encrypted
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear all local PrepAI storage and cache on this device?')) {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }
                }}
                className="hover:text-red-400 transition-colors uppercase tracking-wider"
              >
                Reset Storage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
