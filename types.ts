
export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type Language = 'en' | 'zh';

export interface QuizData {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  svg?: string; // Optional field for geometry diagrams
}

export interface MathResponse {
  explanation: string; // The markdown detailed solution
  quiz: QuizData;      // The interactive quiz object
}

// Deprecated but kept for compatibility if needed, though we primarily use MathResponse now
export interface MathSolution {
  originalImage: string;
  markdownContent: string;
}

export interface AnalyzeError {
  message: string;
}

export type AIProvider = 'gemini' | 'openai' | 'qwen';

export interface AISettings {
  provider: AIProvider;
  model: string;
  baseUrl?: string; // Optional custom base URL
  keys: {
    gemini: string;
    openai: string;
    qwen: string;
  };
}

export const DEFAULT_SETTINGS: AISettings = {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  keys: {
    gemini: '',
    openai: '',
    qwen: ''
  }
};
