"use client";

import type { ReactNode } from "react";
import { useReducedMotion } from "motion/react";

interface PageEnterProps {
  children: ReactNode;
  className?: string;
}

// Đây là 1 lớp đệm style để trang xuất hiện dần dần từ opacity 0 lên 1
export function PageEnter({ children, className = "" }: PageEnterProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={`page-enter ${className}`}
      data-reduced-motion={shouldReduceMotion || undefined}
    >
      {children}
    </div>
  );
}
