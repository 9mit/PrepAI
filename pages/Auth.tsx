
import React, { useState } from 'react';
import { UserProfile } from '../types';

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

  const getRegisteredUsers = (): RegisteredUser[] => {
    const data = localStorage.getItem('prep_ai_users');
    return data ? JSON.parse(data) : [];
  };

  const saveUser = (user: RegisteredUser) => {
    const users = getRegisteredUsers();
    localStorage.setItem('prep_ai_users', JSON.stringify([...users, user]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const users = getRegisteredUsers();

    if (isLogin) {
      const existingUser = users.find(u => u.email === email && u.password === password);

      if (existingUser) {
        onLogin(existingUser);
      } else {
        setError('AUTH_FAILURE: Check credentials. Redirecting...');
        setTimeout(() => {
          setIsLogin(false);
          setError('');
        }, 2000);
      }
    } else {
      const emailExists = users.some(u => u.email === email);

      if (emailExists) {
        setError('AUTH_CONFLICT: Email already registered.');
        return;
      }

      const newUser: RegisteredUser = {
        name: name || email.split('@')[0],
        email: email,
        password: password,
        skills: [],
        education: '',
        experience: '',
        projects: '',
        careerGoals: '',
        onboarded: false,
      };

      saveUser(newUser);
      onLogin(newUser);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[var(--bg-deep)]">
      {/* Subtle Matrix/Developer Focal Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--neon-cyan)] opacity-[0.03] blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[var(--neon-emerald)] opacity-[0.02] blur-[80px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-sm relative z-10 animate-fadeIn font-mono">
        {/* Branding Terminal Style */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 border border-[var(--neon-emerald)] bg-[var(--neon-emerald)]/5 mb-6 shadow-[var(--glow-emerald)]">
            <i className="fa-solid fa-code text-2xl text-[var(--neon-emerald)]"></i>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-1">PrepAI<span className="text-[var(--neon-emerald)]">_OS</span></h1>
          <p className="text-[9px] font-bold tracking-[0.4em] text-[var(--text-muted)] uppercase">Identity_Verification_Protocol</p>
        </div>

        {/* Auth Box */}
        <div className="border border-[rgba(255,255,255,0.05)] bg-[var(--bg-surface)] p-10 shadow-2xl">
          <div className="mb-10 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)] animate-pulse"></div>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">
              {isLogin ? 'Access_Grant_Required' : 'New_User_Registration'}
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
                <label className="label-premium">User_Full_Name</label>
                <input
                  type="text"
                  required
                  className="input-premium"
                  placeholder="HOST_NAME"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-3">
              <label className="label-premium">Host_Email_Uplink</label>
              <input
                type="email"
                required
                className="input-premium"
                placeholder="USER@DOMAIN.LAN"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <label className="label-premium">Credential_Key</label>
              <input
                type="password"
                required
                className="input-premium"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-5 text-sm tracking-[0.2em] mt-4"
              style={{ background: 'var(--neon-emerald)', color: '#000' }}
            >
              {isLogin ? 'Execute_Login()' : 'Commit_Record()'}
            </button>
          </form>

          {/* Nav Toggle */}
          <div className="mt-10 pt-8 border-t border-[rgba(255,255,255,0.05)] text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] hover:text-white transition-colors"
            >
              {isLogin ? (
                <>New_Host? <span className="text-[var(--neon-cyan)] underline underline-offset-4 tracking-widest ml-1">Create_Account</span></>
              ) : (
                <>Existing_Record? <span className="text-[var(--neon-cyan)] underline underline-offset-4 tracking-widest ml-1">Sign_In</span></>
              )}
            </button>
          </div>
        </div>

        {/* Footer Terminal Info */}
        <div className="mt-12 text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-4 py-2 border border-[rgba(255,255,255,0.05)] bg-black/50">
            <i className="fa-solid fa-lock text-[var(--neon-emerald)] text-[10px]"></i>
            <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">Encrypted_AES_256</span>
          </div>

          <div className="block pt-8">
            <button
              onClick={() => {
                if (confirm('FACTORY_RESET: Confirm deletion of all local identity records?')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="text-[8px] uppercase font-bold tracking-[0.4em] text-[var(--text-muted)] hover:text-red-500 transition-colors opacity-40 hover:opacity-100"
            >
              [!] Purge_Application_State
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
