"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Check, BadgeCheck, Sparkles, Loader2, Info } from "lucide-react";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { getPlans, type Plan } from "@/lib/api/plans";
import { createCheckout } from "@/lib/api/payments";
import {
  getMySubscription,
  type MySubscription,
} from "@/lib/api/subscriptions";
import { useAuthStore } from "@/stores/auth.store";
import { toastApiError } from "@/lib/utils/apiError";
import { formatDay, formatNumber } from "@/lib/utils/format";

const FEATURES = [
  "Truy cập toàn bộ ngân hàng câu hỏi",
  "Chấm điểm AI không giới hạn",
  "Phân tích và viết lại câu trả lời",
  "Dashboard theo dõi tiến bộ",
];

const DAY_MS = 24 * 60 * 60 * 1000;

const cardClass =
  "pricing-card-push-in group relative flex h-full flex-col rounded-[28px] border p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_70px_rgba(2,6,23,0.22)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1";

export default function PricingCards() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [sub, setSub] = useState<MySubscription | null>(null);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    getPlans().then(setPlans);
  }, []);

  useEffect(() => {
    if (user) getMySubscription().then(setSub);
    else queueMicrotask(() => setSub(null));
  }, [user]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  async function handleBuy(slug: string) {
    if (loadingSlug) return;

    if (!user) {
      toast.info("Vui lòng đăng nhập để mua gói.");
      router.push(`/login?redirect=${encodeURIComponent("/pricing")}`);
      return;
    }

    if (hasActiveSub) {
      toast.info("Gói hiện tại vẫn còn hiệu lực. Bạn có thể mua lại sau khi hết hạn.");
      return;
    }

    setLoadingSlug(slug);
    try {
      const order = await createCheckout(slug);
      router.push(`/pricing/checkout/${order.id}`);
    } catch (error) {
      toastApiError(
        error,
        "Không tạo được đơn thanh toán. Vui lòng thử lại.",
      );
      setLoadingSlug(null);
    }
  }

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
        Math.ceil((new Date(sub!.expiresAt).getTime() - now) / DAY_MS),
      )
    : 0;
  const expiryStr = hasActiveSub ? formatDay(sub!.expiresAt) : "";

  function buttonLabel() {
    return hasActiveSub ? "Đang có gói hiệu lực" : "Mua ngay";
  }

  if (!plans) {
    return (
      <div className="grid items-stretch gap-5 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${cardClass} skeleton-pulse min-h-[420px] border-white/10 bg-white/[0.055]`}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      {hasActiveSub && (
        <div className="mb-8 flex items-start gap-3 rounded-[24px] border border-[#c4b5fd]/25 bg-[#0f172a]/34 p-4 text-sm text-[#cbd5e1] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
          <Info size={18} className="mt-0.5 flex-shrink-0 text-[#c4b5fd]" />
          <p>
            Bạn đang dùng gói{" "}
            <span className="font-semibold text-white">{sub!.plan.name}</span>{" "}
            · còn <span className="font-semibold">{remainingDays}</span> ngày
            (hết hạn {expiryStr}). Bạn có thể mua gói mới sau khi gói hiện tại
            hết hạn.
          </p>
        </div>
      )}

      <div className="grid items-stretch gap-5 md:grid-cols-3">
        {plans.map((plan, i) => {
          const popular = plan.id === popularId;
          const isCurrent = hasActiveSub && sub!.plan.slug === plan.slug;

          return (
            <AnimateOnScroll key={plan.id} variant="fade-up" delay={i * 120}>
              <div
                className={`${cardClass} ${
                  isCurrent
                    ? "border-[#22c55e]/45"
                    : popular
                      ? "border-[#c4b5fd]/42"
                      : "border-white/[0.13]"
                }`}
                style={{
                  background: popular
                    ? "linear-gradient(180deg, rgba(124,58,237,0.22), rgba(15,23,42,0.24))"
                    : "rgba(15, 23, 42, 0.28)",
                  animationDelay: `${i * 110}ms`,
                }}
              >
                {isCurrent ? (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-[#22c55e]/35 bg-[#0f172a]/80 px-3 py-1 text-[11px] font-semibold text-[#86efac] backdrop-blur-xl">
                    <BadgeCheck size={12} />
                    Đang sử dụng
                  </span>
                ) : popular ? (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-[#c4b5fd]/35 bg-[#7c3aed]/55 px-3 py-1 text-[11px] font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.24)] backdrop-blur-xl">
                    <Sparkles size={11} />
                    Tiết kiệm nhất
                  </span>
                ) : null}

                <h2 className="text-center text-xl font-bold text-[#f4f4f6]">
                  {plan.name}
                </h2>
                <p className="mt-2 min-h-[42px] text-sm leading-6 text-[#94a3b8]">
                  {plan.description}
                </p>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-[#f4f4f6]">
                    {formatNumber(plan.priceVnd)}
                    <span className="text-2xl">đ</span>
                  </span>
                  <span className="text-sm text-[#94a3b8]">
                    / {plan.durationDays} ngày
                  </span>
                </div>

                <div className="my-6 h-px bg-white/10" />

                <ul className="mb-8 flex flex-col gap-3">
                  {FEATURES.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm leading-6 text-[#cbd5e1]"
                    >
                      <Check
                        size={16}
                        className="mt-1 flex-shrink-0 text-[#c4b5fd]"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleBuy(plan.slug)}
                  disabled={loadingSlug !== null || hasActiveSub}
                  className="mt-auto inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.065] px-4 py-3 text-sm font-semibold text-[#f4f4f6] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c4b5fd]/45 hover:bg-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingSlug === plan.slug && (
                    <Loader2 size={15} className="animate-spin" />
                  )}
                  {buttonLabel()}
                </button>
              </div>
            </AnimateOnScroll>
          );
        })}
      </div>
    </div>
  );
}
