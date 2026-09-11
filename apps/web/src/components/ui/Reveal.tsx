"use client";

import type { ReactNode } from "react";
import { useInView } from "react-intersection-observer";

type RevealVariant = "fade-up" | "fade-in" | "fade-left" | "fade-right";
type RevealPreset = "section" | "control";

interface RevealProps {
  children: ReactNode;
  variant?: RevealVariant;
  preset?: RevealPreset;
  delay?: number;
  threshold?: number;
  rootMargin?: string;
  className?: string;
}

const PRESETS: Record<
  RevealPreset,
  { threshold: number; rootMargin: string }
> = {
  section: { threshold: 0.1, rootMargin: "0px" },
  control: { threshold: 0.35, rootMargin: "0px 0px -8% 0px" },
};

export function Reveal({
  children,
  variant = "fade-up",
  preset = "section",
  delay = 0,
  threshold,
  rootMargin,
  className = "",
}: RevealProps) {
  const config = PRESETS[preset];
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: threshold ?? config.threshold,
    rootMargin: rootMargin ?? config.rootMargin,
  });
  const revealClassName = `reveal reveal--${preset} reveal--${variant}${
    inView ? " is-visible" : ""
  } ${className}`;
  const style = delay ? { transitionDelay: `${delay}ms` } : undefined;

  if (preset === "control") {
    return (
      <span ref={ref} className={`inline-flex ${revealClassName}`} style={style}>
        {children}
      </span>
    );
  }

  return (
    <div ref={ref} className={revealClassName} style={style}>
      {children}
    </div>
  );
}
