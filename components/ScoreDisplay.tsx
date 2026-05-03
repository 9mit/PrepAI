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
        if (score >= 7001) return 'Excellent';
        if (score >= 4000) return 'Good';
        return 'Needs Improvement';
    };

    const color = getScoreColor();

    return (
        <div className="flex flex-col items-center justify-center p-8 border border-[rgba(255,255,255,0.05)] bg-[var(--bg-surface)]">
            <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-[var(--text-muted)] mb-4">
                Final_Score
            </span>
            <span
                className="font-mono text-6xl font-black tracking-tighter"
                style={{ color }}
            >
                {score.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-[var(--text-muted)] mt-2 uppercase tracking-widest">
                out of 10,000
            </span>
            <span
                className="font-mono text-[10px] uppercase tracking-[0.3em] mt-4 px-4 py-1.5 border"
                style={{ color, borderColor: `${color}40`, background: `${color}10` }}
            >
                {getScoreLabel()}
            </span>
        </div>
    );
};

export default ScoreDisplay;
