"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "react-toastify";
import AuthCardShell from "@/components/auth/AuthCardShell";
import CodeInput from "@/components/auth/CodeInput";
import { useAuthStore } from "@/stores/auth.store";
import { resendVerificationApi, verifyEmailApi } from "@/lib/api/auth";
import { safeRedirectPath } from "@/lib/utils/safe-redirect";

const RESEND_COOLDOWN = 60;

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  const email = searchParams.get("email") ?? "";
  const redirectTo = safeRedirectPath(searchParams.get("redirect"), "");

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  // Vừa gửi mã lúc đăng ký → bắt đầu với cooldown để tránh gửi lại ngay.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submit(finalCode: string) {
    if (submittingRef.current) return;
    if (finalCode.length !== 6) {
      setError("Vui lòng nhập đủ 6 chữ số.");
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      const { accessToken, user } = await verifyEmailApi(email, finalCode);
      setAuth(accessToken, user);
      toast.success("Xác thực email thành công!");
      const fallback = user.role === "ADMIN" ? "/admin" : "/practice";
      router.push(redirectTo || fallback);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || "Mã xác thực không đúng. Vui lòng thử lại.");
      setCode("");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(code);
  }

  async function handleResend() {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setError("");
    try {
      await resendVerificationApi(email);
      toast.success("Đã gửi lại mã xác thực.");
      setCooldown(RESEND_COOLDOWN);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg || "Không gửi lại được mã. Vui lòng thử lại.");
    } finally {
      setIsResending(false);
    }
  }

  if (!email) {
    return (
      <AuthCardShell
        badge="Xác thực email"
        title="Thiếu thông tin"
        subtitle="Không tìm thấy email cần xác thực."
        backHref="/register"
        backLabel="Quay lại đăng ký"
      >
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Vui lòng đăng ký hoặc đăng nhập lại để nhận mã xác thực.
        </p>
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell
      badge="Xác thực email"
      title="Nhập mã xác thực"
      subtitle={`Chúng tôi đã gửi mã gồm 6 chữ số tới ${email}. Nhập mã để kích hoạt tài khoản.`}
      backHref="/login"
      backLabel="Quay lại đăng nhập"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <CodeInput
          value={code}
          onChange={setCode}
          onComplete={(c) => void submit(c)}
          disabled={isSubmitting}
        />

        {error && (
          <p className="text-center text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || code.length !== 6}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--color-accent-light)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <MailCheck size={16} />
          )}
          Xác thực
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
        Chưa nhận được mã?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || isResending}
          className="font-semibold text-[var(--color-accent-light)] transition-colors hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:text-[var(--color-text-muted)]"
        >
          {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại mã"}
        </button>
      </div>
    </AuthCardShell>
  );
}

export default function VerifyEmailPageClient() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
