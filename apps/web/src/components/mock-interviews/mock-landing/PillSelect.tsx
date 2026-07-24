"use client";

import { ChevronDown } from "lucide-react";

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
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-text-primary">
        {label}
      </span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-12 w-full appearance-none rounded-full border border-white/12 bg-white/[0.07] px-4 pr-10 text-sm font-bold text-white outline-none transition-all duration-300 hover:bg-white/[0.1] focus:border-[#c4b5fd]/50"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#c4b5fd]"
        />
      </span>
    </label>
  );
}
