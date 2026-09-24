import React, { useMemo, useState } from 'react';
import { UserProfile, InterviewResult, AppRoute } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
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
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { y: 8, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
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
    if (history.length === 0) {
      return { avgScore: 0, count: 0, lastCategories: [] as InterviewResult['categories'] };
    }
    const avgScore = Math.round(history.reduce((acc, curr) => acc + curr.overallScore, 0) / history.length);
    return {
      avgScore,
      count: history.length,
      lastCategories: history[0]?.categories || [],
    };
  }, [history]);

  const recommendations = useMemo(() => getDashboardRecommendations(history), [history]);
  const daily = useMemo(() => getDailyChallenge(), []);
  const weekly = useMemo(() => getWeeklyChallenge(), []);
  const streak = useMemo(() => getPracticeStreak(), []);
  const monthly = useMemo(() => getMonthlySummary(history), [history]);
  const recentPacks = DOMAIN_PACKS.slice(0, 6);

  const getReadinessLevel = (score: number) => {
    if (score >= 80) return { label: 'Interview Ready', color: 'var(--neon-emerald)' };
    if (score >= 60) return { label: 'Competitive', color: 'var(--neon-cyan)' };
    if (score > 0) return { label: 'In Progress', color: 'var(--neon-orange)' };
    return { label: 'New Candidate', color: 'var(--text-muted)' };
  };

  const readiness = getReadinessLevel(stats.avgScore);

  return (
    <motion.div
      className="space-y-8 animate-fadeIn"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* SaaS Hero Command Center */}
      <motion.div
        variants={itemVariants}
        className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="saas-pill">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-emerald)] animate-pulse"></span>
                AI Interview System Active
              </span>
              <span className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider">
                {user.careerGoals ? `Target: ${user.careerGoals}` : 'Candidate Hub'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white font-mono">
              Welcome back, {user.name.split(' ')[0]}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
              Conduct high-fidelity practice interviews with realistic audio synthesis, instant STAR evaluation,
              and targeted follow-ups.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate(AppRoute.QUIZ)}
              className="btn-secondary py-3.5 px-6 font-mono text-xs font-bold uppercase tracking-wider"
            >
              <i className="fa-solid fa-graduation-cap text-sm text-[var(--neon-cyan)]"></i>
              <span>Practice Quiz</span>
            </button>

            <button
              type="button"
              onClick={onStartInterview}
              className="btn-primary py-3.5 px-7 font-mono text-xs font-bold uppercase tracking-wider"
            >
              <i className="fa-solid fa-microphone-lines text-sm text-black"></i>
              <span>Start Interview</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* KPI Bento Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Readiness Score */}
        <div className="bento-card group">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Readiness Score
            </span>
            <div className="w-8 h-8 rounded-sm border border-[var(--glass-border)] flex items-center justify-center bg-[var(--bg-accent)] group-hover:border-[var(--neon-emerald)] transition-colors">
              <i className="fa-solid fa-shield-heart text-xs text-[var(--neon-emerald)]"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-3xl font-mono font-black text-white">{stats.avgScore}%</h3>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: readiness.color }}>
              {readiness.label}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--neon-emerald)] transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(stats.avgScore, 100)}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Completed Sessions */}
        <div className="bento-card group">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Sessions Completed
            </span>
            <div className="w-8 h-8 rounded-sm border border-[var(--glass-border)] flex items-center justify-center bg-[var(--bg-accent)] group-hover:border-[var(--neon-cyan)] transition-colors">
              <i className="fa-solid fa-layer-group text-xs text-[var(--neon-cyan)]"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-3xl font-mono font-black text-white">{stats.count}</h3>
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
              {stats.count === 1 ? 'interview' : 'interviews'}
            </span>
          </div>
          <p className="text-[10px] font-mono text-[var(--text-muted)] truncate">
            {stats.count > 0 ? `Latest: ${history[0]?.role || 'General'}` : 'No sessions recorded yet'}
          </p>
        </div>

        {/* Metric 3: Streak */}
        <div className="bento-card group">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Practice Streak
            </span>
            <div className="w-8 h-8 rounded-sm border border-[var(--glass-border)] flex items-center justify-center bg-[var(--bg-accent)] group-hover:border-[var(--neon-orange)] transition-colors">
              <i className="fa-solid fa-fire text-xs text-[var(--neon-orange)]"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-3xl font-mono font-black text-white">{streak}</h3>
            <span className="text-[10px] font-mono text-[var(--neon-orange)] uppercase tracking-wider font-bold">
              {streak === 1 ? 'Day Active' : 'Days Active'}
            </span>
          </div>
          <p className="text-[10px] font-mono text-[var(--text-muted)]">
            {streak > 0 ? 'Consistent practice yields 2.4x higher pass rates' : 'Practice today to begin your streak'}
          </p>
        </div>

        {/* Metric 4: Monthly Volume */}
        <div className="bento-card group">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Monthly Growth
            </span>
            <div className="w-8 h-8 rounded-sm border border-[var(--glass-border)] flex items-center justify-center bg-[var(--bg-accent)] group-hover:border-[var(--neon-violet)] transition-colors">
              <i className="fa-solid fa-chart-line text-xs text-[var(--neon-violet)]"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-3xl font-mono font-black text-white">{monthly.sessions}</h3>
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
              this month
            </span>
          </div>
          <p className="text-[10px] font-mono text-[var(--text-secondary)] truncate">
            {monthly.topWeakness ? `Focus: ${monthly.topWeakness}` : 'Ready for assessment'}
          </p>
        </div>
      </motion.div>

      {/* Main Command Split: Challenges & Recommendations vs Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Challenges & Recommended Paths (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Active Goals / Challenges */}
          <motion.div variants={itemVariants} className="glass-panel p-6 rounded-xl border border-[var(--glass-border)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-bullseye text-[var(--neon-cyan)] text-xs"></i>
                <h2 className="font-mono text-xs uppercase font-bold tracking-[0.25em] text-white">
                  Targeted Drills & Challenges
                </h2>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--neon-cyan)] font-bold">
                Adaptive
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => {
                  writeInterviewPrefill({ mode: daily.mode, domainPack: daily.domainPack });
                  onStartInterview();
                }}
                className="p-4 rounded-lg border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--neon-cyan)] hover:bg-[rgba(6,182,212,0.04)] cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider bg-[var(--neon-cyan)]/15 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30">
                    Daily Drill
                  </span>
                  <i className="fa-solid fa-arrow-right text-[10px] text-[var(--text-muted)] group-hover:text-[var(--neon-cyan)] group-hover:translate-x-1 transition-all"></i>
                </div>
                <h4 className="font-mono text-sm font-bold text-white mb-1 group-hover:text-[var(--neon-cyan)] transition-colors">
                  {daily.title}
                </h4>
                <p className="font-mono text-[10px] text-[var(--text-muted)]">
                  Mode: {daily.mode} · Domain: {daily.domainPack}
                </p>
              </div>

              <div
                onClick={() => {
                  writeInterviewPrefill({ mode: weekly.mode, domainPack: weekly.domainPack });
                  onStartInterview();
                }}
                className="p-4 rounded-lg border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--neon-emerald)] hover:bg-[rgba(16,185,129,0.04)] cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider bg-[var(--neon-emerald)]/15 text-[var(--neon-emerald)] border border-[var(--neon-emerald)]/30">
                    Weekly Challenge
                  </span>
                  <i className="fa-solid fa-arrow-right text-[10px] text-[var(--text-muted)] group-hover:text-[var(--neon-emerald)] group-hover:translate-x-1 transition-all"></i>
                </div>
                <h4 className="font-mono text-sm font-bold text-white mb-1 group-hover:text-[var(--neon-emerald)] transition-colors">
                  {weekly.title}
                </h4>
                <p className="font-mono text-[10px] text-[var(--text-muted)]">
                  Mode: {weekly.mode} · Domain: {weekly.domainPack}
                </p>
              </div>
            </div>

            {/* Quick Domain Packs */}
            <div className="pt-2">
              <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] mb-2.5 font-bold">
                Jump into domain pack:
              </p>
              <div className="flex flex-wrap gap-2">
                {recentPacks.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      writeInterviewPrefill({ domainPack: p.id });
                      onStartInterview();
                    }}
                    className="px-3 py-1.5 rounded-sm border border-[var(--glass-border)] font-mono text-[9px] uppercase tracking-wider text-[var(--text-secondary)] hover:text-white hover:border-[var(--neon-cyan)] hover:bg-[rgba(255,255,255,0.03)] transition-all"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* AI Recommended Practice Pathways */}
          <motion.div variants={itemVariants} className="glass-panel p-6 rounded-xl border border-[var(--glass-border)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-compass text-[var(--neon-emerald)] text-xs"></i>
                <h2 className="font-mono text-xs uppercase font-bold tracking-[0.25em] text-white">
                  Recommended Coaching Pathways
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowChangelog((v) => !v)}
                className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] hover:text-white transition-colors"
              >
                {showChangelog ? 'Hide Roadmap' : 'Platform Roadmap'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                  className="text-left p-4 rounded-md border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--neon-cyan)] hover:bg-[rgba(255,255,255,0.04)] transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[8px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                          rec.action === 'quiz'
                            ? 'bg-[var(--neon-violet)]/15 text-[var(--neon-violet)] border border-[var(--neon-violet)]/30'
                            : 'bg-[var(--neon-cyan)]/15 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30'
                        }`}
                      >
                        {rec.action === 'quiz' ? 'Quiz Drill' : 'Live Mock'}
                      </span>
                    </div>
                    <h4 className="font-mono text-xs font-bold text-white mb-1.5 group-hover:text-[var(--neon-cyan)] transition-colors leading-snug">
                      {rec.title}
                    </h4>
                    <p className="font-mono text-[10px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
                      {rec.reason}
                    </p>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--neon-cyan)] mt-3 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Start {rec.action === 'quiz' ? 'Quiz' : 'Session'} →
                  </span>
                </button>
              ))}
            </div>

            {/* Expandable Platform Roadmap */}
            {showChangelog && (
              <div className="pt-4 border-t border-[var(--glass-border)] grid grid-cols-1 md:grid-cols-3 gap-3 animate-fadeIn">
                {ROADMAP_CHANGELOG.map((p) => (
                  <div key={p.phase} className="p-3.5 rounded border border-[var(--glass-border)] bg-[rgba(0,0,0,0.3)]">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-[var(--neon-emerald)] font-bold block mb-1">
                      Phase {p.phase}
                    </span>
                    <h5 className="font-mono text-xs font-bold text-white mb-2">{p.title}</h5>
                    <ul className="space-y-1">
                      {p.items.map((item) => (
                        <li key={item} className="font-mono text-[9px] text-[var(--text-muted)]">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Activity Stream */}
          <motion.div variants={itemVariants} className="glass-panel rounded-xl overflow-hidden border border-[var(--glass-border)]">
            <div className="p-5 border-b border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-[var(--text-secondary)] text-xs"></i>
                <h3 className="font-mono text-xs uppercase font-bold tracking-[0.25em] text-white">
                  Recent Practice History
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => downloadInterviewHistory()}
                    className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] hover:text-white transition-colors"
                  >
                    Export JSON
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onNavigate(AppRoute.ANALYTICS)}
                  className="font-mono text-[9px] uppercase tracking-wider text-[var(--neon-cyan)] hover:underline ml-2"
                >
                  View All ({history.length})
                </button>
              </div>
            </div>

            <div className="divide-y divide-[var(--glass-border)]">
              {history.length > 0 ? (
                history.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    onClick={() => onNavigate(AppRoute.ANALYTICS)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-sm border border-[var(--glass-border)] flex items-center justify-center bg-[var(--bg-accent)] group-hover:border-[var(--neon-cyan)] transition-colors shrink-0">
                        <i className="fa-solid fa-user-tie text-xs text-[var(--text-secondary)] group-hover:text-[var(--neon-cyan)]"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-xs sm:text-sm text-white uppercase tracking-tight group-hover:text-[var(--neon-cyan)] transition-colors truncate">
                          {session.role}
                        </p>
                        <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
                          {session.company || 'Standard Practice'} ·{' '}
                          {new Date(session.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <span className="font-mono text-xl font-black text-white block leading-none">
                          {session.overallScore}
                        </span>
                        <span className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                          score / 100
                        </span>
                      </div>
                      <i className="fa-solid fa-chevron-right text-xs text-[var(--text-muted)] group-hover:text-white group-hover:translate-x-0.5 transition-all"></i>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full border border-dashed border-[var(--glass-border)] flex items-center justify-center mb-3 text-[var(--text-muted)]">
                    <i className="fa-solid fa-box-open text-base"></i>
                  </div>
                  <h4 className="font-mono text-xs uppercase font-bold tracking-widest text-white mb-1">
                    No Interview Sessions Yet
                  </h4>
                  <p className="font-mono text-[10px] text-[var(--text-muted)] max-w-sm mb-4">
                    Complete your first practice session to receive turn-by-turn STAR analytics and skill diagnostics.
                  </p>
                  <button
                    type="button"
                    onClick={onStartInterview}
                    className="btn-primary py-2.5 px-5 font-mono text-[10px] tracking-wider"
                  >
                    Start First Session
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column: Neural Radar & Skill Analysis (4 cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-xl border border-[var(--glass-border)] flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--glass-border)]">
              <div>
                <h3 className="font-mono text-xs uppercase font-bold tracking-[0.25em] text-white">
                  Skill Breakdown
                </h3>
                <p className="font-mono text-[9px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
                  Latest Interview Radar
                </p>
              </div>
              <span className="text-xs text-[var(--neon-cyan)]">
                <i className="fa-solid fa-chart-radar"></i>
              </span>
            </div>

            <div className="flex-1 flex items-center justify-center min-h-[300px] w-full">
              {stats.lastCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.lastCategories}>
                    <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
                    <PolarAngleAxis
                      dataKey="category"
                      tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 600, fontFamily: 'JetBrains Mono' }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0E1322',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '11px',
                        color: '#FFF',
                      }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="var(--neon-cyan)"
                      strokeWidth={2}
                      fill="var(--neon-cyan)"
                      fillOpacity={0.2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full border border-dashed border-[var(--glass-border)] flex items-center justify-center">
                    <i className="fa-solid fa-radar text-base text-[var(--text-muted)] animate-pulse"></i>
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] leading-relaxed">
                    Radar chart activates after your first completed mock interview.
                  </p>
                </div>
              )}
            </div>

            {stats.lastCategories.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--glass-border)] flex items-center justify-between font-mono text-[10px] text-[var(--text-secondary)]">
                <span>Domain Readiness</span>
                <span className="text-[var(--neon-emerald)] font-bold">Evaluated</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
