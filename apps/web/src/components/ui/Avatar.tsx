"use client";

import { useState } from "react";

// Bảng màu cố định — chọn theo hash của `seed` (thường là userId) nên mỗi
// user luôn ra cùng 1 màu, không đổi giữa các lần render ("random" nhưng ổn định).
const PALETTE = [
  "#7c3aed",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#8b5cf6",
];

function colorForSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

interface Props {
  name: string;
  avatarUrl?: string | null;
  /** Dùng để chọn màu nền nhất quán khi không có avatarUrl — truyền userId. */
  seed: string;
  sizeClass?: string;
  textClass?: string;
}

/** Avatar dùng chung: hiện ảnh nếu có; nếu thiếu hoặc ảnh lỗi thì fallback về chữ cái đầu + màu nền theo seed. */
export default function Avatar({
  name,
  avatarUrl,
  seed,
  sizeClass = "h-10 w-10",
  textClass = "text-sm",
}: Props) {
  const [errored, setErrored] = useState(false);

  if (avatarUrl && !errored) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setErrored(true)}
        className={`${sizeClass} flex-shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${textClass} flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white`}
      style={{ background: colorForSeed(seed) }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
