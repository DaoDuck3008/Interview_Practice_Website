import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "../ui/Reveal";

export default function QuestionBankShowcase() {
  return (
    <section className="relative isolate overflow-hidden border-white/[0.08] bg-[#0f172a] py-14 text-white shadow-[0_22px_90px_rgba(2,6,23,0.34)]">
      <Image
        src="/images/landing-redesign/question-bank-soft-strong-glow.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto min-h-[620px] max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-[620px] max-w-xl flex-col justify-center py-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#ddd6fe]">
            Ngân hàng câu hỏi
          </p>
          <h2 className="text-edge-fade landing-heading-gradient max-w-xl text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
            Tìm nhanh câu hỏi theo công nghệ, cấp độ và chủ đề
          </h2>
          <p className="mt-5 max-w-lg text-pretty leading-8 text-white">
            Bộ câu hỏi được gom theo backend, frontend, database, DSA và system
            design để bạn luyện đúng phần còn yếu trước vòng phỏng vấn.
          </p>

          <Reveal preset="control" delay={120} variant="fade-left">
            <Link
              href="/learning/javascript/questions"
              className="mt-8 inline-flex h-12 w-fit items-center justify-center gap-2 rounded-full border border-white/20 bg-[#26223f] px-6 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_30px_rgba(167,139,250,0.24)] transition-[transform,background-color,border-color] duration-300 hover:-translate-y-1 hover:border-[#ddd6fe]/65 hover:bg-[#342d58] active:scale-[0.98]"
            >
              Khám phá câu hỏi
              <ArrowRight size={15} />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
