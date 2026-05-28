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
  const pct = max > 0 ? (value / max) * 100 : 0;

  const handle = React.useCallback(
    (clientX: number) => {
      const el = ref.current;
      if (!el || !max) return;
      const r = el.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      onSeek(t * max);
    },
    [max, onSeek],
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
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
    >
      <div className="scrubber-track">
        <div className="scrubber-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="scrubber-head" style={{ left: `${pct}%` }} />
    </div>
  );
}
