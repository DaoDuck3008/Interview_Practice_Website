import type {
  MockInterview,
  MockInterviewStatus,
  MockQuestionAnswerStatus,
  MockQuestionScoreStatus,
} from "@/lib/api/mockInterviews";

export type MockStatusBadge = {
  label: string;
  className: string;
};

export type MockInterviewScoreBand = {
  label: string;
  textClassName: string;
  borderClassName: string;
  backgroundClassName: string;
  progressClassName: string;
  shadowClassName: string;
};

export const MOCK_INTERVIEW_STATUS_LABEL: Record<MockInterviewStatus, string> =
  {
    DRAFT: "Chưa bắt đầu",
    IN_PROGRESS: "Đang làm",
    SUBMITTED: "Đã nộp",
    SCORING: "Đang chấm",
    SCORED: "Đã chấm",
    ABANDONED: "Bỏ dở",
  };

export const MOCK_ANSWER_STATUS_LABEL: Record<
  MockQuestionAnswerStatus,
  string
> = {
  PENDING: "Chưa trả lời",
  ANSWERED: "Đã trả lời",
  SKIPPED: "Bỏ qua",
};

export const MOCK_SCORE_STATUS_LABEL: Record<MockQuestionScoreStatus, string> =
  {
    PENDING: "Chờ chấm",
    QUEUED: "Đang chấm",
    SCORED: "Đã chấm",
    FAILED: "Lỗi chấm",
    SKIPPED: "Bỏ qua",
  };

const BADGE_BASE = "border px-2 py-0.5 text-xs font-semibold";

export function mockInterviewStatusBadge(
  status: MockInterviewStatus,
  shape: "pill" | "square" = "pill",
): MockStatusBadge {
  const radius = shape === "pill" ? "rounded-full" : "rounded-md";
  const tone =
    status === "SCORED"
      ? "border-success/30 bg-success/10 text-success"
      : status === "SCORING" || status === "SUBMITTED"
        ? "border-accent/30 bg-accent/10 text-accent-light"
        : status === "ABANDONED"
          ? "border-danger/30 bg-danger/10 text-danger"
          : "border-border bg-elevated text-text-secondary";

  return {
    label: MOCK_INTERVIEW_STATUS_LABEL[status],
    className: `${radius} ${BADGE_BASE} ${tone}`,
  };
}

export function mockQuestionStatusBadge(item: {
  answerStatus: MockQuestionAnswerStatus;
  scoreStatus: MockQuestionScoreStatus;
}): MockStatusBadge {
  const tone =
    item.scoreStatus === "SCORED"
      ? "border-success/30 bg-success/10 text-success"
      : item.scoreStatus === "FAILED"
        ? "border-danger/30 bg-danger/10 text-danger"
        : item.scoreStatus === "QUEUED" || item.scoreStatus === "PENDING"
          ? "border-accent/30 bg-accent/10 text-accent-light"
          : "border-border bg-elevated text-text-secondary";

  return {
    label:
      item.answerStatus === "ANSWERED"
        ? MOCK_SCORE_STATUS_LABEL[item.scoreStatus]
        : MOCK_ANSWER_STATUS_LABEL[item.answerStatus],
    className: `rounded-md ${BADGE_BASE} ${tone}`,
  };
}

export function mockInterviewTargetPath(
  mock: Pick<MockInterview, "id" | "status">,
) {
  if (
    mock.status === "SUBMITTED" ||
    mock.status === "SCORING" ||
    mock.status === "SCORED"
  ) {
    return `/mock-interviews/${mock.id}/result`;
  }
  return `/mock-interviews/${mock.id}`;
}

export function mockInterviewScoreBand(
  score: number | null | undefined,
): MockInterviewScoreBand {
  if (score === null || score === undefined) {
    return {
      label: "Chưa có điểm",
      textClassName: "text-text-muted",
      borderClassName: "border-border",
      backgroundClassName: "bg-elevated/70",
      progressClassName: "bg-border",
      shadowClassName: "shadow-base/20",
    };
  }

  if (score <= 3) {
    return {
      label: "Cần luyện lại",
      textClassName: "text-danger",
      borderClassName: "border-danger/30",
      backgroundClassName: "bg-danger/10",
      progressClassName: "bg-danger",
      shadowClassName: "shadow-danger/10",
    };
  }

  if (score <= 6) {
    return {
      label: "Cần bổ sung",
      textClassName: "text-yellow-300",
      borderClassName: "border-yellow-400/30",
      backgroundClassName: "bg-yellow-500/10",
      progressClassName: "bg-yellow-400",
      shadowClassName: "shadow-yellow-500/10",
    };
  }

  if (score <= 8) {
    return {
      label: "Khá tốt",
      textClassName: "text-success",
      borderClassName: "border-success/30",
      backgroundClassName: "bg-success/10",
      progressClassName: "bg-success",
      shadowClassName: "shadow-success/10",
    };
  }

  return {
    label: "Rất tốt",
    textClassName: "text-blue-300",
    borderClassName: "border-blue-400/30",
    backgroundClassName: "bg-blue-500/10",
    progressClassName: "bg-blue-400",
    shadowClassName: "shadow-blue-500/10",
  };
}

export function mockInterviewScoreText(score: number | null | undefined) {
  return score === null || score === undefined ? "--" : score.toFixed(1);
}
