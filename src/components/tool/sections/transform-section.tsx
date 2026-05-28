"use client";

import * as React from "react";
import { FlipHorizontal, FlipVertical, Scaling } from "lucide-react";
import { Section } from "./section";
import { ValueSlider } from "../controls/value-slider";
import { SwitchRow } from "../controls/switch-row";
import { useDither } from "@/state/dither-context";

export function TransformSection() {
  const { state, actions } = useDither();
  const t = state.transform;
  return (
    <Section title="Transform" icon={<Scaling size={13} />}>
      <ValueSlider
        label="Zoom"
        min={0.1}
        max={4}
        step={0.05}
        precision={2}
        value={t.zoom}
        unit="x"
        onChange={(v) => actions.update({ transform: { ...t, zoom: v } })}
      />
      <ValueSlider
        label="Horizontal scale"
        min={-100}
        max={100}
        step={1}
        value={t.scaleX}
        unit="%"
        onChange={(v) => actions.update({ transform: { ...t, scaleX: v } })}
      />
      <ValueSlider
        label="Vertical scale"
        min={-100}
        max={100}
        step={1}
        value={t.scaleY}
        unit="%"
        onChange={(v) => actions.update({ transform: { ...t, scaleY: v } })}
      />
      <ValueSlider
        label="Move horizontal"
        min={-100}
        max={100}
        step={1}
        value={t.offsetX}
        unit="%"
        onChange={(v) => actions.update({ transform: { ...t, offsetX: v } })}
      />
      <ValueSlider
        label="Move vertical"
        min={-100}
        max={100}
        step={1}
        value={t.offsetY}
        unit="%"
        onChange={(v) => actions.update({ transform: { ...t, offsetY: v } })}
      />
      <SwitchRow
        label={
          <span className="flex items-center gap-1.5">
            <FlipHorizontal size={11} /> Flip horizontal
          </span>
        }
        checked={t.flipH}
        onCheckedChange={(v) => actions.update({ transform: { ...t, flipH: v } })}
      />
      <SwitchRow
        label={
          <span className="flex items-center gap-1.5">
            <FlipVertical size={11} /> Flip vertical
          </span>
        }
        checked={t.flipV}
        onCheckedChange={(v) => actions.update({ transform: { ...t, flipV: v } })}
      />
    </Section>
  );
}
