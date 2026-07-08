"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import ModalPortal from "@/components/ui/ModalPortal";
import {
  getAuditLogAdmin,
  type AuditLogDetail,
  type AuditAction,
  type AuditActorType,
} from "@/lib/api/auditLogs";
import { formatDateTime } from "@/lib/utils/format";

const ACTOR_LABEL: Record<AuditActorType, string> = {
  ADMIN: "Admin",
  USER: "User",
  SYSTEM: "Hệ thống",
  WEBHOOK: "Webhook",
};

const ACTION_LABEL: Record<AuditAction, string> = {
  USER_REGISTER: "Đăng ký tài khoản",
  USER_VERIFY_EMAIL: "Xác thực email",
  USER_CHANGE_PASSWORD: "Đổi mật khẩu",
  USER_RESET_PASSWORD: "Reset mật khẩu",
  USER_LOCK: "Khóa tài khoản",
  USER_UNLOCK: "Mở khóa tài khoản",
  USER_MANUAL_VERIFY: "Xác thực thủ công",
  PLAN_CREATE: "Tạo gói",
  PLAN_UPDATE: "Cập nhật gói",
  PLAN_DELETE: "Xóa gói",
  TOPIC_CREATE: "Tạo chủ đề",
  TOPIC_UPDATE: "Cập nhật chủ đề",
  TOPIC_UPLOAD_ICON: "Đổi icon chủ đề",
  TOPIC_DELETE: "Xóa chủ đề",
  QUESTION_CREATE: "Tạo câu hỏi",
  QUESTION_UPDATE: "Cập nhật câu hỏi",
  QUESTION_SOFT_DELETE: "Ẩn câu hỏi",
  CHECKOUT_CREATE: "Tạo checkout",
  PAYMENT_WEBHOOK_PAID: "Webhook thanh toán thành công",
  PAYMENT_WEBHOOK_FAILED: "Webhook thanh toán lỗi",
  PAYMENT_WEBHOOK_IGNORED: "Webhook bị bỏ qua",
  PAYMENT_ADMIN_VIEW_DETAIL: "Xem chi tiết giao dịch",
  PAYMENT_EXPORT: "Xuất giao dịch",
  SUBSCRIPTION_CANCEL: "Hủy gói đăng ký",
  SUBSCRIPTION_ACTIVATE: "Kích hoạt gói đăng ký",
  SUBSCRIPTION_GRANT: "Cấp gói thủ công",
  SUBSCRIPTION_EXPIRE_CRON: "Cron hết hạn gói",
  SESSION_CREATE: "Tạo câu trả lời",
  SCORE_FLAG: "Báo cáo điểm",
  SCORE_REVIEW: "Review báo cáo điểm",
  SCORE_MANUAL_RESCORE: "Chấm lại thủ công",
  SESSION_ADMIN_VIEW_DETAIL: "Xem chi tiết câu trả lời",
};

interface Props {
  logId: string | null;
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-1.5">
      <span className="text-xs text-[#606072]">{label}</span>
      <span className="text-sm text-[#f4f4f6] break-words">{children}</span>
    </div>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  const empty = value === null || value === undefined;
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[#606072]">
        {title}
      </p>
      <pre className="max-h-72 overflow-auto rounded-lg border border-[#1c1c28] bg-[#06060c] p-3 text-xs leading-relaxed text-[#9898aa] whitespace-pre-wrap break-words">
        {empty ? "—" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export default function AuditLogDetailModal({ logId, onClose }: Props) {
  const [detail, setDetail] = useState<AuditLogDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!logId) return;
    let active = true;
    setLoading(true);
    setError(false);
    setDetail(null);
    getAuditLogAdmin(logId)
      .then((data) => active && setDetail(data))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [logId]);

  if (!logId) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
        onMouseDown={onClose}
      >
        <div
          className="w-full max-w-5xl overflow-hidden rounded-2xl border border-[#1c1c28] bg-[#0d0d14]"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[#1c1c28] px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Chi tiết audit log
              </h2>
              {detail && (
                <p className="mt-1 text-xs text-[#606072]">
                  {formatDateTime(detail.createdAt)} · {detail.id}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer text-[#606072] transition-colors hover:text-[#f4f4f6]"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[78vh] overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-[#606072]">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : error ? (
              <p className="py-16 text-center text-sm text-[#ef4444]">
                Không tải được chi tiết audit log.
              </p>
            ) : detail ? (
              <div className="flex flex-col gap-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="rounded-xl border border-[#1c1c28] bg-[#090910] p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#606072]">
                      Hành động
                    </p>
                    <Row label="Action">{ACTION_LABEL[detail.action]}</Row>
                    <Row label="Actor">
                      {ACTOR_LABEL[detail.actorType]}
                      {detail.actorEmail && (
                        <span className="text-[#606072]">
                          {" "}
                          · {detail.actorEmail}
                        </span>
                      )}
                    </Row>
                    <Row label="Kết quả">
                      {detail.success ? (
                        <span className="text-[#22c55e]">Thành công</span>
                      ) : (
                        <span className="text-[#ef4444]">
                          Lỗi {detail.errorCode ?? ""}
                        </span>
                      )}
                    </Row>
                  </section>

                  <section className="rounded-xl border border-[#1c1c28] bg-[#090910] p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#606072]">
                      Đối tượng & request
                    </p>
                    <Row label="Entity">
                      {detail.entityType}
                      {detail.entityId && (
                        <span className="text-[#606072]">
                          {" "}
                          · {detail.entityId}
                        </span>
                      )}
                    </Row>
                    <Row label="Target user">{detail.targetUserId ?? "—"}</Row>
                    <Row label="Request">
                      {detail.method ?? "—"}{" "}
                      <span className="font-mono text-[#9898aa]">
                        {detail.path ?? ""}
                      </span>
                    </Row>
                    <Row label="IP">{detail.ip ?? "—"}</Row>
                    <Row label="User-Agent">{detail.userAgent ?? "—"}</Row>
                  </section>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <JsonBlock title="Before" value={detail.before} />
                  <JsonBlock title="After" value={detail.after} />
                  <JsonBlock title="Metadata" value={detail.metadata} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export { ACTION_LABEL, ACTOR_LABEL };
