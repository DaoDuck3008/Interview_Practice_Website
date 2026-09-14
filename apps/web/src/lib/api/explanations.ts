import api, { type ApiResponse } from "./api";

export type ExplanationSource =
  | "QUESTION"
  | "SUMMARY"
  | "DETAIL_ANSWER"
  | "KEYWORD";
export interface TechnicalExplanation {
  canonicalTerm: string;
  explanation: string;
  cached: boolean;
  isVerified: boolean;
}
export interface PendingExplanation {
  termId: string;
  status: "PENDING" | "FAILED" | "MERGED";
}
export type ExplanationResponse = TechnicalExplanation | PendingExplanation;
export interface ExplanationCreditBalance {
  source: "FREE" | "SUBSCRIPTION" | "MANUAL";
  planName: string | null;
  granted: number;
  used: number;
  reserved: number;
  available: number;
  cycleEndsAt: string | null;
}

export async function createExplanation(input: {
  questionId: string;
  source: ExplanationSource;
  selectedText: string;
}): Promise<ExplanationResponse> {
  const res = await api.post<ApiResponse<ExplanationResponse>>(
    "/explanations",
    input,
  );
  return res.data.data;
}

/** Poll fallback cho kết quả worker khi socket offline hoặc event bị bỏ lỡ. */
export async function getExplanationStatus(termId: string): Promise<ExplanationResponse> {
  const res = await api.get<ApiResponse<ExplanationResponse>>(`/explanations/terms/${termId}`);
  return res.data.data;
}
export async function getExplanationCreditBalance(): Promise<ExplanationCreditBalance> {
  const res = await api.get<ApiResponse<ExplanationCreditBalance>>(
    "/explanation-credits/me",
  );
  return res.data.data;
}

export interface AdminTechnicalTerm extends TechnicalExplanation {
  id: string;
  status: "PENDING" | "READY" | "FAILED" | "MERGED" | "DISABLED";
  aliases: Array<{ id: string; originalAlias: string }>;
  updatedAt: string;
}

/** Danh sách glossary cho admin review; API client tự kèm JWT hiện tại. */
export async function getAdminTechnicalTerms(
  search?: string,
): Promise<AdminTechnicalTerm[]> {
  const res = await api.get<ApiResponse<AdminTechnicalTerm[]>>(
    "/explanations/admin/terms",
    { params: search ? { search } : undefined },
  );
  return res.data.data;
}

export async function updateAdminTechnicalTerm(
  id: string,
  data: Partial<
    Pick<
      AdminTechnicalTerm,
      "canonicalTerm" | "explanation" | "status" | "isVerified"
    >
  > & { aliases?: string[] },
): Promise<AdminTechnicalTerm> {
  const res = await api.patch<ApiResponse<AdminTechnicalTerm>>(
    `/explanations/admin/terms/${id}`,
    data,
  );
  return res.data.data;
}
