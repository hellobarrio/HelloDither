"use client";

import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  title?: string;
}

export interface SegmentedProps<T extends string> {
  label?: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className="ctrl">
      {label ? (
        <div className="ctrl-label">
          <span className="name">{label}</span>
        </div>
      ) : null}
      <ToggleGroup
        type="single"
        className="segmented"
        value={value}
        aria-label={label}
        onValueChange={(v) => {
          // Radix returns "" when the active item is clicked again. Keep current.
          if (v && v !== value) onChange(v as T);
        }}
      >
        {options.map((opt) => (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            title={opt.title ?? opt.label}
            aria-label={opt.label}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
