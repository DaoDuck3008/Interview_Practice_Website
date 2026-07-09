import { Sparkles } from "lucide-react";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import PricingCards from "@/components/pricing/PricingCards";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Bảng giá — Phỏng vấn IT",
  description:
    "Chọn gói luyện tập phù hợp: mở khóa chấm điểm AI không giới hạn, phân tích cải thiện và theo dõi tiến bộ.",
});

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <AnimateOnScroll variant="fade-up">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-light)] mb-4">
            <Sparkles size={14} />
            Bảng giá
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
            Chọn gói luyện tập phù hợp
          </h1>
          <p className="mt-4 text-[var(--color-text-secondary)]">
            Nâng cấp để mở khóa chấm điểm AI không giới hạn và theo dõi tiến bộ
            của bạn qua từng buổi luyện.
          </p>
        </div>
      </AnimateOnScroll>

      <PricingCards />
    </div>
  );
}
