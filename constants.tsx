export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: <i className="fa-solid fa-house"></i> },
  { id: 'interview', label: 'Practice Interview', icon: <i className="fa-solid fa-microphone-lines"></i> },
  { id: 'quiz', label: 'Practice Quiz', icon: <i className="fa-solid fa-book-open"></i> },
  { id: 'analytics', label: 'Results', icon: <i className="fa-solid fa-chart-line"></i> },
];

export const MOCK_PERFORMANCE_DATA = [
  { category: 'Role Knowledge', score: 85, fullMark: 100 },
  { category: 'Communication', score: 70, fullMark: 100 },
  { category: 'Confidence', score: 90, fullMark: 100 },
  { category: 'Problem Solving', score: 65, fullMark: 100 },
  { category: 'Clarity', score: 75, fullMark: 100 },
];

export const INTERVIEW_FIELDS = [
  { id: 'technology', label: 'Technology', hint: 'Ask technical and problem-solving questions for this role.' },
  { id: 'business', label: 'Business / MBA', hint: 'Ask case-style, strategy, and leadership questions.' },
  { id: 'finance', label: 'Finance', hint: 'Ask finance, accounting, and analytical case questions.' },
  { id: 'marketing', label: 'Marketing', hint: 'Ask marketing strategy, branding, and campaign questions.' },
  { id: 'hr', label: 'HR / People', hint: 'Ask people management, recruiting, and HR policy questions.' },
  { id: 'other', label: 'Other', hint: 'Ask clear behavioral and role-knowledge questions for this field.' },
] as const;

export const COMPANY_STYLES = [
  {
    id: 'product',
    label: 'Product',
    hint: 'Emphasize product sense, user impact, prioritization, and cross-functional collaboration.',
  },
  {
    id: 'service',
    label: 'Service',
    hint: 'Emphasize client delivery, stakeholder management, reliability, and communication.',
  },
  {
    id: 'startup',
    label: 'Startup',
    hint: 'Emphasize ownership, ambiguity tolerance, speed, and wearing multiple hats.',
  },
  {
    id: 'consulting',
    label: 'Consulting',
    hint: 'Emphasize structured case thinking, MECE framing, and executive communication.',
  },
  {
    id: 'finance',
    label: 'Finance firm',
    hint: 'Emphasize analytical rigor, risk awareness, numbers fluency, and precision.',
  },
] as const;

export const INTERVIEW_MODES = [
  {
    id: 'technical',
    label: 'Technical',
    hint: 'Deep role/domain technical questions; probe for concrete methods and trade-offs.',
    questionCount: 5,
    pacing: 'normal',
    softPersona: 'robot',
  },
  {
    id: 'behavioral',
    label: 'Behavioral',
    hint: 'STAR-style behavioral stories about teamwork, conflict, and results.',
    questionCount: 5,
    pacing: 'normal',
    softPersona: 'brain',
  },
  {
    id: 'hr',
    label: 'HR',
    hint: 'Motivation, culture fit, compensation expectations, and career goals.',
    questionCount: 5,
    pacing: 'normal',
    softPersona: 'professional',
  },
  {
    id: 'manager',
    label: 'Manager',
    hint: 'Execution, stakeholder management, prioritization, and team outcomes.',
    questionCount: 5,
    pacing: 'normal',
    softPersona: 'professional',
  },
  {
    id: 'leadership',
    label: 'Leadership',
    hint: 'Vision, influence without authority, difficult decisions, and people development.',
    questionCount: 5,
    pacing: 'normal',
    softPersona: 'professional',
  },
  {
    id: 'case',
    label: 'Case Study',
    hint: 'Open-ended business case; expect structured frameworks and quantified recommendations.',
    questionCount: 4,
    pacing: 'normal',
    softPersona: 'professional',
  },
  {
    id: 'rapid',
    label: 'Rapid Fire',
    hint: 'Short, punchy questions. Answers should be concise (30–60 seconds).',
    questionCount: 8,
    pacing: 'fast',
    softPersona: 'robot',
  },
  {
    id: 'final',
    label: 'Final Round',
    hint: 'Senior bar: judgment, values, high-stakes trade-offs, and executive presence.',
    questionCount: 5,
    pacing: 'normal',
    softPersona: 'professional',
  },
  {
    id: 'panel',
    label: 'Panel',
    hint: 'Simulate multiple interviewer angles in one flow (technical, HR, leadership probes).',
    questionCount: 6,
    pacing: 'normal',
    softPersona: 'professional',
  },
  {
    id: 'recruiter',
    label: 'Recruiter',
    hint: 'Emphasize domain-pack rubric checklist, screening fit, and clear yes/no signals.',
    questionCount: 5,
    pacing: 'normal',
    softPersona: 'professional',
  },
] as const;

export const QUIZ_DOMAIN_PRESETS: { domain: string; topics: string[] }[] = [
  {
    domain: 'Business',
    topics: ['STAR Method', "Porter's Five Forces", 'SWOT Analysis', 'Negotiation Fundamentals'],
  },
  {
    domain: 'Finance',
    topics: ['Financial Statements Basics', 'NPV and IRR', 'Working Capital'],
  },
  {
    domain: 'Marketing',
    topics: ['Go-to-Market Strategy', 'Brand Positioning', 'Customer Segmentation'],
  },
  {
    domain: 'HR',
    topics: ['Behavioral Interviewing', 'Performance Feedback', 'Talent Acquisition Basics'],
  },
  {
    domain: 'Tech',
    topics: ['React Hooks', 'SQL Joins', 'Python List Comprehensions', 'System Design Basics'],
  },
];

export const ROADMAP_CHANGELOG = [
  { phase: 1, title: 'Core Interview Intelligence', items: ['Resume & JD context', 'Smarter follow-ups', 'Richer feedback'] },
  { phase: 2, title: 'Interview Expansion', items: ['Company styles', 'Interview modes', 'Difficulty progression'] },
  { phase: 3, title: 'Progress & Personalization', items: ['History & compare', 'Practice recommendations'] },
  { phase: 4, title: 'Quiz Evolution', items: ['Adaptive difficulty', 'Domain presets', 'Topic mastery'] },
  { phase: 5, title: 'User Experience', items: ['Better errors', 'Accessibility', 'Mobile polish'] },
  { phase: 6, title: 'Community & Feedback', items: ['In-app feedback', 'Changelog'] },
  { phase: 7, title: 'AI Quality & Realism', items: ['Thread memory', 'Natural transitions', 'Stronger challenges'] },
  { phase: 8, title: 'Knowledge Expansion', items: ['Domain packs', 'Rubrics', 'Follow-up strategies'] },
  { phase: 9, title: 'AI Coach', items: ['Better/excellent answers', 'Tips', 'Common mistakes'] },
  { phase: 10, title: 'Voice Experience', items: ['Pace control', 'Filler detection', 'Soft barge-in'] },
  { phase: 11, title: 'Performance', items: ['History export', 'Prompt caps', 'Lazy patterns'] },
  { phase: 12, title: 'Production Readiness', items: ['Tour', 'Search/bookmarks', 'Shortcuts'] },
  { phase: 13, title: 'Growth', items: ['Daily challenge', 'Streaks', 'Monthly summary'] },
  { phase: 14, title: 'AI Learning Engine', items: ['Skill profile', 'Trend recommendations'] },
  { phase: 15, title: 'Enterprise & Education', items: ['Templates', 'Practice seats', 'CSV export'] },
  { phase: 16, title: 'Launch readiness', items: ['Prompt registry', 'Local telemetry', 'Security harden', 'Docs & playbooks'] },
];
