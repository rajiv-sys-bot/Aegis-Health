"use client";

/**
 * Scroll-reveal wrapper: children fade/slide in the first time they enter
 * the viewport. Pure IntersectionObserver — no animation library.
 * Respects prefers-reduced-motion by showing content immediately.
 */

import { useEffect, useRef, useState } from "react";

type RevealProps = {
  children: React.ReactNode;
  /** Extra transition delay in ms — use to stagger siblings. */
  delay?: number;
  /** Starting vertical offset in px. */
  y?: number;
  className?: string;
};

export function Reveal({ children, delay = 0, y = 24, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => setShown(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translateY(${y}px)`,
        transition: `opacity 700ms cubic-bezier(.22,.61,.36,1) ${delay}ms, transform 700ms cubic-bezier(.22,.61,.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
