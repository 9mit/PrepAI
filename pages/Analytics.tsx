
import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { InterviewResult } from '../types';

const AnalyticsPage: React.FC = () => {
  const history: InterviewResult[] = useMemo(() => {
    return JSON.parse(localStorage.getItem('interview_history') || '[]');
  }, []);

  const barData = useMemo(() => {
    return history.slice(0, 5).reverse().map((h, i) => ({
      name: `S-${history.length - history.slice(0, 5).length + i + 1}`,
      score: h.overallScore
    }));
  }, [history]);

  const latestFeedback = history[0]?.feedback || [];
  const latestCategories = history[0]?.categories || [];

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-fadeIn border border-dashed border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
        <div className="w-20 h-20 rounded-full flex items-center justify-center border border-[var(--text-muted)] mb-8 opacity-50">
          <i className="fa-solid fa-chart-pie text-3xl text-[var(--text-muted)]"></i>
        </div>
        <h2 className="text-3xl font-mono font-black uppercase tracking-tighter text-white">No_Data_Stream</h2>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Execute an interview module to generate metrics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fadeIn pb-20">
      <header className="space-y-2 border-b border-[rgba(255,255,255,0.05)] pb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 flex items-center justify-center bg-[var(--neon-violet)]/10 border border-[var(--neon-violet)]/30">
            <i className="fa-solid fa-chart-bar text-[var(--neon-violet)]"></i>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-[var(--neon-violet)]">Analytics_Module_v2</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-mono font-black uppercase tracking-tighter text-white">Performance Insights</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Competency Matrix */}
        <div className="glass-panel p-8 border border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-white">Competency_Matrix</h3>
            <i className="fa-solid fa-bullseye text-[var(--text-muted)]"></i>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={latestCategories}>
                <PolarGrid stroke="rgba(255, 255, 255, 0.05)" />
                <PolarAngleAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono' }} />
                <Radar name="Score" dataKey="score" stroke="var(--neon-cyan)" strokeWidth={2} fill="var(--neon-cyan)" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical Progression */}
        <div className="glass-panel p-8 border border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-white">Historical_Progression</h3>
            <i className="fa-solid fa-arrow-trend-up text-[var(--text-muted)]"></i>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                  contentStyle={{
                    background: '#0a0a0a',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontFamily: 'JetBrains Mono',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="score" fill="var(--neon-violet)" radius={[2, 2, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Feedback Section */}
      <div className="glass-panel p-8 border border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-4 mb-8">
          <i className="fa-solid fa-microchip text-[var(--neon-emerald)] text-xl"></i>
          <h3 className="font-mono text-xl font-black uppercase tracking-tighter text-white">Intelligence_Summary</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {latestFeedback.map((text, i) => (
            <div
              key={i}
              className="p-6 border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] hover:border-[var(--neon-emerald)] transition-colors group"
            >
              <h5 className="font-mono text-[9px] font-bold uppercase tracking-widest mb-3 text-[var(--neon-emerald)]">Observation_{i + 1}</h5>
              <p className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed group-hover:text-white transition-colors">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
