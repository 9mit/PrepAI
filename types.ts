export interface UserProfile {
  name: string;
  email: string;
  skills: string[];
  education: string;
  experience: string;
  projects: string;
  careerGoals: string;
  githubUrl?: string;
  age?: number;
  certifications?: string[];
  bio?: string;
  onboarded: boolean;
}

export interface CategoryExplanation {
  category: string;
  why: string;
  tip: string;
  betterAnswer?: string;
  excellentAnswer?: string;
  tips?: string[];
  commonMistakes?: string[];
}

export interface SampleAnswer {
  questionTheme: string;
  example: string;
}

export interface InterviewResult {
  id: string;
  date: string;
  role: string;
  company: string;
  overallScore: number;
  categories: {
    category: string;
    score: number;
    fullMark: number;
  }[];
  feedback: string[];
  transcription: string[];
  strengths?: string[];
  weaknesses?: string[];
  categoryExplanations?: CategoryExplanation[];
  improvementPlan?: string[];
  sampleAnswers?: SampleAnswer[];
  field?: string;
  mode?: string;
  companyStyle?: string;
  domainPack?: string;
  bookmarked?: boolean;
}

export interface InterviewContext {
  role: string;
  company: string;
  interviewField: string;
  jobDescription: string;
  resumeSnippet: string;
  companyStyle: string;
  interviewMode: string;
  personaLabel: string;
  personaDescription: string;
  intensityLabel: string;
  domainPack?: string;
}

export interface PracticeRecommendation {
  id: string;
  title: string;
  reason: string;
  action: 'interview' | 'quiz';
  prefills?: {
    mode?: string;
    field?: string;
    topic?: string;
    domainPack?: string;
  };
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Quiz {
  topic: string;
  conceptExplanation: string;
  syntaxGuide: string;
  quizQuestions: QuizQuestion[];
  completedAt?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  domain?: string;
}

export interface QuizTopicStats {
  topic: string;
  attempts: number;
  avgScore: number;
  lastDifficulty: 'easy' | 'medium' | 'hard';
  lastScore: number;
  updatedAt: string;
}

export interface FeedbackSubmission {
  id: string;
  type: 'bug' | 'feature' | 'rating' | 'idea';
  message: string;
  rating?: number;
  createdAt: string;
}

export enum AppRoute {
  AUTH = 'auth',
  ONBOARDING = 'onboarding',
  DASHBOARD = 'dashboard',
  INTERVIEW = 'interview',
  ANALYTICS = 'analytics',
  PROFILE = 'profile',
  QUIZ = 'quiz',
  PRIVACY = 'privacy',
  TERMS = 'terms',
}
