import api, { type ApiResponse } from "./api";
import type { MockInterviewStatus } from "./mockInterviews";
import type { Paginated } from "./questions";

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
  query: { page?: number; limit?: number } = {},
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
