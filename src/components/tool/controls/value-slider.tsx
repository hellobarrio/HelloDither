"use client";

import * as React from "react";
import { Slider } from "@/components/ui/slider";

export interface ValueSliderProps {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  precision?: number;
  onChange: (v: number) => void;
  unit?: string;
  showInput?: boolean;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function ValueSlider({
  label,
  min,
  max,
  step = 1,
  value,
  precision = 0,
  onChange,
  unit,
  showInput = true,
}: ValueSliderProps) {
  const display = precision > 0 ? value.toFixed(precision) : `${Math.round(value)}`;

  const onInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(e.target.value);
      if (!Number.isNaN(parsed)) onChange(clamp(parsed, min, max));
    },
    [min, max, onChange],
  );

  return (
    <div className="ctrl">
      {(label || showInput) && (
        <div className="ctrl-label">
          {label ? <span className="name">{label}</span> : <span />}
          {showInput ? (
            <input
              type="number"
              className="value-input"
              min={min}
              max={max}
              step={step}
              value={display}
              onChange={onInputChange}
              aria-label={label ? `${label} value` : "value"}
            />
          ) : null}
          {unit ? <span className="text-[10px] text-foreground/45">{unit}</span> : null}
        </div>
      )}
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(vs) => onChange(vs[0] ?? value)}
      />
    </div>
  );
}
