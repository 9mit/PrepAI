import { DOMAIN_PACKS } from './domainPacks';
import { INTERVIEW_MODES } from '../constants';

const STREAK_KEY = 'prepai_practice_streak';
const LAST_PRACTICE_KEY = 'prepai_last_practice_day';

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function recordPracticeActivity(): { streak: number; isNewDay: boolean } {
  const today = dayKey();
  const last = localStorage.getItem(LAST_PRACTICE_KEY);
  let streak = Number(localStorage.getItem(STREAK_KEY) || '0');
  let isNewDay = false;
  if (last !== today) {
    isNewDay = true;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (last === dayKey(yesterday)) {
      streak += 1;
    } else {
      streak = 1;
    }
    localStorage.setItem(STREAK_KEY, String(streak));
    localStorage.setItem(LAST_PRACTICE_KEY, today);
  }
  return { streak, isNewDay };
}

export function getPracticeStreak(): number {
  return Number(localStorage.getItem(STREAK_KEY) || '0');
}

/** Deterministic daily challenge from date seed. */
export function getDailyChallenge(date = new Date()): {
  title: string;
  mode: string;
  domainPack: string;
  topic: string;
} {
  const seed = Number(dayKey(date).replace(/-/g, ''));
  const modes = INTERVIEW_MODES;
  const packs = DOMAIN_PACKS;
  const mode = modes[seed % modes.length];
  const pack = packs[seed % packs.length];
  return {
    title: `Interview of the day: ${pack.label} · ${mode.label}`,
    mode: mode.id,
    domainPack: pack.id,
    topic: pack.label,
  };
}

export function getWeeklyChallenge(date = new Date()): {
  title: string;
  mode: string;
  domainPack: string;
} {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  const seed = Number(dayKey(start).replace(/-/g, ''));
  const mode = INTERVIEW_MODES[(seed + 3) % INTERVIEW_MODES.length];
  const pack = DOMAIN_PACKS[(seed + 5) % DOMAIN_PACKS.length];
  return {
    title: `Weekly challenge: ${pack.label} ${mode.label}`,
    mode: mode.id,
    domainPack: pack.id,
  };
}

export function getMonthlySummary(history: { overallScore: number; date: string; weaknesses?: string[] }[]): {
  sessions: number;
  avgScore: number;
  topWeakness: string;
} {
  const month = dayKey().slice(0, 7);
  const inMonth = history.filter((h) => (h.date || '').startsWith(month));
  if (inMonth.length === 0) {
    return { sessions: 0, avgScore: 0, topWeakness: 'No sessions this month' };
  }
  const avgScore = Math.round(
    inMonth.reduce((a, b) => a + b.overallScore, 0) / inMonth.length
  );
  const weakCounts = new Map<string, number>();
  for (const h of inMonth) {
    for (const w of h.weaknesses || []) {
      weakCounts.set(w, (weakCounts.get(w) || 0) + 1);
    }
  }
  const topWeakness =
    [...weakCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Keep practicing';
  return { sessions: inMonth.length, avgScore, topWeakness };
}
