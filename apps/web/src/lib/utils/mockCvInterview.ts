import type { MockCvInterview } from "@/lib/api/mockCvInterviews";
import type { InterviewSessionView } from "@/lib/interview-core/types";

export function toMockCvInterviewView(
  input: MockCvInterview,
): InterviewSessionView {
  return {
    id: input.id,
    title: input.title,
    status: input.status,
    level: null,
    totalQuestions: input.totalQuestions,
    durationSeconds: input.durationSeconds,
    startedAt: input.startedAt,
    expiresAt: input.expiresAt,
    submittedAt: input.submittedAt,
    scoredAt: input.scoredAt,
    averageTechnicalScore: input.averageTechnicalScore ?? null,
    averageCompletenessScore: input.averageCompletenessScore ?? null,
    averageClarityScore: input.averageClarityScore ?? null,
    overallScore: input.overallScore ?? null,
    summary: input.summary ?? null,
    strengths: input.strengths ?? [],
    weaknesses: input.weaknesses ?? [],
    nextRecommendations: input.nextRecommendations ?? [],
    overviewStatus: input.overviewStatus,
    overviewError: null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.createdAt,
    topic: null,
    topics: [],
    contextLabel: "Phỏng vấn theo CV",
    questions: input.questions.map((item) => ({
      id: item.id,
      order: item.order,
      answerStatus: item.answerStatus,
      scoreStatus: item.scoreStatus,
      scoreError: item.scoreError ?? null,
      answeredAt: item.answeredAt,
      skippedAt: item.skippedAt,
      question: {
        id: item.id,
        content: item.content,
        level: null,
        topic: null,
      },
      session: item.session
        ? {
            ...item.session,
            score: item.session.score ?? null,
          }
        : null,
    })),
  };
}
