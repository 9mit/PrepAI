import React, { useState } from 'react';
import QuizSetup from '../components/QuizSetup';
import QuizLab from '../components/QuizLab';
import { Quiz } from '../types';
import { generateQuiz, getCompletedQuizzes } from '../services/quizService';
import { motion } from 'framer-motion';
import { AppRoute } from '../types';

interface QuizPageProps {
    onNavigate?: (route: AppRoute) => void;
}

const QuizPage: React.FC<QuizPageProps> = ({ onNavigate }) => {
    const [state, setState] = useState<'setup' | 'loading' | 'quiz'>('setup');
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'concept' | 'quiz'>('concept');

    const handleGenerateQuiz = async (topic: string) => {
        setState('loading');
        setError(null);

        try {
            const generatedQuiz = await generateQuiz(topic);
            setQuiz(generatedQuiz);
            setState('quiz');
            setActiveTab('concept'); // Start with concept
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Quiz generation failed. Please try again.');
            setState('setup');
        }
    };

    const handleReset = () => {
        if (window.confirm('Reset the current quiz and start fresh?')) {
            setState('setup');
            setQuiz(null);
            setActiveTab('concept');
            setError(null);
        }
    };

    const handleQuizComplete = () => {
        if (onNavigate) {
            onNavigate(AppRoute.DASHBOARD);
        } else {
            handleReset();
        }
    };

    const completedCount = getCompletedQuizzes().length;

    return (
        <div className="min-h-screen pb-20">
            {/* Setup View */}
            {state === 'setup' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="pt-12"
                >
                    {error && (
                        <div className="max-w-4xl mx-auto mb-12 bg-red-500/10 border border-red-500/30 text-red-500 p-8 font-mono text-sm">
                            <span className="font-bold block mb-2 uppercase text-[10px] tracking-widest">System_Error</span>
                            {error}
                        </div>
                    )}

                    {completedCount > 0 && (
                        <div className="max-w-4xl mx-auto mb-8 bg-[var(--neon-emerald)]/10 border border-[var(--neon-emerald)]/30 p-6 font-mono text-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--neon-emerald)]">
                                ✓ {completedCount} Quiz{completedCount > 1 ? 'zes' : ''} Completed
                            </span>
                        </div>
                    )}

                    <QuizSetup onSubmit={handleGenerateQuiz} />
                </motion.div>
            )}

            {/* Loading State */}
            {state === 'loading' && (
                <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-12">
                    <div className="relative">
                        <div className="w-24 h-24 border-2 border-[rgba(255,255,255,0.1)] border-t-[var(--neon-emerald)] animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-[var(--neon-emerald)]">
                            <i className="fa-solid fa-microchip text-2xl animate-pulse"></i>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-2xl font-mono font-black uppercase tracking-tighter text-white">Generating_Quiz_Matrix...</h3>
                        <p className="text-[9px] font-mono font-bold uppercase tracking-[0.5em] text-[var(--text-muted)]">Compiling 5 MCQ questions via AI</p>
                    </div>
                </div>
            )}

            {/* Quiz Interface */}
            {state === 'quiz' && quiz && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-12 pt-8"
                >
                    {/* Header with Topic and Reset */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-8 border-b border-[rgba(255,255,255,0.05)]">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 border border-[var(--neon-emerald)] flex items-center justify-center bg-[var(--neon-emerald)]/5">
                                <i className="fa-solid fa-lightbulb text-[var(--neon-emerald)] text-3xl"></i>
                            </div>
                            <div>
                                <h2 className="text-4xl font-black uppercase tracking-tighter text-white font-mono mb-2">{quiz.topic}</h2>
                                <div className="flex items-center gap-3">
                                    <div className="h-[1px] w-8 bg-[var(--neon-emerald)]"></div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--neon-emerald)]">Daily_Challenge_Active</p>
                                </div>
                            </div>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex p-1 bg-[var(--bg-accent)] border border-[rgba(255,255,255,0.05)]">
                            {(['concept', 'quiz'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-12 py-3 font-mono text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab
                                            ? 'bg-[var(--bg-surface)] text-white border border-[rgba(255,255,255,0.05)]'
                                            : 'text-[var(--text-muted)] hover:text-white'
                                        }`}
                                >
                                    {tab === 'concept' ? 'Learn_Concept' : 'Quiz_Lab'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[600px]">
                        {/* Concept Tab */}
                        {activeTab === 'concept' && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                                className="grid grid-cols-1 lg:grid-cols-3 gap-10"
                            >
                                <div className="lg:col-span-2 space-y-10">
                                    <div className="bg-[var(--bg-surface)] p-10 border border-[rgba(255,255,255,0.05)]">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-10 h-10 border border-[var(--neon-cyan)] flex items-center justify-center bg-[var(--neon-cyan)]/5">
                                                <i className="fa-solid fa-book text-[var(--neon-cyan)]"></i>
                                            </div>
                                            <h3 className="text-xl font-mono font-black uppercase tracking-tight text-white">Core_Concept</h3>
                                        </div>
                                        <div className="text-sm text-[var(--text-secondary)] leading-relaxed font-mono whitespace-pre-wrap">
                                            {quiz.conceptExplanation}
                                        </div>
                                    </div>

                                    <div className="bg-[var(--bg-surface)] p-10 border border-[rgba(255,255,255,0.05)]">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-10 h-10 border border-[var(--neon-orange)] flex items-center justify-center bg-[var(--neon-orange)]/5">
                                                <i className="fa-solid fa-code text-[var(--neon-orange)]"></i>
                                            </div>
                                            <h3 className="text-xl font-mono font-black uppercase tracking-tight text-white">Syntax_Reference</h3>
                                        </div>
                                        <div className="bg-black p-8 border border-[rgba(255,255,255,0.05)] font-mono text-xs text-[var(--neon-emerald)] whitespace-pre-wrap leading-relaxed">
                                            {quiz.syntaxGuide}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-[var(--bg-surface)] border border-[var(--neon-emerald)]/20 p-8">
                                        <h4 className="font-mono text-sm font-black uppercase tracking-widest mb-4 text-[var(--neon-emerald)]">Ready to Test?</h4>
                                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-mono mb-6">
                                            You'll face 5 multiple-choice questions ranging from beginner to advanced. Score 60% or higher to mark this topic as completed.
                                        </p>
                                        <button
                                            onClick={() => setActiveTab('quiz')}
                                            className="btn-primary w-full py-4 text-[10px] tracking-[0.3em]"
                                            style={{ background: 'var(--neon-emerald)', color: '#000' }}
                                        >
                                            Start_Quiz →
                                        </button>
                                    </div>

                                    <div className="bg-[rgba(255,255,255,0.02)] p-6 border border-[rgba(255,255,255,0.05)]">
                                        <button
                                            onClick={handleReset}
                                            className="w-full text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-red-500 transition-colors"
                                        >
                                            Reset_Quiz
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Quiz Lab Tab */}
                        {activeTab === 'quiz' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <QuizLab
                                    topic={quiz.topic}
                                    questions={quiz.quizQuestions}
                                    onComplete={handleQuizComplete}
                                />
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default QuizPage;
