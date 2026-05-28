"use client";

import * as React from "react";
import type { GradientPreset, GradientStop } from "@/lib/types";

interface GradientChipProps {
  preset: Pick<GradientPreset, "id" | "label"> & {
    stops: readonly GradientStop[];
  };
  active: boolean;
  onClick: () => void;
}

export function GradientChip({ preset, active, onClick }: GradientChipProps) {
  const bg = React.useMemo(() => {
    const stops = preset.stops
      .map((s) => `${s.color} ${(s.pos * 100).toFixed(1)}%`)
      .join(", ");
    return `linear-gradient(90deg, ${stops})`;
  }, [preset.stops]);

  return (
    <button
      type="button"
      className={"preset-chip" + (active ? " active" : "")}
      style={{ background: bg }}
      onClick={onClick}
      title={preset.label}
      aria-label={preset.label}
    >
      <span className="lbl">{preset.label}</span>
    </button>
  );
}
