// Canvas-based dithering renderer. Pure module — zero React imports.
// Owns a requestAnimationFrame loop that redraws only when needed
// (settings change, video playing, audio attached, gif animated).

import { GRADIENT_PRESETS } from "@/lib/presets";
import { clamp, lerp, lum, rgbToHex, sampleGradient } from "./colors";
import type {
  AudioReading,
  DitherEngine,
  DitherState,
  GradientStop,
  RecordingHandle,
  RecordingOptions,
} from "@/lib/types";

type AudioFn = (() => AudioReading | null) | null;
type MediaEl = HTMLImageElement | HTMLVideoElement | null;

export function createDitherEngine(canvas: HTMLCanvasElement): DitherEngine {
  const _ctx = canvas.getContext("2d");
  if (!_ctx) throw new Error("Canvas 2D context unavailable");
  const ctx: CanvasRenderingContext2D = _ctx;
  const sampleCanvas = document.createElement("canvas");
  const _sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!_sampleCtx) throw new Error("Sample 2D context unavailable");
  const sampleCtx: CanvasRenderingContext2D = _sampleCtx;

  let state: DitherState | null = null;
  let mediaEl: MediaEl = null;
  let mediaIsAnimated = false;
  let audioFn: AudioFn = null;
  let rafHandle: number | null = null;
  let needsRedraw = true;
  let smoothedAudio = 0;

  function setSettings(next: DitherState): void {
    state = next;
    needsRedraw = true;
  }

  function setMedia(el: MediaEl, opts?: { animated?: boolean }): void {
    mediaEl = el;
    mediaIsAnimated = !!opts?.animated;
    needsRedraw = true;
  }

  function setAudio(fn: AudioFn): void {
    audioFn = fn;
    needsRedraw = true;
  }

  function invalidate(): void {
    needsRedraw = true;
  }

  function resizeCanvasToTarget(targetW: number, targetH: number): void {
    const W = Math.max(2, Math.round(targetW));
    const H = Math.max(2, Math.round(targetH));
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    needsRedraw = true;
  }

  // Scale the source media into a cols×rows ImageData buffer.
  function sampleMediaToGrid(cols: number, rows: number): ImageData | null {
    if (!mediaEl || !state) return null;
    const el = mediaEl as HTMLVideoElement & HTMLImageElement;
    const srcW = el.videoWidth || el.naturalWidth || el.width || 0;
    const srcH = el.videoHeight || el.naturalHeight || el.height || 0;
    if (!srcW || !srcH) return null;

    const W = cols;
    const H = rows;
    if (sampleCanvas.width !== W || sampleCanvas.height !== H) {
      sampleCanvas.width = W;
      sampleCanvas.height = H;
    }
    sampleCtx.clearRect(0, 0, W, H);

    const fit = state.canvas.fit;
    const canvasAR = canvas.width / canvas.height;
    const srcAR = srcW / srcH;

    if (fit === "stretch") {
      sampleCtx.drawImage(mediaEl, 0, 0, srcW, srcH, 0, 0, W, H);
    } else if (fit === "contain") {
      let dw: number;
      let dh: number;
      let dx: number;
      let dy: number;
      if (srcAR > canvasAR) {
        dw = W;
        dh = W / srcAR;
        dx = 0;
        dy = (H - dh) / 2;
      } else {
        dh = H;
        dw = H * srcAR;
        dx = (W - dw) / 2;
        dy = 0;
      }
      sampleCtx.drawImage(mediaEl, 0, 0, srcW, srcH, dx, dy, dw, dh);
    } else {
      // cover
      let sx = 0;
      let sy = 0;
      let sw = srcW;
      let sh = srcH;
      if (srcAR > canvasAR) {
        sw = srcH * canvasAR;
        sx = (srcW - sw) / 2;
      } else {
        sh = srcW / canvasAR;
        sy = (srcH - sh) / 2;
      }
      sampleCtx.drawImage(mediaEl, sx, sy, sw, sh, 0, 0, W, H);
    }
    try {
      return sampleCtx.getImageData(0, 0, W, H);
    } catch {
      return null;
    }
  }

  function resolveStops(): readonly GradientStop[] {
    if (!state) return GRADIENT_PRESETS[0].stops;
    const c = state.color;
    if (
      c.presetId === "custom" &&
      Array.isArray(c.customStops) &&
      c.customStops.length >= 2
    ) {
      return [...c.customStops]
        .map((s) => ({ pos: clamp(s.pos, 0, 1), color: s.color }))
        .sort((a, b) => a.pos - b.pos);
    }
    const preset =
      GRADIENT_PRESETS.find((p) => p.id === c.presetId) ?? GRADIENT_PRESETS[0];
    return preset.stops;
  }

  function buildCanvasGradient(stops: readonly GradientStop[]): CanvasGradient {
    if (!state) throw new Error("no state");
    const c = state.color;
    const W = canvas.width;
    const H = canvas.height;
    let grad: CanvasGradient;
    if (c.gradientType === "radial") {
      const cx = W / 2;
      const cy = H / 2;
      const r = Math.max(W, H) / 1.2;
      grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    } else {
      const angle = ((c.gradientAngle || 0) * Math.PI) / 180;
      const cx = W / 2;
      const cy = H / 2;
      const len = Math.max(W, H);
      const dx = (Math.cos(angle) * len) / 2;
      const dy = (Math.sin(angle) * len) / 2;
      grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    }
    stops.forEach((s) => grad.addColorStop(clamp(s.pos, 0, 1), s.color));
    return grad;
  }

  function getAudioBoost(): number {
    if (!audioFn || !state) return 0;
    const a = state.audio;
    const m = audioFn();
    if (!m) return 0;
    let v = 0;
    if (a.band === "low") v = m.lowLevel;
    else if (a.band === "mid") v = m.midLevel;
    else if (a.band === "high") v = m.highLevel;
    else v = m.fullLevel;
    v *= a.sensitivity;
    const smoothing = clamp(a.smoothing, 0, 0.95);
    smoothedAudio = smoothedAudio * smoothing + v * (1 - smoothing);
    return clamp(smoothedAudio, 0, 2);
  }

  function drawShape(
    shape: "rect" | "circle" | "diamond",
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    if (shape === "circle") {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape === "diamond") {
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x, y + h / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(x, y, w, h);
    }
  }

  function draw(): void {
    if (!state) return;
    const c = state.color;
    const g = state.grid;

    const W = canvas.width;
    const H = canvas.height;

    const activeStops = resolveStops();

    // Background (always solid)
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);

    const cols = clamp(g.cols | 0, 2, 600);
    const rows = clamp(g.rows | 0, 2, 600);
    const cellW = W / cols;
    const cellH = H / rows;
    const baseGap = clamp(g.gap, 0, Math.min(cellW, cellH) - 0.2);
    const stretchOn = !!g.stretchEnabled;
    const stretchAxis = g.stretchAxis;
    const sH = clamp((g.stretchH ?? 0) / 100, 0, 1);
    const sV = clamp((g.stretchV ?? 0) / 100, 0, 1);
    const thickness = clamp((g.lineThickness ?? 100) / 100, 0, 1);
    const taper = clamp((g.lineTaper ?? 0) / 100, 0, 1);
    const axisH = stretchOn && (stretchAxis === "horizontal" || stretchAxis === "both");
    const axisV = stretchOn && (stretchAxis === "vertical" || stretchAxis === "both");

    const sampled = sampleMediaToGrid(cols, rows);

    const audioMix = state.audio.mix;
    const useAudio = (audioMix === "audio" || audioMix === "media+audio") && !!audioFn;
    const useMedia = (audioMix === "media" || audioMix === "media+audio") && !!sampled;
    const audioBoost = useAudio ? getAudioBoost() : 0;
    const audioInfluence = clamp(state.audio.influence, 0, 1);

    const fgGradient = c.useGradient ? buildCanvasGradient(activeStops) : null;
    const fgIsPerCell = c.useGradient && c.gradientMap === "luminance";
    if (c.useGradient && c.gradientMap === "position" && fgGradient) {
      ctx.fillStyle = fgGradient;
    } else if (!fgIsPerCell) {
      ctx.fillStyle = c.fg;
    }

    const minH = clamp(g.minH / 100, 0, 1);
    const maxH = clamp(g.maxH / 100, 0, 1);
    const minW = clamp(g.minW / 100, 0, 1);
    const maxW = clamp(g.maxW / 100, 0, 1);
    const intensity = clamp(g.intensity, 0, 2);
    const threshold = clamp(g.threshold, 0, 1);
    const contrast = clamp(g.contrast, 0, 3);
    const gamma = clamp(g.gamma, 0.1, 3);
    const invert = !!g.invert;
    const mode = g.mode;
    const data = sampled ? sampled.data : null;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let t = 0.5;
        if (useMedia && data) {
          const i = (row * cols + col) * 4;
          t = lum(data[i], data[i + 1], data[i + 2]);
        }
        // contrast & gamma
        t = 0.5 + (t - 0.5) * contrast;
        t = clamp(t, 0, 1);
        t = Math.pow(t, 1 / gamma);
        if (invert) t = 1 - t;
        if (threshold > 0)
          t = t < threshold ? 0 : (t - threshold) / (1 - threshold);
        t = clamp(t * intensity, 0, 1);

        let driver = t;
        if (useAudio) {
          if (audioMix === "audio") {
            driver = clamp(audioBoost, 0, 1);
          } else {
            driver = clamp(t + audioBoost * audioInfluence, 0, 1);
          }
        }

        let scaleH = 1;
        let scaleW = 1;
        if (mode === "height") {
          scaleH = lerp(minH, maxH, driver);
          scaleW = lerp(minW, maxW, 1);
        } else if (mode === "width") {
          scaleW = lerp(minW, maxW, driver);
          scaleH = lerp(minH, maxH, 1);
        } else {
          scaleH = lerp(minH, maxH, driver);
          scaleW = lerp(minW, maxW, driver);
        }

        const cx = col * cellW + cellW / 2;
        const cy = row * cellH + cellH / 2;

          if (fgIsPerCell) {
          const [r, gg, bb] = sampleGradient(activeStops, driver);
          ctx.fillStyle = rgbToHex(r, gg, bb);
        }

        if (stretchOn) {
          const stretchFactorV = 1 + driver * sV * 8;
          const stretchFactorH = 1 + driver * sH * 8;
          const taperFactor = lerp(1, 1 - taper, driver);
          const rectW = (cellW - baseGap) * scaleW;
          const rectH = (cellH - baseGap) * scaleH;
          const stretchedW = axisH
            ? rectW * stretchFactorH
            : rectW * taperFactor * thickness;
          const stretchedH = axisV
            ? rectH * stretchFactorV
            : rectH * taperFactor * thickness;
          if (stretchedW < 0.05 || stretchedH < 0.05) continue;
          ctx.fillRect(
            cx - stretchedW / 2,
            cy - stretchedH / 2,
            stretchedW,
            stretchedH,
          );
          continue;
        }

        const innerW = (cellW - baseGap) * scaleW;
        const innerH = (cellH - baseGap) * scaleH;
        if (innerW <= 0.1 || innerH <= 0.1) continue;
        const x = cx - innerW / 2;
        const y = cy - innerH / 2;
        drawShape(g.shape, x, y, innerW, innerH);
      }
    }
  }

  function frame(): void {
    const isVideoLive =
      mediaEl &&
      mediaEl.tagName === "VIDEO" &&
      !(mediaEl as HTMLVideoElement).paused &&
      !(mediaEl as HTMLVideoElement).ended;
    const isAudioLive = !!audioFn;
    const isGifLive = !!(mediaEl && mediaIsAnimated && mediaEl.tagName === "IMG");
    const live = isVideoLive || isAudioLive || isGifLive;
    if (needsRedraw || live) {
      draw();
      needsRedraw = false;
    }
    rafHandle = requestAnimationFrame(frame);
  }

  function start(): void {
    if (rafHandle !== null) return;
    rafHandle = requestAnimationFrame(frame);
  }

  function stop(): void {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
  }

  function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportPNG(filename = "dither.png"): void {
    draw();
    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, filename);
    }, "image/png");
  }

  function exportSVG(filename = "dither.svg"): void {
    if (!state) return;
    const g = state.grid;
    const c = state.color;
    const W = canvas.width;
    const H = canvas.height;
    const cols = clamp(g.cols | 0, 2, 600);
    const rows = clamp(g.rows | 0, 2, 600);
    const cellW = W / cols;
    const cellH = H / rows;
    const baseGap = clamp(g.gap, 0, Math.min(cellW, cellH) - 0.2);
    const stretchOn = !!g.stretchEnabled;
    const stretchAxis = g.stretchAxis;
    const sH = clamp((g.stretchH ?? 0) / 100, 0, 1);
    const sV = clamp((g.stretchV ?? 0) / 100, 0, 1);
    const thickness = clamp((g.lineThickness ?? 100) / 100, 0, 1);
    const taper = clamp((g.lineTaper ?? 0) / 100, 0, 1);
    const axisH = stretchOn && (stretchAxis === "horizontal" || stretchAxis === "both");
    const axisV = stretchOn && (stretchAxis === "vertical" || stretchAxis === "both");
    const sampled = sampleMediaToGrid(cols, rows);
    const data = sampled ? sampled.data : null;
    const minH = clamp(g.minH / 100, 0, 1);
    const maxH = clamp(g.maxH / 100, 0, 1);
    const minW = clamp(g.minW / 100, 0, 1);
    const maxW = clamp(g.maxW / 100, 0, 1);
    const intensity = clamp(g.intensity, 0, 2);
    const threshold = clamp(g.threshold, 0, 1);
    const contrast = clamp(g.contrast, 0, 3);
    const gamma = clamp(g.gamma, 0.1, 3);
    const invert = !!g.invert;
    const mode = g.mode;
    const activeStops = resolveStops();

    const audioMix = state.audio.mix;
    const useAudio = (audioMix === "audio" || audioMix === "media+audio") && !!audioFn;
    const useMedia = (audioMix === "media" || audioMix === "media+audio") && !!sampled;
    const audioBoost = useAudio ? getAudioBoost() : 0;
    const audioInfluence = clamp(state.audio.influence, 0, 1);

    let defs = "";
    const bgFill: string = c.bg;
    let fgFill: string = c.fg;
    if (c.useGradient) {
      const stopsXml = activeStops
        .map(
          (s) =>
            `<stop offset="${(s.pos * 100).toFixed(2)}%" stop-color="${s.color}"/>`,
        )
        .join("");
      const id = "g0";
      if (c.gradientType === "radial") {
        defs += `<radialGradient id="${id}" cx="50%" cy="50%" r="60%">${stopsXml}</radialGradient>`;
      } else {
        const angle = c.gradientAngle || 0;
        const x1 = W / 2;
        const y1 = H / 2;
        const x2 = W / 2 + Math.cos((angle * Math.PI) / 180) * W;
        const y2 = H / 2 + Math.sin((angle * Math.PI) / 180) * H;
        defs += `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopsXml}</linearGradient>`;
      }
      if (c.gradientMap === "position") fgFill = `url(#${id})`;
    }

    let cells = "";
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let t = 0.5;
        if (useMedia && data) {
          const i = (row * cols + col) * 4;
          t = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
        }
        t = 0.5 + (t - 0.5) * contrast;
        t = clamp(t, 0, 1);
        t = Math.pow(t, 1 / gamma);
        if (invert) t = 1 - t;
        if (threshold > 0) t = t < threshold ? 0 : (t - threshold) / (1 - threshold);
        t = clamp(t * intensity, 0, 1);

        let driver = t;
        if (useAudio) {
          if (audioMix === "audio") driver = clamp(audioBoost, 0, 1);
          else driver = clamp(t + audioBoost * audioInfluence, 0, 1);
        }
        let scaleH = 1;
        let scaleW = 1;
        if (mode === "height") {
          scaleH = lerp(minH, maxH, driver);
          scaleW = lerp(minW, maxW, 1);
        } else if (mode === "width") {
          scaleW = lerp(minW, maxW, driver);
          scaleH = lerp(minH, maxH, 1);
        } else {
          scaleH = lerp(minH, maxH, driver);
          scaleW = lerp(minW, maxW, driver);
        }
        const cx = col * cellW + cellW / 2;
        const cy = row * cellH + cellH / 2;
        let cellFill: string = fgFill;
        if (c.useGradient && c.gradientMap === "luminance") {
          const [r, gg, bb] = sampleGradient(activeStops, driver);
          cellFill = rgbToHex(r, gg, bb);
        }

        if (stretchOn) {
          const stretchFactorV = 1 + driver * sV * 8;
          const stretchFactorH = 1 + driver * sH * 8;
          const taperFactor = lerp(1, 1 - taper, driver);
          const rectW = (cellW - baseGap) * scaleW;
          const rectH = (cellH - baseGap) * scaleH;
          const stretchedW = axisH
            ? rectW * stretchFactorH
            : rectW * taperFactor * thickness;
          const stretchedH = axisV
            ? rectH * stretchFactorV
            : rectH * taperFactor * thickness;
          if (stretchedW < 0.05 || stretchedH < 0.05) continue;
          const sx = (cx - stretchedW / 2).toFixed(2);
          const sy = (cy - stretchedH / 2).toFixed(2);
          cells += `<rect x="${sx}" y="${sy}" width="${stretchedW.toFixed(2)}" height="${stretchedH.toFixed(2)}" fill="${cellFill}"/>`;
          continue;
        }

        const innerW = (cellW - baseGap) * scaleW;
        const innerH = (cellH - baseGap) * scaleH;
        if (innerW <= 0.1 || innerH <= 0.1) continue;
        const x = cx - innerW / 2;
        const y = cy - innerH / 2;
        if (g.shape === "circle") {
          cells += `<ellipse cx="${(x + innerW / 2).toFixed(2)}" cy="${(y + innerH / 2).toFixed(2)}" rx="${(innerW / 2).toFixed(2)}" ry="${(innerH / 2).toFixed(2)}" fill="${cellFill}"/>`;
        } else if (g.shape === "diamond") {
          cells += `<polygon points="${(x + innerW / 2).toFixed(2)},${y.toFixed(2)} ${(x + innerW).toFixed(2)},${(y + innerH / 2).toFixed(2)} ${(x + innerW / 2).toFixed(2)},${(y + innerH).toFixed(2)} ${x.toFixed(2)},${(y + innerH / 2).toFixed(2)}" fill="${cellFill}"/>`;
        } else {
          cells += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${innerW.toFixed(2)}" height="${innerH.toFixed(2)}" fill="${cellFill}"/>`;
        }
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="${bgFill}"/>${cells}</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    downloadBlob(blob, filename);
  }

  function startRecording(opts: RecordingOptions = {}): RecordingHandle | null {
    if (typeof MediaRecorder === "undefined") return null;
    const fps = opts.fps ?? 30;
    const capture = (canvas as unknown as { captureStream: (fps: number) => MediaStream }).captureStream;
    if (typeof capture !== "function") return null;
    const stream = capture.call(canvas, fps);
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const rec = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: opts.bitrate ?? 8_000_000,
    });
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      downloadBlob(blob, opts.filename ?? "dither.webm");
      if (opts.onStop) opts.onStop();
    };
    rec.start();
    return {
      stop() {
        try {
          rec.stop();
        } catch {}
      },
    };
  }

  function destroy(): void {
    stop();
    mediaEl = null;
    audioFn = null;
    state = null;
  }

  return {
    setSettings,
    setMedia,
    setAudio,
    resizeCanvasToTarget,
    invalidate,
    start,
    stop,
    exportPNG,
    exportSVG,
    startRecording,
    destroy,
    drawNow: draw,
    getCanvas: () => canvas,
  };
}
