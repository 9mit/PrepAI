import React from 'react';

interface ChipButtonProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  accent?: 'cyan' | 'emerald' | 'orange';
  ariaLabel?: string;
}

const accentClass: Record<NonNullable<ChipButtonProps['accent']>, string> = {
  cyan: 'border-[var(--neon-cyan)] text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10',
  emerald: 'border-[var(--neon-emerald)] text-[var(--neon-emerald)] bg-[var(--neon-emerald)]/10',
  orange: 'border-[var(--neon-orange)] text-[var(--neon-orange)] bg-[var(--neon-orange)]/10',
};

export const ChipButton: React.FC<ChipButtonProps> = ({
  selected,
  onClick,
  label,
  accent = 'cyan',
  ariaLabel,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    aria-label={ariaLabel || label}
    className={`px-3 py-2 border font-mono text-[9px] uppercase tracking-wider transition-all focus:outline-none focus:ring-1 focus:ring-[var(--neon-cyan)] ${
      selected
        ? accentClass[accent]
        : 'border-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:border-[rgba(255,255,255,0.2)]'
    }`}
  >
    {label}
  </button>
);

export default ChipButton;
