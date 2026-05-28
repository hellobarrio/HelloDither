"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ValueSlider } from "./controls/value-slider";
import { RangeSlider } from "./controls/range-slider";
import { useDither } from "@/state/dither-context";

interface GifExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GifExportDialogInnerProps {
  onClose: () => void;
}

function GifExportDialogInner({ onClose }: GifExportDialogInnerProps) {
  const { state, actions } = useDither();
  const m = state.media;
  const isVideo = m.kind === "video";
  const videoDuration = isVideo ? m.duration : 0;
  const initialEnd = isVideo ? Math.min(5, Math.max(0.5, videoDuration)) : 2;

  const [fps, setFps] = React.useState(15);
  const [start, setStart] = React.useState(0);
  const [end, setEnd] = React.useState(initialEnd);
  const [scaleWidth, setScaleWidth] = React.useState(state.canvas.width);
  const [exporting, setExporting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const onSubmit = React.useCallback(async () => {
    if (exporting) return;
    const aspect = state.canvas.height / state.canvas.width;
    const w = Math.max(64, Math.round(scaleWidth));
    const h = Math.max(64, Math.round(w * aspect));
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setExporting(true);
    setProgress(0);
    try {
      await actions.exportGIF({
        fps,
        start,
        end,
        width: w,
        height: h,
        filename: `dither-${Date.now()}.gif`,
        signal: ctrl.signal,
        onProgress: setProgress,
      });
      onClose();
    } finally {
      setExporting(false);
      abortRef.current = null;
    }
  }, [
    exporting,
    state.canvas.height,
    state.canvas.width,
    scaleWidth,
    actions,
    fps,
    start,
    end,
    onClose,
  ]);

  const onCancel = React.useCallback(() => {
    if (exporting) abortRef.current?.abort();
    else onClose();
  }, [exporting, onClose]);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Export GIF</DialogTitle>
        <DialogDescription>
          {isVideo
            ? "Capture a range of the video and encode it as an animated GIF."
            : "Encode the current canvas into a GIF."}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-3.5 flex flex-col gap-3.5">
        <ValueSlider
          label="FPS"
          min={5}
          max={30}
          step={1}
          value={fps}
          onChange={setFps}
        />
        {isVideo ? (
          <RangeSlider
            label="time (s)"
            min={0}
            max={Math.max(0.5, videoDuration)}
            step={0.1}
            minValue={start}
            maxValue={end}
            precision={1}
            unit="s"
            onChange={(mn, mx) => {
              setStart(mn);
              setEnd(mx);
            }}
          />
        ) : (
          <ValueSlider
            label="Duration (s)"
            min={0.5}
            max={10}
            step={0.1}
            value={end - start}
            precision={1}
            onChange={(v) => setEnd(start + v)}
          />
        )}
        <ValueSlider
          label="Output width (px)"
          min={64}
          max={state.canvas.width}
          step={1}
          value={scaleWidth}
          onChange={setScaleWidth}
        />

        {exporting ? (
          <div
            className="relative h-1 w-full overflow-hidden bg-(--fg-3)"
            role="progressbar"
            aria-label="Export progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div
              className="absolute inset-0 origin-left bg-(--hb-rosso) transition-transform duration-100 ease-linear"
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>
        ) : null}
      </div>

      <DialogFooter className="mt-4.5 flex justify-end gap-2">
        <button type="button" className="btn small" onClick={onCancel}>
          {exporting ? "Cancel" : "Close"}
        </button>
        <button
          type="button"
          className="btn small dark min-w-32 justify-center tabular-nums"
          onClick={onSubmit}
          disabled={exporting}
        >
          {exporting
            ? `Encoding… ${Math.round(progress * 100)}%`
            : "Export GIF"}
        </button>
      </DialogFooter>
    </DialogContent>
  );
}

export function GifExportDialog({ open, onOpenChange }: GifExportDialogProps) {
  // Mount the inner content only when open so internal form state resets fresh
  // on each open without triggering `set-state-in-effect`.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <GifExportDialogInner onClose={() => onOpenChange(false)} />
      ) : null}
    </Dialog>
  );
}
