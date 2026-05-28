"use client";

import * as React from "react";
import { Music, Pause, Play, X } from "lucide-react";
import { Section } from "./section";
import { Dropzone } from "../controls/dropzone";
import { ValueSlider } from "../controls/value-slider";
import { Segmented } from "../controls/segmented";
import { Switch } from "@/components/ui/switch";
import { useDither } from "@/state/dither-context";
import type { AudioBand, AudioMix } from "@/lib/types";

const MIX_OPTIONS: readonly { value: AudioMix; label: string }[] = [
  { value: "media", label: "Media" },
  { value: "audio", label: "Audio" },
  { value: "media+audio", label: "Both" },
];

const BAND_OPTIONS: readonly { value: AudioBand; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "mid", label: "Mid" },
  { value: "high", label: "High" },
  { value: "full", label: "Full" },
];

export function AudioSection() {
  const { state, actions } = useDither();
  const a = state.audio;
  return (
    <Section title="Audio Reactivity" icon={<Music size={13} />}>
      {!a.loaded ? (
        <Dropzone
          accept={{ "audio/*": [".mp3", ".wav"] }}
          onFile={(f) => actions.loadFile(f, "audio")}
          icon={<Music size={20} />}
          label="Drop audio"
          hint="MP3 · WAV"
        />
      ) : (
        <div className="audio-preview">
          <button
            type="button"
            className="icon-btn small"
            onClick={actions.togglePlayAudio}
            aria-label={a.isPlaying ? "Pause audio" : "Play audio"}
          >
            {a.isPlaying ? <Pause size={10} /> : <Play size={10} />}
          </button>
          <span className="audio-name">{a.name}</span>
          <button
            type="button"
            className="icon-btn small"
            onClick={actions.clearAudio}
            aria-label="Clear audio"
          >
            <X size={10} />
          </button>
        </div>
      )}

      <Segmented
        label="Mix"
        value={a.mix}
        options={MIX_OPTIONS}
        onChange={(v) => actions.update({ audio: { ...a, mix: v } })}
      />
      <Segmented
        label="Frequency band"
        value={a.band}
        options={BAND_OPTIONS}
        onChange={(v) => actions.update({ audio: { ...a, band: v } })}
      />

      <ValueSlider
        label="Sensitivity"
        min={0}
        max={3}
        step={0.01}
        precision={2}
        value={a.sensitivity}
        onChange={(v) => actions.update({ audio: { ...a, sensitivity: v } })}
      />
      <ValueSlider
        label="Influence"
        min={0}
        max={1}
        step={0.01}
        precision={2}
        value={a.influence}
        onChange={(v) => actions.update({ audio: { ...a, influence: v } })}
      />
      <ValueSlider
        label="Smoothing"
        min={0}
        max={0.95}
        step={0.01}
        precision={2}
        value={a.smoothing}
        onChange={(v) => actions.update({ audio: { ...a, smoothing: v } })}
      />

      {state.media.kind === "video" ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span
            style={{
              textTransform: "uppercase",
              fontSize: 10,
              letterSpacing: "0.06em",
              color: "var(--fg-2)",
            }}
          >
            Sync with video
          </span>
          <Switch
            checked={a.syncWithVideo}
            onCheckedChange={(v) =>
              actions.update({ audio: { ...a, syncWithVideo: v } })
            }
          />
        </div>
      ) : null}
    </Section>
  );
}
