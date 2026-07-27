import { SquareArrowOutUpRight } from "lucide-react";

export default function CvQuestionCta() {
  return (
    <section
      aria-label="Tạo câu hỏi phỏng vấn từ CV"
      className="relative mt-5 hidden w-full overflow-hidden rounded-[14px] border border-white/10 bg-[#0f172a] bg-cover bg-[position:58%_center] shadow-[0_18px_46px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.16)] md:flex md:rounded-[18px]"
      style={{
        backgroundImage: "url(/images/mock-interviews/cv-question-cta-bg.png)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(221,214,254,0.15),transparent_35%)]" />

      <div className="relative flex w-[52%] min-w-0 flex-col justify-center px-7 py-2.5 lg:px-8">
        <p className="mb-1 text-[11px] font-bold leading-4 tracking-[0.02em] text-[#ddd6fe]">
          CV Interview Builder
        </p>

        <h2 className="landing-heading-gradient text-edge-fade w-full whitespace-nowrap text-[clamp(1.125rem,1.55vw,1.5rem)] font-extrabold leading-[1.16] tracking-normal">
          Tạo câu hỏi phỏng vấn từ CV
        </h2>

        <button
          type="button"
          className="mt-3 inline-flex w-fit cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(135deg,#8b5cf6,#7c3aed)] px-3 py-1 text-[12px] font-extrabold text-white shadow-[0_10px_20px_rgba(124,58,237,0.3)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
        >
          Bắt đầu tạo câu hỏi
          <SquareArrowOutUpRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
