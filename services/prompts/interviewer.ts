import {
  MAX_SYSTEM_PROMPT_CHARS,
  buildContextPromptBlock,
  buildNaturalInterviewRules,
} from '../interviewContext';
import { buildDomainPackPromptBlock, getDomainPack } from '../domainPacks';
import { INTERVIEW_FIELDS } from '../../constants';
import { InterviewContext } from '../../types';

export interface InterviewerPromptInput {
  mode: 'next' | 'follow_up_fallback';
  role: string;
  company: string;
  interviewField: string;
  interviewCtx: InterviewContext;
  domainPackId: string;
  selectedStyle: { label: string; description: string };
  selectedIntensity: { label: string };
  modeMeta: { hint: string; pacing?: string };
  styleMeta: { hint: string };
  totalQuestions: number;
  progress: number;
  topicsCovered: string[];
  askedQuestions: string[];
  currentQuestion: string;
  lastAnswer?: string;
  githubSummary?: string;
  /** When true, omit verbose style/mode prose for default setups. */
  compactDefaults?: boolean;
}

/**
 * Central FE interviewer system prompt (chat path). Backend still prepends SYSTEM_GUARDRAIL.
 */
export function buildInterviewerSystemPrompt(input: InterviewerPromptInput): string {
  const fieldMeta = INTERVIEW_FIELDS.find((f) => f.id === input.interviewField) || INTERVIEW_FIELDS[1];
  const companyLabel = input.company.trim() || 'the target company';
  const pack = getDomainPack(input.domainPackId);
  const packBlock = buildDomainPackPromptBlock(pack);
  const githubContext = input.githubSummary ? `\n${input.githubSummary}` : '';
  const asked = input.askedQuestions;
  const askedBlock = asked.length
    ? `\nAlready asked (NEVER repeat or lightly rephrase these):\n${asked.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : '';

  const contextBlock = buildContextPromptBlock({
    ...input.interviewCtx,
    domainPackBlock: packBlock,
  });

  const fieldGuidance = `Interview field: ${fieldMeta.label}. ${fieldMeta.hint} Match the candidate's field. Do NOT force coding questions unless the field is Technology.`;
  const modeGuidance = input.compactDefaults ? '' : `Mode guidance: ${input.modeMeta.hint}`;
  const styleGuidance = input.compactDefaults ? '' : `Company style: ${input.styleMeta.hint}`;
  const pacing =
    input.modeMeta.pacing === 'fast'
      ? 'Keep questions and acknowledgements especially short (rapid fire).'
      : '';

  if (input.mode === 'follow_up_fallback') {
    return `You are a professional ${input.selectedStyle.label} interviewer (${input.selectedStyle.description}) from ${companyLabel} for a ${input.role} role.
${fieldGuidance}
${modeGuidance}
${styleGuidance}
${contextBlock}
Intensity: ${input.selectedIntensity.label}.
The candidate just answered: "${(input.lastAnswer || '').slice(0, 500)}"
Current main question was: "${input.currentQuestion}"
Ask ONE short probing follow-up that cites their words (quote a short phrase). Prefer metrics, trade-offs, or ownership gaps. Do NOT ask a brand-new topic. Do NOT repeat the same question. 1-2 sentences max.${githubContext}`.slice(
      0,
      MAX_SYSTEM_PROMPT_CHARS
    );
  }

  return `You are a professional ${input.selectedStyle.label} interviewer (${input.selectedStyle.description}) from ${companyLabel} conducting a ${input.role} interview.
${fieldGuidance}
${modeGuidance}
${styleGuidance}
${pacing}
${contextBlock}
Intensity: ${input.selectedIntensity.label}. Higher intensity = more critical probing.

${buildNaturalInterviewRules(input.totalQuestions, input.progress, input.topicsCovered)}
${askedBlock}${githubContext}`.slice(0, MAX_SYSTEM_PROMPT_CHARS);
}
