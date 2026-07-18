import { InterviewResult, PracticeRecommendation, QuizTopicStats } from '../types';
import { getQuizTopicStats } from './quizService';

export interface SkillCategoryTrend {
  category: string;
  latest: number;
  previous: number | null;
  delta: number;
  avg: number;
}

export interface SkillProfile {
  updatedAt: string;
  sessionsAnalyzed: number;
  categoryTrends: SkillCategoryTrend[];
  weakModes: string[];
  strongModes: string[];
  suggestedIntensity: 'zen' | 'standard' | 'aggressive';
}

function loadHistory(): InterviewResult[] {
  try {
    return JSON.parse(localStorage.getItem('interview_history') || '[]') as InterviewResult[];
  } catch {
    return [];
  }
}

export function buildSkillProfile(history?: InterviewResult[]): SkillProfile {
  const h = (history || loadHistory()).slice(0, 12);
  const catMap = new Map<string, number[]>();
  const modeScores = new Map<string, number[]>();

  for (const session of h) {
    for (const c of session.categories || []) {
      const arr = catMap.get(c.category) || [];
      arr.push(c.score);
      catMap.set(c.category, arr);
    }
    if (session.mode) {
      const arr = modeScores.get(session.mode) || [];
      arr.push(session.overallScore);
      modeScores.set(session.mode, arr);
    }
  }

  const categoryTrends: SkillCategoryTrend[] = [...catMap.entries()].map(([category, scores]) => {
    const latest = scores[0] ?? 0;
    const previous = scores.length > 1 ? scores[1] : null;
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return {
      category,
      latest,
      previous,
      delta: previous === null ? 0 : latest - previous,
      avg,
    };
  });

  const modeAvgs = [...modeScores.entries()].map(([mode, scores]) => ({
    mode,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));
  modeAvgs.sort((a, b) => a.avg - b.avg);
  const weakModes = modeAvgs.slice(0, 2).map((m) => m.mode);
  const strongModes = modeAvgs.slice(-2).reverse().map((m) => m.mode);

  const comm = categoryTrends.find((c) => c.category.toLowerCase().includes('communication'));
  let suggestedIntensity: SkillProfile['suggestedIntensity'] = 'standard';
  if (comm && comm.delta > 5 && comm.latest >= 75) suggestedIntensity = 'aggressive';
  if (comm && comm.latest < 55) suggestedIntensity = 'zen';

  const profile: SkillProfile = {
    updatedAt: new Date().toISOString(),
    sessionsAnalyzed: h.length,
    categoryTrends,
    weakModes,
    strongModes,
    suggestedIntensity,
  };
  localStorage.setItem('prepai_skill_profile', JSON.stringify(profile));
  return profile;
}

export function loadSkillProfile(): SkillProfile | null {
  try {
    const raw = localStorage.getItem('prepai_skill_profile');
    return raw ? (JSON.parse(raw) as SkillProfile) : null;
  } catch {
    return null;
  }
}

/**
 * Trend-aware recommendations (Phase 14). Falls back gracefully with few sessions.
 */
export function getLearningRecommendations(history: InterviewResult[]): PracticeRecommendation[] {
  const profile = buildSkillProfile(history);
  const recs: PracticeRecommendation[] = [];

  const leadershipWeak = profile.categoryTrends.find(
    (c) => c.category.toLowerCase().includes('cultural') || c.avg < 65
  );
  const roleWeak = profile.categoryTrends.find(
    (c) => c.category.toLowerCase().includes('role') || c.category.toLowerCase().includes('technical')
  );
  const comm = profile.categoryTrends.find((c) => c.category.toLowerCase().includes('communication'));

  if (leadershipWeak && leadershipWeak.avg < 70) {
    recs.push({
      id: 'learn-leadership',
      title: 'Practice leadership questions',
      reason: `${leadershipWeak.category} averaging ${leadershipWeak.avg}. Focus on leadership + STAR.`,
      action: 'interview',
      prefills: { mode: 'leadership' },
    });
    recs.push({
      id: 'learn-star',
      title: 'STAR method quiz',
      reason: 'Strengthen structured behavioral answers.',
      action: 'quiz',
      prefills: { topic: 'STAR Method' },
    });
  }

  if (roleWeak && roleWeak.delta < -5) {
    recs.push({
      id: 'learn-tech-drop',
      title: 'Revision: role knowledge',
      reason: `${roleWeak.category} dropped ${Math.abs(roleWeak.delta)} pts — schedule a technical round.`,
      action: 'interview',
      prefills: { mode: 'technical' },
    });
  }

  if (comm && comm.delta > 5) {
    recs.push({
      id: 'learn-comm-up',
      title: 'Increase interview difficulty',
      reason: 'Communication is improving — try a final-round or aggressive session.',
      action: 'interview',
      prefills: { mode: 'final' },
    });
  }

  const quizStats: QuizTopicStats[] = getQuizTopicStats().sort((a, b) => a.avgScore - b.avgScore);
  if (quizStats[0] && quizStats[0].avgScore < 70) {
    recs.push({
      id: 'learn-quiz',
      title: `Revise: ${quizStats[0].topic}`,
      reason: `Quiz avg ${Math.round(quizStats[0].avgScore)}% — adaptive retry recommended.`,
      action: 'quiz',
      prefills: { topic: quizStats[0].topic },
    });
  }

  for (const mode of profile.weakModes.slice(0, 1)) {
    recs.push({
      id: `weak-mode-${mode}`,
      title: `Retry ${mode} interviews`,
      reason: 'Your weakest interview mode based on recent averages.',
      action: 'interview',
      prefills: { mode },
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: 'learn-default',
      title: 'Start a practice interview',
      reason: 'Complete more sessions to unlock trend-based coaching.',
      action: 'interview',
    });
  }

  const seen = new Set<string>();
  return recs.filter((r) => {
    if (seen.has(r.title)) return false;
    seen.add(r.title);
    return true;
  }).slice(0, 5);
}
