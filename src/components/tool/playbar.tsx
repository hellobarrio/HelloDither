"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { Scrubber } from "./controls/scrubber";
import { useDither } from "@/state/dither-context";

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Playbar() {
  const { state, actions } = useDither();
  const m = state.media;
  const a = state.audio;
  const isPlayingAny = (m.kind === "video" && m.isPlaying) || a.isPlaying;
  const canPlay = m.kind === "video" || a.loaded;

  let timeDisplay = "—:—— / —:——";
  if (m.kind === "video") {
    timeDisplay = `${formatTime(m.currentTime)} / ${formatTime(m.duration)}`;
  } else if (a.loaded) {
    timeDisplay = `${formatTime(a.currentTime)} / ${formatTime(a.duration)}`;
  }

  return (
    <div className="flex h-[54px] w-full flex-wrap items-center gap-3.5 bg-background px-3">
      <button
        type="button"
        className="icon-btn"
        onClick={actions.togglePlayAll}
        disabled={!canPlay}
        aria-label={isPlayingAny ? "Pause" : "Play"}
      >
        {isPlayingAny ? <Pause size={13} /> : <Play size={13} />}
      </button>
      {m.kind === "video" ? (
        <Scrubber
          value={m.currentTime}
          max={m.duration}
          onSeek={actions.seekMedia}
          variant="video"
        />
      ) : a.loaded ? (
        <Scrubber
          value={a.currentTime}
          max={a.duration}
          onSeek={actions.seekAudio}
          variant="audio"
        />
      ) : (
        <div className="scrubber">
          <div className="scrubber-track" />
        </div>
      )}
      <div className="min-w-[90px] text-right text-[10px] uppercase tracking-[0.06em] text-(--fg-2) tabular-nums">
        {timeDisplay}
      </div>
    </div>
  );
}
