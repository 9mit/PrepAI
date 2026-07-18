export const PROMPT_VERSION = '2026.07.launch';

export {
  MAX_JD_CHARS,
  MAX_RESUME_CHARS,
  MAX_SYSTEM_PROMPT_CHARS,
  BANNED_STOCK_PHRASES,
  buildResumeSnippet,
  truncateJd,
  buildContextPromptBlock,
  buildNaturalInterviewRules,
} from '../interviewContext';

export { buildDomainPackPromptBlock, getDomainPack } from '../domainPacks';
