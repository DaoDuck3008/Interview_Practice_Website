import { Sparkles } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import PricingCards from "@/components/pricing/PricingCards";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Bảng giá - Phỏng vấn IT",
  description:
    "Chọn gói luyện tập phù hợp: mở khóa chấm điểm AI không giới hạn, phân tích cải thiện và theo dõi tiến bộ.",
});

export default function PricingPage() {
  return (
    <div className="performance-page mx-auto flex min-h-[calc(100vh-96px)] max-w-6xl flex-col px-4 py-4 md:py-6">
      <Reveal variant="fade-up">
        <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#c4b5fd]/18 bg-[#10111a] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#c4b5fd]">
            <Sparkles size={14} />
            Bảng giá
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#f4f4f6] md:text-4xl">
            Chọn gói luyện tập phù hợp
          </h1>
        </div>
      </Reveal>

      <PricingCards />
    </div>
  );
}
