"use client";

import * as React from "react";
import {
  ArrowLeftRight,
  ArrowUpDown,
  Circle as CircleIcon,
  Diamond,
  Grid as GridIcon,
  Move,
  Square as SquareIcon,
} from "lucide-react";
import { Section } from "./section";
import { ValueSlider } from "../controls/value-slider";
import { RangeSlider } from "../controls/range-slider";
import { Segmented } from "../controls/segmented";
import { Switch } from "@/components/ui/switch";
import { useDither } from "@/state/dither-context";
import type { CellShape, DeformMode, StretchAxis } from "@/lib/types";

const DEFORM_OPTIONS: readonly {
  value: DeformMode;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "height", label: "Height", icon: <ArrowUpDown size={11} /> },
  { value: "width", label: "Width", icon: <ArrowLeftRight size={11} /> },
  { value: "both", label: "Both", icon: <Move size={11} /> },
];

const SHAPE_OPTIONS: readonly {
  value: CellShape;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "rect", label: "Rect", icon: <SquareIcon size={11} /> },
  { value: "circle", label: "Circle", icon: <CircleIcon size={11} /> },
  { value: "diamond", label: "Diamond", icon: <Diamond size={11} /> },
];

const STRETCH_AXIS_OPTIONS: readonly {
  value: StretchAxis;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "vertical", label: "Vert.", icon: <ArrowUpDown size={11} /> },
  { value: "horizontal", label: "Horiz.", icon: <ArrowLeftRight size={11} /> },
  { value: "both", label: "Both", icon: <Move size={11} /> },
];

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span
        style={{
          textTransform: "uppercase",
          fontSize: 10,
          letterSpacing: "0.06em",
          color: "var(--fg-2)",
        }}
      >
        {label}
      </span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

export function GridSection() {
  const { state, actions } = useDither();
  const g = state.grid;
  const expert = state.ui.mode === "expert";

  return (
    <Section title="Grid" icon={<GridIcon size={13} />}>
      <Segmented
        label="Deformation"
        value={g.mode}
        options={DEFORM_OPTIONS}
        onChange={(v) => actions.update({ grid: { ...g, mode: v } })}
      />
      <ValueSlider
        label="Columns"
        min={4}
        max={300}
        step={1}
        value={g.cols}
        onChange={(v) => actions.update({ grid: { ...g, cols: Math.round(v) } })}
      />
      <ValueSlider
        label="Rows"
        min={4}
        max={300}
        step={1}
        value={g.rows}
        onChange={(v) => actions.update({ grid: { ...g, rows: Math.round(v) } })}
      />
      <ValueSlider
        label="Gap"
        min={0}
        max={20}
        step={0.5}
        precision={1}
        value={g.gap}
        onChange={(v) => actions.update({ grid: { ...g, gap: v } })}
      />

      {g.mode === "height" || g.mode === "both" ? (
        <RangeSlider
          label="height"
          min={0}
          max={100}
          step={1}
          minValue={g.minH}
          maxValue={g.maxH}
          unit="%"
          onChange={(min, max) =>
            actions.update({ grid: { ...g, minH: min, maxH: max } })
          }
        />
      ) : null}
      {g.mode === "width" || g.mode === "both" ? (
        <RangeSlider
          label="width"
          min={0}
          max={100}
          step={1}
          minValue={g.minW}
          maxValue={g.maxW}
          unit="%"
          onChange={(min, max) =>
            actions.update({ grid: { ...g, minW: min, maxW: max } })
          }
        />
      ) : null}

      <ValueSlider
        label="Intensity"
        min={0}
        max={2}
        step={0.01}
        precision={2}
        value={g.intensity}
        onChange={(v) => actions.update({ grid: { ...g, intensity: v } })}
      />

      {expert ? (
        <>
          <ValueSlider
            label="Contrast"
            min={0}
            max={3}
            step={0.01}
            precision={2}
            value={g.contrast}
            onChange={(v) => actions.update({ grid: { ...g, contrast: v } })}
          />
          <ValueSlider
            label="Gamma"
            min={0.1}
            max={3}
            step={0.01}
            precision={2}
            value={g.gamma}
            onChange={(v) => actions.update({ grid: { ...g, gamma: v } })}
          />
          <ValueSlider
            label="Threshold"
            min={0}
            max={1}
            step={0.01}
            precision={2}
            value={g.threshold}
            onChange={(v) => actions.update({ grid: { ...g, threshold: v } })}
          />
          <Segmented
            label="Shape"
            value={g.shape}
            options={SHAPE_OPTIONS}
            onChange={(v) => actions.update({ grid: { ...g, shape: v } })}
          />
        </>
      ) : null}

      <ToggleRow
        label="Stretch into lines"
        value={g.stretchEnabled}
        onChange={(v) => actions.update({ grid: { ...g, stretchEnabled: v } })}
      />
      {g.stretchEnabled ? (
        <>
          <Segmented
            label="Stretch axis"
            value={g.stretchAxis}
            options={STRETCH_AXIS_OPTIONS}
            onChange={(v) => actions.update({ grid: { ...g, stretchAxis: v } })}
          />
          {g.stretchAxis !== "horizontal" ? (
            <ValueSlider
              label="Vertical stretch"
              min={0}
              max={100}
              step={1}
              value={g.stretchV}
              onChange={(v) => actions.update({ grid: { ...g, stretchV: v } })}
            />
          ) : null}
          {g.stretchAxis !== "vertical" ? (
            <ValueSlider
              label="Horizontal stretch"
              min={0}
              max={100}
              step={1}
              value={g.stretchH}
              onChange={(v) => actions.update({ grid: { ...g, stretchH: v } })}
            />
          ) : null}
          <ValueSlider
            label="Line thickness"
            min={0}
            max={100}
            step={1}
            value={g.lineThickness}
            onChange={(v) => actions.update({ grid: { ...g, lineThickness: v } })}
          />
          <ValueSlider
            label="Line taper"
            min={0}
            max={100}
            step={1}
            value={g.lineTaper}
            onChange={(v) => actions.update({ grid: { ...g, lineTaper: v } })}
          />
        </>
      ) : null}

      <ToggleRow
        label="Invert"
        value={g.invert}
        onChange={(v) => actions.update({ grid: { ...g, invert: v } })}
      />
    </Section>
  );
}
