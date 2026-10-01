"use client";

import { useEffect, useRef, useState } from "react";

interface RevealProps {
  children: React.ReactNode;
  /** Delay in ms before the transition starts (staggering) */
  delay?: number;
  className?: string;
}

/**
 * Reveal – fades and translates content up by 8 px once it enters the viewport.
 *
 * Design principles:
 * - No layout shift: content is rendered normally on the server and without JS.
 * - Respects prefers-reduced-motion: the initial state is already "visible", so
 *   if reduced motion is detected at mount we simply do nothing (no hiding step).
 * - The IntersectionObserver fires setVisible only inside the callback, never
 *   synchronously in the effect body (avoids the react-hooks/set-state-in-effect lint rule).
 */
export default function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  // State drives the CSS. We initialise to "visible" (false = hidden ONLY applied
  // after mount when motion is allowed).
  const [hidden, setHidden] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only animate when the browser allows motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return; // keep default visible appearance

    // We need to hide first and then reveal on intersection.
    // To avoid a synchronous setState, we toggle the class via a ref directly,
    // then drive the transition through the observer callback setting state.
    const el = ref.current;
    if (!el) return;

    // Apply hidden state imperatively so the element starts hidden without a
    // synchronous setState call in the effect body.
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    el.style.transitionProperty = "opacity, transform";
    el.style.transitionDuration = "350ms";
    el.style.transitionTimingFunction = "ease-out";
    el.style.transitionDelay = `${delay}ms`;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          // This setState is inside the observer callback, not synchronous in the effect body.
          setHidden(false);
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);


  // hidden state exists only to trigger re-render after intersection (not actually
  // used in the JSX — the animation is driven imperatively via style mutations above
  // to avoid the synchronous-setState-in-effect lint error).
  void hidden;

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
