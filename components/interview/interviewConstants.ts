import { INTERVIEW_FIELDS, COMPANY_STYLES, INTERVIEW_MODES } from '../../constants';
import { SpeechPace } from '../../services/voiceUtils';

export type InterviewFieldId = (typeof INTERVIEW_FIELDS)[number]['id'];
export type CompanyStyleId = (typeof COMPANY_STYLES)[number]['id'];
export type InterviewModeId = (typeof INTERVIEW_MODES)[number]['id'];

export type TurnState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface TranscriptLine {
  sender: 'AI' | 'You';
  text: string;
}

export const TOTAL_QUESTIONS_DEFAULT = 5;

export const AVATAR_STYLES = [
  {
    id: 'professional',
    label: 'Executive',
    icon: 'fa-user-tie',
    description: 'A direct industry leader focused on strategy, culture fit, and measurable business impact across any field.',
  },
  {
    id: 'brain',
    label: 'Career Coach',
    icon: 'fa-brain',
    description: 'A supportive coach who probes soft skills, adaptability, storytelling, and career growth.',
  },
  {
    id: 'robot',
    label: 'Technical Expert',
    icon: 'fa-robot',
    description: 'An analytical interviewer for technical roles, focusing on problem-solving, systems thinking, and precision.',
  },
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number];

export const INTENSITY_MODES = [
  { id: 'standard', label: 'Standard', multiplier: 1, color: 'var(--text-secondary)' },
  { id: 'aggressive', label: 'Aggressive', multiplier: 1.5, color: '#F87171' },
  { id: 'zen', label: 'Zen', multiplier: 0.7, color: '#60A5FA' },
] as const;

export type IntensityMode = (typeof INTENSITY_MODES)[number];

export const AVATAR_COLORS = [
  { id: 'emerald', label: 'Emerald', hex: '#10B981', bg: 'bg-emerald-500', shadow: '0 0 20px rgba(16, 185, 129, 0.4)', glow: 'rgba(16,185,129,0.8)' },
  { id: 'cyan', label: 'Cyan', hex: '#06B6D4', bg: 'bg-cyan-500', shadow: '0 0 20px rgba(6, 182, 212, 0.4)', glow: 'rgba(6,182,212,0.8)' },
  { id: 'orange', label: 'Orange', hex: '#F97316', bg: 'bg-orange-500', shadow: '0 0 20px rgba(249, 115, 22, 0.4)', glow: 'rgba(249,115,22,0.8)' },
  { id: 'violet', label: 'Violet', hex: '#8B5CF6', bg: 'bg-violet-500', shadow: '0 0 20px rgba(139, 92, 246, 0.4)', glow: 'rgba(139,92,246,0.8)' },
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const SPEECH_PACES: SpeechPace[] = ['slow', 'normal', 'fast'];
