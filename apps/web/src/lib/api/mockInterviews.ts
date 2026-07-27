import api, { type ApiResponse } from "./api";
import type { Level, Paginated, Question } from "./questions";
import type { Score } from "./sessions";
import type { Topic } from "./topics";

export type MockInterviewLevelOption = Level | "MIX";

export type MockInterviewStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "SCORING"
  | "SCORED"
  | "ABANDONED";

export type MockQuestionAnswerStatus = "PENDING" | "ANSWERED" | "SKIPPED";
export type MockQuestionScoreStatus =
  | "PENDING"
  | "QUEUED"
  | "SCORED"
  | "FAILED"
  | "SKIPPED";

export type MockOverviewStatus =
  | "PENDING"
  | "GENERATED"
  | "FALLBACK"
  | "FAILED";

export interface MockInterviewQuestion {
  id: string;
  order: number;
  answerStatus: MockQuestionAnswerStatus;
  scoreStatus: MockQuestionScoreStatus;
  scoreError: string | null;
  answeredAt: string | null;
  skippedAt: string | null;
  question: Pick<Question, "id" | "content" | "level"> & {
    topic?: { id: string; name: string; slug: string } | null;
  };
  session: {
    id: string;
    audioUrl: string;
    transcript: string;
    duration: number;
    createdAt: string;
    score: Score | null;
  } | null;
}

export interface MockInterview {
  id: string;
  title: string;
  status: MockInterviewStatus;
  level: Level | null;
  totalQuestions: number;
  durationSeconds: number;
  startedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  scoredAt: string | null;
  averageTechnicalScore: number | null;
  averageCompletenessScore: number | null;
  averageClarityScore: number | null;
  overallScore: number | null;
  summary: string | null;
  strengths: string[];
  weaknesses: string[];
  nextRecommendations: string[];
  overviewStatus: MockOverviewStatus;
  overviewError: string | null;
  createdAt: string;
  topic: Topic | null;
  topics: Topic[];
  questions?: MockInterviewQuestion[];
}

export interface CreateMockInterviewInput {
  topicIds: string[];
  level?: MockInterviewLevelOption;
  totalQuestions: number;
  durationSeconds: number;
}

export async function createMockInterview(
  input: CreateMockInterviewInput,
): Promise<MockInterview> {
  const res = await api.post<ApiResponse<MockInterview>>(
    "/mock-interviews",
    input,
  );
  return res.data.data;
}

export async function getMockInterviews(
  query: {
    page?: number;
    limit?: number;
  } = {},
): Promise<Paginated<MockInterview>> {
  const res = await api.get<ApiResponse<Paginated<MockInterview>>>(
    "/mock-interviews",
    { params: query },
  );
  return res.data.data;
}

export async function getMockInterview(id: string): Promise<MockInterview> {
  const res = await api.get<ApiResponse<MockInterview>>(
    `/mock-interviews/${id}`,
  );
  return res.data.data;
}

export async function startMockInterview(id: string): Promise<MockInterview> {
  const res = await api.post<ApiResponse<MockInterview>>(
    `/mock-interviews/${id}/start`,
  );
  return res.data.data;
}

export async function answerMockQuestion(
  mockInterviewId: string,
  questionItemId: string,
  formData: FormData,
): Promise<{
  id: string;
  questionId: string;
  audioUrl: string;
  transcript: string;
  duration: number;
  createdAt: string;
}> {
  const res = await api.post<
    ApiResponse<{
      id: string;
      questionId: string;
      audioUrl: string;
      transcript: string;
      duration: number;
      createdAt: string;
    }>
  >(
    `/mock-interviews/${mockInterviewId}/questions/${questionItemId}/answer`,
    formData,
  );
  return res.data.data;
}

export async function submitMockInterview(id: string): Promise<MockInterview> {
  const res = await api.post<ApiResponse<MockInterview>>(
    `/mock-interviews/${id}/submit`,
  );
  return res.data.data;
}

export async function getMockInterviewResult(
  id: string,
): Promise<MockInterview> {
  const res = await api.get<ApiResponse<MockInterview>>(
    `/mock-interviews/${id}/result`,
  );
  return res.data.data;
}
