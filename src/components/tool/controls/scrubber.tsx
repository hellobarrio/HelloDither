"use client";

import * as React from "react";

interface ScrubberProps {
  value: number;
  max: number;
  onSeek: (t: number) => void;
  variant?: "video" | "audio";
}

export function Scrubber({ value, max, onSeek, variant = "video" }: ScrubberProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const safeMax = Number.isFinite(max) && max > 0 ? max : 0;
  const safeValue = safeMax ? Math.max(0, Math.min(value, safeMax)) : 0;
  const pct = safeMax > 0 ? (safeValue / safeMax) * 100 : 0;
  const ariaLabel = variant === "audio" ? "Audio timeline" : "Video timeline";

  const handle = React.useCallback(
    (clientX: number) => {
      const el = ref.current;
      if (!el || !safeMax) return;
      const r = el.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      onSeek(t * safeMax);
    },
    [safeMax, onSeek],
  );

  const seekBy = React.useCallback(
    (delta: number) => {
      if (!safeMax) return;
      onSeek(Math.max(0, Math.min(safeMax, safeValue + delta)));
    },
    [onSeek, safeMax, safeValue],
  );

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!safeMax) return;
      const smallStep = Math.max(safeMax / 100, 0.1);
      const largeStep = Math.max(safeMax / 10, 1);
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowDown":
          e.preventDefault();
          seekBy(-smallStep);
          break;
        case "ArrowRight":
        case "ArrowUp":
          e.preventDefault();
          seekBy(smallStep);
          break;
        case "PageDown":
          e.preventDefault();
          seekBy(-largeStep);
          break;
        case "PageUp":
          e.preventDefault();
          seekBy(largeStep);
          break;
        case "Home":
          e.preventDefault();
          onSeek(0);
          break;
        case "End":
          e.preventDefault();
          onSeek(safeMax);
          break;
      }
    },
    [onSeek, safeMax, seekBy],
  );

  React.useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const x = "touches" in e ? e.touches[0]?.clientX : e.clientX;
      if (typeof x === "number") handle(x);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, handle]);

  return (
    <div
      ref={ref}
      className={"scrubber" + (variant === "audio" ? " audio-track" : "")}
      onMouseDown={(e) => {
        setDragging(true);
        handle(e.clientX);
      }}
      onTouchStart={(e) => {
        const x = e.touches[0]?.clientX;
        if (typeof x === "number") {
          setDragging(true);
          handle(x);
        }
      }}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={safeValue}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="scrubber-track">
        <div className="scrubber-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="scrubber-head" style={{ left: `${pct}%` }} />
    </div>
  );
}
