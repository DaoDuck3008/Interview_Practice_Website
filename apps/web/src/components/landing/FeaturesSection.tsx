"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BrainCircuit, FileSearch, Mic } from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Reveal } from "../ui/Reveal";

const ACTIVE_INTERVAL_MS = 10000;

const FEATURES = [
  {
    id: "answer",
    eyebrow: "Practice flow",
    title: "Trả lời từng câu hỏi",
    cta: "Luyện câu đầu tiên",
    href: "/practice",
    image:
      "/images/landing-redesign/workflow-answer-question-soft-strong-glow.png",
    icon: Mic,
  },
  {
    id: "mock",
    eyebrow: "Mock interview",
    title: "Phỏng vấn thử theo chủ đề",
    cta: "Tạo mock interview",
    href: "/mock-interviews",
    image:
      "/images/landing-redesign/workflow-mock-interview-soft-strong-glow.png",
    icon: BrainCircuit,
  },
  {
    id: "cv",
    eyebrow: "CV analysis",
    title: "Gợi ý câu hỏi theo CV",
    cta: "Phân tích CV ngay",
    href: "/mock-cv",
    image: "/images/landing-redesign/workflow-cv-analysis-soft-strong-glow.png",
    icon: FileSearch,
  },
];

export default function FeaturesSection() {
  const [activeId, setActiveId] = useState(FEATURES[0].id);
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const active =
    FEATURES.find((feature) => feature.id === activeId) ?? FEATURES[0];
  const highlightedFeatureId = hoveredFeatureId ?? active.id;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const activeIndex = FEATURES.findIndex(
        (feature) => feature.id === activeId,
      );
      const nextIndex =
        activeIndex === -1 ? 0 : (activeIndex + 1) % FEATURES.length;

      setActiveId(FEATURES[nextIndex].id);
    }, ACTIVE_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [activeId]);

  return (
    <section
      id="tinh-nang"
      className="relative isolate overflow-hidden bg-[#0f172a] py-14 text-white shadow-[0_22px_90px_rgba(2,6,23,0.34)]"
    >
      <Image
        key={active.id}
        src={active.image}
        alt=""
        fill
        sizes="100vw"
        className="pointer-events-none object-cover object-center"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto min-h-[620px] max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-[620px] max-w-xl flex-col justify-center py-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#c4b5fd]">
            Luồng luyện tập
          </p>
          <h2 className="text-edge-fade landing-heading-gradient text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
            Mỗi chức năng là một cách chuẩn bị khác nhau
          </h2>
          <p className="mt-4 max-w-lg text-pretty leading-8 text-white">
            Chọn một luồng luyện tập để xem hình minh họa workflow tương ứng.
          </p>

          <LayoutGroup id="landing-feature-navigation">
            <div
              className="mt-8 grid gap-3"
              onPointerLeave={() => setHoveredFeatureId(null)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setHoveredFeatureId(null);
                }
              }}
            >
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                const selected = feature.id === active.id;
                const highlighted = feature.id === highlightedFeatureId;
                return (
                  <Reveal
                    key={feature.id}
                    preset="control"
                    className="block w-full max-w-[25rem]"
                    delay={index * 90}
                    variant="fade-left"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveId(feature.id)}
                      onPointerEnter={() => setHoveredFeatureId(feature.id)}
                      onFocus={() => setHoveredFeatureId(feature.id)}
                      aria-pressed={selected}
                      className={`group relative flex h-14 w-full items-center gap-3 overflow-hidden rounded-full border px-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_44px_rgba(91,33,182,0.16)] transition-[border-color,box-shadow] duration-300 active:scale-[0.985] ${
                        selected
                          ? "border-[#ddd6fe]/70 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_18px_52px_rgba(124,58,237,0.25)]"
                          : "border-white/15 text-white"
                      }`}
                    >
                      {highlighted ? (
                        <motion.span
                          layoutId="landing-feature-indicator"
                          className={`pointer-events-none absolute inset-0 rounded-full ${
                            selected ? "bg-[#292447]/95" : "bg-[#202641]/92"
                          }`}
                          transition={
                            shouldReduceMotion
                              ? { duration: 0 }
                              : {
                                  type: "spring",
                                  stiffness: 420,
                                  damping: 34,
                                  mass: 0.55,
                                }
                          }
                        />
                      ) : null}
                      {selected ? (
                        <span className="feature-tab-progress pointer-events-none absolute bottom-0 left-0 z-10 h-px w-full bg-gradient-to-r from-transparent via-[#ddd6fe] to-transparent" />
                      ) : null}
                      <span
                        className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-[transform,background-color,border-color,box-shadow] duration-300 group-hover:scale-110 ${
                          selected || highlighted
                            ? "border-[#ddd6fe]/60 bg-white/[0.18] text-white shadow-[0_0_24px_rgba(196,181,253,0.28)]"
                            : "border-white/15 bg-white/[0.08] text-[#efe7ff]"
                        }`}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="relative z-10 min-w-0 truncate text-sm font-bold text-white sm:text-white">
                        {feature.title}
                      </span>
                    </button>
                  </Reveal>
                );
              })}
            </div>
          </LayoutGroup>

          <Reveal preset="control" delay={320} variant="fade-left">
            <Link
              href={active.href}
              className="mt-7 inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full border border-white/20 bg-[#26223f] px-5 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_28px_rgba(167,139,250,0.24)] transition-[transform,background-color,border-color] duration-300 hover:-translate-y-1 hover:border-[#ddd6fe]/65 hover:bg-[#342d58] active:scale-[0.98]"
            >
              {active.cta}
              <ArrowRight size={15} />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
