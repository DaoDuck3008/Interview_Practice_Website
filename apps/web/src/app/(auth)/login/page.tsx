"use client";

import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { loginApi } from "@/lib/api/auth";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

const FEATURES = [
  "Ghi âm câu trả lời phỏng vấn thực tế",
  "Nhận đánh giá chi tiết từ AI",
  "Theo dõi điểm số và tiến độ",
];

function LoginContent() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? undefined;
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { accessToken, user } = await loginApi(email.trim(), password);
      setAuth(accessToken, user);
      const fallback = user.role === "ADMIN" ? "/admin" : "/practice";
      router.push(redirectTo || fallback);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg || "Email hoặc mật khẩu không đúng.");
    } finally {
      setIsSubmitting(false);
      toast.success("Đăng nhập thành công!");
    }
  }

  const registerHref = redirectTo
    ? `/register?redirect=${encodeURIComponent(redirectTo)}`
    : "/register";

  return (
    <div className="h-screen flex" style={{ background: "#06060c" }}>
      {/* Left panel — branding */}
      <div
        className="hidden md:flex w-[45%] flex-shrink-0 relative"
        style={{
          backgroundImage: "url('/images/register_background_2.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRight: "1px solid #1c1c28",
        }}
      >
        <div className="absolute inset-0" style={{ background: "rgba(6,6,12,0.88)" }} />
        <div className="relative z-10 flex flex-col justify-between w-full px-12 py-12">
          <Link
            href="/"
            className="font-extrabold text-xl text-[#f4f4f6] tracking-tight"
          >
            Interview<span className="text-[#8b5cf6]">Prep</span>
          </Link>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <p className="font-mono text-xs text-[#606072]">
                $ why interviewprep
              </p>
              <h2 className="text-3xl font-bold text-[#f4f4f6] leading-snug">
                Luyện tập phỏng vấn
                <br />
                <span className="text-[#8b5cf6]">kỹ thuật với AI</span>
              </h2>
            </div>
            <ul className="flex flex-col gap-4">
              {FEATURES.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="font-mono text-[#7c3aed] text-sm mt-0.5 flex-shrink-0">
                    ▸
                  </span>
                  <span className="text-sm text-[#9898aa]">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="font-mono text-xs text-[#3d3d54]">© 2025 InterviewPrep</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-12 relative"
        style={{
          backgroundImage: "url('/images/register_background_2.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0" style={{ background: "rgba(6,6,12,0.7)" }} />

        <div className="w-full max-w-sm flex flex-col gap-8 relative z-10">
          {/* Back + mobile logo */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-[#606072] hover:text-[#9898aa] transition-colors"
            >
              <ArrowLeft size={14} />
              Trang chủ
            </Link>
            <Link
              href="/"
              className="md:hidden font-extrabold text-lg text-[#f4f4f6] tracking-tight"
            >
              Interview<span className="text-[#8b5cf6]">Prep</span>
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-[#f4f4f6]">Đăng nhập</h1>
            <p className="text-sm text-[#606072]">
              Tiếp tục hành trình luyện tập của bạn
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#9898aa]">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg text-sm text-[#f4f4f6] placeholder-[#3d3d54] outline-none transition-all"
                style={{ background: "#0d0d14", border: "1px solid #1c1c28" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#7c3aed";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(124,58,237,0.15)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#1c1c28";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#9898aa]">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-lg text-sm text-[#f4f4f6] placeholder-[#3d3d54] outline-none transition-all"
                  style={{ background: "#0d0d14", border: "1px solid #1c1c28" }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#7c3aed";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(124,58,237,0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#1c1c28";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#606072] hover:text-[#9898aa] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-[#ef4444]">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg text-sm font-semibold text-white transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: "#7c3aed",
                boxShadow: "0 0 14px rgba(124,58,237,0.3)",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) e.currentTarget.style.background = "#6d28d9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#7c3aed";
              }}
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              Đăng nhập
            </button>
          </form>

          <p className="text-sm text-center text-[#606072]">
            Chưa có tài khoản?{" "}
            <Link
              href={registerHref}
              className="text-[#8b5cf6] hover:text-[#7c3aed] transition-colors"
            >
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
