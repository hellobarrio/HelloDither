"use client";

import * as React from "react";
import { Palette } from "lucide-react";
import { Section } from "./section";
import { ValueSlider } from "../controls/value-slider";
import { Segmented } from "../controls/segmented";
import { ColorField } from "../controls/color-field";
import { GradientChip } from "../controls/gradient-chip";
import { CustomStopsEditor } from "../controls/custom-stops-editor";
import { SwitchRow } from "../controls/switch-row";
import { GRADIENT_PRESETS } from "@/lib/presets";
import { useDither } from "@/state/dither-context";
import type { GradientMap, GradientType } from "@/lib/types";

const GRADIENT_TYPE_OPTIONS: readonly { value: GradientType; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
];
const MAP_OPTIONS: readonly { value: GradientMap; label: string }[] = [
  { value: "luminance", label: "Luminance" },
  { value: "position", label: "Position" },
];

export function ColorSection() {
  const { state, actions } = useDither();
  const c = state.color;

  return (
    <Section title="Color" icon={<Palette size={13} />}>
      <ColorField
        label="Background"
        value={c.bg}
        onChange={(v) => actions.update({ color: { ...c, bg: v } })}
      />
      <ColorField
        label="Pixel"
        value={c.fg}
        onChange={(v) => actions.update({ color: { ...c, fg: v } })}
      />

      <SwitchRow
        label="Gradient"
        checked={c.useGradient}
        onCheckedChange={(v) => actions.update({ color: { ...c, useGradient: v } })}
      />

      {c.useGradient ? (
        <>
          <Segmented
            label="Type"
            value={c.gradientType}
            options={GRADIENT_TYPE_OPTIONS}
            onChange={(v) => actions.update({ color: { ...c, gradientType: v } })}
          />
          {c.gradientType === "linear" ? (
            <ValueSlider
              label="Angle"
              min={0}
              max={360}
              step={1}
              value={c.gradientAngle}
              onChange={(v) => actions.update({ color: { ...c, gradientAngle: v } })}
            />
          ) : null}
          <Segmented
            label="Map by"
            value={c.gradientMap}
            options={MAP_OPTIONS}
            onChange={(v) => actions.update({ color: { ...c, gradientMap: v } })}
          />

          <div className="ctrl">
            <div className="ctrl-label">
              <span className="name">Preset</span>
            </div>
            <div className="preset-grid">
              {GRADIENT_PRESETS.map((p) => (
                <GradientChip
                  key={p.id}
                  preset={p}
                  active={p.id === c.presetId}
                  onClick={() => actions.update({ color: { ...c, presetId: p.id } })}
                />
              ))}
              <GradientChip
                preset={{ id: "custom", label: "Custom", stops: c.customStops }}
                active={c.presetId === "custom"}
                onClick={() => actions.update({ color: { ...c, presetId: "custom" } })}
              />
            </div>
          </div>

          {c.presetId === "custom" ? (
            <CustomStopsEditor
              stops={c.customStops}
              onChange={(next) => actions.update({ color: { ...c, customStops: next } })}
            />
          ) : null}
        </>
      ) : null}
    </Section>
  );
}
