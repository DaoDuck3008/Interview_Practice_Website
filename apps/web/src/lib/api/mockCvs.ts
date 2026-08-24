import api, { type ApiResponse } from "./api";
import type {
  MockInterviewStatus,
  MockOverviewStatus,
  MockQuestionAnswerStatus,
  MockQuestionScoreStatus,
} from "./mockInterviews";
import type {
  MockCvQuestionFocusArea,
  MockCvQuestionSource,
  MockCvReadiness,
} from "./mockCvInterviews";
import type { Paginated } from "./questions";
import type { Score } from "./sessions";

export type MockCvAnalysisStatus =
  | "PENDING"
  | "ANALYZING"
  | "READY"
  | "UNSUPPORTED"
  | "NEEDS_REUPLOAD"
  | "FAILED";

export type MockCvQuestionGenerationStatus =
  | "PENDING"
  | "GENERATING"
  | "READY"
  | "FAILED";

export interface MockCvLatestInterview {
  id: string;
  status: MockInterviewStatus;
  overallScore: number | null;
  submittedAt: string | null;
}

export interface MockCvAnalysis {
  id: string;
  status: MockCvAnalysisStatus;
  summary: string | null;
  technicalSkills: string[];
  detectedDomains: string[];
  questionGenerationStatus: MockCvQuestionGenerationStatus;
  requestedQuestionCount: number | null;
  requestedDurationSeconds: number;
  isStale: boolean;
  isQuestionGenerationStale: boolean;
  canRetry: boolean;
  retryAvailableAt: string | null;
  failureMessage: string | null;
  questionGenerationFailureMessage: string | null;
}

export interface MockCv {
  id: string;
  targetRole: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  analysis: MockCvAnalysis | null;
  latestInterview: MockCvLatestInterview | null;
  _count: { interviews: number };
}

export const MOCK_CV_TARGET_ROLE_GROUPS = [
  {
    label: "Phát triển phần mềm",
    roles: [
      { code: "SOFTWARE_ENGINEER", label: "Software Engineer" },
      { code: "BACKEND_DEVELOPER", label: "Backend Developer" },
      { code: "FRONTEND_DEVELOPER", label: "Frontend Developer" },
      { code: "FULLSTACK_DEVELOPER", label: "Full-stack Developer" },
      { code: "MOBILE_DEVELOPER", label: "Mobile Developer" },
      {
        code: "EMBEDDED_SOFTWARE_ENGINEER",
        label: "Embedded Software Engineer",
      },
    ],
  },
  {
    label: "Kiểm thử & Hạ tầng",
    roles: [
      { code: "QA_TEST_ENGINEER", label: "QA / Test Engineer" },
      {
        code: "DEVOPS_SRE_PLATFORM_ENGINEER",
        label: "DevOps / SRE / Platform Engineer",
      },
      { code: "CLOUD_ENGINEER", label: "Cloud Engineer" },
    ],
  },
  {
    label: "Dữ liệu",
    roles: [
      { code: "DATA_ANALYST", label: "Data Analyst" },
      { code: "DATA_ENGINEER", label: "Data Engineer" },
      {
        code: "DATA_SCIENTIST_ML_ENGINEER",
        label: "Data Scientist / Machine Learning Engineer",
      },
    ],
  },
  {
    label: "Sản phẩm & Thiết kế",
    roles: [
      { code: "BUSINESS_ANALYST", label: "Business Analyst" },
      {
        code: "PRODUCT_MANAGER",
        label: "Product Owner / Product Manager",
      },
      {
        code: "UI_UX_PRODUCT_DESIGNER",
        label: "UI/UX / Product Designer",
      },
    ],
  },
] as const;

export type MockCvTargetRoleCode =
  (typeof MOCK_CV_TARGET_ROLE_GROUPS)[number]["roles"][number]["code"];

export const MOCK_CV_QUESTION_OPTIONS = [10, 20, 30] as const;
export const MOCK_CV_DURATION_OPTIONS = [
  { value: 900, label: "15 phút" },
  { value: 1800, label: "30 phút" },
  { value: 2700, label: "45 phút" },
  { value: 3600, label: "60 phút" },
] as const;

export interface CreateMockCvInput {
  targetRoleCode: MockCvTargetRoleCode;
  totalQuestions: (typeof MOCK_CV_QUESTION_OPTIONS)[number];
  durationSeconds: (typeof MOCK_CV_DURATION_OPTIONS)[number]["value"];
  cv: File;
}

export type StartMockCvInterviewResponse =
  | {
      status: "PREPARING";
      mockCvId: string;
      analysisId: string;
    }
  | {
      status: "STARTED";
      interview: {
        id: string;
        status: MockInterviewStatus;
        totalQuestions: number;
        durationSeconds: number;
      };
    };

export async function getMockCvs(
  query: {
    page?: number;
    limit?: number;
    search?: string;
    sortOrder?: "newest" | "oldest";
  } = {},
): Promise<Paginated<MockCv>> {
  const res = await api.get<ApiResponse<Paginated<MockCv>>>("/mock-cvs", {
    params: query,
  });
  return res.data.data;
}

export async function getMockCv(id: string): Promise<MockCv> {
  const res = await api.get<ApiResponse<MockCv>>(`/mock-cvs/${id}`);
  return res.data.data;
}

export async function createMockCv(input: CreateMockCvInput): Promise<MockCv> {
  const formData = new FormData();
  formData.append("targetRoleCode", input.targetRoleCode);
  formData.append("totalQuestions", String(input.totalQuestions));
  formData.append("durationSeconds", String(input.durationSeconds));
  formData.append("cv", input.cv);
  const res = await api.post<ApiResponse<MockCv>>("/mock-cvs", formData);
  return res.data.data;
}

export async function retryMockCvAnalysis(id: string): Promise<MockCv> {
  const res = await api.post<ApiResponse<MockCv>>(
    `/mock-cvs/${id}/retry-analysis`,
  );
  return res.data.data;
}

export async function deleteMockCv(id: string): Promise<{ deleted: true }> {
  const res = await api.delete<ApiResponse<{ deleted: true }>>(
    `/mock-cvs/${id}`,
  );
  return res.data.data;
}

export async function startMockCvInterview(
  id: string,
): Promise<StartMockCvInterviewResponse> {
  const res = await api.post<ApiResponse<StartMockCvInterviewResponse>>(
    `/mock-cvs/${id}/start`,
  );
  return res.data.data;
}

// ─── Admin: quản trị Mock CV ─────────────────────────────────────────────

export type MockCvExtractionQuality = "HIGH" | "MEDIUM" | "LOW";
export type AdminMockCvAttention = "all" | "failed" | "stale";

export interface AdminMockCvQuery {
  search?: string;
  analysisStatus?: MockCvAnalysisStatus;
  questionStatus?: MockCvQuestionGenerationStatus;
  interviewStatus?: MockInterviewStatus;
  attention?: AdminMockCvAttention;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface AdminMockCvAnalysis {
  id: string;
  status: MockCvAnalysisStatus;
  extractionQuality: MockCvExtractionQuality | null;
  detectedDomains: string[];
  eligibilityReason: string | null;
  analysisError: string | null;
  lastRetryAt: string | null;
  analysisAttempt: number;
  analysisStartedAt: string | null;
  questionGenerationStatus: MockCvQuestionGenerationStatus;
  questionGenerationAttempt: number;
  questionGenerationStartedAt: string | null;
  questionGeneratedAt: string | null;
  questionGenerationError: string | null;
  requestedQuestionCount: number | null;
  requestedDurationSeconds: number;
  selectedBankQuestionCount: number | null;
  generatedQuestionCount: number | null;
  summary: string | null;
  topicSlugs: string[];
  technicalSkills: string[];
  experienceSignals: string[];
  strengths: string[];
  gapsForTargetRole: string[];
  interviewFocusAreas: string[];
  claimsToVerify: string[];
  projects: unknown;
  promptVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMockCvListItem {
  id: string;
  targetRole: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
  analysis: AdminMockCvAnalysis | null;
  interviews: Array<{
    id: string;
    status: MockInterviewStatus;
    overallScore: number | null;
    updatedAt: string;
  }>;
  _count: { questions: number; interviews: number };
}

export interface AdminMockCvStats {
  total: number;
  processing: number;
  scoring: number;
  attention: number;
}

export interface AdminMockCvPreparedQuestion {
  id: string;
  order: number;
  source: MockCvQuestionSource;
  focusArea: MockCvQuestionFocusArea | null;
  content: string;
  rationale: string | null;
  createdAt: string;
}

export interface AdminMockCvInterviewQuestion {
  id: string;
  order: number;
  source: MockCvQuestionSource;
  focusArea: MockCvQuestionFocusArea | null;
  content: string;
  answerStatus: MockQuestionAnswerStatus;
  scoreStatus: MockQuestionScoreStatus;
  scoreError: string | null;
  answeredAt: string | null;
  skippedAt: string | null;
  sessionId: string | null;
  session: {
    id: string;
    audioUrl: string;
    transcript: string;
    duration: number;
    createdAt: string;
    score: Score | null;
  } | null;
}

export interface AdminMockCvInterview {
  id: string;
  userId: string;
  title: string;
  status: MockInterviewStatus;
  totalQuestions: number;
  durationSeconds: number;
  startedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  scoredAt: string | null;
  lastScoringRetryAt: string | null;
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
  readiness: MockCvReadiness | null;
  claimsToPrepareEvidence: string[];
  createdAt: string;
  updatedAt: string;
  questions: AdminMockCvInterviewQuestion[];
}

export interface AdminMockCvDetail {
  id: string;
  userId: string;
  targetRole: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
  analysis: AdminMockCvAnalysis | null;
  questions: AdminMockCvPreparedQuestion[];
  interviews: AdminMockCvInterview[];
}

export async function getMockCvsAdmin(
  query: AdminMockCvQuery = {},
): Promise<Paginated<AdminMockCvListItem>> {
  const res = await api.get<ApiResponse<Paginated<AdminMockCvListItem>>>(
    "/mock-cvs/admin",
    { params: query },
  );
  return res.data.data;
}

export async function getMockCvAdminStats(): Promise<AdminMockCvStats> {
  const res = await api.get<ApiResponse<AdminMockCvStats>>(
    "/mock-cvs/admin/stats",
  );
  return res.data.data;
}

export async function getMockCvAdminDetail(
  id: string,
): Promise<AdminMockCvDetail> {
  const res = await api.get<ApiResponse<AdminMockCvDetail>>(
    `/mock-cvs/admin/${id}`,
  );
  return res.data.data;
}

export async function retryMockCvAnalysisAdmin(
  id: string,
): Promise<AdminMockCvDetail> {
  const res = await api.post<ApiResponse<AdminMockCvDetail>>(
    `/mock-cvs/admin/${id}/retry-analysis`,
  );
  return res.data.data;
}

export async function retryMockCvQuestionsAdmin(
  id: string,
): Promise<AdminMockCvDetail> {
  const res = await api.post<ApiResponse<AdminMockCvDetail>>(
    `/mock-cvs/admin/${id}/retry-questions`,
  );
  return res.data.data;
}

export async function retryMockCvInterviewScoringAdmin(
  id: string,
): Promise<AdminMockCvDetail> {
  const res = await api.post<ApiResponse<AdminMockCvDetail>>(
    `/mock-cvs/admin/interviews/${id}/retry-scoring`,
  );
  return res.data.data;
}

export async function hardDeleteMockCvInterviewAdmin(
  id: string,
): Promise<{ deleted: true; mockCvId: string; userId: string }> {
  const res = await api.delete<
    ApiResponse<{ deleted: true; mockCvId: string; userId: string }>
  >(`/mock-cvs/admin/interviews/${id}`);
  return res.data.data;
}

export async function hardDeleteMockCvAdmin(
  id: string,
): Promise<{ deleted: true; userId: string }> {
  const res = await api.delete<
    ApiResponse<{ deleted: true; userId: string }>
  >(`/mock-cvs/admin/${id}`);
  return res.data.data;
}
