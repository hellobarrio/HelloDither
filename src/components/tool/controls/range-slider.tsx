"use client";

import * as React from "react";
import { ValueSlider } from "./value-slider";

export interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  minValue: number;
  maxValue: number;
  precision?: number;
  unit?: string;
  onChange: (minValue: number, maxValue: number) => void;
}

export function RangeSlider({
  label,
  min,
  max,
  step = 1,
  minValue,
  maxValue,
  precision = 0,
  unit,
  onChange,
}: RangeSliderProps) {
  return (
    <div className="ctrl" style={{ gap: 8 }}>
      <ValueSlider
        label={`Min ${label}`}
        min={min}
        max={max}
        step={step}
        precision={precision}
        unit={unit}
        value={minValue}
        onChange={(v) => onChange(Math.min(v, maxValue), maxValue)}
      />
      <ValueSlider
        label={`Max ${label}`}
        min={min}
        max={max}
        step={step}
        precision={precision}
        unit={unit}
        value={maxValue}
        onChange={(v) => onChange(minValue, Math.max(v, minValue))}
      />
    </div>
  );
}
