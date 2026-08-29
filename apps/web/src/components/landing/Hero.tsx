import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import TopicsPreview from "./TopicsPreview";
import { FlyInOnView } from "../ui/FlyInOnView";

export default async function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0f172a] pt-16 text-white shadow-[0_22px_90px_rgba(2,6,23,0.36)]">
      <div className="absolute inset-0">
        <Image
          src="/images/landing-redesign/landing-hero-soft-strong-glow.png"
          alt=""
          fill
          className="object-cover object-center"
          priority
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-12rem)] max-w-7xl items-center px-4 pb-12 pt-20 sm:px-6 lg:pb-14 lg:pt-24">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-[#1a2036]/90 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
            style={{ boxShadow: "0 0 28px rgba(124,58,237,0.18)" }}
          >
            <Sparkles size={14} className="text-[#c4b5fd]" />
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#c4b5fd]">
              Phản hồi từ AI
            </span>
          </div>

          <h1 className="text-edge-fade max-w-4xl text-balance text-[2.45rem] font-extrabold leading-[1.04] tracking-tight text-[#f4f4f6] sm:text-6xl lg:text-[5.2rem]">
            <span>Chinh phục mọi</span>
            <span className="flex flex-wrap justify-center gap-x-[0.28em]">
              <span
                className="text-[#c4b5fd]"
                style={{ textShadow: "0 0 42px rgba(167,139,250,0.42)" }}
              >
                buổi phỏng vấn
              </span>
              <span>IT</span>
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-pretty leading-8 text-[#d6d2e5] sm:text-lg">
            Luyện tập câu hỏi phỏng vấn thực tế theo chủ đề và cấp độ. Nhận điểm
            số và phân tích chi tiết từ AI ngay lập tức bằng Tiếng Việt.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <FlyInOnView className="w-full sm:w-auto" delay={80}>
              <Link
                href="/learning/javascript/questions"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#6240c7] px-8 font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_32px_rgba(124,58,237,0.32)] transition-[transform,background-color,border-color] duration-300 hover:-translate-y-1 hover:border-[#8b5cf6]/60 hover:bg-[#7049d8] active:scale-[0.98] sm:w-auto"
              >
                Bắt đầu học
                <ArrowRight size={16} />
              </Link>
            </FlyInOnView>
            <FlyInOnView className="w-full sm:w-auto" delay={180}>
              <Link
                href="/practice"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-[#171a28] px-8 font-semibold text-[#f4f4f6] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-[transform,background-color,border-color] duration-300 hover:-translate-y-1 hover:border-[#8b5cf6]/45 hover:bg-[#22263a] active:scale-[0.98] sm:w-auto"
              >
                Luyện tập ngay
                <ArrowRight size={16} />
              </Link>
            </FlyInOnView>
          </div>

          <p className="mt-5 text-sm font-medium text-[#c4b5fd]">
            300+ câu hỏi · Miễn phí để bắt đầu
          </p>
        </div>
      </div>

      <TopicsPreview />
    </section>
  );
}
