import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* ── Hero background image ── */}
      <div className="absolute inset-0">
        <Image
          src="/hero-bg.png"
          alt=""
          fill
          className="object-cover object-center"
          style={{ opacity: 0.5 }}
          priority
        />
        {/* Dissolve image toward edges, match new body bg */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 65% 55% at 50% 50%, transparent 15%, #06060c 75%)",
          }}
        />
      </div>

      {/* ── Glow layers (inspired by example.jpg spotlight technique) ── */}

      {/* Outer halo — wide, low opacity purple wash */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 45%, rgba(88,28,135,0.35) 0%, rgba(49,10,74,0.15) 50%, transparent 75%)",
        }}
        aria-hidden="true"
      />

      {/* Inner spotlight — concentrated bright core */}
      <div
        className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[320px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(109,40,217,0.55) 0%, rgba(124,58,237,0.25) 45%, transparent 75%)",
          filter: "blur(48px)",
        }}
        aria-hidden="true"
      />

      {/* Top-center rim light — thin bright streak like example */}
      <div
        className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[320px] h-[120px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(167,139,250,0.3) 0%, transparent 70%)",
          filter: "blur(32px)",
        }}
        aria-hidden="true"
      />

      {/* ── Content ── */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-24 flex flex-col items-center text-center gap-7">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7c3aed]/20 border border-[#7c3aed]/50"
          style={{
            boxShadow:
              "0 0 20px rgba(124,58,237,0.25), inset 0 1px 0 rgba(167,139,250,0.15)",
          }}
        >
          <Sparkles size={13} className="text-[#c4b5fd]" />
          <span className="text-xs font-bold text-[#c4b5fd] tracking-widest uppercase">
            Phản Hồi Từ AI
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-[4.5rem] font-extrabold leading-[1.07] tracking-tight text-[#f4f4f6]">
          Chinh Phục Mọi
          <br />
          <span
            className="text-[#a78bfa]"
            style={{ textShadow: "0 0 40px rgba(167,139,250,0.4)" }}
          >
            Buổi Phỏng Vấn
          </span>{" "}
          IT
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-[#9898aa] leading-relaxed max-w-xl">
          Luyện tập câu hỏi phỏng vấn thực tế theo chủ đề và cấp độ. Nhận điểm
          số &amp; phân tích chi tiết từ AI ngay lập tức bằng Tiếng Việt.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-1">
          <Link
            href="/practice"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-base font-bold rounded-xl transition-all duration-200 cursor-pointer"
            style={{
              boxShadow:
                "0 0 28px rgba(124,58,237,0.5), 0 1px 0 rgba(167,139,250,0.3) inset",
            }}
          >
            Bắt Đầu Luyện Tập
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Social proof */}
        <p className="text-sm text-[#a78bfa] mt-2 tracking-wide">
          300+ câu hỏi &nbsp;·&nbsp; 3 cấp độ (Common / Medium / Hard)
          &nbsp;·&nbsp; Miễn phí
        </p>
      </div>

      {/* Bottom fade — matches body bg #06060c */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, #06060c)",
        }}
        aria-hidden="true"
      />
    </section>
  );
}
