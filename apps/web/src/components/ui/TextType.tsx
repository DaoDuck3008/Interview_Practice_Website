"use client";

import {
  type ElementType,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

type TextTypeProps<T extends ElementType = "div"> = {
  text: string | string[];
  as?: T;
  typingSpeed?: number;
  initialDelay?: number;
  pauseDuration?: number;
  deletingSpeed?: number;
  loop?: boolean;
  replayInterval?: number;
  startOnVisible?: boolean;
  showCursor?: boolean;
  cursorCharacter?: string;
  className?: string;
  cursorClassName?: string;
};

export default function TextType<T extends ElementType = "div">({
  text,
  as,
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = true,
  replayInterval,
  startOnVisible = false,
  showCursor = true,
  cursorCharacter = "|",
  className = "",
  cursorClassName = "",
}: TextTypeProps<T>) {
  const Component = as ?? "div";
  const sentences = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);
  const fullText = sentences.join(" ");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [started, setStarted] = useState(!startOnVisible);
  const [cycle, setCycle] = useState(0);
  const [displayText, setDisplayText] = useState(() =>
    prefersReducedMotion ? (sentences[0] ?? "") : "",
  );
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const visibleText = prefersReducedMotion ? (sentences[0] ?? "") : displayText;

  useEffect(() => {
    if (!startOnVisible || started) return;
    const node = wrapperRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [startOnVisible, started]);

  useEffect(() => {
    if (prefersReducedMotion || !started || !replayInterval) return;

    const interval = window.setInterval(() => {
      setCycle((value) => value + 1);
      setSentenceIndex(0);
      setIsDeleting(false);
      setDisplayText("");
    }, replayInterval);

    return () => window.clearInterval(interval);
  }, [prefersReducedMotion, replayInterval, started]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (!started) return;

    const current = sentences[sentenceIndex] ?? "";
    const isComplete = displayText === current;
    const isEmpty = displayText.length === 0;
    const shouldStop = !loop && !isDeleting && isComplete;

    if (shouldStop) return;

    const delay =
      isComplete && loop
        ? pauseDuration
        : isDeleting
          ? deletingSpeed
          : displayText.length === 0
            ? initialDelay
            : typingSpeed;

    const timeout = window.setTimeout(() => {
      if (isComplete) {
        setIsDeleting(true);
        return;
      }

      if (isDeleting && isEmpty) {
        setIsDeleting(false);
        setSentenceIndex((index) => (index + 1) % sentences.length);
        return;
      }

      setDisplayText((currentText) =>
        isDeleting
          ? currentText.slice(0, -1)
          : current.slice(0, currentText.length + 1),
      );
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [
    cycle,
    deletingSpeed,
    displayText,
    initialDelay,
    isDeleting,
    loop,
    pauseDuration,
    prefersReducedMotion,
    sentenceIndex,
    sentences,
    started,
    typingSpeed,
  ]);

  return (
    <div ref={wrapperRef} className="inline-block w-full">
      <Component aria-label={fullText} className={className}>
        <span aria-hidden="true">{visibleText || "\u00a0"}</span>
        {showCursor && (
          <span
            aria-hidden="true"
            className={`text-type-cursor ${cursorClassName}`}
          >
            {cursorCharacter}
          </span>
        )}
      </Component>
    </div>
  );
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    () => {
      if (typeof window === "undefined") return false;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    },
    () => false,
  );
}
