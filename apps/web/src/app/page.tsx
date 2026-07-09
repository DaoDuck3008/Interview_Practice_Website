import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import TopicsPreview from "@/components/landing/TopicsPreview";
import FeaturesSection from "@/components/landing/FeaturesSection";
import CTASection from "@/components/landing/CTASection";
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
      <main className="flex flex-col flex-1">
        <AnimateOnScroll>
          <Hero />
        </AnimateOnScroll>
        <AnimateOnScroll variant="fade-up">
          <TopicsPreview />
        </AnimateOnScroll>
        <AnimateOnScroll variant="fade-up" delay={80}>
          <HowItWorks />
        </AnimateOnScroll>
        <AnimateOnScroll variant="fade-up">
          <FeaturesSection />
        </AnimateOnScroll>
        <AnimateOnScroll variant="fade-up" delay={60}>
          <CTASection />
        </AnimateOnScroll>
      </main>
      <Footer />
    </>
  );
}
