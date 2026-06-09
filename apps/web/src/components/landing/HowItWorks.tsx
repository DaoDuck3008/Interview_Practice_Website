const STEPS = [
  {
    number: "01",
    title: "Chọn Chủ Đề",
    description:
      "Chọn từ JavaScript, Node.js, React, System Design và nhiều hơn nữa. Lọc theo cấp độ Junior, Mid hay Senior.",
  },
  {
    number: "02",
    title: "Trả Lời Câu Hỏi",
    description:
      "Đọc câu hỏi và viết câu trả lời của bạn. Suy nghĩ như trong một buổi phỏng vấn thực sự.",
  },
  {
    number: "03",
    title: "Nhận Phản Hồi AI",
    description:
      "Điểm số tức thì về độ chính xác kỹ thuật, sự đầy đủ và rõ ràng — phân tích chi tiết bằng Tiếng Việt.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="cach-hoat-dong"
      className="relative py-28 overflow-hidden"
      style={{ borderTop: "1px solid rgba(124,58,237,0.2)" }}
    >
      {/* Top glow line */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(124,58,237,0.6), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-[#a78bfa] mb-3">
            Cách hoạt động
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#f4f4f6] tracking-tight">
            Ba bước để tự tin phỏng vấn
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 relative">
          {/* Connector line */}
          <div
            className="hidden md:block absolute top-7 left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] h-px pointer-events-none"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(124,58,237,0.3) 20%, rgba(124,58,237,0.3) 80%, transparent)",
            }}
            aria-hidden="true"
          />

          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className="flex flex-col items-center text-center gap-5 px-6 group"
            >
              <div
                className="relative z-10 w-14 h-14 rounded-full border bg-[#0d0d14] flex items-center justify-center flex-shrink-0 transition-all duration-300"
                style={{
                  borderColor:
                    i === 1 ? "rgba(124,58,237,0.6)" : "rgba(124,58,237,0.25)",
                  boxShadow:
                    i === 1
                      ? "0 0 0 4px rgba(124,58,237,0.08), 0 0 24px rgba(124,58,237,0.25)"
                      : undefined,
                }}
              >
                <span
                  className="text-xs font-bold tracking-wider"
                  style={{ color: "#a78bfa" }}
                >
                  {step.number}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold text-[#f4f4f6]">
                  {step.title}
                </h3>
                <p className="text-sm text-[#606072] leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
