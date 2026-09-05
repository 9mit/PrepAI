
import React, { useMemo, useState } from 'react';
import { UserProfile, InterviewResult, AppRoute } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { getDashboardRecommendations } from '../services/dashboardRecs';
import { writeInterviewPrefill, writeQuizPrefill, downloadInterviewHistory } from '../services/interviewContext';
import { ROADMAP_CHANGELOG } from '../constants';
import { getDailyChallenge, getWeeklyChallenge, getPracticeStreak, getMonthlySummary } from '../services/growth';
import { DOMAIN_PACKS } from '../services/domainPacks';
import { track } from '../services/telemetry';

import { motion } from 'framer-motion';

interface DashboardPageProps {
  user: UserProfile;
  onStartInterview: () => void;
  onNavigate: (route: AppRoute) => void;
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
      type: "spring" as const,
      stiffness: 120,
      damping: 20
    }
  }
};

const DashboardPage: React.FC<DashboardPageProps> = ({ user, onStartInterview, onNavigate }) => {
  const history: InterviewResult[] = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('interview_history') || '[]') as InterviewResult[];
    } catch {
      return [];
    }
  }, []);

  const [showChangelog, setShowChangelog] = useState(false);

  const stats = useMemo(() => {
    if (history.length === 0) return { avgScore: 0, count: 0, lastCategories: [] as InterviewResult['categories'] };
    const avgScore = Math.round(history.reduce((acc, curr) => acc + curr.overallScore, 0) / history.length);
    return {
      avgScore,
      count: history.length,
      lastCategories: history[0].categories
    };
  }, [history]);

  const recommendations = useMemo(() => getDashboardRecommendations(history), [history]);
  const daily = useMemo(() => getDailyChallenge(), []);
  const weekly = useMemo(() => getWeeklyChallenge(), []);
  const streak = getPracticeStreak();
  const monthly = useMemo(() => getMonthlySummary(history), [history]);
  const recentPacks = DOMAIN_PACKS.slice(0, 6);

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
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-[var(--neon-cyan)] px-2 py-0.5 border border-[var(--neon-cyan)]/20 bg-[var(--neon-cyan)]/5">Online</span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-[var(--text-muted)]">Hi, {user.name.split(' ')[0]}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter text-white font-mono">
            Home
          </h1>
        </div>
        <button
          type="button"
          onClick={onStartInterview}
          className="btn-primary flex items-center justify-center gap-4 py-5 px-8 sm:px-10 text-base w-full md:w-auto"
          style={{ background: 'var(--neon-emerald)', color: '#000' }}
        >
          <i className="fa-solid fa-bolt-lightning text-lg"></i>
          Start practice interview
        </button>
      </motion.header>

      <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 border border-[rgba(255,255,255,0.05)]">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--neon-emerald)] mb-2">Streak</p>
          <p className="font-mono text-3xl font-black text-white">{streak} day{streak === 1 ? '' : 's'}</p>
        </div>
        <div className="glass-panel p-5 border border-[rgba(255,255,255,0.05)]">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--neon-cyan)] mb-2">This month</p>
          <p className="font-mono text-sm text-white">{monthly.sessions} sessions · avg {monthly.avgScore}</p>
          <p className="font-mono text-[9px] text-[var(--text-muted)] mt-2">{monthly.topWeakness}</p>
        </div>
        <div className="glass-panel p-5 border border-[rgba(255,255,255,0.05)] flex flex-col gap-2">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--neon-orange)]">Quick actions</p>
          <button type="button" onClick={() => downloadInterviewHistory()} className="btn-secondary text-[9px] py-2">
            Export history JSON
          </button>
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="glass-panel p-6 border border-[rgba(255,255,255,0.05)] space-y-4">
        <h2 className="font-mono text-xs uppercase font-bold tracking-[0.4em] text-white">Challenges</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            className="text-left p-4 border border-[rgba(255,255,255,0.05)] hover:border-[var(--neon-cyan)]"
            onClick={() => {
              writeInterviewPrefill({ mode: daily.mode, domainPack: daily.domainPack });
              onStartInterview();
            }}
          >
            <p className="font-mono text-[9px] text-[var(--neon-cyan)] uppercase tracking-widest mb-1">Daily</p>
            <p className="font-mono text-sm text-white">{daily.title}</p>
          </button>
          <button
            type="button"
            className="text-left p-4 border border-[rgba(255,255,255,0.05)] hover:border-[var(--neon-emerald)]"
            onClick={() => {
              writeInterviewPrefill({ mode: weekly.mode, domainPack: weekly.domainPack });
              onStartInterview();
            }}
          >
            <p className="font-mono text-[9px] text-[var(--neon-emerald)] uppercase tracking-widest mb-1">Weekly</p>
            <p className="font-mono text-sm text-white">{weekly.title}</p>
          </button>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-2">Recently added packs</p>
          <div className="flex flex-wrap gap-2">
            {recentPacks.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  writeInterviewPrefill({ domainPack: p.id });
                  onStartInterview();
                }}
                className="px-3 py-2 border border-[rgba(255,255,255,0.05)] font-mono text-[9px] uppercase text-[var(--text-secondary)] hover:border-[var(--neon-cyan)]"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="glass-panel p-6 sm:p-8 border border-[rgba(255,255,255,0.05)] space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-mono text-xs uppercase font-bold tracking-[0.4em] text-white">Recommended practice</h2>
          <button
            type="button"
            onClick={() => setShowChangelog((v) => !v)}
            className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] hover:text-white"
          >
            {showChangelog ? 'Hide roadmap' : 'View roadmap'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((rec) => (
            <button
              key={rec.id}
              type="button"
              onClick={() => {
                track('recommendation_click', { id: rec.id, action: rec.action });
                if (rec.action === 'quiz') {
                  if (rec.prefills?.topic) writeQuizPrefill(rec.prefills.topic);
                  onNavigate(AppRoute.QUIZ);
                } else {
                  writeInterviewPrefill({
                    mode: rec.prefills?.mode,
                    field: rec.prefills?.field,
                    domainPack: rec.prefills?.domainPack,
                  });
                  onStartInterview();
                }
              }}
              className="text-left p-5 border border-[rgba(255,255,255,0.05)] hover:border-[var(--neon-cyan)] transition-colors bg-[var(--bg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--neon-cyan)]"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--neon-cyan)] mb-2">
                {rec.action === 'quiz' ? 'Quiz' : 'Interview'}
              </p>
              <p className="font-mono text-sm font-bold text-white mb-2">{rec.title}</p>
              <p className="font-mono text-[10px] text-[var(--text-muted)] leading-relaxed">{rec.reason}</p>
            </button>
          ))}
        </div>
        {showChangelog && (
          <div className="pt-4 border-t border-[rgba(255,255,255,0.05)] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto">
            {ROADMAP_CHANGELOG.map((p) => (
              <div key={p.phase} className="p-4 border border-[rgba(255,255,255,0.05)]">
                <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--neon-emerald)] mb-2">Phase {p.phase}</p>
                <p className="font-mono text-xs font-bold text-white mb-2">{p.title}</p>
                <ul className="space-y-1">
                  {p.items.map((item) => (
                    <li key={item} className="font-mono text-[9px] text-[var(--text-muted)]">• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </motion.section>

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
                <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-widest">01</span>
              </div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-1 text-[var(--text-muted)]">Interviews</p>
              <h3 className="text-5xl font-mono font-black text-white">{stats.count.toString().padStart(2, '0')}</h3>
            </div>

            {/* Performance Index */}
            <div className="bento-card group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 border border-[rgba(255,255,255,0.05)] flex items-center justify-center bg-[var(--bg-accent)] group-hover:border-[var(--neon-orange)] transition-colors">
                  <i className="fa-solid fa-chart-line text-sm text-[var(--text-secondary)] group-hover:text-[var(--neon-orange)]"></i>
                </div>
                <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-widest">02</span>
              </div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-1 text-[var(--text-muted)]">Average score</p>
              <h3 className="text-5xl font-mono font-black text-white">{stats.avgScore}<span className="text-sm ml-1 text-[var(--text-muted)]">%</span></h3>
            </div>

            {/* System Status */}
            <div className="bento-card group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 border border-[rgba(255,255,255,0.05)] flex items-center justify-center bg-[var(--bg-accent)] group-hover:border-[var(--neon-emerald)] transition-colors">
                  <i className="fa-solid fa-microchip text-sm text-[var(--text-secondary)] group-hover:text-[var(--neon-emerald)]"></i>
                </div>
                <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-widest">03</span>
              </div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-1 text-[var(--text-muted)]">Status</p>
              <h3 className="text-5xl font-mono font-black text-[var(--neon-emerald)] uppercase">{history.length > 0 ? 'Active' : 'Ready'}</h3>
            </div>
          </motion.div>

          {/* Activity Stream */}
          <motion.div variants={itemVariants} className="glass-panel rounded-lg overflow-hidden border border-[rgba(255,255,255,0.05)]">
            <div className="p-6 bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
              <h3 className="font-mono text-xs uppercase font-bold tracking-[0.4em] text-white">Recent interviews</h3>
              <div className="flex gap-2">
                <span className="text-[9px] font-mono text-[var(--neon-cyan)] uppercase tracking-widest">History</span>
              </div>
            </div>

            <div className="p-2">
              {history.length > 0 ? history.slice(0, 5).map((session) => (
                <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-sm transition-all duration-200 hover:bg-[var(--bg-accent)] group border-b border-[rgba(255,255,255,0.03)] last:border-0">
                  <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                    <div className="w-12 h-12 shrink-0 border border-[rgba(255,255,255,0.05)] flex items-center justify-center transition-all duration-200 group-hover:border-[var(--neon-cyan)] bg-[var(--bg-surface)]">
                      <i className="fa-solid fa-code text-sm text-[var(--text-muted)] group-hover:text-[var(--neon-cyan)]"></i>
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-sm text-white uppercase tracking-tight group-hover:text-[var(--neon-cyan)] transition-colors truncate">{session.role}</p>
                      <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-tighter mt-1 truncate">
                        {session.company || '—'} · {new Date(session.date).toISOString().split('T')[0]}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0 pl-16 sm:pl-0">
                    <p className="font-mono text-2xl font-black text-white">{session.overallScore.toString().padStart(3, '0')}</p>
                    <p className="text-[8px] font-mono uppercase font-bold tracking-widest text-[var(--text-muted)]">score</p>
                  </div>
                </div>
              )) : (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-50">
                  <i className="fa-solid fa-box-open text-4xl mb-4 text-[var(--text-muted)]"></i>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white">No interviews yet</p>
                  <p className="font-mono text-[9px] text-[var(--text-muted)] mt-2">Start a practice interview to see results here.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Neural Analysis (Radar) */}
        <motion.div variants={itemVariants} className="lg:col-span-4 glass-panel rounded-lg border border-[rgba(255,255,255,0.05)] flex flex-col">
          <div className="p-6 bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.05)]">
            <h3 className="font-mono text-xs uppercase font-bold tracking-[0.4em] text-white">Skill snapshot</h3>
            <p className="font-mono text-[9px] mt-1 text-[var(--text-muted)] uppercase tracking-tighter">From your latest interview</p>
          </div>

          <div className="flex-1 p-4 sm:p-6 flex items-center justify-center min-h-[320px] sm:min-h-[400px] overflow-hidden">
            {stats.lastCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={stats.lastCategories}>
                  <PolarGrid stroke="rgba(255, 255, 255, 0.05)" radialLines={true} />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fill: '#475569', fontSize: 8, fontWeight: 700, fontFamily: 'JetBrains Mono' }}
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
                  Complete an interview to see your skill breakdown.
                </p>
              </div>
            )}
          </div>

          {stats.lastCategories.length > 0 && (
            <div className="p-6 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)]">
              <div className="flex items-center justify-between font-mono text-[9px] text-[var(--text-secondary)] uppercase tracking-widest">
                <span>Last session</span>
                <span className="text-[var(--neon-emerald)]">Ready</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
