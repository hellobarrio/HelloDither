"use client";

import * as React from "react";
import { Maximize, RotateCcw } from "lucide-react";
import { useDither } from "@/state/dither-context";

interface CanvasStageProps {
  emptyHero: React.ReactNode;
}

export function CanvasStage({ emptyHero }: CanvasStageProps) {
  const { state, actions, meta } = useDither();
  const stageRefCb = React.useCallback(
    (el: HTMLDivElement | null) => {
      actions.setStageEl(el);
    },
    [actions],
  );
  const canvasRefCb = React.useCallback(
    (el: HTMLCanvasElement | null) => {
      actions.setCanvasRef(el);
    },
    [actions],
  );

  const onDragOver = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);
  const onDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      if (!f) return;
      const isAudio =
        f.type.startsWith("audio/") || /\.(mp3|wav)$/i.test(f.name);
      actions.loadFile(f, isAudio ? "audio" : "media");
    },
    [actions],
  );

  const hasMedia = state.media.kind !== "none";
  const isPlayingAny =
    (state.media.kind === "video" && state.media.isPlaying) ||
    state.audio.isPlaying;
  const recording = meta.recording;

  return (
    <div
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4"
      ref={stageRefCb}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div
        className="relative max-h-full max-w-full bg-(--hb-black) outline-[1px] outline-foreground"
        style={{
          width: state.canvas.width * meta.stageScale,
          height: state.canvas.height * meta.stageScale,
          outlineColor: recording ? "var(--hb-rosso)" : "var(--fg-1)",
          visibility: hasMedia ? "visible" : "hidden",
        }}
      >
        <canvas ref={canvasRefCb} className="w-full h-full" />
      </div>

      {!hasMedia ? emptyHero : null}

      <div className="absolute bottom-[18px] left-[18px] z-[5] flex flex-col gap-1.5">
        {recording ? (
          <div className="inline-flex w-max items-center gap-2 bg-(--hb-black) px-2.5 py-1.5 text-[10px] uppercase tracking-[0.08em] text-(--hb-grigio)">
            <span className="h-1.5 w-1.5 rounded-full bg-(--hb-rosso) animate-[pulse_1.4s_infinite_ease-in-out]" />
            REC · WEBM
          </div>
        ) : isPlayingAny ? (
          <div className="inline-flex w-max items-center gap-2 bg-(--hb-black) px-2.5 py-1.5 text-[10px] uppercase tracking-[0.08em] text-(--hb-grigio)">
            <span className="h-1.5 w-1.5 rounded-full bg-(--hb-rosso) animate-[pulse_1.4s_infinite_ease-in-out]" />
            LIVE
          </div>
        ) : null}
      </div>

      <div className="absolute right-[18px] top-[18px] z-[5] flex flex-col items-end gap-1.5">
        <button
          type="button"
          className="icon-btn small"
          onClick={actions.fitToMedia}
          disabled={!hasMedia}
          title="Fit canvas to media"
          aria-label="Fit canvas to media"
        >
          <Maximize size={11} />
        </button>
        <button
          type="button"
          className="icon-btn small"
          onClick={actions.resetGrid}
          title="Reset to default values"
          aria-label="Reset to default values"
        >
          <RotateCcw size={11} />
        </button>
      </div>
    </div>
  );
}
