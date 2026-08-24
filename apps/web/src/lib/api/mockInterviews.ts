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
    topic?: { id: string; name: string; slug: string; iconUrl: string | null } | null;
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
  updatedAt?: string;
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
    search?: string;
    sortOrder?: "newest" | "oldest";
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

export async function retryMockInterviewScoring(
  id: string,
): Promise<MockInterview> {
  const res = await api.post<ApiResponse<MockInterview>>(
    `/mock-interviews/${id}/retry-scoring`,
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

// ─── Admin: quản lý Mock test ───────────────────────────────────────────────

export type AdminMockInterviewAttention = "all" | "failed" | "stale";

export interface AdminMockInterviewQuery {
  search?: string;
  topicId?: string;
  level?: Level;
  status?: MockInterviewStatus;
  attention?: AdminMockInterviewAttention;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface AdminMockInterviewListItem {
  id: string;
  title: string;
  status: MockInterviewStatus;
  level: Level | null;
  totalQuestions: number;
  durationSeconds: number;
  submittedAt: string | null;
  scoredAt: string | null;
  overallScore: number | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
  topics: Topic[];
  answeredQuestions: number;
  failedQuestions: number;
  queuedQuestions: number;
}

export interface AdminMockInterviewStats {
  total: number;
  inProgress: number;
  scoring: number;
  attention: number;
}

export interface AdminMockInterviewDetail extends MockInterview {
  userId: string;
  user: { id: string; name: string; email: string };
  updatedAt: string;
  lastScoringRetryAt: string | null;
  questions: MockInterviewQuestion[];
}

export async function getMockInterviewsAdmin(
  query: AdminMockInterviewQuery = {},
): Promise<Paginated<AdminMockInterviewListItem>> {
  const res = await api.get<ApiResponse<Paginated<AdminMockInterviewListItem>>>(
    "/mock-interviews/admin",
    { params: query },
  );
  return res.data.data;
}

export async function getMockInterviewAdminStats(): Promise<AdminMockInterviewStats> {
  const res = await api.get<ApiResponse<AdminMockInterviewStats>>(
    "/mock-interviews/admin/stats",
  );
  return res.data.data;
}

export async function getMockInterviewAdminDetail(
  id: string,
): Promise<AdminMockInterviewDetail> {
  const res = await api.get<ApiResponse<AdminMockInterviewDetail>>(
    `/mock-interviews/admin/${id}`,
  );
  return res.data.data;
}

export async function retryMockInterviewScoringAdmin(
  id: string,
): Promise<AdminMockInterviewDetail> {
  const res = await api.post<ApiResponse<AdminMockInterviewDetail>>(
    `/mock-interviews/admin/${id}/retry-scoring`,
  );
  return res.data.data;
}

export async function hardDeleteMockInterviewAdmin(
  id: string,
): Promise<{ deleted: true; userId: string }> {
  const res = await api.delete<
    ApiResponse<{ deleted: true; userId: string }>
  >(`/mock-interviews/admin/${id}`);
  return res.data.data;
}
