import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { markQuizComplete, recordQuizAttempt, recommendNextTopics, QuizDifficulty } from '../services/quizService';
import { writeQuizPrefill } from '../services/interviewContext';
import { track } from '../services/telemetry';

interface QuizLabProps {
  topic: string;
  questions: QuizQuestion[];
  difficulty?: QuizDifficulty;
  onComplete: () => void;
  onRetryTopic?: (topic: string) => void;
}

const QuizLab: React.FC<QuizLabProps> = ({
  topic,
  questions,
  difficulty: difficultyProp,
  onComplete,
  onRetryTopic,
}) => {
  const difficulty: QuizDifficulty = difficultyProp ?? 'medium';
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [showResults, setShowResults] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [nextTopics, setNextTopics] = useState<string[]>([]);

  const handleSelectOption = (optionIndex: number) => {
    if (showResults) return;
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) setCurrentQuestion(currentQuestion + 1);
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1);
  };

  const handleSubmit = () => {
    const unanswered = selectedAnswers.findIndex((a) => a === -1);
    if (unanswered !== -1) {
      setSubmitError(`Please answer Question ${unanswered + 1} before submitting.`);
      setCurrentQuestion(unanswered);
      return;
    }
    setSubmitError('');
    setShowResults(true);
    const score = selectedAnswers.filter((answer, idx) => answer === questions[idx]?.correctAnswer).length;
    const total = questions.length || 1;
    const percentage = Math.round((score / total) * 100);
    recordQuizAttempt(topic, percentage, difficulty);
    track('quiz_complete', { topic, score: percentage, difficulty });
    setNextTopics(recommendNextTopics(topic));
    if (score >= questions.length * 0.6) {
      markQuizComplete(topic);
    }
  };

  const score = showResults
    ? selectedAnswers.filter((answer, idx) => answer === questions[idx]?.correctAnswer).length
    : 0;
  const totalQ = questions.length || 1;
  const percentage = showResults ? Math.round((score / totalQ) * 100) : 0;
  const currentQ = questions[currentQuestion];

  return (
    <div className="font-mono space-y-6 max-w-4xl mx-auto animate-fadeIn">
      {/* Validation Error Banner */}
      {submitError && (
        <div
          role="alert"
          className="p-3.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center gap-2"
        >
          <i className="fa-solid fa-triangle-exclamation text-sm shrink-0"></i>
          <span>{submitError}</span>
        </div>
      )}

      {!showResults ? (
        <div className="space-y-6">
          {/* Top Progress & Navigation HUD */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--glass-border)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black uppercase tracking-wider text-[var(--neon-emerald)]">
                  Question {currentQuestion + 1} of {questions.length}
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[rgba(255,255,255,0.05)] border border-[var(--glass-border)] text-[var(--text-muted)]">
                  {difficulty}
                </span>
              </div>
              <div className="w-48 h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--neon-emerald)] transition-all duration-300 rounded-full"
                  style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary py-2 px-5 text-[10px] tracking-wider"
            >
              <i className="fa-solid fa-check text-xs"></i>
              <span>Submit All</span>
            </button>
          </div>

          {/* Question Card */}
          <div className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] space-y-6">
            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed font-sans">
              {currentQ.question}
            </h3>

            {/* Answer Choices */}
            <div className="space-y-3" role="radiogroup" aria-label={`Question ${currentQuestion + 1}`}>
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedAnswers[currentQuestion] === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-4 sm:p-5 rounded-lg border transition-all flex items-center gap-4 ${
                      isSelected
                        ? 'bg-[var(--neon-emerald)]/15 border-[var(--neon-emerald)] text-white shadow-lg'
                        : 'bg-[rgba(255,255,255,0.02)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--neon-cyan)] hover:text-white'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-sm flex items-center justify-center font-mono font-bold text-xs shrink-0 border ${
                        isSelected
                          ? 'border-[var(--neon-emerald)] bg-[var(--neon-emerald)] text-black'
                          : 'border-[var(--glass-border)] bg-[var(--bg-accent)] text-[var(--text-muted)]'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-xs sm:text-sm font-sans font-medium">{option}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Question Controls */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="btn-secondary flex-1 py-3 text-xs tracking-wider disabled:opacity-30"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={currentQuestion === questions.length - 1}
              className="btn-secondary flex-1 py-3 text-xs tracking-wider disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="space-y-8 animate-fadeIn">
          <div className="glass-panel p-8 sm:p-10 rounded-xl border border-[var(--glass-border)] text-center space-y-4">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-2 border-[var(--neon-emerald)] bg-[var(--neon-emerald)]/10 shadow-[var(--glow-emerald)] mb-2">
              <span className="text-3xl font-mono font-black text-[var(--neon-emerald)]">{percentage}%</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-mono">
              Quiz Completed
            </h2>
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">
              Accuracy: {score} of {questions.length} Correct · {percentage >= 60 ? 'Mastery Achieved' : 'Review Recommended'}
            </p>

            {nextTopics.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-[var(--glass-border)] max-w-md mx-auto">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold">
                  Recommended Follow-up Topics:
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {nextTopics.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        writeQuizPrefill(t);
                        if (onRetryTopic) onRetryTopic(t);
                        else onComplete();
                      }}
                      className="px-3 py-1.5 rounded-sm border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] text-[10px] uppercase tracking-wider text-[var(--neon-cyan)] hover:border-[var(--neon-cyan)] hover:bg-[rgba(6,182,212,0.08)] transition-all"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4">
              <button
                type="button"
                onClick={onComplete}
                className="btn-primary py-3.5 px-8 text-xs font-mono font-bold tracking-widest"
              >
                Return to Dashboard
              </button>
            </div>
          </div>

          {/* Answer Explanations Review */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-white pb-2 border-b border-[var(--glass-border)]">
              Detailed Answer Explanations
            </h3>
            {questions.map((q, idx) => {
              const isCorrect = selectedAnswers[idx] === q.correctAnswer;
              return (
                <div
                  key={idx}
                  className={`p-5 rounded-lg border ${
                    isCorrect
                      ? 'border-[var(--neon-emerald)]/30 bg-[rgba(16,185,129,0.04)]'
                      : 'border-red-500/30 bg-[rgba(239,68,68,0.04)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[9px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                        isCorrect
                          ? 'bg-[var(--neon-emerald)]/20 text-[var(--neon-emerald)]'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      Question {idx + 1}: {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-2 font-sans">{q.question}</h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                    {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizLab;
