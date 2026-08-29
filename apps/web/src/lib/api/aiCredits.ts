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

export async function getAiCreditBalance(): Promise<AiCreditBalance> {
  const res = await api.get<ApiResponse<AiCreditBalance>>("/ai-credits/me");
  return res.data.data;
}
