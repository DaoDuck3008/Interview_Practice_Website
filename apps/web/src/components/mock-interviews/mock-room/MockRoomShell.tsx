import type { ReactNode } from "react";

// Card glass chính bao quanh câu hỏi và recorder của phòng mock interview.
export function MockQuestionArticle({ children }: { children: ReactNode }) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/[0.05] shadow-[0_18px_70px_rgba(15,23,42,0.34)] backdrop-blur-2xl">
      {children}
    </article>
  );
}

// Nút pill chính dùng cho các hành động lớn trong phòng mock, ví dụ xác nhận nộp bài.
export function PrimaryPillButton({
  children,
  className = "",
  disabled,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-slate-950 shadow-xl shadow-violet-950/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// Nút pill phụ cho thao tác quay lại hoặc hủy trong các panel của phòng mock.
export function SecondaryPillButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.055] px-5 text-sm font-bold text-white/70 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/40 hover:bg-white/[0.09] hover:text-white active:scale-[0.98]"
    >
      {children}
    </button>
  );
}
