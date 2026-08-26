import api, { type ApiResponse } from "./api";

export type CreditCycleSource = "FREE" | "SUBSCRIPTION" | "MANUAL";

export interface AiCreditBalance {
  cycleId: string;
  source: CreditCycleSource;
  planName: string | null;
  granted: number;
  used: number;
  reserved: number;
  available: number;
  cycleStartsAt: string;
  cycleEndsAt: string;
}

export interface AiCreditPricing {
  ANSWER_AUDIO: number;
  ANSWER_IMPROVEMENT: number;
  MOCK_INTERVIEW_CREATE: number;
  MOCK_INTERVIEW_OVERVIEW: number;
  CV_ANALYSIS_10: number;
  CV_ANALYSIS_20: number;
  CV_ANALYSIS_30: number;
  MOCK_CV_OVERVIEW: number;
}

export async function getAiCreditBalance(): Promise<AiCreditBalance> {
  const res = await api.get<ApiResponse<AiCreditBalance>>("/ai-credits/me");
  return res.data.data;
}

export async function getAiCreditPricing(): Promise<AiCreditPricing> {
  const res = await api.get<ApiResponse<AiCreditPricing>>(
    "/ai-credits/pricing",
  );
  return res.data.data;
}

export function getMockCvAnalysisCost(
  questionCount: number,
  pricing: AiCreditPricing | null,
): number | null {
  if (!pricing) return null;
  if (questionCount <= 10) return pricing.CV_ANALYSIS_10;
  if (questionCount <= 20) return pricing.CV_ANALYSIS_20;
  return pricing.CV_ANALYSIS_30;
}
