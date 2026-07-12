"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Mail,
  ShieldCheck,
  UserCog,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import Modal from "./Modal";
import { getUserDetail, type AdminUserDetail } from "@/lib/api/users";
import { formatDay, formatDate, formatVnd } from "@/lib/utils/format";
import {
  SUBSCRIPTION_STATUS_META,
  ORDER_STATUS_META,
} from "@/lib/utils/subscriptions";

interface Props {
  /** User cần xem; null = đóng modal. */
  userId: string | null;
  onClose: () => void;
}

export default function UserDetailModal({ userId, onClose }: Props) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    queueMicrotask(() => {
      setDetail(null);
      setLoading(true);
      getUserDetail(userId)
        .then(setDetail)
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, [userId]);

  return (
    <Modal
      open={userId !== null}
      onClose={onClose}
      title="Thông tin người dùng"
    >
      {loading || !detail ? (
        <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)]">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* Header */}
          <div className="flex items-center gap-4">
            {detail.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.avatarUrl}
                alt={detail.name}
                referrerPolicy="no-referrer"
                className="h-14 w-14 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
                style={{ background: "var(--color-accent)" }}
              >
                {detail.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-base font-bold text-white">
                  {detail.name}
                </p>
                {detail.role === "ADMIN" && (
                  <span className="rounded-full bg-[rgba(124,58,237,0.14)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-light)]">
                    Admin
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-[var(--color-text-muted)]">
                {detail.email}
              </p>
            </div>
          </div>

          {/* Thông tin tài khoản */}
          <Section title="Thông tin tài khoản">
            <InfoRow icon={Mail} label="Email">
              <span className="inline-flex items-center gap-2">
                {detail.email}
                {detail.emailVerified ? (
                  <Badge
                    color="#22c55e"
                    icon={CheckCircle2}
                    label="Đã xác thực"
                  />
                ) : (
                  <Badge
                    color="#f59e0b"
                    icon={AlertTriangle}
                    label="Chưa xác thực"
                  />
                )}
                {detail.isLock && (
                  <Badge color="#ef4444" icon={Lock} label="Đã khóa" />
                )}
              </span>
            </InfoRow>
            <InfoRow icon={ShieldCheck} label="Phương thức đăng nhập">
              {detail.isGoogle ? "Google" : "Email & mật khẩu"}
            </InfoRow>
            <InfoRow icon={UserCog} label="Vai trò">
              {detail.role === "ADMIN" ? "Quản trị viên" : "Người dùng"}
            </InfoRow>
            <InfoRow icon={CalendarDays} label="Ngày tham gia">
              {formatDay(detail.createdAt)}
            </InfoRow>
          </Section>

          {/* Gói đã đăng ký */}
          <Section title="Gói đã đăng ký">
            {detail.subscription ? (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {detail.subscription.plan.name}
                  </span>
                  <StatusChip
                    color={
                      SUBSCRIPTION_STATUS_META[detail.subscription.status].color
                    }
                    label={
                      SUBSCRIPTION_STATUS_META[detail.subscription.status].label
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-xs text-[var(--color-text-secondary)]">
                  <span>
                    Bắt đầu: {formatDay(detail.subscription.startedAt)}
                  </span>
                  <span>
                    Hết hạn: {formatDay(detail.subscription.expiresAt)}
                  </span>
                  <span>
                    Kỳ hạn: {detail.subscription.plan.durationDays} ngày
                  </span>
                  {detail.subscription.canceledAt && (
                    <span>
                      Đã hủy: {formatDay(detail.subscription.canceledAt)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                Chưa đăng ký gói nào.
              </p>
            )}
          </Section>

          {/* Lịch sử giao dịch */}
          <Section title={`Lịch sử giao dịch (${detail.orders.length})`}>
            {detail.orders.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                Chưa có giao dịch nào.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {detail.orders.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {o.amountVnd > 0 ? formatVnd(o.amountVnd) : "Miễn phí"}
                      </span>
                      <StatusChip
                        color={ORDER_STATUS_META[o.status].color}
                        label={ORDER_STATUS_META[o.status].label}
                      />
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[var(--color-text-muted)]">
                      {o.plan && <span>{o.plan.name}</span>}
                      <span>
                        {o.provider === "manual"
                          ? "Cấp thủ công"
                          : `Mã: ${o.transferCode}`}
                      </span>
                      <span>
                        {o.paidAt
                          ? `Thanh toán: ${formatDate(o.paidAt)}`
                          : `Tạo: ${formatDate(o.createdAt)}`}
                      </span>
                    </div>
                    {o.note && (
                      <p className="mt-1.5 text-xs italic text-[var(--color-text-secondary)]">
                        “{o.note}”
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-[var(--color-border)] py-2.5 last:border-b-0">
      <span className="inline-flex w-44 flex-shrink-0 items-center gap-2 text-xs text-[var(--color-text-muted)]">
        <Icon size={14} />
        {label}
      </span>
      <span className="min-w-0 text-sm text-[var(--color-text-primary)]">
        {children}
      </span>
    </div>
  );
}

function StatusChip({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{
        background: `${color}1a`,
        color,
        border: `1px solid ${color}4d`,
      }}
    >
      {label}
    </span>
  );
}

function Badge({
  color,
  icon: Icon,
  label,
}: {
  color: string;
  icon: typeof CheckCircle2;
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{
        background: `${color}1a`,
        color,
        border: `1px solid ${color}4d`,
      }}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}
