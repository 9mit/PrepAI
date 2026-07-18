import { getPracticeRecommendations as getLegacyRecommendations } from './recommendations';
import { getLearningRecommendations } from './skillProfile';
import { InterviewResult, PracticeRecommendation } from '../types';

/** Prefer trend-aware learning recommendations when enough history exists. */
export function getDashboardRecommendations(history: InterviewResult[]): PracticeRecommendation[] {
  if (history.length >= 2) {
    return getLearningRecommendations(history);
  }
  return getLegacyRecommendations(history);
}

export { getLegacyRecommendations as getPracticeRecommendations };
export { getLearningRecommendations, buildSkillProfile } from './skillProfile';
