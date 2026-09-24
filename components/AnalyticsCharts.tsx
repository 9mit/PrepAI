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
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
    {/* Skill Breakdown Radar Chart */}
    <div className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] overflow-hidden">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--glass-border)]">
        <div>
          <h3 className="font-mono text-xs uppercase font-bold tracking-[0.25em] text-white">
            Competency Radar
          </h3>
          <p className="font-mono text-[9px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
            Turn-by-turn category performance
          </p>
        </div>
        <i className="fa-solid fa-bullseye text-[var(--neon-cyan)] text-sm"></i>
      </div>

      <div className="h-[280px] sm:h-[340px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="68%" data={categories}>
            <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 600, fontFamily: 'JetBrains Mono' }}
            />
            <Tooltip
              contentStyle={{
                background: '#0E1322',
                border: '1px solid rgba(255, 255, 255, 0.12)',
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
              fillOpacity={0.25}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Score Progression Trend Chart */}
    <div className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] overflow-hidden">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--glass-border)]">
        <div>
          <h3 className="font-mono text-xs uppercase font-bold tracking-[0.25em] text-white">
            Score Progression
          </h3>
          <p className="font-mono text-[9px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
            Recent sessions trajectory
          </p>
        </div>
        <i className="fa-solid fa-arrow-trend-up text-[var(--neon-emerald)] text-sm"></i>
      </div>

      <div className="h-[280px] sm:h-[340px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 12, right: 12, left: -16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.06)" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
              width={36}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
              contentStyle={{
                background: '#0E1322',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                fontFamily: 'JetBrains Mono',
                fontSize: '11px',
                color: '#FFF',
              }}
            />
            <Bar
              dataKey="score"
              fill="var(--neon-emerald)"
              radius={[4, 4, 0, 0]}
              barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

export default AnalyticsCharts;
