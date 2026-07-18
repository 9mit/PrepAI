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
        <div className="max-w-4xl mx-auto space-y-16 font-mono">
            <div className="flex justify-end">
                {onBack && (
                    <button type="button" onClick={onBack} className="btn-secondary text-[10px] px-6 py-3">
                        Back to Home
                    </button>
                )}
            </div>

            <div className="text-center space-y-6">
                <div className="inline-flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 border border-[var(--neon-emerald)] flex items-center justify-center bg-[var(--neon-emerald)]/5">
                        <i className="fa-solid fa-book-open text-[var(--neon-emerald)] text-xl"></i>
                    </div>
                </div>
                <h1 className="text-6xl font-black uppercase tracking-tighter text-white">
                    Practice<span className="text-[var(--neon-emerald)]"> quiz</span>
                </h1>
                <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)] max-w-2xl mx-auto">
                    Domain quizzes with adaptive difficulty based on your past scores
                </p>
            </div>

            <div className="bg-[var(--bg-surface)] p-12 border border-[rgba(255,255,255,0.05)]">
                <form onSubmit={handleSubmit} className="space-y-10">
                    <div className="space-y-4">
                        <label className="label-premium">Topic</label>
                        <input
                            type="text"
                            required
                            className="input-premium"
                            placeholder="e.g. SWOT analysis, brand strategy, system design"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            aria-label="Quiz topic"
                        />
                        {hintedDifficulty && (
                            <p className="text-[9px] uppercase tracking-widest text-[var(--neon-cyan)] mt-2">
                                Suggested difficulty: {hintedDifficulty}
                                {prior ? ` · prior avg ${Math.round(prior.avgScore)}% (${prior.attempts} tries)` : ''}
                            </p>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="flex flex-wrap gap-2" role="group" aria-label="Quiz domain">
                            {domains.map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setDomainFilter(d)}
                                    className={`px-3 py-2 border font-mono text-[9px] uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-[var(--neon-cyan)] ${
                                        domainFilter === d
                                            ? 'border-[var(--neon-cyan)] text-[var(--neon-cyan)]'
                                            : 'border-[rgba(255,255,255,0.05)] text-[var(--text-muted)]'
                                    }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {presets.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setTopic(preset)}
                                    className="px-6 py-4 border border-[rgba(255,255,255,0.05)] bg-[var(--bg-accent)] text-left transition-all hover:border-[var(--neon-cyan)] hover:bg-[rgba(255,255,255,0.02)] group focus:outline-none focus:ring-1 focus:ring-[var(--neon-cyan)]"
                                >
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] group-hover:text-[var(--neon-cyan)] transition-colors">
                                        {preset}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!topic.trim()}
                        className="btn-primary w-full py-6 text-base tracking-[0.2em] disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ background: 'var(--neon-emerald)', color: '#000' }}
                    >
                        Generate quiz
                    </button>
                </form>
            </div>
        </div>
    );
};

export default QuizSetup;
