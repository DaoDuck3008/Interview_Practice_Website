"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { getPlans, type Plan } from "@/lib/api/plans";

const FEATURES = [
  "Truy cập toàn bộ ngân hàng câu hỏi",
  "Chấm điểm AI không giới hạn",
  "Phân tích & viết lại câu trả lời",
  "Dashboard theo dõi tiến bộ",
];

const cardClass =
  "group relative flex flex-col h-full rounded-2xl p-8 backdrop-blur-xl transition-all duration-300";

export default function PricingCards() {
  const [plans, setPlans] = useState<Plan[] | null>(null);

  useEffect(() => {
    getPlans().then(setPlans);
  }, []);

  // "Tiết kiệm nhất" = gói có giá/ngày thấp nhất.
  const popularId =
    plans && plans.length
      ? plans.reduce((best, p) =>
          p.priceVnd / p.durationDays < best.priceVnd / best.durationDays
            ? p
            : best,
        ).id
      : null;

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
    <div className="grid gap-6 md:grid-cols-3 items-stretch">
      {plans.map((plan, i) => {
        const popular = plan.id === popularId;
        return (
          <AnimateOnScroll key={plan.id} variant="fade-up" delay={i * 120}>
            <div
              className={`${cardClass} hover:-translate-y-1 hover:border-[var(--color-accent)] hover:shadow-[0_0_40px_-5px_rgba(124,58,237,0.55)] ${
                popular
                  ? "border border-[var(--color-accent)]/60"
                  : "border border-white/10"
              }`}
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              {popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)] px-3 py-1 text-[11px] font-semibold text-white whitespace-nowrap">
                  <Sparkles size={11} />
                  Tiết kiệm nhất
                </span>
              )}

              <h2 className="text-xl font-bold text-[var(--color-text-primary)] text-center">
                {plan.name}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)] min-h-[40px]">
                {plan.description}
              </p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-[var(--color-text-primary)]">
                  {plan.priceVnd.toLocaleString("vi-VN")}
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
                className="mt-auto w-full rounded-md py-3 text-sm font-semibold transition-colors duration-200 cursor-pointer border border-white/15 text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-light)]"
              >
                Mua ngay
              </button>
            </div>
          </AnimateOnScroll>
        );
      })}
    </div>
  );
}
