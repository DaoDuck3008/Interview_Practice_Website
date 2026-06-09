"use client";

import { useInView } from "react-intersection-observer";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  variant?: "fade-up" | "fade-in" | "fade-left";
  delay?: number;
  className?: string;
}

export function AnimateOnScroll({
  children,
  variant = "fade-up",
  delay = 0,
  className = "",
}: Props) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <div
      ref={ref}
      className={`will-animate will-animate--${variant}${inView ? " is-visible" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
