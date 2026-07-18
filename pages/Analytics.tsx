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
    return history.slice(0, 5).reverse().map((h, i) => ({
      name: `S-${history.length - history.slice(0, 5).length + i + 1}`,
      score: h.overallScore
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
      setDownloadError('Could not download the report. Is the server running?');
    } finally {
      setIsDownloading(false);
    }
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-fadeIn border border-dashed border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] px-4">
        <div className="w-20 h-20 rounded-full flex items-center justify-center border border-[var(--text-muted)] mb-8 opacity-50">
          <i className="fa-solid fa-chart-pie text-3xl text-[var(--text-muted)]"></i>
        </div>
        <h2 className="text-3xl font-mono font-black uppercase tracking-tighter text-white text-center">No results yet</h2>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] text-center">Complete a practice interview to see your scores here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fadeIn pb-20">
      <header className="space-y-2 border-b border-[rgba(255,255,255,0.05)] pb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 flex items-center justify-center bg-[var(--neon-violet)]/10 border border-[var(--neon-violet)]/30">
            <i className="fa-solid fa-chart-bar text-[var(--neon-violet)]"></i>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-[var(--neon-violet)]">Results</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-mono font-black uppercase tracking-tighter text-white">Your results</h1>
      </header>

      <div className="glass-panel p-4 sm:p-6 border border-[rgba(255,255,255,0.05)] space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end justify-between">
          <label className="label-premium mb-0 block flex-1">
            Search history
            <input
              className="input-premium mt-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by role, company, mode…"
              aria-label="Search interview history"
            />
          </label>
          <button type="button" onClick={() => downloadInterviewHistory()} className="btn-secondary text-[10px] px-4 py-3">
            Export JSON
          </button>
        </div>
        <label className="label-premium mb-3 block">Interview history</label>
        <div className="flex flex-wrap gap-2">
          {filtered.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => { setSelectedId(h.id); setShowTranscript(false); }}
              className={`px-4 py-2 border font-mono text-[9px] uppercase tracking-wider transition-all focus:outline-none focus:ring-1 focus:ring-[var(--neon-cyan)] ${
                selected?.id === h.id
                  ? 'border-[var(--neon-cyan)] text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10'
                  : 'border-[rgba(255,255,255,0.05)] text-[var(--text-secondary)]'
              }`}
            >
              {h.bookmarked ? '★ ' : ''}#{history.length - history.findIndex((x) => x.id === h.id)} · {h.role.slice(0, 24)} · {h.overallScore}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ScoreDisplay score={scaledScore} />
        <div className="lg:col-span-2 flex flex-col gap-6 justify-center glass-panel p-6 sm:p-8 border border-[rgba(255,255,255,0.05)]">
          <div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-white mb-2">Selected interview</h3>
            <p className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-tighter break-words">
              {selected?.role} @ {selected?.company || '—'} — {selected?.date ? new Date(selected.date).toLocaleDateString() : ''}
            </p>
            <p className="font-mono text-[9px] text-[var(--text-muted)] mt-2 uppercase tracking-widest">
              {[selected?.mode, selected?.field, selected?.companyStyle].filter(Boolean).join(' · ') || 'Score on the 1–10000 scale'}
            </p>
            {previous && (
              <p className="font-mono text-[10px] mt-3 text-[var(--text-secondary)]">
                vs previous: {selected!.overallScore - previous.overallScore >= 0 ? '+' : ''}
                {selected!.overallScore - previous.overallScore} overall
              </p>
            )}
          </div>
          {downloadError && (
            <p role="alert" className="font-mono text-[9px] text-red-400 uppercase tracking-widest">{downloadError}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={isDownloading}
              className="btn-primary py-4 px-6 text-center font-mono text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-60"
              style={{ background: 'var(--neon-cyan)', color: '#000' }}
            >
              <i className="fa-solid fa-file-pdf"></i>
              {isDownloading ? 'Generating…' : 'Download report'}
            </button>
            <button
              type="button"
              onClick={() => setShowTranscript((v) => !v)}
              className="btn-secondary py-4 px-6 font-mono text-xs uppercase tracking-[0.2em]"
            >
              {showTranscript ? 'Hide transcript' : 'View transcript'}
            </button>
            {selected && (
              <>
                <button
                  type="button"
                  onClick={() => setHistory(toggleBookmark(selected.id))}
                  className="btn-secondary py-4 px-6 font-mono text-xs uppercase tracking-[0.2em]"
                >
                  {selected.bookmarked ? 'Unbookmark' : 'Bookmark'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(copySessionSummary(selected));
                      setCopyStatus('Summary copied');
                    } catch {
                      setCopyStatus('Could not copy');
                    }
                  }}
                  className="btn-secondary py-4 px-6 font-mono text-xs uppercase tracking-[0.2em]"
                >
                  Copy summary
                </button>
              </>
            )}
          </div>
          {copyStatus && <p className="font-mono text-[9px] text-[var(--neon-emerald)]">{copyStatus}</p>}
        </div>
      </div>

      {showTranscript && selected?.transcription && (
        <div className="glass-panel p-6 sm:p-8 border border-[rgba(255,255,255,0.05)] max-h-96 overflow-y-auto space-y-3">
          <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-white mb-4">Transcript</h3>
          {selected.transcription.map((line, i) => (
            <p key={i} className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed break-words">{line}</p>
          ))}
        </div>
      )}

      <Suspense
        fallback={
          <div className="glass-panel p-8 border border-[rgba(255,255,255,0.05)] font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            Loading charts…
          <div className="mt-4 h-64 animate-pulse bg-[rgba(255,255,255,0.06)] rounded" />
          </div>
        }
      >
        <AnalyticsCharts categories={selected?.categories || []} barData={barData} />
      </Suspense>

      {categoryDeltas.length > 0 && (
        <div className="glass-panel p-6 sm:p-8 border border-[rgba(255,255,255,0.05)]">
          <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-white mb-6">Compare to previous</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {categoryDeltas.map((d) => (
              <div key={d.category} className="p-4 border border-[rgba(255,255,255,0.05)]">
                <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--text-muted)] mb-2">{d.category}</p>
                <p className={`font-mono text-lg font-black ${d.delta >= 0 ? 'text-[var(--neon-emerald)]' : 'text-red-400'}`}>
                  {d.delta >= 0 ? '+' : ''}{d.delta}
                </p>
                <p className="font-mono text-[9px] text-[var(--text-secondary)]">now {d.score}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(domains.length > 0 || weakList.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {domains.length > 0 && (
            <div className="glass-panel p-6 border border-[rgba(255,255,255,0.05)]">
              <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-white mb-4">Domain averages</h3>
              <ul className="space-y-3">
                {domains.map((d) => (
                  <li key={d.label} className="flex justify-between font-mono text-xs text-[var(--text-secondary)]">
                    <span className="uppercase tracking-widest">{d.label}</span>
                    <span className="text-white">{d.avg} <span className="text-[var(--text-muted)]">({d.count})</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {weakList.length > 0 && (
            <div className="glass-panel p-6 border border-[rgba(255,255,255,0.05)]">
              <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-white mb-4">Frequent weaknesses</h3>
              <ul className="space-y-3">
                {weakList.map((w) => (
                  <li key={w} className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed">• {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {(selected?.strengths?.length || selected?.weaknesses?.length) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-panel p-6 sm:p-8 border border-[rgba(255,255,255,0.05)]">
            <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-[var(--neon-emerald)] mb-4">Strengths</h3>
            <ul className="space-y-3">
              {(selected?.strengths || []).map((s, i) => (
                <li key={i} className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed">+ {s}</li>
              ))}
            </ul>
          </div>
          <div className="glass-panel p-6 sm:p-8 border border-[rgba(255,255,255,0.05)]">
            <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-red-400 mb-4">Weaknesses</h3>
            <ul className="space-y-3">
              {(selected?.weaknesses || []).map((w, i) => (
                <li key={i} className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed">− {w}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {selected?.categoryExplanations && selected.categoryExplanations.length > 0 && (
        <div className="glass-panel p-6 sm:p-8 border border-[rgba(255,255,255,0.05)]">
          <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-white mb-6">AI Coach</h3>
          <div className="space-y-6">
            {selected.categoryExplanations.map((ex) => (
              <div key={ex.category} className="p-5 border border-[rgba(255,255,255,0.05)] space-y-3">
                <h5 className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--neon-cyan)]">{ex.category}</h5>
                <p className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed">{ex.why}</p>
                <p className="font-mono text-[10px] text-[var(--neon-emerald)]">Tip: {ex.tip}</p>
                {ex.betterAnswer && (
                  <div>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Better answer</p>
                    <p className="font-mono text-xs text-white leading-relaxed">{ex.betterAnswer}</p>
                  </div>
                )}
                {ex.excellentAnswer && (
                  <div>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Excellent answer</p>
                    <p className="font-mono text-xs text-white leading-relaxed">{ex.excellentAnswer}</p>
                  </div>
                )}
                {(ex.tips?.length || ex.commonMistakes?.length) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {ex.tips && ex.tips.length > 0 && (
                      <ul className="space-y-1">
                        {ex.tips.map((t) => (
                          <li key={t} className="font-mono text-[10px] text-[var(--text-secondary)]">• {t}</li>
                        ))}
                      </ul>
                    )}
                    {ex.commonMistakes && ex.commonMistakes.length > 0 && (
                      <ul className="space-y-1">
                        {ex.commonMistakes.map((m) => (
                          <li key={m} className="font-mono text-[10px] text-red-400/80">× {m}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
                {onNavigate && (
                  <button
                    type="button"
                    className="btn-secondary text-[9px] px-3 py-2 mt-2"
                    onClick={() => {
                      writeInterviewPrefill({ mode: selected.mode, field: selected.field, domainPack: selected.domainPack });
                      onNavigate(AppRoute.INTERVIEW);
                    }}
                  >
                    Practice this tip
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {selected?.improvementPlan && selected.improvementPlan.length > 0 && (
        <div className="glass-panel p-6 sm:p-8 border border-[rgba(255,255,255,0.05)]">
          <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-white mb-4">Improvement plan</h3>
          <ol className="space-y-3 list-decimal list-inside">
            {selected.improvementPlan.map((step, i) => (
              <li key={i} className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed">{step}</li>
            ))}
          </ol>
        </div>
      )}

      {selected?.sampleAnswers && selected.sampleAnswers.length > 0 && (
        <div className="glass-panel p-6 sm:p-8 border border-[rgba(255,255,255,0.05)]">
          <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-white mb-6">Sample high-quality answers</h3>
          <div className="space-y-6">
            {selected.sampleAnswers.map((sa, i) => (
              <div key={i} className="p-4 border border-[rgba(255,255,255,0.05)]">
                <h5 className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--neon-orange)] mb-2">{sa.questionTheme}</h5>
                <p className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{sa.example}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-panel p-6 sm:p-8 border border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-4 mb-8">
          <i className="fa-solid fa-microchip text-[var(--neon-emerald)] text-xl"></i>
          <h3 className="font-mono text-xl font-black uppercase tracking-tighter text-white">Feedback</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(selected?.feedback || []).map((text, i) => (
            <div
              key={i}
              className="p-6 border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] hover:border-[var(--neon-emerald)] transition-colors group"
            >
              <h5 className="font-mono text-[9px] font-bold uppercase tracking-widest mb-3 text-[var(--neon-emerald)]">Note {i + 1}</h5>
              <p className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed group-hover:text-white transition-colors break-words">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
