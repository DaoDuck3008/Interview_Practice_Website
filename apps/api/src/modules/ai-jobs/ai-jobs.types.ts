export const AI_JOBS_QUEUE = 'ai-jobs';

export const JOB_SCORE = 'score';
export const JOB_IMPROVE = 'improve';

export interface ScoreJobData {
  sessionId: string;
  userId: string;
}

export interface ImproveJobData {
  sessionId: string;
  userId: string;
}
