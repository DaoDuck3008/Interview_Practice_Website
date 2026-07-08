import api, { type ApiResponse } from "./api";
import type { Paginated } from "./questions";

export type AuditActorType = "USER" | "ADMIN" | "SYSTEM" | "WEBHOOK";

export type AuditAction =
  | "USER_REGISTER"
  | "USER_VERIFY_EMAIL"
  | "USER_CHANGE_PASSWORD"
  | "USER_RESET_PASSWORD"
  | "USER_LOCK"
  | "USER_UNLOCK"
  | "USER_MANUAL_VERIFY"
  | "PLAN_CREATE"
  | "PLAN_UPDATE"
  | "PLAN_DELETE"
  | "TOPIC_CREATE"
  | "TOPIC_UPDATE"
  | "TOPIC_UPLOAD_ICON"
  | "TOPIC_DELETE"
  | "QUESTION_CREATE"
  | "QUESTION_UPDATE"
  | "QUESTION_SOFT_DELETE"
  | "CHECKOUT_CREATE"
  | "PAYMENT_WEBHOOK_PAID"
  | "PAYMENT_WEBHOOK_FAILED"
  | "PAYMENT_WEBHOOK_IGNORED"
  | "PAYMENT_ADMIN_VIEW_DETAIL"
  | "PAYMENT_EXPORT"
  | "SUBSCRIPTION_CANCEL"
  | "SUBSCRIPTION_ACTIVATE"
  | "SUBSCRIPTION_GRANT"
  | "SUBSCRIPTION_EXPIRE_CRON"
  | "SESSION_CREATE"
  | "SCORE_FLAG"
  | "SCORE_REVIEW"
  | "SCORE_MANUAL_RESCORE"
  | "SESSION_ADMIN_VIEW_DETAIL";

export interface AuditLogListItem {
  id: string;
  actorType: AuditActorType;
  actorId: string | null;
  actorEmail: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  targetUserId: string | null;
  method: string | null;
  path: string | null;
  ip: string | null;
  success: boolean;
  errorCode: string | null;
  createdAt: string;
}

export interface AuditLogDetail extends AuditLogListItem {
  userAgent: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
}

export interface AuditLogQuery {
  search?: string;
  action?: AuditAction;
  actorType?: AuditActorType;
  entityType?: string;
  actorId?: string;
  targetUserId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function getAuditLogsAdmin(
  query: AuditLogQuery = {},
): Promise<Paginated<AuditLogListItem>> {
  const res = await api.get<ApiResponse<Paginated<AuditLogListItem>>>(
    "/audit-logs/admin",
    { params: query },
  );
  return res.data.data;
}

export async function getAuditLogAdmin(id: string): Promise<AuditLogDetail> {
  const res = await api.get<ApiResponse<AuditLogDetail>>(
    `/audit-logs/admin/${id}`,
  );
  return res.data.data;
}
