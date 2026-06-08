import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section
      className="py-28 relative overflow-hidden"
      style={{ borderTop: "1px solid rgba(124,58,237,0.15)" }}
    >
      {/* Top glow line */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px pointer-events-none"
        style={{ background: "linear-gradient(to right, transparent, rgba(124,58,237,0.6), transparent)" }}
        aria-hidden="true"
      />
      {/* Strong glow blob */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(88,28,135,0.35) 0%, rgba(49,10,74,0.15) 50%, transparent 75%)",
          filter: "blur(60px)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 flex flex-col items-center text-center gap-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#7c3aed]">
          Bắt đầu ngay hôm nay
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#fafafa] tracking-tight max-w-2xl leading-tight">
          Sẵn sàng chinh phục buổi phỏng vấn tiếp theo?
        </h2>
        <p className="text-base sm:text-lg text-[#a1a1aa] max-w-md">
          Hàng nghìn lập trình viên đang luyện tập thông minh hơn mỗi ngày.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 h-13 px-8 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-base font-semibold rounded-xl transition-all duration-200 cursor-pointer mt-2"
          style={{ boxShadow: "0 0 32px rgba(124,58,237,0.4)" }}
        >
          Tạo Tài Khoản Miễn Phí
          <ArrowRight size={16} />
        </Link>
        <p className="text-sm text-[#52525b]">
          Không cần thẻ tín dụng &nbsp;·&nbsp; Miễn phí vĩnh viễn
        </p>
      </div>
    </section>
  );
}
