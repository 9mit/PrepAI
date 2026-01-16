import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { markQuizComplete } from '../services/quizService';

interface QuizLabProps {
    topic: string;
    questions: QuizQuestion[];
    onComplete: () => void;
}

const QuizLab: React.FC<QuizLabProps> = ({ topic, questions, onComplete }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
    const [showResults, setShowResults] = useState(false);

    const handleSelectOption = (optionIndex: number) => {
        if (showResults) return; // Prevent changes after submission

        const newAnswers = [...selectedAnswers];
        newAnswers[currentQuestion] = optionIndex;
        setSelectedAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
        }
    };

    const handleSubmit = () => {
        const unanswered = selectedAnswers.findIndex(a => a === -1);
        if (unanswered !== -1) {
            alert(`Please answer all questions. Question ${unanswered + 1} is unanswered.`);
            setCurrentQuestion(unanswered);
            return;
        }

        setShowResults(true);
        const score = selectedAnswers.filter((answer, idx) => answer === questions[idx].correctAnswer).length;

        // Mark as complete if passed (60% or higher)
        if (score >= questions.length * 0.6) {
            markQuizComplete(topic);
        }
    };

    const calculateScore = () => {
        return selectedAnswers.filter((answer, idx) => answer === questions[idx].correctAnswer).length;
    };

    const currentQ = questions[currentQuestion];
    const score = showResults ? calculateScore() : 0;
    const percentage = showResults ? Math.round((score / questions.length) * 100) : 0;

    return (
        <div className="font-mono space-y-8">
            {!showResults ? (
                <>
                    {/* Question Progress */}
                    <div className="flex items-center justify-between pb-6 border-b border-[rgba(255,255,255,0.05)]">
                        <div>
                            <span className="text-[9px] uppercase tracking-[0.4em] text-[var(--neon-emerald)] font-black">
                                Question {currentQuestion + 1}/{questions.length}
                            </span>
                            <div className="flex gap-2 mt-3">
                                {questions.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-1.5 w-12 transition-all ${idx === currentQuestion
                                                ? 'bg-[var(--neon-emerald)]'
                                                : selectedAnswers[idx] !== -1
                                                    ? 'bg-[var(--neon-cyan)]'
                                                    : 'bg-[rgba(255,255,255,0.1)]'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={handleSubmit}
                            className="btn-primary px-8 py-3 text-[10px] tracking-[0.3em]"
                            style={{ background: 'var(--neon-emerald)', color: '#000' }}
                        >
                            Submit_Quiz
                        </button>
                    </div>

                    {/* Question Display */}
                    <div className="bg-[var(--bg-surface)] p-10 border border-[rgba(255,255,255,0.05)]">
                        <h3 className="text-xl font-bold text-white mb-8 leading-relaxed">
                            {currentQ.question}
                        </h3>

                        <div className="space-y-4">
                            {currentQ.options.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelectOption(idx)}
                                    className={`w-full text-left p-6 border transition-all ${selectedAnswers[currentQuestion] === idx
                                            ? 'bg-[var(--neon-emerald)]/10 border-[var(--neon-emerald)] text-white'
                                            : 'bg-[var(--bg-accent)] border-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:border-[var(--neon-cyan)] hover:text-white'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={`w-8 h-8 flex items-center justify-center border font-bold text-xs ${selectedAnswers[currentQuestion] === idx
                                                ? 'border-[var(--neon-emerald)] bg-[var(--neon-emerald)] text-black'
                                                : 'border-[rgba(255,255,255,0.2)] text-[var(--text-muted)]'
                                            }`}>
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        <span className="text-sm">{option}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-4">
                        <button
                            onClick={handlePrevious}
                            disabled={currentQuestion === 0}
                            className="flex-1 py-4 border border-[rgba(255,255,255,0.1)] text-[10px] uppercase tracking-widest font-bold transition-all hover:border-[var(--neon-cyan)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:text-white"
                        >
                            ← Previous
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={currentQuestion === questions.length - 1}
                            className="flex-1 py-4 border border-[rgba(255,255,255,0.1)] text-[10px] uppercase tracking-widest font-bold transition-all hover:border-[var(--neon-cyan)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:text-white"
                        >
                            Next →
                        </button>
                    </div>
                </>
            ) : (
                <>
                    {/* Results Display */}
                    <div className="bg-[var(--bg-surface)] p-12 border border-[var(--neon-emerald)]/20">
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center justify-center w-24 h-24 border-4 border-[var(--neon-emerald)] bg-[var(--neon-emerald)]/5 mb-6">
                                <span className="text-4xl font-black text-[var(--neon-emerald)]">{percentage}%</span>
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">
                                Quiz_Completed
                            </h2>
                            <p className="text-sm uppercase tracking-widest text-[var(--text-muted)]">
                                Score: {score}/{questions.length} Correct
                            </p>
                        </div>

                        {percentage >= 60 ? (
                            <div className="bg-[var(--neon-emerald)]/10 border border-[var(--neon-emerald)]/30 p-6 text-center">
                                <p className="text-sm font-bold uppercase tracking-wider text-[var(--neon-emerald)]">
                                    ✓ Passed - This topic is now marked as completed
                                </p>
                            </div>
                        ) : (
                            <div className="bg-[var(--neon-orange)]/10 border border-[var(--neon-orange)]/30 p-6 text-center">
                                <p className="text-sm font-bold uppercase tracking-wider text-[var(--neon-orange)]">
                                    ! Score below 60% - Try a different topic or review the concept
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Answer Review */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white border-b border-[rgba(255,255,255,0.05)] pb-4">
                            Answer Review
                        </h3>
                        {questions.map((q, idx) => {
                            const isCorrect = selectedAnswers[idx] === q.correctAnswer;
                            return (
                                <div key={idx} className="bg-[var(--bg-surface)] p-8 border border-[rgba(255,255,255,0.05)]">
                                    <div className="flex items-start gap-4 mb-4">
                                        <span className={`status-badge ${isCorrect
                                                ? 'bg-[var(--neon-emerald)]/10 text-[var(--neon-emerald)] border-[var(--neon-emerald)]/30'
                                                : 'bg-red-500/10 text-red-500 border-red-500/30'
                                            }`}>
                                            Q{idx + 1}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-white mb-4">{q.question}</p>
                                            <div className="space-y-2 mb-4">
                                                {q.options.map((opt, optIdx) => (
                                                    <div
                                                        key={optIdx}
                                                        className={`text-xs p-3 border ${optIdx === q.correctAnswer
                                                                ? 'border-[var(--neon-emerald)]/30 bg-[var(--neon-emerald)]/5 text-[var(--neon-emerald)]'
                                                                : optIdx === selectedAnswers[idx] && !isCorrect
                                                                    ? 'border-red-500/30 bg-red-500/5 text-red-400'
                                                                    : 'border-[rgba(255,255,255,0.05)] text-[var(--text-muted)]'
                                                            }`}
                                                    >
                                                        <span className="font-bold mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                                                        {opt}
                                                        {optIdx === q.correctAnswer && <span className="ml-2">✓</span>}
                                                        {optIdx === selectedAnswers[idx] && !isCorrect && <span className="ml-2">✗</span>}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="bg-[rgba(255,255,255,0.02)] p-4 border border-[rgba(255,255,255,0.05)]">
                                                <p className="text-[9px] uppercase tracking-widest font-black text-[var(--neon-orange)] mb-2">
                                                    Explanation
                                                </p>
                                                <p className="text-xs text-[var(--text-secondary)]">{q.explanation}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        onClick={onComplete}
                        className="btn-primary w-full py-6 text-base tracking-[0.2em]"
                        style={{ background: 'var(--neon-emerald)', color: '#000' }}
                    >
                        Complete_&_Return_to_Dashboard
                    </button>
                </>
            )}
        </div>
    );
};

export default QuizLab;
