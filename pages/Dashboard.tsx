
import React, { useMemo } from 'react';
import { UserProfile, InterviewResult } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

import { motion } from 'framer-motion';

interface DashboardPageProps {
  user: UserProfile;
  onStartInterview: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 20
    }
  }
};

const DashboardPage: React.FC<DashboardPageProps> = ({ user, onStartInterview }) => {
  const history: InterviewResult[] = useMemo(() => {
    return JSON.parse(localStorage.getItem('interview_history') || '[]');
  }, []);

  const stats = useMemo(() => {
    if (history.length === 0) return { avgScore: 0, count: 0, lastCategories: [] };
    const avgScore = Math.round(history.reduce((acc, curr) => acc + curr.overallScore, 0) / history.length);
    return {
      avgScore,
      count: history.length,
      lastCategories: history[0].categories
    };
  }, [history]);

  return (
    <motion.div
      className="space-y-12 pt-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Area */}
      <motion.header variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-[rgba(255,255,255,0.05)]">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-[var(--neon-cyan)] px-2 py-0.5 border border-[var(--neon-cyan)]/20 bg-[var(--neon-cyan)]/5">System.Active</span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-[var(--text-muted)]">User: {user.name.split(' ')[0]}</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-white font-mono">
            Dashboard<span className="text-[var(--neon-emerald)]">.io</span>
          </h1>
        </div>
        <button
          onClick={onStartInterview}
          className="btn-primary flex items-center gap-4 py-5 px-10 text-base"
          style={{ background: 'var(--neon-emerald)', color: '#000' }}
        >
          <i className="fa-solid fa-bolt-lightning text-lg"></i>
          Execute_New_Session
        </button>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Metrics Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Sessions */}
            <div className="bento-card group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 border border-[rgba(255,255,255,0.05)] flex items-center justify-center bg-[var(--bg-accent)] group-hover:border-[var(--neon-cyan)] transition-colors">
                  <i className="fa-solid fa-database text-sm text-[var(--text-secondary)] group-hover:text-[var(--neon-cyan)]"></i>
                </div>
                <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-widest">metric_01</span>
              </div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-1 text-[var(--text-muted)]">Total_Sessions</p>
              <h3 className="text-5xl font-mono font-black text-white">{stats.count.toString().padStart(2, '0')}</h3>
            </div>

            {/* Performance Index */}
            <div className="bento-card group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 border border-[rgba(255,255,255,0.05)] flex items-center justify-center bg-[var(--bg-accent)] group-hover:border-[var(--neon-orange)] transition-colors">
                  <i className="fa-solid fa-chart-line text-sm text-[var(--text-secondary)] group-hover:text-[var(--neon-orange)]"></i>
                </div>
                <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-widest">metric_02</span>
              </div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-1 text-[var(--text-muted)]">Performance_Index</p>
              <h3 className="text-5xl font-mono font-black text-white">{stats.avgScore}<span className="text-sm ml-1 text-[var(--text-muted)]">%</span></h3>
            </div>

            {/* System Status */}
            <div className="bento-card group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 border border-[rgba(255,255,255,0.05)] flex items-center justify-center bg-[var(--bg-accent)] group-hover:border-[var(--neon-emerald)] transition-colors">
                  <i className="fa-solid fa-microchip text-sm text-[var(--text-secondary)] group-hover:text-[var(--neon-emerald)]"></i>
                </div>
                <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-widest">metric_03</span>
              </div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-1 text-[var(--text-muted)]">System_Status</p>
              <h3 className="text-5xl font-mono font-black text-[var(--neon-emerald)] uppercase">{history.length > 0 ? 'Live' : 'Rdy'}</h3>
            </div>
          </motion.div>

          {/* Activity Stream */}
          <motion.div variants={itemVariants} className="glass-panel rounded-lg overflow-hidden border border-[rgba(255,255,255,0.05)]">
            <div className="p-6 bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
              <h3 className="font-mono text-xs uppercase font-bold tracking-[0.4em] text-white">Activity_Stream</h3>
              <div className="flex gap-2">
                <span className="text-[9px] font-mono text-[var(--neon-cyan)] uppercase cursor-pointer hover:underline tracking-widest">Export_Logs</span>
              </div>
            </div>

            <div className="p-2">
              {history.length > 0 ? history.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-6 rounded-sm transition-all duration-200 hover:bg-[var(--bg-accent)] group border-b border-[rgba(255,255,255,0.03)] last:border-0">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 border border-[rgba(255,255,255,0.05)] flex items-center justify-center transition-all duration-200 group-hover:border-[var(--neon-cyan)] bg-[var(--bg-surface)]">
                      <i className="fa-solid fa-code text-sm text-[var(--text-muted)] group-hover:text-[var(--neon-cyan)]"></i>
                    </div>
                    <div>
                      <p className="font-mono font-bold text-sm text-white uppercase tracking-tight group-hover:text-[var(--neon-cyan)] transition-colors">{session.role}</p>
                      <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-tighter mt-1">
                        {session.company} // {new Date(session.date).toISOString().split('T')[0]}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-2xl font-black text-white">{session.overallScore.toString().padStart(3, '0')}</p>
                    <p className="text-[8px] font-mono uppercase font-bold tracking-widest text-[var(--text-muted)]">pts_total</p>
                  </div>
                </div>
              )) : (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-50">
                  <i className="fa-solid fa-box-open text-4xl mb-4 text-[var(--text-muted)]"></i>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white">Null_History_Detected</p>
                  <p className="font-mono text-[9px] text-[var(--text-muted)] mt-2">No session logs found in primary storage.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Neural Analysis (Radar) */}
        <motion.div variants={itemVariants} className="lg:col-span-4 glass-panel rounded-lg border border-[rgba(255,255,255,0.05)] flex flex-col">
          <div className="p-6 bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.05)]">
            <h3 className="font-mono text-xs uppercase font-bold tracking-[0.4em] text-white">Neural_Analysis</h3>
            <p className="font-mono text-[9px] mt-1 text-[var(--text-muted)] uppercase tracking-tighter">Skill pattern recognition data</p>
          </div>

          <div className="flex-1 p-6 flex items-center justify-center min-h-[400px]">
            {stats.lastCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={stats.lastCategories}>
                  <PolarGrid stroke="rgba(255, 255, 255, 0.05)" radialLines={true} />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fill: '#475569', fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono' }}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="var(--neon-cyan)"
                    strokeWidth={2}
                    fill="var(--neon-cyan)"
                    fillOpacity={0.15}
                    animationDuration={1500}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center text-center px-10">
                <div className="w-12 h-12 border border-dashed border-[rgba(255,255,255,0.1)] rounded-full flex items-center justify-center mb-6">
                  <i className="fa-solid fa-radar text-[var(--text-muted)] animate-pulse"></i>
                </div>
                <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em] leading-relaxed">
                  Insufficient_Data:<br />Please initiate a session to map skill matrices.
                </p>
              </div>
            )}
          </div>

          {stats.lastCategories.length > 0 && (
            <div className="p-6 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)]">
              <div className="flex items-center justify-between font-mono text-[9px] text-[var(--text-secondary)] uppercase tracking-widest">
                <span>Sync_Status</span>
                <span className="text-[var(--neon-emerald)]">100%_Optimal</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
