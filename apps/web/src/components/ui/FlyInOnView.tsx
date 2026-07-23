"use client";

import { ReactNode } from "react";
import { useInView } from "react-intersection-observer";

type FlyDirection = "up" | "left" | "right";

interface FlyInOnViewProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: FlyDirection;
}

const DIRECTION_CLASSES: Record<FlyDirection, string> = {
  up: "translate-y-5",
  left: "-translate-x-6",
  right: "translate-x-6",
};

export function FlyInOnView({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: FlyInOnViewProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.35,
    rootMargin: "0px 0px -8% 0px",
  });

  return (
    <span
      ref={ref}
      className={`inline-flex transition-[opacity,transform,filter] duration-700 ease-out ${
        inView
          ? "translate-x-0 translate-y-0 opacity-100 blur-0"
          : `${DIRECTION_CLASSES[direction]} opacity-0 blur-sm`
      } ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </span>
  );
}
