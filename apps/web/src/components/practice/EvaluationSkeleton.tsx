import { Sparkles } from "lucide-react";

/**
 * Khung xương hiển thị trong lúc chờ AI chấm điểm — bám đúng layout của
 * AnswerEvaluation (điểm tổng bên trái + 3 thanh điểm) để chuyển cảnh mượt.
 * Hiệu ứng nhấp nháy dùng opacity (không gradient) theo design system.
 */
export default function EvaluationSkeleton() {
  return (
    <section className="px-6 py-6 flex flex-col gap-5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-[#8b5cf6]">
        <Sparkles size={13} className="skeleton-pulse" />
        <span className="skeleton-pulse">AI đang chấm điểm...</span>
      </p>

      <div className="flex items-center gap-5">
        {/* Điểm tổng */}
        <div
          className="flex-shrink-0 rounded-2xl w-[104px] h-[88px] skeleton-pulse"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />

        {/* 3 thanh điểm */}
        <div className="flex-1 flex flex-col gap-3.5 min-w-0">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <span
                className="w-16 h-3 rounded-md flex-shrink-0 skeleton-pulse"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  animationDelay: `${i * 0.18}s`,
                }}
              />
              <span
                className="flex-1 h-2 rounded-full skeleton-pulse"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  animationDelay: `${i * 0.18}s`,
                }}
              />
              <span
                className="w-9 h-3 rounded-md flex-shrink-0 skeleton-pulse"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Khối nhận xét */}
      <div className="flex flex-col gap-2 pl-4 border-l-2 border-[rgba(124,58,237,0.3)]">
        <span
          className="w-full h-3 rounded-md skeleton-pulse"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />
        <span
          className="w-3/4 h-3 rounded-md skeleton-pulse"
          style={{ background: "rgba(255,255,255,0.06)", animationDelay: "0.2s" }}
        />
      </div>
    </section>
  );
}
