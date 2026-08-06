export const AI_JOBS_QUEUE = 'ai-jobs';

export const JOB_SCORE = 'score';
export const JOB_IMPROVE = 'improve';
export const JOB_MOCK_CV_PROFILE = 'mock-cv-profile';
export const JOB_MOCK_CV_QUESTION_GENERATION =
  'mock-cv-question-generation';

export interface ScoreJobData {
  sessionId: string;
  userId: string;
}

export interface ImproveJobData {
  sessionId: string;
  userId: string;
}

export interface MockCvProfileJobData {
  analysisId: string;
  userId: string;
  attempt: number;
}

export interface MockCvQuestionGenerationJobData {
  analysisId: string;
  userId: string;
  attempt: number;
}

export type AiJobData =
  | ScoreJobData
  | ImproveJobData
  | MockCvProfileJobData
  | MockCvQuestionGenerationJobData;
