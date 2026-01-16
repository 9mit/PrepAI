import React, { useState } from 'react';

interface QuizSetupProps {
    onSubmit: (topic: string) => void;
}

const QuizSetup: React.FC<QuizSetupProps> = ({ onSubmit }) => {
    const [topic, setTopic] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (topic.trim()) {
            onSubmit(topic.trim());
        }
    };

    const presetTopics = [
        'JavaScript Array Methods',
        'React Hooks',
        'SQL Joins',
        'Python List Comprehensions',
        'CSS Flexbox',
        'Git Branching Strategies'
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-16 font-mono">
            <div className="text-center space-y-6">
                <div className="inline-flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 border border-[var(--neon-emerald)] flex items-center justify-center bg-[var(--neon-emerald)]/5">
                        <i className="fa-solid fa-code text-[var(--neon-emerald)] text-xl"></i>
                    </div>
                </div>
                <h1 className="text-6xl font-black uppercase tracking-tighter text-white">
                    Daily<span className="text-[var(--neon-emerald)]">_Quiz</span>
                </h1>
                <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)] max-w-2xl mx-auto">
                    Topic-Based Technical Challenge Generator // Powered by Groq LLM
                </p>
            </div>

            <div className="bg-[var(--bg-surface)] p-12 border border-[rgba(255,255,255,0.05)]">
                <form onSubmit={handleSubmit} className="space-y-10">
                    <div className="space-y-4">
                        <label className="label-premium">Select_Topic_Module</label>
                        <input
                            type="text"
                            required
                            className="input-premium"
                            placeholder="Enter technical topic (e.g., React State Management)"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                        />
                        <p className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] mt-2">
                            Specify any programming concept, language, or framework
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-[1px] flex-1 bg-[rgba(255,255,255,0.05)]"></div>
                            <span className="text-[8px] uppercase tracking-[0.5em] text-[var(--text-muted)]">Quick_Select</span>
                            <div className="h-[1px] flex-1 bg-[rgba(255,255,255,0.05)]"></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {presetTopics.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setTopic(preset)}
                                    className="px-6 py-4 border border-[rgba(255,255,255,0.05)] bg-[var(--bg-accent)] text-left transition-all hover:border-[var(--neon-cyan)] hover:bg-[rgba(255,255,255,0.02)] group"
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
                        Generate_Quiz()
                    </button>
                </form>
            </div>

            <div className="border-t border-[rgba(255,255,255,0.05)] pt-12 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                <div className="flex items-center gap-4">
                    <i className="fa-solid fa-microchip text-[var(--neon-emerald)]"></i>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white">AI Engine Status</p>
                        <p className="text-[8px] uppercase tracking-widest text-[var(--text-muted)] mt-1">Groq // Llama-3.3-70B-Versatile</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <i className="fa-solid fa-shield-halved text-[var(--neon-cyan)]"></i>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white">Privacy First</p>
                        <p className="text-[8px] uppercase tracking-widest text-[var(--text-muted)] mt-1">Code Execution // Client-Side Only</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizSetup;
