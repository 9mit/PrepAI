
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
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option (0-3)
  explanation: string;
}

export interface Quiz {
  topic: string;
  conceptExplanation: string;
  syntaxGuide: string;
  quizQuestions: QuizQuestion[]; // 5 MCQ questions
  completedAt?: string; // ISO timestamp when completed
}

export enum AppRoute {
  AUTH = 'auth',
  ONBOARDING = 'onboarding',
  DASHBOARD = 'dashboard',
  INTERVIEW = 'interview',
  ANALYTICS = 'analytics',
  PROFILE = 'profile',
  QUIZ = 'quiz'
}
