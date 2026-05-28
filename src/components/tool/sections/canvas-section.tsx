"use client";

import * as React from "react";
import { Maximize, Square } from "lucide-react";
import { Section } from "./section";
import { ValueSlider } from "../controls/value-slider";
import { Segmented } from "../controls/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SIZE_PRESETS } from "@/lib/presets";
import { useDither } from "@/state/dither-context";
import type { CanvasFit } from "@/lib/types";

const FIT_OPTIONS: readonly { value: CanvasFit; label: string }[] = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "stretch", label: "Stretch" },
] as const;

export function CanvasSection() {
  const { state, actions } = useDither();
  const c = state.canvas;
  return (
    <Section title="Canvas" icon={<Square size={13} />}>
      <div className="ctrl">
        <div className="ctrl-label">
          <span className="name">Preset</span>
        </div>
        <Select
          value={c.preset}
          onValueChange={(v) => {
            const preset = SIZE_PRESETS.find((p) => p.id === v);
            if (preset && preset.w && preset.h) {
              actions.update({
                canvas: { ...c, preset: v, width: preset.w, height: preset.h },
              });
            } else {
              actions.update({ canvas: { ...c, preset: v } });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SIZE_PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ValueSlider
          label="Width"
          min={64}
          max={3840}
          step={1}
          value={c.width}
          onChange={(v) =>
            actions.update({
              canvas: { ...c, preset: "custom", width: Math.round(v) },
            })
          }
        />
        <ValueSlider
          label="Height"
          min={64}
          max={3840}
          step={1}
          value={c.height}
          onChange={(v) =>
            actions.update({
              canvas: { ...c, preset: "custom", height: Math.round(v) },
            })
          }
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="btn small flex-1"
          onClick={actions.fitToMedia}
          disabled={state.media.kind === "none"}
        >
          <Maximize size={11} /> Fit to media
        </button>
      </div>

      <Segmented
        label="Image fit"
        value={c.fit}
        options={FIT_OPTIONS}
        onChange={(v) => actions.update({ canvas: { ...c, fit: v } })}
      />
    </Section>
  );
}
