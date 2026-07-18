import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface AnalyticsChartsProps {
  categories: { category: string; score: number; fullMark: number }[];
  barData: { name: string; score: number }[];
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ categories, barData }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <div className="glass-panel p-6 sm:p-8 border border-[rgba(255,255,255,0.05)] overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-white">Skill breakdown</h3>
        <i className="fa-solid fa-bullseye text-[var(--text-muted)]"></i>
      </div>
      <div className="h-[280px] sm:h-[350px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="65%" data={categories}>
            <PolarGrid stroke="rgba(255, 255, 255, 0.05)" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono' }}
            />
            <Radar name="Score" dataKey="score" stroke="var(--neon-cyan)" strokeWidth={2} fill="var(--neon-cyan)" fillOpacity={0.2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="glass-panel p-6 sm:p-8 border border-[rgba(255,255,255,0.05)] overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-white">Score history</h3>
        <i className="fa-solid fa-arrow-trend-up text-[var(--text-muted)]"></i>
      </div>
      <div className="h-[280px] sm:h-[350px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
              contentStyle={{
                background: '#0a0a0a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontFamily: 'JetBrains Mono',
                color: '#fff',
              }}
            />
            <Bar dataKey="score" fill="var(--neon-violet)" radius={[2, 2, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

export default AnalyticsCharts;
