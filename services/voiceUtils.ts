const FILLER_WORDS = new Set([
  'um', 'uh', 'er', 'ah', 'like', 'youknow', 'you', 'know', 'basically', 'actually',
  'literally', 'right', 'so', 'well', 'hmm', 'mmm',
]);

/**
 * Estimate filler-word ratio from a transcript segment (0–1).
 */
export function estimateFillerRatio(text: string): number {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return 0;
  let fillers = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (FILLER_WORDS.has(t)) {
      fillers += 1;
      continue;
    }
    if (t === 'you' && tokens[i + 1] === 'know') {
      fillers += 1;
    }
  }
  return Math.min(1, fillers / tokens.length);
}

/**
 * Lightweight confidence estimate 0–100 from filler ratio, length, and optional API confidence.
 */
export function estimateSpeakingConfidence(
  text: string,
  fillerRatio: number,
  apiConfidence?: number
): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  let score = 70;
  if (words < 12) score -= 15;
  else if (words > 40 && words < 180) score += 10;
  else if (words >= 180) score -= 5;
  score -= Math.round(fillerRatio * 80);
  if (typeof apiConfidence === 'number') {
    score = Math.round(score * 0.5 + apiConfidence * 0.5);
  }
  return Math.max(1, Math.min(100, score));
}

export type SpeechPace = 'slow' | 'normal' | 'fast';

export function paceToRate(pace: SpeechPace): number {
  if (pace === 'slow') return 0.85;
  if (pace === 'fast') return 1.15;
  return 1;
}
