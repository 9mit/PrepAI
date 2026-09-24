import React, { useState, useEffect } from 'react';
import { QUIZ_DOMAIN_PRESETS } from '../constants';
import { suggestDifficulty, getTopicStat } from '../services/quizService';

interface QuizSetupProps {
  onSubmit: (topic: string) => void;
  onBack?: () => void;
}

const QuizSetup: React.FC<QuizSetupProps> = ({ onSubmit, onBack }) => {
  const [topic, setTopic] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('All');

  useEffect(() => {
    const prefill = localStorage.getItem('quiz_prefill_topic');
    if (prefill) {
      setTopic(prefill);
      localStorage.removeItem('quiz_prefill_topic');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onSubmit(topic.trim());
    }
  };

  const domains = ['All', ...QUIZ_DOMAIN_PRESETS.map((d) => d.domain)];
  const presets =
    domainFilter === 'All'
      ? QUIZ_DOMAIN_PRESETS.flatMap((d) => d.topics)
      : QUIZ_DOMAIN_PRESETS.find((d) => d.domain === domainFilter)?.topics || [];

  const hintedDifficulty = topic.trim() ? suggestDifficulty(topic.trim()) : null;
  const prior = topic.trim() ? getTopicStat(topic.trim()) : undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn font-mono">
      {/* Top Header with Back Action */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--glass-border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="saas-pill">Adaptive Knowledge Lab</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            Skill Assessment <span className="text-[var(--neon-emerald)]">Quizzes</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">
            5-question targeted drills with adaptive difficulty based on past accuracy
          </p>
        </div>

        {onBack && (
          <button type="button" onClick={onBack} className="btn-secondary text-[10px] px-4 py-2 shrink-0">
            ← Dashboard
          </button>
        )}
      </div>

      {/* Main Setup Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="label-premium">Custom Topic or Skill Area</label>
            <div className="relative">
              <input
                type="text"
                required
                className="input-premium py-3 pl-10 text-sm"
                placeholder="e.g. Distributed Consensus, Brand Equity, Micro-frontends, CAP Theorem"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                aria-label="Quiz topic"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none"></i>
            </div>

            {hintedDifficulty && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--neon-cyan)] font-bold">
                  Suggested Difficulty: {hintedDifficulty}
                </span>
                {prior && (
                  <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                    · Past Average: {Math.round(prior.avgScore)}% ({prior.attempts} attempts)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Domain Category Filter Tabs */}
          <div className="space-y-3 pt-2">
            <label className="label-premium">Explore Pre-curated Interview Topics</label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Quiz domain filter">
              {domains.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDomainFilter(d)}
                  className={`px-3 py-1.5 rounded-sm font-mono text-[10px] uppercase tracking-wider transition-all ${
                    domainFilter === d
                      ? 'bg-[var(--neon-cyan)]/20 border border-[var(--neon-cyan)] text-white font-bold'
                      : 'border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-white hover:bg-[rgba(255,255,255,0.03)]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTopic(preset)}
                  className={`p-3 rounded-md border text-left transition-all group ${
                    topic === preset
                      ? 'border-[var(--neon-emerald)] bg-[var(--neon-emerald)]/10 text-white'
                      : 'border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] text-[var(--text-secondary)] hover:border-[var(--neon-cyan)] hover:text-white'
                  }`}
                >
                  <span className="text-xs font-mono font-medium block truncate">
                    {preset}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-[var(--glass-border)]">
            <button
              type="submit"
              disabled={!topic.trim()}
              className="btn-primary w-full py-4 text-xs font-mono font-bold tracking-widest disabled:opacity-40"
            >
              <i className="fa-solid fa-brain text-sm"></i>
              <span>Generate Quiz Questions</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuizSetup;
