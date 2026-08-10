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
  canRetry: boolean;
  retryAvailableAt: string | null;
  failureMessage: string | null;
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

export interface CreateMockCvInput {
  targetRole: string;
  cv: File;
}

export interface StartMockCvInterviewInput {
  totalQuestions: number;
  durationSeconds: number;
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

export async function createMockCv(input: CreateMockCvInput): Promise<MockCv> {
  const formData = new FormData();
  formData.append("targetRole", input.targetRole);
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
  input: StartMockCvInterviewInput,
): Promise<StartMockCvInterviewResponse> {
  const res = await api.post<ApiResponse<StartMockCvInterviewResponse>>(
    `/mock-cvs/${id}/start`,
    input,
  );
  return res.data.data;
}
