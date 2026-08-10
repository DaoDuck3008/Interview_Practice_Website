import api, { type ApiResponse } from "./api";
import type {
  MockInterviewStatus,
  MockOverviewStatus,
  MockQuestionAnswerStatus,
  MockQuestionScoreStatus,
} from "./mockInterviews";
import type { Score } from "./sessions";

export type MockCvReadiness = "NOT_READY" | "NEEDS_PRACTICE" | "READY";
export type MockCvQuestionSource = "QUESTION_BANK" | "AI_GENERATED";
export type MockCvQuestionFocusArea =
  | "PROJECT"
  | "EXPERIENCE"
  | "TECHNICAL_DEPTH"
  | "CLAIM_VERIFICATION";

export interface MockCvInterviewQuestion {
  id: string;
  order: number;
  source: MockCvQuestionSource;
  focusArea: MockCvQuestionFocusArea | null;
  content: string;
  answerKeySummary?: string;
  answerKeywords?: string[];
  answerStatus: MockQuestionAnswerStatus;
  scoreStatus: MockQuestionScoreStatus;
  scoreError?: string | null;
  answeredAt: string | null;
  skippedAt: string | null;
  session: {
    id: string;
    audioUrl: string;
    transcript: string;
    duration: number;
    createdAt: string;
    score?: Score | null;
  } | null;
}

export interface MockCvInterview {
  id: string;
  mockCvId: string;
  title: string;
  status: MockInterviewStatus;
  totalQuestions: number;
  durationSeconds: number;
  startedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  scoredAt: string | null;
  averageTechnicalScore?: number | null;
  averageCompletenessScore?: number | null;
  averageClarityScore?: number | null;
  overallScore?: number | null;
  summary?: string | null;
  strengths?: string[];
  weaknesses?: string[];
  nextRecommendations?: string[];
  overviewStatus: MockOverviewStatus;
  readiness?: MockCvReadiness | null;
  claimsToPrepareEvidence?: string[];
  createdAt: string;
  updatedAt?: string;
  questions: MockCvInterviewQuestion[];
}

export async function getMockCvInterview(id: string): Promise<MockCvInterview> {
  const res = await api.get<ApiResponse<MockCvInterview>>(
    `/mock-cv-interviews/${id}`,
  );
  return res.data.data;
}

export async function answerMockCvQuestion(
  interviewId: string,
  questionItemId: string,
  formData: FormData,
): Promise<{
  id: string;
  audioUrl: string;
  transcript: string;
  duration: number;
  createdAt: string;
}> {
  const res = await api.post<
    ApiResponse<{
      id: string;
      audioUrl: string;
      transcript: string;
      duration: number;
      createdAt: string;
    }>
  >(
    `/mock-cv-interviews/${interviewId}/questions/${questionItemId}/answer`,
    formData,
  );
  return res.data.data;
}

export async function submitMockCvInterview(
  id: string,
): Promise<MockCvInterview> {
  const res = await api.post<ApiResponse<MockCvInterview>>(
    `/mock-cv-interviews/${id}/submit`,
  );
  return res.data.data;
}

export async function getMockCvInterviewResult(
  id: string,
): Promise<MockCvInterview> {
  const res = await api.get<ApiResponse<MockCvInterview>>(
    `/mock-cv-interviews/${id}/result`,
  );
  return res.data.data;
}

export async function retryMockCvInterviewScoring(
  id: string,
): Promise<MockCvInterview> {
  await api.post<ApiResponse<MockCvInterview>>(
    `/mock-cv-interviews/${id}/retry-scoring`,
  );
  return getMockCvInterviewResult(id);
}
