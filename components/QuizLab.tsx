import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { markQuizComplete, recordQuizAttempt, recommendNextTopics, QuizDifficulty } from '../services/quizService';
import { writeQuizPrefill } from '../services/interviewContext';

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
            setSubmitError(`Please answer all questions. Question ${unanswered + 1} is unanswered.`);
            setCurrentQuestion(unanswered);
            return;
        }
        setSubmitError('');
        setShowResults(true);
        const score = selectedAnswers.filter((answer, idx) => answer === questions[idx].correctAnswer).length;
        const percentage = Math.round((score / questions.length) * 100);
        recordQuizAttempt(topic, percentage, difficulty);
        import('../services/telemetry').then(({ track }) => {
            track('quiz_complete', { topic, score: percentage, difficulty });
        });
        setNextTopics(recommendNextTopics(topic));
        if (score >= questions.length * 0.6) {
            markQuizComplete(topic);
        }
    };

    const score = showResults
        ? selectedAnswers.filter((answer, idx) => answer === questions[idx].correctAnswer).length
        : 0;
    const percentage = showResults ? Math.round((score / questions.length) * 100) : 0;
    const currentQ = questions[currentQuestion];

    return (
        <div className="font-mono space-y-8">
            {submitError && (
                <div role="alert" className="p-4 border border-red-500/30 bg-red-500/5 text-red-400 text-[10px] uppercase tracking-widest">
                    {submitError}
                </div>
            )}
            {!showResults ? (
                <>
                    <div className="flex items-center justify-between pb-6 border-b border-[rgba(255,255,255,0.05)]">
                        <div>
                            <span className="text-[9px] uppercase tracking-[0.4em] text-[var(--neon-emerald)] font-black">
                                Question {currentQuestion + 1}/{questions.length} · {difficulty}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="btn-primary px-6 py-3 text-[10px] tracking-widest"
                            style={{ background: 'var(--neon-emerald)', color: '#000' }}
                        >
                            Submit
                        </button>
                    </div>
                    <div className="bg-[var(--bg-surface)] p-8 border border-[rgba(255,255,255,0.05)] space-y-6">
                        <h3 className="text-lg font-bold text-white leading-relaxed">{currentQ.question}</h3>
                        <div className="space-y-4" role="radiogroup" aria-label={`Question ${currentQuestion + 1}`}>
                            {currentQ.options.map((option, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    role="radio"
                                    aria-checked={selectedAnswers[currentQuestion] === idx}
                                    onClick={() => handleSelectOption(idx)}
                                    className={`w-full text-left p-6 border transition-all focus:outline-none focus:ring-1 focus:ring-[var(--neon-cyan)] ${
                                        selectedAnswers[currentQuestion] === idx
                                            ? 'bg-[var(--neon-emerald)]/10 border-[var(--neon-emerald)] text-white'
                                            : 'bg-[var(--bg-accent)] border-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:border-[var(--neon-cyan)]'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="w-8 h-8 flex items-center justify-center border font-bold text-xs">
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        <span className="text-sm">{option}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button type="button" onClick={handlePrevious} disabled={currentQuestion === 0} className="flex-1 py-4 border border-[rgba(255,255,255,0.1)] text-[10px] uppercase tracking-widest font-bold disabled:opacity-30">
                            Previous
                        </button>
                        <button type="button" onClick={handleNext} disabled={currentQuestion === questions.length - 1} className="flex-1 py-4 border border-[rgba(255,255,255,0.1)] text-[10px] uppercase tracking-widest font-bold disabled:opacity-30">
                            Next
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div className="bg-[var(--bg-surface)] p-12 border border-[var(--neon-emerald)]/20 text-center space-y-6">
                        <div className="inline-flex items-center justify-center w-24 h-24 border-4 border-[var(--neon-emerald)] mb-2">
                            <span className="text-4xl font-black text-[var(--neon-emerald)]">{percentage}%</span>
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Quiz complete</h2>
                        <p className="text-sm uppercase tracking-widest text-[var(--text-muted)]">
                            Score: {score}/{questions.length} · Difficulty: {difficulty}
                        </p>
                        {nextTopics.length > 0 && (
                            <div className="space-y-3 pt-4">
                                <p className="text-[9px] uppercase tracking-widest text-[var(--text-muted)]">Recommended next</p>
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
                                            className="px-4 py-2 border border-[rgba(255,255,255,0.1)] text-[10px] uppercase tracking-widest text-[var(--neon-cyan)]"
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button type="button" onClick={onComplete} className="btn-primary w-full py-4 text-[10px] tracking-widest" style={{ background: 'var(--neon-emerald)', color: '#000' }}>
                            Done
                        </button>
                    </div>
                    <div className="space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white border-b border-[rgba(255,255,255,0.05)] pb-4">Answer review</h3>
                        {questions.map((q, idx) => {
                            const isCorrect = selectedAnswers[idx] === q.correctAnswer;
                            return (
                                <div key={idx} className="bg-[var(--bg-surface)] p-8 border border-[rgba(255,255,255,0.05)]">
                                    <p className={`text-[9px] uppercase tracking-widest mb-2 ${isCorrect ? 'text-[var(--neon-emerald)]' : 'text-red-400'}`}>
                                        Q{idx + 1} {isCorrect ? 'Correct' : 'Incorrect'}
                                    </p>
                                    <p className="text-sm font-bold text-white mb-3">{q.question}</p>
                                    <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{q.explanation}</p>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default QuizLab;
