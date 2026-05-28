// Dithering canvas renderer.
// Decoupled from React: takes a settings object + a media source and draws to a canvas.
// Uses requestAnimationFrame for continuous rendering when video/audio is active.

(function () {
  // ---- Math helpers ----
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; // 0..1

  // Parse "#rrggbb" -> [r,g,b]
  function hexToRgb(hex) {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map((v) => clamp(v | 0, 0, 255).toString(16).padStart(2, "0")).join("");
  }

  // Sample a gradient at t in 0..1
  function sampleGradient(stops, t) {
    t = clamp(t, 0, 1);
    if (t <= stops[0].pos) return hexToRgb(stops[0].color);
    if (t >= stops[stops.length - 1].pos) return hexToRgb(stops[stops.length - 1].color);
    for (let i = 1; i < stops.length; i++) {
      const a = stops[i - 1];
      const b = stops[i];
      if (t >= a.pos && t <= b.pos) {
        const f = (t - a.pos) / (b.pos - a.pos || 1);
        const ca = hexToRgb(a.color);
        const cb = hexToRgb(b.color);
        return [lerp(ca[0], cb[0], f), lerp(ca[1], cb[1], f), lerp(ca[2], cb[2], f)];
      }
    }
    return hexToRgb(stops[0].color);
  }

  // -- Offscreen sampling canvas: scaled-down copy of source for fast luminance reads --
  function createDitherEngine(canvas) {
    const ctx = canvas.getContext("2d");
    const sampleCanvas = document.createElement("canvas");
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

    let state = null;        // current settings
    let mediaEl = null;      // HTMLImageElement | HTMLVideoElement | null
    let audioFn = null;      // () => { level, lowLevel, midLevel, highLevel, fullLevel }
    let rafHandle = null;
    let needsRedraw = true;  // set true to redraw next frame
    let dpr = window.devicePixelRatio || 1;
    let lastFrameTime = 0;
    let smoothedAudio = 0;   // additional smoothing on top of analyser

    function setSettings(next) {
      state = next;
      needsRedraw = true;
    }
    let mediaIsAnimated = false;  // true for animated GIFs (img element keeps changing each frame)
    function setMedia(el, opts) { mediaEl = el; mediaIsAnimated = !!(opts && opts.animated); needsRedraw = true; }
    function setAudio(fn) { audioFn = fn; needsRedraw = true; }
    function invalidate() { needsRedraw = true; }

    function resizeCanvasToTarget(targetW, targetH) {
      // Internal pixel size matches target dimensions for crisp export.
      // CSS sizing (display) is handled by the parent layout.
      const W = Math.max(2, Math.round(targetW));
      const H = Math.max(2, Math.round(targetH));
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      needsRedraw = true;
    }

    // Returns ImageData-like { data, w, h } scaled to a cols x rows grid
    function sampleMediaToGrid(cols, rows) {
      if (!mediaEl) return null;
      // Determine source dimensions
      const srcW = mediaEl.videoWidth || mediaEl.naturalWidth || mediaEl.width || 0;
      const srcH = mediaEl.videoHeight || mediaEl.naturalHeight || mediaEl.height || 0;
      if (!srcW || !srcH) return null;

      // Sample to a low-res buffer matching grid resolution (or a bit higher for averaging)
      const W = cols;
      const H = rows;
      if (sampleCanvas.width !== W || sampleCanvas.height !== H) {
        sampleCanvas.width = W;
        sampleCanvas.height = H;
      }
      sampleCtx.clearRect(0, 0, W, H);

      // Fit media inside canvas according to state.canvas.fit
      const fit = (state && state.canvas && state.canvas.fit) || "cover";
      const canvasAR = canvas.width / canvas.height;
      const srcAR = srcW / srcH;

      if (fit === "stretch") {
        // Fill the whole canvas regardless of aspect — distort source.
        sampleCtx.drawImage(mediaEl, 0, 0, srcW, srcH, 0, 0, W, H);
      } else if (fit === "contain") {
        // Fit fully inside the canvas, letterboxing as needed.
        let dw, dh, dx, dy;
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
        // "cover" — fill canvas, crop the overflow on the long axis.
        let sx = 0, sy = 0, sw = srcW, sh = srcH;
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
      } catch (e) {
        return null;
      }
    }

    function getAudioBoost() {
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
      // Additional smoothing on top of analyser's built-in
      const smoothing = clamp(a.smoothing, 0, 0.95);
      smoothedAudio = smoothedAudio * smoothing + v * (1 - smoothing);
      return clamp(smoothedAudio, 0, 2); // 0..2 (can boost above 1)
    }

    function draw() {
      if (!state) return;
      const c = state.color;
      const g = state.grid;

      const W = canvas.width;
      const H = canvas.height;

      // Resolve active gradient stops (preset or user-edited custom list)
      const activeStops = resolveStops();

      // Background
      let bgFill = c.bg;
      if (c.useGradientBg) {
        bgFill = buildCanvasGradient(activeStops);
      }
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, W, H);

      const cols = clamp(g.cols | 0, 2, 600);
      const rows = clamp(g.rows | 0, 2, 600);
      const cellW = W / cols;
      const cellH = H / rows;
      const baseGap = clamp(g.gap, 0, Math.min(cellW, cellH) - 0.2);
      // Stretch becomes a per-cell rect transform: bright cells extend in the chosen axis
      // (up to ~9× cell length) AND get thinner on the perpendicular axis by `taper`.
      // Combined, this draws elongated, gradually-thinning needles that escape the grid.
      const stretchOn = !!g.stretchEnabled;
      const stretchAxis = g.stretchAxis || "vertical";
      const sH = clamp((g.stretchH ?? 0) / 100, 0, 1);
      const sV = clamp((g.stretchV ?? 0) / 100, 0, 1);
      const thickness = clamp((g.lineThickness ?? 100) / 100, 0, 1);
      const taper = clamp((g.lineTaper ?? 0) / 100, 0, 1);
      const axisH = stretchOn && (stretchAxis === "horizontal" || stretchAxis === "both");
      const axisV = stretchOn && (stretchAxis === "vertical" || stretchAxis === "both");

      const sampled = sampleMediaToGrid(cols, rows);

      const audioMix = state.audio.mix;
      const useAudio = (audioMix === "audio" || audioMix === "media+audio") && audioFn;
      const useMedia = (audioMix === "media" || audioMix === "media+audio") && sampled;
      const audioBoost = useAudio ? getAudioBoost() : 0;
      const audioInfluence = clamp(state.audio.influence, 0, 1);

      // Foreground fill resolution.
      // Critical: when the background is also a gradient, we MUST explicitly set
      // a non-gradient fill for cells, otherwise they inherit the bg fillStyle and disappear.
      const fgGradient = c.useGradientFg ? buildCanvasGradient(activeStops) : null;
      const fgIsPerCell = c.useGradientFg && c.gradientMap === "luminance";
      if (c.useGradientFg && c.gradientMap === "position" && fgGradient) {
        ctx.fillStyle = fgGradient;
      } else if (!fgIsPerCell) {
        ctx.fillStyle = c.fg;
      }

      // Audio-only mode amplifies all cells; media-only modes ignore audioBoost in size
      const minH = clamp(g.minH / 100, 0, 1);
      const maxH = clamp(g.maxH / 100, 0, 1);
      const minW = clamp(g.minW / 100, 0, 1);
      const maxW = clamp(g.maxW / 100, 0, 1);
      const intensity = clamp(g.intensity, 0, 2);
      const threshold = clamp(g.threshold, 0, 1);

      const mode = g.mode; // "height" | "width" | "both"
      const data = sampled ? sampled.data : null;

      // Pre-compute contrast/gamma helpers
      const contrast = clamp(g.contrast, 0, 3);
      const gamma = clamp(g.gamma, 0.1, 3);
      const invert = !!g.invert;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // ---- compute t (brightness driver, 0..1) ----
          let t = 0.5;
          if (useMedia && data) {
            const i = (row * cols + col) * 4;
            t = lum(data[i], data[i + 1], data[i + 2]);
          } else if (!useMedia && useAudio) {
            t = 0.5; // baseline; audio modulates equally
          } else if (!useMedia && !useAudio) {
            // No media + no audio — show a static centered cell pattern
            t = 0.5;
          }
          // contrast & gamma
          t = 0.5 + (t - 0.5) * contrast;
          t = clamp(t, 0, 1);
          t = Math.pow(t, 1 / gamma);
          if (invert) t = 1 - t;
          if (threshold > 0) t = t < threshold ? 0 : (t - threshold) / (1 - threshold);
          // intensity (scale around 0)
          t = clamp(t * intensity, 0, 1);

          // ---- audio modulation ----
          let driver = t;
          if (useAudio) {
            if (audioMix === "audio") {
              driver = clamp(audioBoost, 0, 1);
            } else {
              driver = clamp(t + audioBoost * audioInfluence, 0, 1);
            }
          }

          // ---- compute cell size from mode ----
          let scaleH = 1, scaleW = 1;
          if (mode === "height") {
            scaleH = lerp(minH, maxH, driver);
            scaleW = lerp(minW, maxW, 1); // keep at max width (fixed)
          } else if (mode === "width") {
            scaleW = lerp(minW, maxW, driver);
            scaleH = lerp(minH, maxH, 1);
          } else {
            scaleH = lerp(minH, maxH, driver);
            scaleW = lerp(minW, maxW, driver);
          }

          const cx = col * cellW + cellW / 2;
          const cy = row * cellH + cellH / 2;

          // ---- fill resolution (per-cell when fg gradient is luminance-mapped) ----
          if (fgIsPerCell) {
            const [r, gg, bb] = sampleGradient(activeStops, driver);
            ctx.fillStyle = rgbToHex(r, gg, bb);
          }

          if (stretchOn) {
            // Rect-based stretch: bright cells extend by (1 + driver * s * 8) on the axes
            // where stretch is enabled; on the OTHER axes, the cell is narrowed by
            // taper (bright cells get thinner) and by global thickness.
            const stretchFactorV = 1 + driver * sV * 8;
            const stretchFactorH = 1 + driver * sH * 8;
            const taperFactor = lerp(1, 1 - taper, driver);

            // Base rect derived from the deformation mode's scaleH/scaleW + cellW/H.
            const rectW = (cellW - baseGap) * scaleW;
            const rectH = (cellH - baseGap) * scaleH;

            const stretchedW = axisH ? rectW * stretchFactorH : rectW * taperFactor * thickness;
            const stretchedH = axisV ? rectH * stretchFactorV : rectH * taperFactor * thickness;
            if (stretchedW < 0.05 || stretchedH < 0.05) continue;

            ctx.fillRect(cx - stretchedW / 2, cy - stretchedH / 2, stretchedW, stretchedH);
            continue;
          }

          // ---- standard rect/shape mode ----
          const innerW = (cellW - baseGap) * scaleW;
          const innerH = (cellH - baseGap) * scaleH;
          if (innerW <= 0.1 || innerH <= 0.1) continue;
          const x = cx - innerW / 2;
          const y = cy - innerH / 2;

          drawShape(g.shape, x, y, innerW, innerH);
        }
      }
    }

    function drawShape(shape, x, y, w, h) {
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

    function resolveStops() {
      const c = state.color;
      if (c.presetId === "custom" && Array.isArray(c.customStops) && c.customStops.length >= 2) {
        // Sort + clamp positions in case the editor handed us unsorted stops.
        return [...c.customStops]
          .map((s) => ({ pos: clamp(s.pos, 0, 1), color: s.color }))
          .sort((a, b) => a.pos - b.pos);
      }
      const preset = window.GRADIENT_PRESETS.find((p) => p.id === c.presetId) || window.GRADIENT_PRESETS[0];
      return preset.stops;
    }

    function buildCanvasGradient(stops) {
      const c = state.color;
      const W = canvas.width, H = canvas.height;
      let grad;
      if (c.gradientType === "radial") {
        const cx = W / 2, cy = H / 2;
        const r = Math.max(W, H) / 1.2;
        grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      } else {
        const angle = ((c.gradientAngle || 0) * Math.PI) / 180;
        const cx = W / 2, cy = H / 2;
        const len = Math.max(W, H);
        const dx = Math.cos(angle) * len / 2;
        const dy = Math.sin(angle) * len / 2;
        grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
      }
      stops.forEach((s) => grad.addColorStop(clamp(s.pos, 0, 1), s.color));
      return grad;
    }

    function frame(now) {
      const isVideoLive = mediaEl && mediaEl.tagName === "VIDEO" && !mediaEl.paused && !mediaEl.ended;
      const isAudioLive = !!audioFn;
      const isGifLive = !!(mediaEl && mediaIsAnimated && mediaEl.tagName === "IMG");
      const live = isVideoLive || isAudioLive || isGifLive;
      if (needsRedraw || live) {
        draw();
        needsRedraw = false;
      }
      lastFrameTime = now;
      rafHandle = requestAnimationFrame(frame);
    }

    function start() {
      if (rafHandle != null) return;
      rafHandle = requestAnimationFrame(frame);
    }
    function stop() {
      if (rafHandle != null) {
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }
    }

    function exportPNG(filename = "dither.png") {
      // ensure latest frame
      draw();
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    }

    function exportSVG(filename = "dither.svg") {
      // Render the current state into an SVG string by walking the same grid.
      if (!state) return;
      const g = state.grid;
      const c = state.color;
      const W = canvas.width, H = canvas.height;
      const cols = clamp(g.cols | 0, 2, 600);
      const rows = clamp(g.rows | 0, 2, 600);
      const cellW = W / cols;
      const cellH = H / rows;
      const baseGap = clamp(g.gap, 0, Math.min(cellW, cellH) - 0.2);
      const stretchOn = !!g.stretchEnabled;
      const stretchAxis = g.stretchAxis || "vertical";
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
      const useAudio = (audioMix === "audio" || audioMix === "media+audio") && audioFn;
      const useMedia = (audioMix === "media" || audioMix === "media+audio") && sampled;
      const audioBoost = useAudio ? getAudioBoost() : 0;
      const audioInfluence = clamp(state.audio.influence, 0, 1);

      let defs = "";
      let bgFill = c.bg;
      let fgFill = c.fg;
      if (c.useGradientBg || c.useGradientFg) {
        const stopsXml = activeStops.map((s) => `<stop offset="${(s.pos * 100).toFixed(2)}%" stop-color="${s.color}"/>`).join("");
        const id = "g0";
        if (c.gradientType === "radial") {
          defs += `<radialGradient id="${id}" cx="50%" cy="50%" r="60%">${stopsXml}</radialGradient>`;
        } else {
          const angle = c.gradientAngle || 0;
          defs += `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${W/2}" y1="${H/2}" x2="${W/2 + Math.cos((angle*Math.PI)/180)*W}" y2="${H/2 + Math.sin((angle*Math.PI)/180)*H}">${stopsXml}</linearGradient>`;
        }
        if (c.useGradientBg) bgFill = `url(#${id})`;
        if (c.useGradientFg && c.gradientMap === "position") fgFill = `url(#${id})`;
      }

      let cells = "";
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let t = 0.5;
          if (useMedia && data) {
            const i = (row * cols + col) * 4;
            t = (0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2]) / 255;
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
          let scaleH = 1, scaleW = 1;
          if (mode === "height") { scaleH = lerp(minH, maxH, driver); scaleW = lerp(minW, maxW, 1); }
          else if (mode === "width") { scaleW = lerp(minW, maxW, driver); scaleH = lerp(minH, maxH, 1); }
          else { scaleH = lerp(minH, maxH, driver); scaleW = lerp(minW, maxW, driver); }
          const cx = col * cellW + cellW / 2;
          const cy = row * cellH + cellH / 2;
          let cellFill = fgFill;
          if (c.useGradientFg && c.gradientMap === "luminance") {
            const [r, gg, bb] = sampleGradient(activeStops, driver);
            cellFill = rgbToHex(r, gg, bb);
          }

          if (stretchOn) {
            const stretchFactorV = 1 + driver * sV * 8;
            const stretchFactorH = 1 + driver * sH * 8;
            const taperFactor = lerp(1, 1 - taper, driver);
            const rectW = (cellW - baseGap) * scaleW;
            const rectH = (cellH - baseGap) * scaleH;
            const stretchedW = axisH ? rectW * stretchFactorH : rectW * taperFactor * thickness;
            const stretchedH = axisV ? rectH * stretchFactorV : rectH * taperFactor * thickness;
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
            cells += `<ellipse cx="${(x + innerW/2).toFixed(2)}" cy="${(y + innerH/2).toFixed(2)}" rx="${(innerW/2).toFixed(2)}" ry="${(innerH/2).toFixed(2)}" fill="${cellFill}"/>`;
          } else if (g.shape === "diamond") {
            cells += `<polygon points="${(x+innerW/2).toFixed(2)},${y.toFixed(2)} ${(x+innerW).toFixed(2)},${(y+innerH/2).toFixed(2)} ${(x+innerW/2).toFixed(2)},${(y+innerH).toFixed(2)} ${x.toFixed(2)},${(y+innerH/2).toFixed(2)}" fill="${cellFill}"/>`;
          } else {
            cells += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${innerW.toFixed(2)}" height="${innerH.toFixed(2)}" fill="${cellFill}"/>`;
          }
        }
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${defs}</defs>
<rect width="${W}" height="${H}" fill="${bgFill}"/>
${cells}
</svg>`;
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // Returns a MediaRecorder that captures canvas as webm video.
    function startRecording(opts = {}) {
      const stream = canvas.captureStream(opts.fps || 30);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: opts.bitrate || 8_000_000 });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = opts.filename || "dither.webm";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        if (opts.onStop) opts.onStop();
      };
      rec.start();
      return rec;
    }

    function destroy() {
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
      get canvas() { return canvas; },
    };
  }

  window.createDitherEngine = createDitherEngine;
})();
