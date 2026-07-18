import { describe, it, expect, beforeAll } from 'vitest';
import { scaleScoreTo10000, approximateOfficialScore } from './scoring';
import { estimateFillerRatio, estimateSpeakingConfidence } from './voiceUtils';
import { suggestDifficulty } from './quizService';
import { buildDomainPackPromptBlock, getDomainPack } from './domainPacks';
import { truncateJd, MAX_JD_CHARS, buildNaturalInterviewRules, copySessionSummary } from './interviewContext';
import { getLearningRecommendations, buildSkillProfile } from './skillProfile';
import { getDailyChallenge, getMonthlySummary } from './growth';
import { exportSeatsCsv, upsertSeat, listSeats } from './templates';
import { InterviewResult } from '../types';

beforeAll(() => {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true });
});

function sampleResult(overrides: Partial<InterviewResult> = {}): InterviewResult {
  return {
    id: '1',
    date: new Date().toISOString(),
    role: 'PM',
    company: 'X',
    overallScore: 70,
    categories: [
      { category: 'Role Knowledge', score: 80, fullMark: 100 },
      { category: 'Problem Solving', score: 70, fullMark: 100 },
      { category: 'Cultural Fit', score: 60, fullMark: 100 },
      { category: 'Confidence', score: 70, fullMark: 100 },
      { category: 'Communication', score: 75, fullMark: 100 },
    ],
    feedback: [],
    transcription: [],
    ...overrides,
  };
}

describe('scoring', () => {
  it('scales 1-100 to 1-10000', () => {
    expect(scaleScoreTo10000(75)).toBe(7500);
    expect(scaleScoreTo10000(0)).toBe(1);
    expect(scaleScoreTo10000(100)).toBe(10000);
  });

  it('approximates official score with Role Knowledge', () => {
    const score = approximateOfficialScore(sampleResult());
    expect(score).toBeGreaterThan(1);
    expect(score).toBeLessThanOrEqual(10000);
  });
});

describe('voiceUtils', () => {
  it('detects fillers', () => {
    expect(estimateFillerRatio('um uh like basically the plan')).toBeGreaterThan(0.2);
    expect(estimateFillerRatio('We shipped the feature on time.')).toBeLessThan(0.15);
  });

  it('estimates confidence', () => {
    const c = estimateSpeakingConfidence(
      'We delivered a 20% uplift in conversion by redesigning onboarding.',
      0.05,
      80
    );
    expect(c).toBeGreaterThan(50);
  });
});

describe('quiz difficulty', () => {
  it('defaults to medium without stats', () => {
    expect(suggestDifficulty('Brand New Topic XYZ')).toBe('medium');
  });
});

describe('domain packs', () => {
  it('builds prompt block', () => {
    const pack = getDomainPack('consulting');
    expect(pack).toBeTruthy();
    const block = buildDomainPackPromptBlock(pack);
    expect(block).toContain('Consulting');
    expect(block).toContain('Rubric');
  });
});

describe('interviewContext', () => {
  it('truncates JD', () => {
    const long = 'a'.repeat(MAX_JD_CHARS + 100);
    expect(truncateJd(long).length).toBe(MAX_JD_CHARS);
  });

  it('includes banned phrases and topics', () => {
    const rules = buildNaturalInterviewRules(5, 2, ['pricing']);
    expect(rules).toContain('pricing');
    expect(rules).toContain('stock phrases');
  });

  it('copies session summary', () => {
    const text = copySessionSummary(sampleResult({ overallScore: 82, strengths: ['clarity'] }));
    expect(text).toContain('82');
    expect(text).toContain('PM');
  });
});

describe('skill profile', () => {
  it('builds trends and recommendations', () => {
    const history = [
      sampleResult({
        id: 'a',
        overallScore: 60,
        mode: 'technical',
        categories: [
          { category: 'Role Knowledge', score: 50, fullMark: 100 },
          { category: 'Cultural Fit', score: 55, fullMark: 100 },
          { category: 'Communication', score: 80, fullMark: 100 },
          { category: 'Problem Solving', score: 60, fullMark: 100 },
          { category: 'Confidence', score: 60, fullMark: 100 },
        ],
      }),
      sampleResult({ id: 'b', overallScore: 75, mode: 'leadership' }),
      sampleResult({ id: 'c', overallScore: 70, mode: 'technical' }),
    ];
    const profile = buildSkillProfile(history);
    expect(profile.sessionsAnalyzed).toBe(3);
    const recs = getLearningRecommendations(history);
    expect(recs.length).toBeGreaterThan(0);
  });
});

describe('growth', () => {
  it('returns daily challenge', () => {
    const d = getDailyChallenge(new Date('2026-07-18'));
    expect(d.mode).toBeTruthy();
    expect(d.domainPack).toBeTruthy();
  });

  it('summarizes month', () => {
    const s = getMonthlySummary([
      sampleResult({ date: '2026-07-01T00:00:00.000Z', weaknesses: ['clarity'] }),
    ]);
    expect(s.sessions).toBeGreaterThanOrEqual(0);
  });
});

describe('sanitize', () => {
  it('escapes formula cells', async () => {
    const { sanitizeExportCell, stripControlChars } = await import('./sanitize');
    expect(sanitizeExportCell('=CMD()')).toMatch(/^'/);
    expect(stripControlChars('hi\u0000there')).toBe('hithere');
  });
});

describe('templates seats', () => {
  it('exports csv after upsert', () => {
    localStorage.clear();
    upsertSeat('Alice', 80);
    upsertSeat('Alice', 90);
    expect(listSeats().length).toBe(1);
    const csv = exportSeatsCsv();
    expect(csv).toContain('Alice');
    expect(csv).toContain('avg_score');
  });
});
