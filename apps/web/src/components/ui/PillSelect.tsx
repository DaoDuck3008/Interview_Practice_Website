"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/** Menu chọn dạng pill dùng chung cho các form cần bề mặt glass thay cho select native. */
export default function PillSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: Array<{ value: number; label: string }>;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function selectOption(nextValue: number) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <span className="mb-2 block text-sm font-semibold text-text-primary">
        {label}
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-full items-center justify-between rounded-full border border-white/12 bg-white/[0.07] px-4 text-sm font-bold text-white outline-none transition-all duration-300 hover:bg-white/[0.1] focus:border-[#c4b5fd]/50"
      >
        {selected?.label}
        <ChevronDown
          size={16}
          className={`text-[#c4b5fd] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/12 bg-[#0f172a]/95 p-1.5 shadow-[0_22px_54px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => selectOption(option.value)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors ${active ? "bg-[#7c3aed]/24 text-white" : "text-[#d8d6ea] hover:bg-white/[0.09]"}`}
              >
                {option.label}
                {active && <Check size={15} className="text-[#c4b5fd]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
