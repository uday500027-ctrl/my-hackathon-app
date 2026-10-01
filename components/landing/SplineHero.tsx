"use client";

import dynamic from "next/dynamic";
import {
  Component,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const SCENE_URL = "https://prod.spline.design/7x4KcKu0nANtKjx5/scene.splinecode";

// Loaded only in the client bundle — no SSR (Spline uses browser APIs)
const SplineScene = dynamic(
  () => import("@splinetool/react-spline"),
  { ssr: false }
);

type LoadState = "idle" | "loading" | "loaded" | "error";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: () => void;
}

class SplineErrorBoundary extends Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Log nothing sensitive
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const emptySubscribe = () => () => {};

function getIsTouchSnapshot(): boolean {
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0
  );
}

function useIsTouchDevice(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    getIsTouchSnapshot,
    () => false
  );
}

function shouldUseFallback(): boolean {
  if (typeof window === "undefined") return true;
  if (window.innerWidth < 768) return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const conn = nav.connection;
  if (conn) {
    if (conn.saveData) return true;
    if (conn.effectiveType && ["slow-2g", "2g", "3g"].includes(conn.effectiveType)) return true;
  }
  return false;
}

export default function SplineHero() {
  // Default: show fallback on first paint (SSR / hydration)
  const [useFallback, setUseFallback] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const isTouchDevice = useIsTouchDevice();
  const containerRef = useRef<HTMLDivElement>(null);
  const splineMountedRef = useRef(false);

  useEffect(() => {
    // Evaluate fallback conditions after mount
    if (shouldUseFallback()) return;

    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let preflightController: AbortController | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Mount only when in view
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !splineMountedRef.current) {
          splineMountedRef.current = true;
          observer.disconnect();

          // Preflight the scene URL before mounting Spline
          preflightController = new AbortController();
          timeoutId = setTimeout(() => {
            preflightController?.abort();
          }, 6000);

          fetch(SCENE_URL, {
            method: "GET",
            cache: "force-cache",
            signal: preflightController.signal,
          })
            .then((res) => {
              if (timeoutId) clearTimeout(timeoutId);
              if (cancelled) return;
              if (res.ok) {
                setSceneReady(true);
                setUseFallback(false);
                setLoadState("loading");
              }
              // If !res.ok: stay on static fallback, never mount Spline
            })
            .catch(() => {
              if (timeoutId) clearTimeout(timeoutId);
              // On any failure: stay on static fallback, never mount Spline
            });
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      preflightController?.abort();
      observer.disconnect();
    };
  }, []);

  function handleLoad() {
    setLoadState("loaded");
  }

  function handleError() {
    setLoadState("error");
    setUseFallback(true);
    setSceneReady(false);
  }

  const isLoaded = sceneReady && !useFallback && loadState === "loaded";
  const fallbackOpacity = isLoaded ? 0 : 0.2;
  const sceneOpacity = isLoaded ? 1 : 0;

  return (
    /*
     * Root element: "absolute inset-0 -z-0 h-full w-full overflow-hidden bg-[#0a0a0a]"
     * with aria-hidden="true". No aspect ratio, max-height or rounded corners.
     */
    <div
      ref={containerRef}
      className="absolute inset-0 -z-0 h-full w-full overflow-hidden bg-[#0a0a0a]"
      aria-hidden="true"
    >
      {/* ── Fallback layer ────────────────────────────────────────────────────
          Dark static background: render /hero-fallback.svg as an <img> with
          "absolute inset-0 h-full w-full object-cover opacity-20" on top of #0a0a0a root.
          Cross-fades to the scene on onLoad with a 300ms opacity transition.
          No layout shift.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-fallback.svg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-20 transition-opacity duration-300 pointer-events-none"
        style={{ opacity: fallbackOpacity }}
        aria-hidden="true"
      />

      {/* ── Scene layer ───────────────────────────────────────────────────────
          "absolute inset-0 h-full w-full".
          Spline gets className="h-full w-full" and style={{ width: "100%", height: "100%" }}.
          Canvas set to display:block, width:100%, height:100%, margin 0.
          touch-action: pan-y so page scroll is never hijacked.
          On touch devices pointer-events: none on the scene.
          Spline badge is left exactly as runtime renders it.
      */}
      {sceneReady && !useFallback && loadState !== "error" && (
        <div
          className="absolute inset-0 h-full w-full [&_canvas]:block [&_canvas]:h-full [&_canvas]:w-full [&_canvas]:m-0 [&_canvas]:p-0 [&_canvas]:border-0 spline-scene-layer transition-opacity duration-300"
          style={{
            opacity: sceneOpacity,
            touchAction: "pan-y",
            pointerEvents: isTouchDevice ? "none" : "auto",
          }}
          aria-hidden="true"
        >
          <SplineErrorBoundary
            fallback={null}
            onError={handleError}
          >
            <SplineScene
              scene={SCENE_URL}
              onLoad={handleLoad}
              onError={handleError}
              className="h-full w-full"
              style={{ width: "100%", height: "100%" }}
            />
          </SplineErrorBoundary>
        </div>
      )}
    </div>
  );
}
