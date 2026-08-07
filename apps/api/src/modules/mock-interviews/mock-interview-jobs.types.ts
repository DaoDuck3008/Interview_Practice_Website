export const MOCK_INTERVIEW_JOBS_QUEUE = 'mock-interview-jobs';

export const JOB_AUTO_SUBMIT_EXPIRED_MOCK = 'auto-submit-expired-mock';
export const JOB_AUTO_SUBMIT_EXPIRED_MOCK_CV =
  'auto-submit-expired-mock-cv';
export const JOB_RECOVER_EXPIRED_MOCKS = 'recover-expired-mocks';

export interface AutoSubmitExpiredMockJobData {
  mockInterviewId: string;
  userId: string;
}

export interface AutoSubmitExpiredMockCvJobData {
  mockCvInterviewId: string;
  userId: string;
}

export type RecoverExpiredMocksJobData = Record<string, never>;

export type MockInterviewJobData =
  | AutoSubmitExpiredMockJobData
  | AutoSubmitExpiredMockCvJobData
  | RecoverExpiredMocksJobData;
