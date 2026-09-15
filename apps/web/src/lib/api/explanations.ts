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
export interface PaginatedTechnicalTerms {
  items: AdminTechnicalTerm[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TechnicalTermStats {
  totalTerms: number;
  totalAliases: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

/** Danh sách glossary cho admin review; API client tự kèm JWT hiện tại. */
export async function getAdminTechnicalTerms(
  params: { search?: string; status?: AdminTechnicalTerm["status"]; page?: number; limit?: number } = {},
): Promise<PaginatedTechnicalTerms> {
  const res = await api.get<ApiResponse<PaginatedTechnicalTerms>>(
    "/explanations/admin/terms",
    { params },
  );
  return res.data.data;
}

/** Số liệu tổng quan glossary cho card admin, độc lập với search/filter của bảng. */
export async function getAdminTechnicalTermStats(): Promise<TechnicalTermStats> {
  const res = await api.get<ApiResponse<TechnicalTermStats>>(
    "/explanations/admin/terms/stats",
  );
  return res.data.data;
}

export async function updateAdminTechnicalTerm(
  id: string,
  data: Partial<
    Pick<
      AdminTechnicalTerm,
      "canonicalTerm" | "explanation" | "status"
    >
  > & { aliases?: string[] },
): Promise<AdminTechnicalTerm> {
  const res = await api.patch<ApiResponse<AdminTechnicalTerm>>(
    `/explanations/admin/terms/${id}`,
    data,
  );
  return res.data.data;
}

export async function deleteAdminTechnicalTerm(id: string): Promise<{ id: string }> {
  const res = await api.delete<ApiResponse<{ id: string }>>(`/explanations/admin/terms/${id}`);
  return res.data.data;
}
