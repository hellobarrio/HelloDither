// GIF export with time range + fps support.
// Lazy-loads `gifenc` so the encoder is not in the initial bundle.

import type { DitherEngine, GifExportOptions } from "@/lib/types";

type SourceMedia =
  | { kind: "video"; el: HTMLVideoElement }
  | { kind: "image"; el: HTMLImageElement; durationSeconds: number };

interface ExportInputs {
  engine: DitherEngine;
  source: SourceMedia | null;
  opts: GifExportOptions;
}

const waitForRaf = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

const waitForSeeked = (
  video: HTMLVideoElement,
  targetTime: number,
  signal?: AbortSignal,
): Promise<void> => {
  if (signal?.aborted) {
    return Promise.reject(new DOMException("Cancelled", "AbortError"));
  }
  if (Math.abs(video.currentTime - targetTime) < 0.001) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let timeout: number | null = null;
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
      if (timeout !== null) window.clearTimeout(timeout);
    };
    const finish = (fn: () => void) => {
      cleanup();
      fn();
    };
    const onSeeked = () => {
      finish(() => resolve());
    };
    const onError = () => {
      finish(() => reject(new Error("Video seek failed")));
    };
    const onAbort = () => {
      finish(() => reject(new DOMException("Cancelled", "AbortError")));
    };
    timeout = window.setTimeout(() => {
      finish(() => resolve());
    }, 3000);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
};

function downloadGif(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: "image/gif" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function exportGIF({
  engine,
  source,
  opts,
}: ExportInputs): Promise<void> {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");

  const fps = Math.max(1, Math.floor(opts.fps));
  const delay = Math.max(2, Math.round(1000 / fps));
  const canvas = engine.getCanvas();
  const W = opts.width ?? canvas.width;
  const H = opts.height ?? canvas.height;

  // We sample from the rendered engine canvas at its native size.
  // The optional output width/height triggers a downscale via OffscreenCanvas.
  const needScale = W !== canvas.width || H !== canvas.height;
  let scaleCtx: CanvasRenderingContext2D | null = null;
  let scaleCanvas: HTMLCanvasElement | null = null;
  if (needScale) {
    scaleCanvas = document.createElement("canvas");
    scaleCanvas.width = W;
    scaleCanvas.height = H;
    scaleCtx = scaleCanvas.getContext("2d", { willReadFrequently: true });
  }

  const enc = GIFEncoder();
  const totalSeconds = Math.max(0.05, opts.end - opts.start);
  const totalFrames = Math.max(1, Math.round(totalSeconds * fps));
  const dt = totalSeconds / totalFrames;

  const wasPaused =
    source?.kind === "video" ? source.el.paused : true;
  if (source?.kind === "video") {
    source.el.pause();
  }

  try {
    for (let i = 0; i < totalFrames; i++) {
      if (opts.signal?.aborted) {
        throw new DOMException("Cancelled", "AbortError");
      }
      const t = opts.start + i * dt;
      if (source?.kind === "video") {
        source.el.currentTime = t;
        await waitForSeeked(source.el, t, opts.signal);
      }
      // Let the engine pick up the new frame.
      engine.invalidate();
      await waitForRaf();
      engine.drawNow();

      let imageData: ImageData;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2D context");
      if (needScale && scaleCtx && scaleCanvas) {
        scaleCtx.clearRect(0, 0, W, H);
        scaleCtx.drawImage(canvas, 0, 0, W, H);
        imageData = scaleCtx.getImageData(0, 0, W, H);
      } else {
        imageData = ctx.getImageData(0, 0, W, H);
      }

      const data = imageData.data;
      const palette = quantize(data, 256, { format: "rgb444" });
      const indexed = applyPalette(data, palette, "rgb444");
      enc.writeFrame(indexed, W, H, {
        palette,
        delay,
        first: i === 0,
        repeat: 0,
      });

      opts.onProgress?.((i + 1) / totalFrames);
    }

    enc.finish();
    const bytes = enc.bytes();
    downloadGif(bytes, opts.filename ?? `dither-${Date.now()}.gif`);
  } finally {
    if (source?.kind === "video" && !wasPaused) {
      try {
        await source.el.play();
      } catch {}
    }
  }
}
