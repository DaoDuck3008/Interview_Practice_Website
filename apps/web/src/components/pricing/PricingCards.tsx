"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Check, BadgeCheck, Sparkles, Loader2, Info } from "lucide-react";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { getPlans, type Plan } from "@/lib/api/plans";
import { createCheckout } from "@/lib/api/payments";
import { getMySubscription, type MySubscription } from "@/lib/api/subscriptions";
import { useAuthStore } from "@/stores/auth.store";
import { toastApiError } from "@/lib/utils/apiError";
import { formatDay, formatNumber } from "@/lib/utils/format";

const FEATURES = [
  "Truy cập toàn bộ ngân hàng câu hỏi",
  "Chấm điểm AI không giới hạn",
  "Phân tích & viết lại câu trả lời",
  "Dashboard theo dõi tiến bộ",
];

const cardClass =
  "group relative flex flex-col h-full rounded-2xl p-8 backdrop-blur-xl transition-all duration-300";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function PricingCards() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [sub, setSub] = useState<MySubscription | null>(null);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  useEffect(() => {
    getPlans().then(setPlans);
  }, []);

  useEffect(() => {
    if (user) getMySubscription().then(setSub);
    else setSub(null);
  }, [user]);

  async function handleBuy(slug: string) {
    if (loadingSlug) return;

    // Chưa đăng nhập -> điều hướng tới trang đăng nhập (kèm redirect quay lại Pricing).
    if (!user) {
      toast.info("Vui lòng đăng nhập để mua gói.");
      router.push(`/login?redirect=${encodeURIComponent("/pricing")}`);
      return;
    }

    setLoadingSlug(slug);
    try {
      const order = await createCheckout(slug);
      router.push(`/pricing/checkout/${order.id}`);
    } catch (error) {
      toastApiError(error, "Không tạo được đơn thanh toán. Vui lòng thử lại.");
      setLoadingSlug(null);
    }
  }

  // "Tiết kiệm nhất" = gói có giá/ngày thấp nhất.
  const popularId =
    plans && plans.length
      ? plans.reduce((best, p) =>
          p.priceVnd / p.durationDays < best.priceVnd / best.durationDays
            ? p
            : best,
        ).id
      : null;

  const hasActiveSub = !!sub?.isActive;
  const remainingDays = hasActiveSub
    ? Math.max(
        0,
        Math.ceil((new Date(sub!.expiresAt).getTime() - Date.now()) / DAY_MS),
      )
    : 0;
  const expiryStr = hasActiveSub ? formatDay(sub!.expiresAt) : "";

  function buttonLabel(plan: Plan, isCurrent: boolean) {
    if (!user || !hasActiveSub) return "Mua ngay";
    return isCurrent ? "Gia hạn" : "Đổi gói";
  }

  if (!plans) {
    return (
      <div className="grid gap-6 md:grid-cols-3 items-stretch">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${cardClass} border border-white/10 animate-pulse min-h-[420px]`}
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Note khi đã có gói đang hoạt động */}
      {hasActiveSub && (
        <div
          className="mb-8 flex items-start gap-3 rounded-xl border border-[var(--color-accent)]/30 p-4 backdrop-blur-xl"
          style={{ background: "rgba(124,58,237,0.08)" }}
        >
          <Info
            size={18}
            className="mt-0.5 flex-shrink-0 text-[var(--color-accent-light)]"
          />
          <p className="text-sm text-[var(--color-text-secondary)]">
            Bạn đang dùng gói{" "}
            <span className="font-semibold text-[var(--color-text-primary)]">
              {sub!.plan.name}
            </span>{" "}
            · còn <span className="font-semibold">{remainingDays}</span> ngày (hết
            hạn {expiryStr}). Mua thêm hoặc đổi gói sẽ{" "}
            <span className="font-semibold text-[var(--color-text-primary)]">
              cộng dồn
            </span>{" "}
            ngày vào thời hạn hiện tại.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3 items-stretch">
        {plans.map((plan, i) => {
          const popular = plan.id === popularId;
          const isCurrent = hasActiveSub && sub!.plan.slug === plan.slug;
          return (
            <AnimateOnScroll key={plan.id} variant="fade-up" delay={i * 120}>
              <div
                className={`${cardClass} hover:-translate-y-1 hover:border-[var(--color-accent)] hover:shadow-[0_0_40px_-5px_rgba(124,58,237,0.55)] ${
                  isCurrent
                    ? "border border-[var(--color-success)]/60"
                    : popular
                      ? "border border-[var(--color-accent)]/60"
                      : "border border-white/10"
                }`}
                style={{
                  background: isCurrent
                    ? "rgba(34,197,94,0.08)"
                    : "rgba(255,255,255,0.05)",
                }}
              >
                {isCurrent ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-[var(--color-success)] px-3 py-1 text-[11px] font-semibold text-white whitespace-nowrap">
                    <BadgeCheck size={12} />
                    Đang sử dụng
                  </span>
                ) : popular ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)] px-3 py-1 text-[11px] font-semibold text-white whitespace-nowrap">
                    <Sparkles size={11} />
                    Tiết kiệm nhất
                  </span>
                ) : null}

                <h2 className="text-xl font-bold text-[var(--color-text-primary)] text-center">
                  {plan.name}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-muted)] min-h-[40px]">
                  {plan.description}
                </p>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-[var(--color-text-primary)]">
                    {formatNumber(plan.priceVnd)}
                    <span className="text-2xl">đ</span>
                  </span>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    / {plan.durationDays} ngày
                  </span>
                </div>

                <div className="my-6 h-px bg-white/10" />

                <ul className="flex flex-col gap-3 mb-8">
                  {FEATURES.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)]"
                    >
                      <Check
                        size={16}
                        className="mt-0.5 flex-shrink-0 text-[var(--color-accent-light)]"
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleBuy(plan.slug)}
                  disabled={loadingSlug !== null}
                  className="mt-auto w-full rounded-md py-3 text-sm font-semibold transition-colors duration-200 cursor-pointer border border-white/15 text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-light)] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {loadingSlug === plan.slug && (
                    <Loader2 size={15} className="animate-spin" />
                  )}
                  {buttonLabel(plan, isCurrent)}
                </button>
              </div>
            </AnimateOnScroll>
          );
        })}
      </div>
    </div>
  );
}
