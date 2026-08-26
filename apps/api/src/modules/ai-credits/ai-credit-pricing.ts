import { AiCreditFeature } from '@prisma/client';

export const AI_CREDIT_PRICING: Record<AiCreditFeature, number> = {
  ANSWER_AUDIO: 1,
  ANSWER_IMPROVEMENT: 1,
  MOCK_INTERVIEW_CREATE: 0,
  MOCK_INTERVIEW_OVERVIEW: 2,
  CV_ANALYSIS_10: 8,
  CV_ANALYSIS_20: 12,
  CV_ANALYSIS_30: 16,
  MOCK_CV_OVERVIEW: 2,
};

/** Credit trial được cấp lại lúc 00:00 theo giờ Việt Nam. */
export const FREE_DAILY_AI_CREDITS = 3;

const AUDIO_RESERVATION_TTL_MS = 15 * 60 * 1000;
const CV_RESERVATION_TTL_MS = 30 * 60 * 1000;

export function getAiCreditCost(feature: AiCreditFeature): number {
  return AI_CREDIT_PRICING[feature];
}

export function getReservationTtlMs(feature: AiCreditFeature): number {
  switch (feature) {
    case AiCreditFeature.CV_ANALYSIS_10:
    case AiCreditFeature.CV_ANALYSIS_20:
    case AiCreditFeature.CV_ANALYSIS_30:
      return CV_RESERVATION_TTL_MS;
    default:
      return AUDIO_RESERVATION_TTL_MS;
  }
}

/** Khóa idempotency có namespace để các nghiệp vụ khác nhau không thể va chạm ID. */
export function aiCreditReservationKey(
  feature: AiCreditFeature,
  referenceType: string,
  referenceId: string,
) {
  return `${feature}:${referenceType}:${referenceId}`;
}

export function cvAnalysisFeature(questionCount: number): AiCreditFeature {
  if (questionCount <= 10) return AiCreditFeature.CV_ANALYSIS_10;
  if (questionCount <= 20) return AiCreditFeature.CV_ANALYSIS_20;
  return AiCreditFeature.CV_ANALYSIS_30;
}
