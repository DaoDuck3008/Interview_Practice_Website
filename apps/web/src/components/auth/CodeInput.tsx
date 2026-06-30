"use client";

import {
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";

const LENGTH = 6;

/**
 * Ô nhập mã OTP 6 chữ số: mỗi chữ số một ô, hỗ trợ dán, xoá lùi và mũi tên.
 * `value` là chuỗi đang nhập; `onChange` trả về chuỗi đã ghép; `onComplete`
 * gọi khi đủ 6 số (để tự submit nếu muốn).
 */
export default function CodeInput({
  value,
  onChange,
  onComplete,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  function focusIndex(i: number) {
    const el = inputs.current[Math.max(0, Math.min(LENGTH - 1, i))];
    el?.focus();
    el?.select();
  }

  function setDigit(i: number, char: string) {
    const next = digits.slice();
    next[i] = char;
    const joined = next.join("").slice(0, LENGTH);
    onChange(joined);
    if (joined.length === LENGTH && !joined.includes("")) onComplete?.(joined);
  }

  function handleChange(i: number, e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setDigit(i, "");
      return;
    }
    // Nếu người dùng gõ/dán nhiều số vào một ô thì rải sang các ô kế tiếp.
    const chars = raw.split("");
    const next = digits.slice();
    let idx = i;
    for (const c of chars) {
      if (idx >= LENGTH) break;
      next[idx] = c;
      idx += 1;
    }
    const joined = next.join("").slice(0, LENGTH);
    onChange(joined);
    focusIndex(idx);
    if (joined.length === LENGTH && !joined.includes("")) onComplete?.(joined);
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        setDigit(i, "");
      } else {
        setDigit(i - 1, "");
        focusIndex(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      focusIndex(i - 1);
    } else if (e.key === "ArrowRight") {
      focusIndex(i + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    onChange(pasted);
    focusIndex(pasted.length);
    if (pasted.length === LENGTH) onComplete?.(pasted);
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.currentTarget.select()}
          className="h-12 w-10 sm:h-14 sm:w-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-center text-xl font-bold text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30 disabled:opacity-50"
        />
      ))}
    </div>
  );
}
