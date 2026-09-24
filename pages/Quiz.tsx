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
      setActiveTab('concept');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quiz generation failed. Please try again.');
      setState('setup');
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset current quiz and select a new topic?')) {
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
    <div className="min-h-full pb-16 font-mono">
      {/* Setup View */}
      {state === 'setup' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {error && (
            <div
              role="alert"
              className="max-w-4xl mx-auto p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-3"
            >
              <i className="fa-solid fa-triangle-exclamation text-sm shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          {completedCount > 0 && (
            <div className="max-w-4xl mx-auto p-3.5 rounded-lg bg-[var(--neon-emerald)]/10 border border-[var(--neon-emerald)]/30 text-center flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--neon-emerald)]"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--neon-emerald)]">
                {completedCount} Practice {completedCount === 1 ? 'Quiz' : 'Quizzes'} Completed
              </span>
            </div>
          )}

          <QuizSetup
            onSubmit={handleGenerateQuiz}
            onBack={onNavigate ? () => onNavigate(AppRoute.DASHBOARD) : undefined}
          />
        </motion.div>
      )}

      {/* Loading State */}
      {state === 'loading' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fadeIn">
          <div className="relative">
            <div className="w-16 h-16 border-2 border-[var(--glass-border)] border-t-[var(--neon-emerald)] rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-[var(--neon-emerald)]">
              <i className="fa-solid fa-microchip text-xl animate-pulse"></i>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black uppercase tracking-tight text-white font-mono">
              Synthesizing Questions…
            </h3>
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Generating 5 adaptive questions using Llama 3.3 70B
            </p>
          </div>
        </div>
      )}

      {/* Quiz Interface */}
      {state === 'quiz' && quiz && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="space-y-8 max-w-4xl mx-auto"
        >
          {/* Header with Topic and Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg border border-[var(--neon-emerald)] flex items-center justify-center bg-[var(--neon-emerald)]/10 text-[var(--neon-emerald)]">
                <i className="fa-solid fa-lightbulb text-xl"></i>
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-mono">
                  {quiz.topic}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="saas-pill">5 Questions</span>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                    Adaptive Rigor
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex rounded-md p-1 bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] self-start sm:self-center">
              <button
                type="button"
                onClick={() => setActiveTab('concept')}
                className={`px-4 sm:px-6 py-2 font-mono text-xs uppercase font-bold tracking-wider rounded transition-all ${
                  activeTab === 'concept'
                    ? 'bg-[var(--bg-accent)] text-white shadow-sm border border-[rgba(255,255,255,0.1)]'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Key Points
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('quiz')}
                className={`px-4 sm:px-6 py-2 font-mono text-xs uppercase font-bold tracking-wider rounded transition-all ${
                  activeTab === 'quiz'
                    ? 'bg-[var(--bg-accent)] text-white shadow-sm border border-[rgba(255,255,255,0.1)]'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Take Quiz
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {/* Concept Tab */}
            {activeTab === 'concept' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                <div className="lg:col-span-2 space-y-6">
                  <div className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] space-y-4">
                    <div className="flex items-center gap-3">
                      <i className="fa-solid fa-book-open text-[var(--neon-cyan)] text-sm"></i>
                      <h3 className="text-base font-mono font-bold uppercase tracking-wider text-white">
                        Concept Overview
                      </h3>
                    </div>
                    <div className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans whitespace-pre-wrap">
                      {quiz.conceptExplanation}
                    </div>
                  </div>

                  <div className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] space-y-4">
                    <div className="flex items-center gap-3">
                      <i className="fa-solid fa-code text-[var(--neon-emerald)] text-sm"></i>
                      <h3 className="text-base font-mono font-bold uppercase tracking-wider text-white">
                        Key Frameworks & Syntax
                      </h3>
                    </div>
                    <div className="bg-[rgba(0,0,0,0.4)] p-4 sm:p-6 rounded-lg border border-[var(--glass-border)] font-mono text-xs text-[var(--neon-emerald)] whitespace-pre-wrap leading-relaxed">
                      {quiz.syntaxGuide}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="glass-panel p-6 rounded-xl border border-[var(--neon-emerald)]/30 space-y-4">
                    <span className="saas-pill">Ready to test?</span>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-mono">
                      Answer 5 multiple-choice questions ranging from fundamentals to senior-level edge cases.
                      Score 60%+ to earn completion mastery.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('quiz')}
                      className="btn-primary w-full py-3.5 text-xs font-mono font-bold tracking-wider"
                    >
                      Begin Quiz Drill →
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="btn-secondary w-full py-2.5 text-[10px] tracking-wider"
                  >
                    Select Different Topic
                  </button>
                </div>
              </motion.div>
            )}

            {/* Quiz Lab Tab */}
            {activeTab === 'quiz' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <QuizLab
                  topic={quiz.topic}
                  questions={quiz.quizQuestions}
                  difficulty={quiz.difficulty}
                  onComplete={handleQuizComplete}
                  onRetryTopic={(t) => {
                    void handleGenerateQuiz(t);
                  }}
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
