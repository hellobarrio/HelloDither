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
      className="canvas-stage"
      ref={stageRefCb}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div
        className="canvas-wrap"
        style={{
          width: state.canvas.width * meta.stageScale,
          height: state.canvas.height * meta.stageScale,
          outlineColor: recording ? "var(--hb-rosso)" : "var(--fg-1)",
          visibility: hasMedia ? "visible" : "hidden",
        }}
      >
        <canvas ref={canvasRefCb} style={{ width: "100%", height: "100%" }} />
      </div>

      {!hasMedia ? emptyHero : null}

      <div className="canvas-status">
        {recording ? (
          <div className="status-pill">
            <span className="led" />
            REC · WEBM
          </div>
        ) : isPlayingAny ? (
          <div className="status-pill">
            <span className="led" />
            LIVE
          </div>
        ) : null}
      </div>

      <div className="canvas-floating-toolbar">
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
          title="Reset grid to defaults"
          aria-label="Reset grid"
        >
          <RotateCcw size={11} />
        </button>
      </div>
    </div>
  );
}
