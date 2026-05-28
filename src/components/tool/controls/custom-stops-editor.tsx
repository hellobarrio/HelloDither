"use client";

import * as React from "react";
import { X } from "lucide-react";
import { ValueSlider } from "./value-slider";
import { CompactColorField } from "./color-field";
import type { GradientStop } from "@/lib/types";

interface CustomStopsEditorProps {
  stops: GradientStop[];
  onChange: (next: GradientStop[]) => void;
}

const sortStops = (arr: GradientStop[]): GradientStop[] =>
  [...arr].sort((a, b) => a.pos - b.pos);

export function CustomStopsEditor({ stops, onChange }: CustomStopsEditorProps) {
  const updateStop = React.useCallback(
    (i: number, patch: Partial<GradientStop>) => {
      onChange(sortStops(stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s))));
    },
    [stops, onChange],
  );

  const addStop = React.useCallback(() => {
    let bestGap = 0;
    let bestPos = 0.5;
    const sorted = sortStops(stops);
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].pos - sorted[i].pos;
      if (gap > bestGap) {
        bestGap = gap;
        bestPos = (sorted[i].pos + sorted[i + 1].pos) / 2;
      }
    }
    onChange(sortStops([...stops, { pos: bestPos, color: "#888888" }]));
  }, [stops, onChange]);

  const removeStop = React.useCallback(
    (i: number) => {
      if (stops.length <= 2) return;
      onChange(stops.filter((_, idx) => idx !== i));
    },
    [stops, onChange],
  );

  const gradientPreview = React.useMemo(() => {
    const sorted = sortStops(stops);
    const css = sorted.map((s) => `${s.color} ${(s.pos * 100).toFixed(1)}%`).join(", ");
    return `linear-gradient(90deg, ${css})`;
  }, [stops]);

  return (
    <div className="ctrl" style={{ gap: 8 }}>
      <div className="ctrl-label">
        <span className="name">Custom stops</span>
        <button
          type="button"
          className="btn small"
          style={{ height: 22, padding: "0 8px", fontSize: 9 }}
          onClick={addStop}
        >
          + Add
        </button>
      </div>
      <div style={{ height: 28, border: "1px solid var(--fg-1)", background: gradientPreview }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {stops.map((s, i) => (
          <div
            key={`stop-${i}`}
            style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr 26px",
              gap: 6,
              alignItems: "center",
            }}
          >
            <CompactColorField
              value={s.color}
              onChange={(hex) => updateStop(i, { color: hex })}
              ariaLabel={`Stop ${i + 1} color`}
            />
            <ValueSlider
              min={0}
              max={1}
              step={0.01}
              precision={2}
              value={s.pos}
              onChange={(v) => updateStop(i, { pos: v })}
            />
            <button
              type="button"
              className="icon-btn small"
              style={{ width: 26, height: 24 }}
              disabled={stops.length <= 2}
              onClick={() => removeStop(i)}
              title="Remove stop"
              aria-label="Remove stop"
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
