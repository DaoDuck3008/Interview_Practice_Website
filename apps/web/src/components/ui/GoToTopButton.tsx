"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

const SCROLL_THRESHOLD = 480;

export default function GoToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function updateVisibility() {
      const shouldShow = window.scrollY > SCROLL_THRESHOLD;
      setVisible((current) => (current === shouldShow ? current : shouldShow));
    }

    window.addEventListener("scroll", updateVisibility, { passive: true });
    updateVisibility();

    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  function scrollToTop() {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Lên đầu trang"
      title="Lên đầu trang"
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-4 right-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#171d31] text-[#d4d4e0] shadow-[0_18px_44px_rgba(2,6,23,0.34)] transition-[opacity,transform,background-color,border-color,color] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] hover:-translate-y-0.5 hover:border-[#c4b5fd]/50 hover:bg-[#232b46] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4b5fd]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] active:scale-95 sm:bottom-36 sm:h-11 sm:w-11 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <ArrowUp size={18} />
    </button>
  );
}
