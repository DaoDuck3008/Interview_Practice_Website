"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, KeyRound, Send } from "lucide-react";
import { toast } from "react-toastify";
import AuthCardShell from "@/components/auth/AuthCardShell";
import CodeInput from "@/components/auth/CodeInput";
import { forgotPasswordApi, resetPasswordApi } from "@/lib/api/auth";

const RESEND_COOLDOWN = 60;

function ForgotPasswordContent() {
  const router = useRouter();

  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }
    setIsSubmitting(true);
    try {
      await forgotPasswordApi(email.trim());
      toast.success("Nếu email tồn tại, mã đặt lại đã được gửi.");
      setStep("reset");
      setCooldown(RESEND_COOLDOWN);
    } catch {
      // Backend luôn trả chung để tránh dò email; lỗi mạng thì báo nhẹ.
      toast.error("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resend() {
    if (cooldown > 0) return;
    try {
      await forgotPasswordApi(email.trim());
      toast.success("Đã gửi lại mã.");
      setCooldown(RESEND_COOLDOWN);
    } catch {
      toast.error("Không gửi lại được mã.");
    }
  }

  async function submitReset(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (code.length !== 6) {
      setError("Vui lòng nhập đủ 6 chữ số.");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    setIsSubmitting(true);
    try {
      await resetPasswordApi(email.trim(), code, password);
      toast.success("Đặt lại mật khẩu thành công! Vui lòng đăng nhập.");
      router.push("/login");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || "Không đặt lại được mật khẩu. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "email") {
    return (
      <AuthCardShell
        badge="Quên mật khẩu"
        title="Khôi phục mật khẩu"
        subtitle="Nhập email của bạn, chúng tôi sẽ gửi mã 6 chữ số để đặt lại mật khẩu."
        backHref="/login"
        backLabel="Quay lại đăng nhập"
      >
        <form onSubmit={requestCode} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-accent-light)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Gửi mã đặt lại
          </button>
        </form>
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell
      badge="Quên mật khẩu"
      title="Đặt mật khẩu mới"
      subtitle={`Nhập mã đã gửi tới ${email} và mật khẩu mới của bạn.`}
      backHref="/login"
      backLabel="Quay lại đăng nhập"
    >
      <form onSubmit={submitReset} className="flex flex-col gap-6">
        <CodeInput value={code} onChange={setCode} disabled={isSubmitting} />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--color-text-secondary)]">
            Mật khẩu mới
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ít nhất 8 ký tự"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 pr-11 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-accent-light)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <KeyRound size={16} />
          )}
          Đặt lại mật khẩu
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
        Chưa nhận được mã?{" "}
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0}
          className="font-semibold text-[var(--color-accent-light)] transition-colors hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:text-[var(--color-text-muted)]"
        >
          {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại mã"}
        </button>
      </div>
    </AuthCardShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordContent />
    </Suspense>
  );
}
