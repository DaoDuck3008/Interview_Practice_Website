import type {
  MockCvAnalysisStatus,
  MockCvQuestionGenerationStatus,
} from "@/lib/api/mockCvs";
import type { MockInterviewStatus } from "@/lib/api/mockInterviews";

export const MOCK_INTERVIEW_STATUS_LABEL: Record<MockInterviewStatus, string> = {
  DRAFT: "Bản nháp",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
  SCORING: "Đang chấm",
  SCORED: "Đã chấm",
  ABANDONED: "Đã bỏ dở",
};

export const MOCK_CV_ANALYSIS_STATUS_LABEL: Record<
  MockCvAnalysisStatus,
  string
> = {
  PENDING: "Chờ phân tích",
  ANALYZING: "Đang phân tích",
  READY: "Đã phân tích",
  UNSUPPORTED: "Không hỗ trợ",
  NEEDS_REUPLOAD: "Cần tải lại",
  FAILED: "Phân tích lỗi",
};

export const MOCK_CV_QUESTION_STATUS_LABEL: Record<
  MockCvQuestionGenerationStatus,
  string
> = {
  PENDING: "Chờ tạo câu hỏi",
  GENERATING: "Đang tạo câu hỏi",
  READY: "Câu hỏi sẵn sàng",
  FAILED: "Tạo câu hỏi lỗi",
};

export function interviewStatusClass(status: MockInterviewStatus): string {
  if (status === "SCORED")
    return "border-success/30 bg-success/10 text-success";
  if (status === "SCORING" || status === "SUBMITTED")
    return "border-accent/30 bg-accent/10 text-accent-light";
  if (status === "IN_PROGRESS")
    return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  return "border-border bg-elevated text-text-muted";
}

export function analysisStatusClass(status: MockCvAnalysisStatus): string {
  if (status === "READY")
    return "border-success/30 bg-success/10 text-success";
  if (status === "PENDING" || status === "ANALYZING")
    return "border-accent/30 bg-accent/10 text-accent-light";
  return "border-danger/30 bg-danger/10 text-danger";
}

export function questionStatusClass(
  status: MockCvQuestionGenerationStatus,
): string {
  if (status === "READY")
    return "border-success/30 bg-success/10 text-success";
  if (status === "FAILED")
    return "border-danger/30 bg-danger/10 text-danger";
  return "border-accent/30 bg-accent/10 text-accent-light";
}
