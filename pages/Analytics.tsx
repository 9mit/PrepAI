import React, { useMemo, useState, Suspense, lazy } from 'react';
import { InterviewResult, AppRoute } from '../types';
import ScoreDisplay from '../components/ScoreDisplay';
import { approximateOfficialScore } from '../services/scoring';
import { apiFetch } from '../services/apiClient';
import {
  downloadInterviewHistory,
  toggleBookmark,
  copySessionSummary,
  writeInterviewPrefill,
} from '../services/interviewContext';
import { domainAverages, frequentWeaknesses } from '../services/recommendations';

const AnalyticsCharts = lazy(() => import('../components/AnalyticsCharts'));

const AnalyticsPage: React.FC<{ onNavigate?: (route: AppRoute) => void }> = ({ onNavigate }) => {
  const [history, setHistory] = useState<InterviewResult[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('interview_history') || '[]') as InterviewResult[];
    } catch {
      return [];
    }
  });

  const [selectedId, setSelectedId] = useState(history[0]?.id || '');
  const [downloadError, setDownloadError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [search, setSearch] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (h) =>
        h.role.toLowerCase().includes(q) ||
        (h.company || '').toLowerCase().includes(q) ||
        (h.mode || '').toLowerCase().includes(q) ||
        (h.domainPack || '').toLowerCase().includes(q)
    );
  }, [history, search]);

  const selected = useMemo(
    () => history.find((h) => h.id === selectedId) || history[0],
    [history, selectedId]
  );
  const previous = useMemo(() => {
    if (!selected) return undefined;
    const idx = history.findIndex((h) => h.id === selected.id);
    return idx >= 0 ? history[idx + 1] : undefined;
  }, [history, selected]);

  const barData = useMemo(() => {
    return history
      .slice(0, 5)
      .reverse()
      .map((h, i) => ({
        name: `S-${history.length - history.slice(0, 5).length + i + 1}`,
        score: h.overallScore,
      }));
  }, [history]);

  const domains = useMemo(() => domainAverages(history), [history]);
  const weakList = useMemo(() => frequentWeaknesses(history), [history]);
  const scaledScore = selected ? approximateOfficialScore(selected) : 0;

  const categoryDeltas = useMemo(() => {
    if (!selected || !previous) return [];
    return selected.categories.map((c) => {
      const prev = previous.categories.find((p) => p.category === c.category);
      return {
        category: c.category,
        delta: c.score - (prev?.score ?? c.score),
        score: c.score,
      };
    });
  }, [selected, previous]);

  const handleDownloadReport = async () => {
    if (!selected) return;
    setDownloadError('');
    setIsDownloading(true);
    try {
      const response = await apiFetch('/interview/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selected.id,
          role: selected.role,
          company: selected.company,
          overall_score: selected.overallScore,
          categories: selected.categories,
          feedback: selected.feedback,
          date: selected.date,
          strengths: selected.strengths || [],
          weaknesses: selected.weaknesses || [],
          improvement_plan: selected.improvementPlan || [],
        }),
      });
      if (!response.ok) {
        throw new Error('Report generation failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prepai_report_${selected.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Could not download report PDF. Verify backend connectivity.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (history.length === 0) {
    return (
      <div className="glass-panel p-12 sm:p-16 rounded-xl border border-[var(--glass-border)] flex flex-col items-center justify-center text-center my-12 animate-fadeIn max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-full border border-dashed border-[var(--glass-border)] flex items-center justify-center mb-4 text-[var(--text-muted)]">
          <i className="fa-solid fa-chart-pie text-2xl"></i>
        </div>
        <h2 className="text-2xl font-mono font-black uppercase tracking-tight text-white mb-2">
          No Interview Records Found
        </h2>
        <p className="font-mono text-xs text-[var(--text-muted)] max-w-md mb-6 leading-relaxed">
          Complete a mock interview session to unlock turn-by-turn STAR scoring, skill radar charts, and PDF debriefs.
        </p>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate(AppRoute.INTERVIEW)}
            className="btn-primary py-3.5 px-6 font-mono text-xs font-bold tracking-wider"
          >
            Start Practice Interview
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-16 font-mono">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--glass-border)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="saas-pill">Executive Candidate Debrief</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white font-mono">
            Performance <span className="text-[var(--neon-cyan)]">Analytics</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">
            Turn-by-turn evaluations, STAR structure assessments, and action plans
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => downloadInterviewHistory()}
            className="btn-secondary text-[10px] px-4 py-2.5"
          >
            <i className="fa-solid fa-file-export text-xs"></i>
            <span>Export All JSON</span>
          </button>
        </div>
      </header>

      {/* Session Selector Strip with Filter */}
      <div className="glass-panel p-4 sm:p-5 rounded-xl border border-[var(--glass-border)] space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <input
              className="input-premium py-2 pl-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sessions by role, company, or mode…"
              aria-label="Search interview history"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs pointer-events-none"></i>
          </div>
          <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider self-center">
            {filtered.length} of {history.length} sessions
          </span>
        </div>

        {/* Horizontal Session Chips */}
        <div className="flex flex-wrap gap-2 pt-1 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
          {filtered.map((h) => {
            const isSelected = selected?.id === h.id;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  setSelectedId(h.id);
                  setShowTranscript(false);
                }}
                className={`px-3 py-1.5 rounded-sm border font-mono text-[10px] uppercase tracking-wider transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'border-[var(--neon-cyan)] text-white bg-[var(--neon-cyan)]/15 font-bold shadow-sm'
                    : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[rgba(255,255,255,0.2)] hover:text-white'
                }`}
              >
                {h.bookmarked && <span className="text-[var(--neon-orange)]">★</span>}
                <span className="truncate max-w-[160px]">{h.role}</span>
                <span className="text-[var(--text-muted)] font-normal">({h.overallScore})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Score Overview & Selected Session Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ScoreDisplay score={scaledScore} />

        <div className="lg:col-span-2 glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <span className="px-2.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-[var(--neon-cyan)]/15 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30">
                {selected?.company || 'General Practice'}
              </span>
              <span className="font-mono text-xs text-[var(--text-muted)]">
                {selected?.date ? new Date(selected.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''}
              </span>
            </div>

            <h2 className="text-2xl font-black uppercase tracking-tight text-white font-mono">
              {selected?.role}
            </h2>

            <p className="font-mono text-xs text-[var(--text-secondary)] uppercase tracking-wider">
              {[selected?.mode, selected?.field, selected?.companyStyle, selected?.domainPack].filter(Boolean).join(' · ')}
            </p>

            {previous && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[rgba(255,255,255,0.03)] border border-[var(--glass-border)] text-xs">
                <span className="text-[var(--text-muted)]">vs. Previous Session:</span>
                <strong
                  className={
                    selected!.overallScore - previous.overallScore >= 0
                      ? 'text-[var(--neon-emerald)]'
                      : 'text-red-400'
                  }
                >
                  {selected!.overallScore - previous.overallScore >= 0 ? '+' : ''}
                  {selected!.overallScore - previous.overallScore} pts
                </strong>
              </div>
            )}

            {downloadError && (
              <p role="alert" className="text-xs text-red-400 font-mono">
                {downloadError}
              </p>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap gap-2.5 pt-4 border-t border-[var(--glass-border)]">
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={isDownloading}
              className="btn-primary py-2.5 px-4 text-xs font-mono font-bold tracking-wider disabled:opacity-50"
            >
              <i className="fa-solid fa-file-pdf"></i>
              <span>{isDownloading ? 'Generating PDF…' : 'Download PDF Report'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTranscript((v) => !v)}
              className="btn-secondary py-2.5 px-4 text-xs font-mono tracking-wider"
            >
              <i className="fa-solid fa-scroll"></i>
              <span>{showTranscript ? 'Hide Transcript' : 'View Transcript'}</span>
            </button>

            {selected && (
              <>
                <button
                  type="button"
                  onClick={() => setHistory(toggleBookmark(selected.id))}
                  className="btn-secondary py-2.5 px-4 text-xs font-mono tracking-wider"
                >
                  <i className={`fa-solid fa-star ${selected.bookmarked ? 'text-[var(--neon-orange)]' : ''}`}></i>
                  <span>{selected.bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(copySessionSummary(selected));
                      setCopyStatus('Summary copied to clipboard!');
                      setTimeout(() => setCopyStatus(''), 2500);
                    } catch {
                      setCopyStatus('Clipboard copy failed');
                    }
                  }}
                  className="btn-secondary py-2.5 px-4 text-xs font-mono tracking-wider"
                >
                  <i className="fa-solid fa-copy"></i>
                  <span>Copy Summary</span>
                </button>
              </>
            )}
          </div>

          {copyStatus && (
            <p className="text-[10px] font-mono text-[var(--neon-emerald)] font-bold">{copyStatus}</p>
          )}
        </div>
      </div>

      {/* Expandable Transcript Panel */}
      {showTranscript && selected?.transcription && (
        <div className="glass-panel p-6 rounded-xl border border-[var(--glass-border)] space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
            <h3 className="font-mono text-xs uppercase font-bold tracking-wider text-white">
              Full Dialogue Transcript
            </h3>
            <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase">
              {selected.transcription.length} exchanges
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-3 pr-2 scrollbar-hide text-xs leading-relaxed">
            {selected.transcription.map((line, i) => {
              const isInterviewer = line.startsWith('Interviewer:');
              return (
                <div
                  key={i}
                  className={`p-3 rounded-md border ${
                    isInterviewer
                      ? 'border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] text-slate-200'
                      : 'border-[var(--neon-emerald)]/20 bg-[rgba(16,185,129,0.04)] text-slate-100 ml-4'
                  }`}
                >
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <Suspense
        fallback={
          <div className="glass-panel p-8 rounded-xl border border-[var(--glass-border)] font-mono text-xs text-[var(--text-muted)] animate-pulse">
            Loading analytics visualization…
          </div>
        }
      >
        <AnalyticsCharts categories={selected?.categories || []} barData={barData} />
      </Suspense>

      {/* Category Deltas vs Previous */}
      {categoryDeltas.length > 0 && (
        <div className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs uppercase font-bold tracking-[0.25em] text-white">
              Competency Shifts vs. Previous Session
            </h3>
            <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase">Turn Delta</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {categoryDeltas.map((d) => (
              <div key={d.category} className="p-3.5 rounded-lg border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)]">
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] block truncate mb-1">
                  {d.category}
                </span>
                <span
                  className={`font-mono text-xl font-black block leading-none ${
                    d.delta >= 0 ? 'text-[var(--neon-emerald)]' : 'text-red-400'
                  }`}
                >
                  {d.delta >= 0 ? '+' : ''}
                  {d.delta}
                </span>
                <span className="font-mono text-[10px] text-[var(--text-secondary)] mt-1 block">
                  current {d.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Weaknesses Split */}
      {(selected?.strengths?.length || selected?.weaknesses?.length) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] space-y-4">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-circle-check text-[var(--neon-emerald)] text-sm"></i>
              <h3 className="font-mono text-xs uppercase font-bold tracking-[0.25em] text-[var(--neon-emerald)]">
                Demonstrated Strengths
              </h3>
            </div>
            <ul className="space-y-2.5">
              {(selected?.strengths || []).map((s, i) => (
                <li
                  key={i}
                  className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed flex items-start gap-2.5"
                >
                  <span className="text-[var(--neon-emerald)] font-bold mt-0.5">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] space-y-4">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-[var(--neon-orange)] text-sm"></i>
              <h3 className="font-mono text-xs uppercase font-bold tracking-[0.25em] text-[var(--neon-orange)]">
                Target Improvement Areas
              </h3>
            </div>
            <ul className="space-y-2.5">
              {(selected?.weaknesses || []).map((w, i) => (
                <li
                  key={i}
                  className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed flex items-start gap-2.5"
                >
                  <span className="text-[var(--neon-orange)] font-bold mt-0.5">!</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {/* AI Turn-by-Turn Explanations & Better Answers */}
      {selected?.categoryExplanations && selected.categoryExplanations.length > 0 && (
        <div className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-2.5">
              <i className="fa-solid fa-brain text-[var(--neon-cyan)] text-base"></i>
              <h3 className="font-mono text-xs uppercase font-bold tracking-[0.25em] text-white">
                Turn-by-Turn AI Coaching Analysis
              </h3>
            </div>
            <span className="saas-pill">STAR Method</span>
          </div>

          <div className="space-y-6">
            {selected.categoryExplanations.map((ex) => (
              <div
                key={ex.category}
                className="p-5 rounded-lg border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--neon-cyan)]">
                    {ex.category}
                  </h4>
                  {onNavigate && (
                    <button
                      type="button"
                      className="btn-secondary text-[9px] py-1 px-3"
                      onClick={() => {
                        writeInterviewPrefill({
                          mode: selected.mode,
                          field: selected.field,
                          domainPack: selected.domainPack,
                        });
                        onNavigate(AppRoute.INTERVIEW);
                      }}
                    >
                      Practice Drill →
                    </button>
                  )}
                </div>

                <p className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed">
                  {ex.why}
                </p>

                <div className="p-3 rounded bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.15)] text-xs text-[var(--neon-emerald)] font-mono">
                  <i className="fa-solid fa-lightbulb mr-2"></i>
                  <strong>Coach Tip:</strong> {ex.tip}
                </div>

                {ex.betterAnswer && (
                  <div className="space-y-1 pt-1">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                      Recommended Better Answer:
                    </span>
                    <p className="font-mono text-xs text-slate-200 leading-relaxed bg-[rgba(0,0,0,0.3)] p-3 rounded border border-[var(--glass-border)]">
                      {ex.betterAnswer}
                    </p>
                  </div>
                )}

                {ex.excellentAnswer && (
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--neon-cyan)] font-bold">
                      Gold Standard Answer:
                    </span>
                    <p className="font-mono text-xs text-white leading-relaxed bg-[rgba(6,182,212,0.05)] p-3 rounded border border-[var(--neon-cyan)]/30">
                      {ex.excellentAnswer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* High-Quality Sample Answers */}
      {selected?.sampleAnswers && selected.sampleAnswers.length > 0 && (
        <div className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--glass-border)] space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--glass-border)]">
            <i className="fa-solid fa-award text-[var(--neon-orange)] text-sm"></i>
            <h3 className="font-mono text-xs uppercase font-bold tracking-[0.25em] text-white">
              Model Responses for Asked Themes
            </h3>
          </div>

          <div className="space-y-4">
            {selected.sampleAnswers.map((sa, i) => (
              <div key={i} className="p-4 rounded-lg border border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] space-y-2">
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--neon-orange)] block">
                  Question Theme: {sa.questionTheme}
                </span>
                <p className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap font-sans">
                  {sa.example}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
