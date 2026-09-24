/**
 * Turn-machine helpers shared by InterviewRoom.
 * STT/TTS/evaluate orchestration remains in InterviewRoom for session coupling;
 * this module owns shared types and silence constants.
 */
export type { TurnState } from '../components/interview/interviewConstants';

export const SILENCE_COMMIT_MS = 3200;

export interface EvaluateApiResponse {
  next_action: string;
  message: string;
  follow_up: { type: string; question: string } | null;
  score?: {
    accuracy: number;
    depth: number;
    clarity: number;
    confidence: number;
    feedback: string;
  };
}
