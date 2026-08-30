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

export type MockCvQuestionCount = 10 | 20 | 30;

export interface AiCreditPricing {
  mockCv: {
    totalCreditsByQuestionCount: Record<MockCvQuestionCount, number>;
  };
}

export async function getAiCreditPricing(): Promise<AiCreditPricing> {
  const res = await api.get<ApiResponse<AiCreditPricing>>(
    "/ai-credits/pricing",
  );
  return res.data.data;
}

export async function getAiCreditBalance(): Promise<AiCreditBalance> {
  const res = await api.get<ApiResponse<AiCreditBalance>>("/ai-credits/me");
  return res.data.data;
}
