/**
 * Auth page — client-only registration/login with hashed passwords.
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
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRegisteredUsers = (): RegisteredUser[] => {
    const data = localStorage.getItem('prep_ai_users');
    return data ? JSON.parse(data) as RegisteredUser[] : [];
  };

  const persistUsers = (users: RegisteredUser[]) => {
    localStorage.setItem('prep_ai_users', JSON.stringify(users));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const users = getRegisteredUsers();

      if (isLogin) {
        const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!existingUser || !(await passwordsMatch(password, existingUser.password))) {
          setError('Wrong email or password. Try creating an account if you are new.');
          setTimeout(() => {
            setIsLogin(false);
            setError('');
          }, 2000);
          return;
        }

        // Migrate legacy plaintext / unsalted SHA-256 to PBKDF2
        if (existingUser.password && needsRehash(existingUser.password)) {
          existingUser.password = await hashPassword(password);
          const idx = users.findIndex(u => u.email === existingUser.email);
          if (idx !== -1) {
            users[idx] = existingUser;
            persistUsers(users);
          }
        }

        onLogin(stripPassword(existingUser) as UserProfile);
      } else {
        const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[var(--bg-deep)]">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--neon-cyan)] opacity-[0.03] blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[var(--neon-emerald)] opacity-[0.02] blur-[80px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-sm relative z-10 animate-fadeIn font-mono">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 border border-[var(--neon-emerald)] bg-[var(--neon-emerald)]/5 mb-6 shadow-[var(--glow-emerald)]">
            <i className="fa-solid fa-code text-2xl text-[var(--neon-emerald)]"></i>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-1">PrepAI</h1>
          <p className="text-[9px] font-bold tracking-[0.4em] text-[var(--text-muted)] uppercase">Interview practice</p>
        </div>

        <div className="border border-[rgba(255,255,255,0.05)] bg-[var(--bg-surface)] p-6 sm:p-10 shadow-2xl">
          <div className="mb-10 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)] animate-pulse"></div>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">
              {isLogin ? 'Sign in' : 'Create account'}
            </h2>
          </div>

          {error && (
            <div className="mb-8 p-4 border border-red-500/30 bg-red-500/5 text-red-500 text-[9px] font-bold uppercase tracking-widest animate-pulse">
              <i className="fa-solid fa-triangle-exclamation mr-2"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {!isLogin && (
              <div className="space-y-3">
                <label className="label-premium">Full name</label>
                <input
                  type="text"
                  required
                  className="input-premium"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-3">
              <label className="label-premium">Email</label>
              <input
                type="email"
                required
                className="input-premium"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-3">
              <label className="label-premium">Password</label>
              <input
                type="password"
                required
                className="input-premium"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                minLength={isLogin ? 1 : 6}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-5 text-sm tracking-[0.2em] mt-4 disabled:opacity-60"
              style={{ background: 'var(--neon-emerald)', color: '#000' }}
            >
              {isSubmitting ? 'Please wait…' : (isLogin ? 'Sign in' : 'Create account')}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-[rgba(255,255,255,0.05)] text-center">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] hover:text-white transition-colors"
            >
              {isLogin ? (
                <>New here? <span className="text-[var(--neon-cyan)] underline underline-offset-4 tracking-widest ml-1">Create account</span></>
              ) : (
                <>Already have an account? <span className="text-[var(--neon-cyan)] underline underline-offset-4 tracking-widest ml-1">Sign in</span></>
              )}
            </button>
          </div>
        </div>

        <div className="mt-12 text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-4 py-2 border border-[rgba(255,255,255,0.05)] bg-black/50">
            <i className="fa-solid fa-lock text-[var(--neon-emerald)] text-[10px]"></i>
            <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">Password stored securely on this device</span>
          </div>

          <div className="block pt-8">
            <button
              type="button"
              onClick={() => {
                if (confirm('Clear all local PrepAI data on this device?')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="text-[8px] uppercase font-bold tracking-[0.4em] text-[var(--text-muted)] hover:text-red-500 transition-colors opacity-40 hover:opacity-100"
            >
              Clear local data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
