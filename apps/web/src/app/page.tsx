import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/landing/Hero";
import FeaturesSection from "@/components/landing/FeaturesSection";
import QuestionBankShowcase from "@/components/landing/QuestionBankShowcase";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Phỏng vấn IT — Luyện tập phỏng vấn IT với AI",
  description:
    "Luyện tập câu hỏi phỏng vấn IT theo chủ đề, ghi âm câu trả lời và nhận phản hồi AI để cải thiện kỹ năng phỏng vấn.",
});

export default function HomePage() {
  return (
    <>
      <Header />
      <main
        className="flex flex-col flex-1 bg-[#0f172a] text-white"
      >
        <AnimateOnScroll>
          <Hero />
        </AnimateOnScroll>
        <AnimateOnScroll variant="fade-up">
          <FeaturesSection />
        </AnimateOnScroll>
        <AnimateOnScroll variant="fade-up" delay={60}>
          <QuestionBankShowcase />
        </AnimateOnScroll>
      </main>
      <Footer />
    </>
  );
}
