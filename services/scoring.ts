import { InterviewResult } from "../types";

/**
 * Map a 1-100 overall interview score onto the official 1-10000 display scale.
 * Linear mapping: score_100 * 100, clamped to [1, 10000].
 */
export function scaleScoreTo10000(overallScore100: number): number {
  return Math.max(1, Math.min(10000, Math.round(overallScore100 * 100)));
}

/**
 * Approximate the official weighted formula from category scores when agentic
 * session metrics (latency, follow-ups) are unavailable.
 */
export function approximateOfficialScore(result: InterviewResult): number {
  const byName = (...names: string[]): number => {
    const lowered = names.map((n) => n.toLowerCase());
    const found = result.categories.find((c) =>
      lowered.includes(c.category.toLowerCase())
    );
    return found?.score ?? result.overallScore;
  };

  const accuracy = byName("Role Knowledge", "Technical Knowledge");
  const depth = byName("Problem Solving");
  const adaptability = byName("Cultural Fit");
  const confidence = byName("Confidence");
  const speed = byName("Communication"); // proxy when latency unknown

  const scoreRaw =
    (accuracy * 0.35 +
      depth * 0.25 +
      adaptability * 0.2 +
      speed * 0.1 +
      confidence * 0.1) /
    100 *
    10000;

  return Math.max(1, Math.min(10000, Math.round(scoreRaw)));
}
