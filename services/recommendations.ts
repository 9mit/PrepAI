import { InterviewResult, PracticeRecommendation, QuizTopicStats } from '../types';

function loadQuizStats(): QuizTopicStats[] {
  try {
    return JSON.parse(localStorage.getItem('quiz_topic_stats') || '[]') as QuizTopicStats[];
  } catch {
    return [];
  }
}

/**
 * Derive 3–5 concrete next-practice actions from interview history and quiz stats.
 */
export function getPracticeRecommendations(history: InterviewResult[]): PracticeRecommendation[] {
  const recs: PracticeRecommendation[] = [];
  const latest = history[0];

  if (!latest) {
    return [
      {
        id: 'start-interview',
        title: 'Start a practice interview',
        reason: 'No sessions yet — complete one to unlock personalized guidance.',
        action: 'interview',
      },
      {
        id: 'start-quiz',
        title: 'Try a practice quiz',
        reason: 'Build foundations with a short topic quiz.',
        action: 'quiz',
        prefills: { topic: 'STAR Method' },
      },
    ];
  }

  const weakCats = [...latest.categories]
    .sort((a, b) => a.score - b.score)
    .filter((c) => c.score < 75)
    .slice(0, 2);

  for (const cat of weakCats) {
    const name = cat.category.toLowerCase();
    if (name.includes('communication')) {
      recs.push({
        id: 'comm',
        title: 'Improve communication',
        reason: `${cat.category} scored ${cat.score}. Practice clearer, structured answers.`,
        action: 'interview',
        prefills: { mode: 'behavioral' },
      });
    } else if (name.includes('role') || name.includes('technical')) {
      recs.push({
        id: 'role-know',
        title: 'Strengthen role knowledge',
        reason: `${cat.category} scored ${cat.score}. Focus on domain depth for ${latest.role}.`,
        action: 'interview',
        prefills: { field: latest.field || 'business', mode: 'technical' },
      });
    } else if (name.includes('problem')) {
      recs.push({
        id: 'problem',
        title: 'Practice problem solving',
        reason: `${cat.category} scored ${cat.score}. Try a case-style round.`,
        action: 'interview',
        prefills: { mode: 'case' },
      });
    } else if (name.includes('confidence') || name.includes('cultural')) {
      recs.push({
        id: 'leadership',
        title: 'Practice leadership questions',
        reason: `${cat.category} scored ${cat.score}. A leadership round helps.`,
        action: 'interview',
        prefills: { mode: 'leadership' },
      });
    }
  }

  for (const w of (latest.weaknesses || []).slice(0, 2)) {
    recs.push({
      id: `weak-${recs.length}`,
      title: 'Address a recent weakness',
      reason: w.slice(0, 120),
      action: 'interview',
      prefills: { mode: latest.mode || 'behavioral' },
    });
  }

  const quizStats = loadQuizStats().sort((a, b) => a.avgScore - b.avgScore);
  if (quizStats[0] && quizStats[0].avgScore < 70) {
    recs.push({
      id: 'quiz-weak',
      title: `Revise: ${quizStats[0].topic}`,
      reason: `Average quiz score ${Math.round(quizStats[0].avgScore)}%. Retry at an easier difficulty.`,
      action: 'quiz',
      prefills: { topic: quizStats[0].topic },
    });
  }

  if (history.length >= 2) {
    const prev = history[1];
    const delta = latest.overallScore - prev.overallScore;
    if (delta < 0) {
      recs.push({
        id: 'retry-mode',
        title: 'Retry your last interview style',
        reason: `Score dropped ${Math.abs(delta)} points vs the previous session.`,
        action: 'interview',
        prefills: { mode: latest.mode, field: latest.field },
      });
    }
  }

  if (recs.length === 0) {
    recs.push({
      id: 'stretch',
      title: 'Try a harder final-round interview',
      reason: 'Recent scores look solid — stretch with a final-round style.',
      action: 'interview',
      prefills: { mode: 'final' },
    });
  }

  // Dedupe by title, cap at 5
  const seen = new Set<string>();
  return recs.filter((r) => {
    if (seen.has(r.title)) return false;
    seen.add(r.title);
    return true;
  }).slice(0, 5);
}

export function frequentWeaknesses(history: InterviewResult[], limit = 5): string[] {
  const counts = new Map<string, number>();
  for (const h of history.slice(0, 10)) {
    for (const w of h.weaknesses || []) {
      const key = w.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    for (const c of h.categories) {
      if (c.score < 65) {
        const key = `Low ${c.category}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

export function domainAverages(history: InterviewResult[]): { label: string; avg: number; count: number }[] {
  const map = new Map<string, { sum: number; count: number }>();
  for (const h of history) {
    const key = h.field || h.mode || 'general';
    const cur = map.get(key) || { sum: 0, count: 0 };
    cur.sum += h.overallScore;
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.entries()].map(([label, v]) => ({
    label,
    avg: Math.round(v.sum / v.count),
    count: v.count,
  }));
}
