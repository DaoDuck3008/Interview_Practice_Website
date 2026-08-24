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
