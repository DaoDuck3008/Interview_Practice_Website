import { Database, BarChart2, Cpu, Mic } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section
      id="tinh-nang"
      className="py-28 relative overflow-hidden"
      style={{ borderTop: "1px solid rgba(124,58,237,0.15)" }}
    >
      {/* Top glow line */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(124,58,237,0.55), transparent)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[160px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(88,28,135,0.22) 0%, transparent 70%)",
          filter: "blur(30px)",
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[#7c3aed] mb-3">
            Tính năng
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#fafafa] tracking-tight">
            Tất cả những gì bạn cần để chuẩn bị
          </h2>
        </div>

        {/*
          Bento layout (desktop 3 cols):
          ┌─────────────────────┬──────────┐
          │  AI Chấm Điểm       │ 300+ Câu │  row 1
          │  (2 cols, 2 rows)   ├──────────┤
          │                     │ 3 Cấp Độ │  row 2
          ├──────────┬──────────┴──────────┤
          │ Ghi Âm (3 cols, shorter)       │  row 3
          └────────────────────────────────┘
        */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* AI Scoring — prominent, 2 cols wide & 2 rows tall */}
          <div
            className="group relative flex flex-col justify-between gap-6 p-7 rounded-2xl border border-[#1c1c28] bg-[#0d0d14] md:col-span-2 md:row-span-2 min-h-[260px] overflow-hidden hover:border-[#7c3aed]/40 transition-all duration-300"
            style={{
              boxShadow: "inset 0 0 60px rgba(124,58,237,0.04)",
            }}
          >
            {/* Background glow inside card */}
            <div
              className="absolute bottom-0 left-0 w-[300px] h-[200px] rounded-full blur-3xl pointer-events-none transition-all duration-500 group-hover:opacity-100 opacity-50"
              style={{ background: "rgba(124,58,237,0.08)" }}
              aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#13131c] border border-[#222232] flex items-center justify-center group-hover:border-[#7c3aed]/50 transition-colors duration-300">
                <Cpu size={20} className="text-[#8b5cf6]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#fafafa] mb-2">
                  Chấm Điểm AI
                </h3>
                <p className="text-sm text-[#71717a] leading-relaxed max-w-md">
                  Phản hồi tức thì về độ chính xác kỹ thuật, sự đầy đủ và rõ
                  ràng của câu trả lời — được phân tích bởi DeepSeek AI bằng
                  Tiếng Việt.
                </p>
              </div>
            </div>

            {/* Score preview */}
            <div className="relative z-10 grid grid-cols-3 gap-3">
              {[
                { label: "Kỹ thuật", value: "8/10" },
                { label: "Đầy đủ", value: "9/10" },
                { label: "Rõ ràng", value: "7/10" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col gap-1 p-3 rounded-xl bg-[#13131c] border border-[#1c1c28]"
                >
                  <span className="text-xs text-[#71717a]">{item.label}</span>
                  <span
                    className="text-lg font-bold text-[#8b5cf6]"
                    style={{ textShadow: "0 0 12px rgba(139,92,246,0.4)" }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 300+ Questions */}
          <div className="group flex flex-col gap-4 p-6 rounded-2xl border border-[#1c1c28] bg-[#0d0d14] hover:border-[#7c3aed]/30 hover:bg-[#13131c] transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-[#13131c] border border-[#222232] flex items-center justify-center group-hover:border-[#7c3aed]/50 transition-colors duration-300">
              <Database size={20} className="text-[#8b5cf6]" />
            </div>
            <div>
              <p
                className="text-3xl font-extrabold text-[#fafafa] mb-1"
                style={{ textShadow: "0 0 20px rgba(139,92,246,0.3)" }}
              >
                300+
              </p>
              <h3 className="text-base font-bold text-[#fafafa] mb-1.5">
                Câu Hỏi Thực Tế
              </h3>
              <p className="text-sm text-[#71717a] leading-relaxed">
                Ngân hàng câu hỏi từ các công ty công nghệ hàng đầu, liên tục
                cập nhật.
              </p>
            </div>
          </div>

          {/* 3 Levels */}
          <div className="group flex flex-col gap-4 p-6 rounded-2xl border border-[#1c1c28] bg-[#0d0d14] hover:border-[#7c3aed]/30 hover:bg-[#13131c] transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-[#13131c] border border-[#222232] flex items-center justify-center group-hover:border-[#7c3aed]/50 transition-colors duration-300">
              <BarChart2 size={20} className="text-[#8b5cf6]" />
            </div>
            <div>
              <div className="flex gap-1.5 mb-2">
                {["Common", "Medium", "Hard"].map((lvl) => (
                  <span
                    key={lvl}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#1c1c28] bg-[#13131c] text-[#a1a1aa]"
                  >
                    {lvl}
                  </span>
                ))}
              </div>
              <h3 className="text-base font-bold text-[#fafafa] mb-1.5">
                3 Cấp Độ
              </h3>
              <p className="text-sm text-[#71717a] leading-relaxed">
                Luyện đúng vị trí bạn đang ứng tuyển. Tiến bộ theo từng cấp độ.
              </p>
            </div>
          </div>

          {/* Voice Recording — full width, short */}
          <div className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-5 p-6 rounded-2xl border border-[#1c1c28] bg-[#0d0d14] md:col-span-3 overflow-hidden hover:border-[#7c3aed]/20 transition-all duration-300">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#13131c] border border-[#222232] flex items-center justify-center">
              <Mic size={20} className="text-[#71717a]" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <div className="flex-1">
                <h3 className="text-base font-bold text-[#71717a] mb-0.5">
                  Ghi Âm Giọng Nói
                </h3>
                <p className="text-sm text-[#52525b]">
                  Luyện trả lời bằng giọng nói như phỏng vấn thực sự. AI chuyển
                  giọng nói thành văn bản và chấm điểm.
                </p>
              </div>
              <span className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-[#7c3aed]/30 text-[#8b5cf6] bg-[#7c3aed]/8">
                Sắp Ra Mắt
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
