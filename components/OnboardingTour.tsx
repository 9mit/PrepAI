import React, { useState } from 'react';

const TIPS = [
  'Start a practice interview from Home — pick a field, mode, and optional job description.',
  'Use Leave to exit early without analysis, or End interview to get coaching results.',
  'Practice Quiz adapts difficulty based on your past scores.',
  'Open Profile to send feedback or save interview templates.',
];

const FLAG = 'prepai_tour_done';

export function isTourDone(): boolean {
  return localStorage.getItem(FLAG) === '1';
}

export function dismissTour(): void {
  localStorage.setItem(FLAG, '1');
}

const OnboardingTour: React.FC = () => {
  const [open, setOpen] = useState(!isTourDone());
  const [step, setStep] = useState(0);

  if (!open) return null;

  const finish = () => {
    dismissTour();
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Getting started tour"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-md glass-panel border border-[rgba(255,255,255,0.1)] p-6 font-mono space-y-4">
        <p className="text-[9px] uppercase tracking-widest text-[var(--neon-cyan)]">
          Tip {step + 1} of {TIPS.length}
        </p>
        <p className="text-sm text-white leading-relaxed">{TIPS[step]}</p>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={finish} className="btn-secondary text-[10px] px-4 py-2">
            Skip
          </button>
          {step < TIPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="btn-primary text-[10px] px-4 py-2"
              style={{ background: 'var(--neon-emerald)', color: '#000' }}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="btn-primary text-[10px] px-4 py-2"
              style={{ background: 'var(--neon-emerald)', color: '#000' }}
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
