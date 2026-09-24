import React from 'react';

interface ScoreDisplayProps {
  score: number;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score }) => {
  const getScoreColor = (): string => {
    if (score >= 7001) return 'var(--neon-emerald)';
    if (score >= 4000) return '#F59E0B'; // amber
    return '#EF4444'; // red
  };

  const getScoreLabel = (): string => {
    if (score >= 8500) return 'Top 5% Candidate';
    if (score >= 7001) return 'Interview Ready';
    if (score >= 5000) return 'Competitive';
    return 'Development Needed';
  };

  const color = getScoreColor();
  const label = getScoreLabel();
  const normalizedPercent = Math.min(Math.round((score / 10000) * 100), 100);

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] flex flex-col items-center justify-center text-center relative overflow-hidden">
      <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--text-muted)] font-bold mb-3">
        Overall Index Score
      </span>

      <div className="my-2">
        <span
          className="font-mono text-5xl sm:text-6xl font-black tracking-tight"
          style={{ color }}
        >
          {score.toLocaleString()}
        </span>
        <span className="font-mono text-xs text-[var(--text-muted)] block mt-1 uppercase tracking-widest">
          out of 10,000 pts ({normalizedPercent}%)
        </span>
      </div>

      <div className="w-full max-w-[200px] h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden my-4">
        <div
          className="h-full transition-all duration-500 rounded-full"
          style={{ width: `${normalizedPercent}%`, backgroundColor: color }}
        />
      </div>

      <span
        className="font-mono text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full border"
        style={{ color, borderColor: `${color}40`, background: `${color}15` }}
      >
        {label}
      </span>
    </div>
  );
};

export default ScoreDisplay;
