import { InterviewResult, UserProfile } from '../types';

export const MAX_JD_CHARS = 4000;
export const MAX_RESUME_CHARS = 3000;
export const MAX_SYSTEM_PROMPT_CHARS = 11000;

export const BANNED_STOCK_PHRASES = [
  'Tell me about yourself',
  'What are your strengths and weaknesses',
  'Where do you see yourself in five years',
  'Do you have any questions for me',
];

export function buildResumeSnippet(user: UserProfile, useProfile: boolean, extraPaste = ''): string {
  const parts: string[] = [];
  if (extraPaste.trim()) {
    parts.push(extraPaste.trim());
  }
  if (useProfile) {
    if (user.skills?.length) parts.push(`Skills: ${user.skills.join(', ')}`);
    if (user.experience?.trim()) parts.push(`Experience: ${user.experience.trim()}`);
    if (user.projects?.trim()) parts.push(`Projects: ${user.projects.trim()}`);
    if (user.education?.trim()) parts.push(`Education: ${user.education.trim()}`);
  }
  return parts.join('\n').trim().slice(0, MAX_RESUME_CHARS);
}

export function truncateJd(text: string): string {
  return text.trim().slice(0, MAX_JD_CHARS);
}

export function buildContextPromptBlock(ctx: {
  jobDescription: string;
  resumeSnippet: string;
  companyStyle: string;
  interviewMode: string;
  domainPackBlock?: string;
}): string {
  const blocks: string[] = [];
  if (ctx.jobDescription.trim()) {
    blocks.push(`JOB DESCRIPTION:\n${ctx.jobDescription.slice(0, MAX_JD_CHARS)}`);
  }
  if (ctx.resumeSnippet.trim()) {
    blocks.push(`RESUME CONTEXT:\n${ctx.resumeSnippet.slice(0, MAX_RESUME_CHARS)}`);
  }
  if (ctx.companyStyle.trim()) {
    blocks.push(`COMPANY STYLE: ${ctx.companyStyle}`);
  }
  if (ctx.interviewMode.trim()) {
    blocks.push(`INTERVIEW MODE: ${ctx.interviewMode}`);
  }
  if (ctx.domainPackBlock?.trim()) {
    blocks.push(ctx.domainPackBlock.trim());
  }
  return blocks.length ? `\n${blocks.join('\n\n')}\n` : '';
}

export function buildNaturalInterviewRules(
  totalQuestions: number,
  progress: number,
  topicsCovered: string[] = []
): string {
  const covered = topicsCovered.length
    ? `\nTopics already covered (do not revisit): ${topicsCovered.join('; ')}`
    : '';
  return `Conversation quality rules:
- Ask exactly ${totalQuestions} DISTINCT main questions (currently advanced ${progress}/${totalQuestions}).
- Keep responses BRIEF (1-2 sentences) then ask exactly ONE new question.
- NEVER repeat or lightly rephrase a previous question.
- Use natural bridging phrases (e.g. "Thanks — shifting focus…", "Building on that…").
- Avoid stock phrases: ${BANNED_STOCK_PHRASES.join('; ')}.
- Prefer topic diversity; do not stay on one theme for consecutive main questions.
- Reference resume projects or JD must-haves when context exists.
- Do NOT wrap up until all ${totalQuestions} main questions are done.${covered}`;
}

export function persistInterviewPrefs(prefs: {
  role: string;
  company: string;
  interviewField: string;
  jobDescription?: string;
  companyStyle?: string;
  interviewMode?: string;
  domainPack?: string;
}): void {
  localStorage.setItem('last_target_role', prefs.role);
  localStorage.setItem('last_target_company', prefs.company);
  localStorage.setItem('last_interview_field', prefs.interviewField);
  if (prefs.jobDescription !== undefined) {
    localStorage.setItem('last_job_description', prefs.jobDescription.slice(0, MAX_JD_CHARS));
  }
  if (prefs.companyStyle) localStorage.setItem('last_company_style', prefs.companyStyle);
  if (prefs.interviewMode) localStorage.setItem('last_interview_mode', prefs.interviewMode);
  if (prefs.domainPack) localStorage.setItem('last_domain_pack', prefs.domainPack);
}

export function readPrefillFromStorage(): {
  mode?: string;
  field?: string;
  topic?: string;
  domainPack?: string;
} {
  try {
    const raw = localStorage.getItem('interview_prefill');
    if (!raw) return {};
    localStorage.removeItem('interview_prefill');
    return JSON.parse(raw) as { mode?: string; field?: string; topic?: string; domainPack?: string };
  } catch {
    return {};
  }
}

export function writeInterviewPrefill(prefill: {
  mode?: string;
  field?: string;
  topic?: string;
  domainPack?: string;
}): void {
  localStorage.setItem('interview_prefill', JSON.stringify(prefill));
}

export function writeQuizPrefill(topic: string): void {
  localStorage.setItem('quiz_prefill_topic', topic);
}

export function exportInterviewHistoryJson(): string {
  return localStorage.getItem('interview_history') || '[]';
}

export function downloadInterviewHistory(): void {
  const blob = new Blob([exportInterviewHistoryJson()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prepai_history_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function toggleBookmark(sessionId: string): InterviewResult[] {
  const history = JSON.parse(localStorage.getItem('interview_history') || '[]') as InterviewResult[];
  const next = history.map((h) =>
    h.id === sessionId ? { ...h, bookmarked: !h.bookmarked } : h
  );
  localStorage.setItem('interview_history', JSON.stringify(next));
  return next;
}

export function copySessionSummary(result: InterviewResult): string {
  const lines = [
    `PrepAI Interview Summary`,
    `${result.role} @ ${result.company || '—'}`,
    `Score: ${result.overallScore}/100`,
    `Date: ${result.date}`,
    ...(result.strengths || []).slice(0, 3).map((s) => `Strength: ${s}`),
    ...(result.weaknesses || []).slice(0, 3).map((w) => `Weakness: ${w}`),
    ...(result.feedback || []).slice(0, 3).map((f) => `Note: ${f}`),
  ];
  return lines.join('\n');
}
