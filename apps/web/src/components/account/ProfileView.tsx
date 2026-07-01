"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  KeyRound,
  Mail,
  ShieldCheck,
  AlertTriangle,
  UserCog,
} from "lucide-react";
import { getMyProfile, type MyProfile } from "@/lib/api/auth";
import { formatDay } from "@/lib/utils/format";
import ChangePasswordModal from "@/components/account/ChangePasswordModal";

const cardClass =
  "rounded-2xl p-6 md:p-8 backdrop-blur-xl border border-white/10";
const cardBg = { background: "rgba(255,255,255,0.05)" };

export default function ProfileView() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col gap-6">
        <div className={`${cardClass} animate-pulse h-32`} style={cardBg} />
        <div className={`${cardClass} animate-pulse h-56`} style={cardBg} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1">
        <div className={cardClass} style={cardBg}>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Không tải được thông tin tài khoản. Vui lòng thử lại.
          </p>
        </div>
      </div>
    );
  }

  const initial = profile.name.charAt(0).toUpperCase();

  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* Header */}
      <div className={cardClass} style={cardBg}>
        <div className="flex items-center gap-4">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              referrerPolicy="no-referrer"
              className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{ background: "var(--color-accent)" }}
            >
              {initial}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-extrabold text-[var(--color-text-primary)]">
                {profile.name}
              </h2>
              {profile.role === "ADMIN" && (
                <span className="rounded-full bg-[rgba(124,58,237,0.14)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-light)]">
                  Admin
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-sm text-[var(--color-text-secondary)]">
              {profile.email}
            </p>
          </div>
        </div>
      </div>

      {/* Thông tin tài khoản */}
      <div className={cardClass} style={cardBg}>
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          Thông tin tài khoản
        </h3>
        <div className="mt-5 flex flex-col">
          <InfoRow icon={Mail} label="Email">
            <span className="inline-flex items-center gap-2">
              {profile.email}
              {profile.emailVerified ? (
                <Badge color="#22c55e" icon={BadgeCheck} label="Đã xác thực" />
              ) : (
                <Badge
                  color="#f59e0b"
                  icon={AlertTriangle}
                  label="Chưa xác thực"
                />
              )}
            </span>
          </InfoRow>
          <InfoRow icon={ShieldCheck} label="Phương thức đăng nhập">
            {profile.isGoogle ? "Google" : "Email & mật khẩu"}
          </InfoRow>
          <InfoRow icon={UserCog} label="Vai trò">
            {profile.role === "ADMIN" ? "Quản trị viên" : "Người dùng"}
          </InfoRow>
          <InfoRow icon={CalendarDays} label="Ngày tham gia">
            {formatDay(profile.createdAt)}
          </InfoRow>
        </div>
      </div>

      {/* Bảo mật */}
      <div className={cardClass} style={cardBg}>
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          Bảo mật
        </h3>
        {profile.isGoogle ? (
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
            Tài khoản của bạn đăng nhập bằng Google nên không có mật khẩu để đổi.
            Hãy quản lý mật khẩu trong tài khoản Google.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Đổi mật khẩu định kỳ để giữ tài khoản an toàn.
            </p>
            <button
              onClick={() => setPwOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] transition-colors duration-200 hover:border-[var(--color-accent)] hover:text-[var(--color-accent-light)]"
            >
              <KeyRound size={15} />
              Đổi mật khẩu
            </button>
          </div>
        )}
      </div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
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
    <div className="flex flex-col gap-1 border-b border-white/10 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <span className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] sm:w-48 sm:flex-shrink-0">
        <Icon size={15} />
        {label}
      </span>
      <span className="min-w-0 text-sm text-[var(--color-text-primary)]">
        {children}
      </span>
    </div>
  );
}

function Badge({
  color,
  icon: Icon,
  label,
}: {
  color: string;
  icon: typeof BadgeCheck;
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: `${color}1a`, color, border: `1px solid ${color}4d` }}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}
