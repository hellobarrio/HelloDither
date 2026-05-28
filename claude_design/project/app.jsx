// Main App: hosts the canvas, wires media/audio engines, and renders the sidebar.

const {
  useState: aState,
  useEffect: aEff,
  useRef: aRef,
  useCallback: aCb,
  useMemo: aMemo,
} = React;

const VALID_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const VALID_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const VALID_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/wave",
  "audio/mp3",
  "audio/x-wav",
];
const MAX_BYTES = 200 * 1024 * 1024;

function formatTime(sec) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function App() {
  // ---- State ----
  const [state, setState] = aState(window.DEFAULT_STATE);
  const stateRef = aRef(state);
  aEff(() => {
    stateRef.current = state;
  }, [state]);

  const [toasts, setToasts] = aState([]);
  const [recording, setRecording] = aState(false);
  const [spectrumBars, setSpectrumBars] = aState(() => new Array(28).fill(0));

  // ---- Refs (live values, not in React state) ----
  const canvasRef = aRef(null);
  const engineRef = aRef(null);
  const audioEngineRef = aRef(null);
  const mediaElementRef = aRef(null); // image or video el (used for sampling)
  const mediaUrlRef = aRef(null);
  const audioElementRef = aRef(null); // <audio> element
  const audioUrlRef = aRef(null);
  const recorderRef = aRef(null);
  const spectrumRafRef = aRef(null);

  const update = aCb((patch) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  // ---- Toasts ----
  const pushToast = aCb((message, kind = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  // ---- Engine init ----
  aEff(() => {
    if (!canvasRef.current) return;
    const engine = window.createDitherEngine(canvasRef.current);
    engineRef.current = engine;
    engine.setSettings(stateRef.current);
    engine.resizeCanvasToTarget(state.canvas.width, state.canvas.height);
    engine.start();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // ---- Push state to engine on each change ----
  aEff(() => {
    const e = engineRef.current;
    if (!e) return;
    e.setSettings(state);
    e.resizeCanvasToTarget(state.canvas.width, state.canvas.height);
    if (audioEngineRef.current)
      audioEngineRef.current.setSmoothing(state.audio.smoothing);
  }, [state]);

  // ---- File validation + upload ----
  const onUpload = aCb((file, role) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      pushToast(`File too large (${(file.size / 1e6).toFixed(1)} MB)`, "error");
      return;
    }
    if (role === "media") {
      if (VALID_IMAGE_TYPES.includes(file.type)) loadImage(file);
      else if (VALID_VIDEO_TYPES.includes(file.type)) loadVideo(file);
      else pushToast(`Unsupported media: ${file.type || file.name}`, "error");
    } else if (role === "audio") {
      if (
        VALID_AUDIO_TYPES.includes(file.type) ||
        /\.(mp3|wav)$/i.test(file.name)
      )
        loadAudio(file);
      else pushToast(`Unsupported audio: ${file.type || file.name}`, "error");
    }
  }, []);

  // ---- Image loader ----
  const loadImage = aCb((file) => {
    clearMediaInternal();
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous";
    const isGif = file.type === "image/gif" || /\.gif$/i.test(file.name);
    img.onload = () => {
      // For animated GIFs we keep the <img> attached to the DOM so the browser keeps
      // ticking its animation. Note: opacity:0 / display:none / off-screen images get
      // their animation suspended by some browsers — so we mount it tiny but visible
      // in a corner behind the toolbar where the user won't notice.
      if (isGif) {
        img.style.cssText =
          "position:fixed;top:0;left:0;width:2px;height:2px;z-index:-1;pointer-events:none;";
        document.body.appendChild(img);
      }
      mediaElementRef.current = img;
      mediaUrlRef.current = url;
      engineRef.current?.setMedia(img, { animated: isGif });
      setState((s) => ({
        ...s,
        media: {
          kind: "image",
          name: file.name,
          width: img.naturalWidth,
          height: img.naturalHeight,
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          url,
          animated: isGif,
        },
      }));
      pushToast(
        isGif ? `Loaded ${file.name} (animated)` : `Loaded ${file.name}`,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      pushToast("Image failed to load", "error");
    };
    img.src = url;
  }, []);

  // ---- Video loader ----
  const loadVideo = aCb((file) => {
    clearMediaInternal();
    const url = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.crossOrigin = "anonymous";
    vid.src = url;
    vid.muted = true; // muted so we can autoplay; audio reactivity uses the separate audio file
    vid.playsInline = true;
    vid.loop = true;
    vid.preload = "auto";
    vid.onloadedmetadata = () => {
      mediaElementRef.current = vid;
      mediaUrlRef.current = url;
      engineRef.current?.setMedia(vid);
      setState((s) => ({
        ...s,
        media: {
          kind: "video",
          name: file.name,
          width: vid.videoWidth,
          height: vid.videoHeight,
          isPlaying: false,
          currentTime: 0,
          duration: vid.duration,
          url,
        },
      }));
      vid
        .play()
        .then(() => {
          setState((s) => ({ ...s, media: { ...s.media, isPlaying: true } }));
        })
        .catch(() => {});
      pushToast(`Loaded ${file.name}`);
    };
    vid.onerror = () => {
      URL.revokeObjectURL(url);
      pushToast("Video failed to load", "error");
    };

    vid.addEventListener("timeupdate", () => {
      setState((s) =>
        s.media.kind === "video"
          ? {
              ...s,
              media: {
                ...s.media,
                currentTime: vid.currentTime,
                duration: vid.duration || s.media.duration,
              },
            }
          : s,
      );
    });
    vid.addEventListener("play", () =>
      setState((s) =>
        s.media.kind === "video"
          ? { ...s, media: { ...s.media, isPlaying: true } }
          : s,
      ),
    );
    vid.addEventListener("pause", () =>
      setState((s) =>
        s.media.kind === "video"
          ? { ...s, media: { ...s.media, isPlaying: false } }
          : s,
      ),
    );
  }, []);

  // ---- Audio loader ----
  const loadAudio = aCb((file) => {
    clearAudioInternal();
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.src = url;
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.loop = true;
    audio.onloadedmetadata = () => {
      audioElementRef.current = audio;
      audioUrlRef.current = url;
      if (!audioEngineRef.current)
        audioEngineRef.current = window.createAudioEngine();
      audioEngineRef.current.attach(audio);
      audioEngineRef.current.setSmoothing(stateRef.current.audio.smoothing);
      engineRef.current?.setAudio(() => audioEngineRef.current?.read());
      setState((s) => ({
        ...s,
        audio: {
          ...s.audio,
          loaded: true,
          name: file.name,
          duration: audio.duration,
          currentTime: 0,
          isPlaying: false,
        },
      }));
      startSpectrumLoop();
      pushToast(`Loaded ${file.name}`);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      pushToast("Audio failed to load", "error");
    };
    audio.addEventListener("timeupdate", () => {
      setState((s) =>
        s.audio.loaded
          ? {
              ...s,
              audio: {
                ...s.audio,
                currentTime: audio.currentTime,
                duration: audio.duration || s.audio.duration,
              },
            }
          : s,
      );
    });
    audio.addEventListener("play", () =>
      setState((s) => ({ ...s, audio: { ...s.audio, isPlaying: true } })),
    );
    audio.addEventListener("pause", () =>
      setState((s) => ({ ...s, audio: { ...s.audio, isPlaying: false } })),
    );
  }, []);

  // ---- Spectrum visualization loop ----
  const startSpectrumLoop = aCb(() => {
    if (spectrumRafRef.current) cancelAnimationFrame(spectrumRafRef.current);
    const tick = () => {
      const ae = audioEngineRef.current;
      if (ae && ae.isAttached) {
        const m = ae.read();
        if (m && m.freq) {
          const N = 28;
          const out = new Array(N);
          const step = m.freq.length / N;
          for (let i = 0; i < N; i++) {
            let sum = 0;
            const start = Math.floor(i * step);
            const end = Math.floor((i + 1) * step);
            for (let j = start; j < end; j++) sum += m.freq[j];
            out[i] = sum / Math.max(1, end - start) / 255;
          }
          setSpectrumBars(out);
        }
      }
      spectrumRafRef.current = requestAnimationFrame(tick);
    };
    spectrumRafRef.current = requestAnimationFrame(tick);
  }, []);

  // ---- Cleanup helpers ----
  function clearMediaInternal() {
    const v = mediaElementRef.current;
    if (v && v.tagName === "VIDEO") {
      try {
        v.pause();
        v.src = "";
        v.load();
      } catch (e) {}
    }
    // If a GIF img was attached to the DOM for animation ticking, detach it.
    if (v && v.tagName === "IMG" && v.parentNode) v.parentNode.removeChild(v);
    if (mediaUrlRef.current) URL.revokeObjectURL(mediaUrlRef.current);
    mediaElementRef.current = null;
    mediaUrlRef.current = null;
    engineRef.current?.setMedia(null);
  }
  function clearAudioInternal() {
    if (audioEngineRef.current) audioEngineRef.current.detach();
    const a = audioElementRef.current;
    if (a) {
      try {
        a.pause();
        a.src = "";
      } catch (e) {}
    }
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioElementRef.current = null;
    audioUrlRef.current = null;
    engineRef.current?.setAudio(null);
    if (spectrumRafRef.current) cancelAnimationFrame(spectrumRafRef.current);
    spectrumRafRef.current = null;
    setSpectrumBars(new Array(28).fill(0));
  }
  const clearMedia = aCb(() => {
    clearMediaInternal();
    setState((s) => ({
      ...s,
      media: {
        kind: "none",
        name: "",
        width: 0,
        height: 0,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
      },
    }));
  }, []);
  const clearAudio = aCb(() => {
    clearAudioInternal();
    setState((s) => ({
      ...s,
      audio: {
        ...s.audio,
        loaded: false,
        name: "",
        isPlaying: false,
        currentTime: 0,
        duration: 0,
      },
    }));
  }, []);

  // ---- Cleanup on unmount ----
  aEff(() => {
    return () => {
      clearMediaInternal();
      clearAudioInternal();
      if (audioEngineRef.current) audioEngineRef.current.destroy();
      if (recorderRef.current)
        try {
          recorderRef.current.stop();
        } catch (e) {}
    };
  }, []);

  // ---- Playback toggles ----
  const togglePlayMedia = aCb(() => {
    const v = mediaElementRef.current;
    if (!v || v.tagName !== "VIDEO") return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    // Sync audio if requested
    if (stateRef.current.audio.syncWithVideo && audioElementRef.current) {
      if (v.paused) audioElementRef.current.pause();
      else audioElementRef.current.play().catch(() => {});
    }
  }, []);

  const togglePlayAudio = aCb(() => {
    const a = audioElementRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
    // Sync media if video and toggle is on
    if (
      stateRef.current.audio.syncWithVideo &&
      mediaElementRef.current &&
      mediaElementRef.current.tagName === "VIDEO"
    ) {
      if (a.paused) mediaElementRef.current.pause();
      else mediaElementRef.current.play().catch(() => {});
    }
  }, []);

  const togglePlayAll = aCb(() => {
    const hasVid =
      mediaElementRef.current && mediaElementRef.current.tagName === "VIDEO";
    const hasAud = !!audioElementRef.current;
    if (hasVid && (!hasAud || stateRef.current.audio.syncWithVideo))
      togglePlayMedia();
    else if (hasAud) togglePlayAudio();
    else if (hasVid) togglePlayMedia();
  }, []);

  // ---- Fit canvas to media ----
  const fitToMedia = aCb(() => {
    const el = mediaElementRef.current;
    if (!el) return;
    const w = el.naturalWidth || el.videoWidth;
    const h = el.naturalHeight || el.videoHeight;
    if (!w || !h) return;
    // Cap to max 1920 for perf
    let W = w,
      H = h;
    const cap = 1920;
    if (W > cap || H > cap) {
      const s = cap / Math.max(W, H);
      W = Math.round(W * s);
      H = Math.round(H * s);
    }
    update({
      canvas: {
        ...stateRef.current.canvas,
        preset: "custom",
        width: W,
        height: H,
      },
    });
    pushToast(`Canvas set to ${W}×${H}`);
  }, [update]);

  // ---- Seek ----
  const seekMedia = aCb((t) => {
    const v = mediaElementRef.current;
    if (v && v.tagName === "VIDEO") v.currentTime = t;
  }, []);
  const seekAudio = aCb((t) => {
    const a = audioElementRef.current;
    if (a) a.currentTime = t;
  }, []);

  // ---- Exports ----
  const exportPNG = aCb(() => {
    engineRef.current?.exportPNG(`dither-${Date.now()}.png`);
    pushToast("PNG exported");
  }, []);
  const exportSVG = aCb(() => {
    engineRef.current?.exportSVG(`dither-${Date.now()}.svg`);
    pushToast("SVG exported");
  }, []);
  const toggleRecord = aCb(() => {
    if (recording) {
      try {
        recorderRef.current?.stop();
      } catch (e) {}
      recorderRef.current = null;
      setRecording(false);
    } else {
      const rec = engineRef.current?.startRecording({
        fps: 30,
        filename: `dither-${Date.now()}.webm`,
        onStop: () => setRecording(false),
      });
      if (rec) {
        recorderRef.current = rec;
        setRecording(true);
        pushToast("Recording started");
      } else pushToast("Recording not supported in this browser", "error");
    }
  }, [recording]);

  // ---- Canvas CSS sizing (fit container) ----
  const stageRef = aRef(null);
  const [stageScale, setStageScale] = aState(1);
  aEff(() => {
    if (!stageRef.current) return;
    const ro = new ResizeObserver(() => updateStageScale());
    ro.observe(stageRef.current);
    updateStageScale();
    return () => ro.disconnect();
    function updateStageScale() {
      const rect = stageRef.current.getBoundingClientRect();
      const pad = 32 * 2;
      const sw = rect.width - pad;
      const sh = rect.height - pad;
      const cw = stateRef.current.canvas.width;
      const ch = stateRef.current.canvas.height;
      const s = Math.min(sw / cw, sh / ch, 1);
      setStageScale(Math.max(0.05, s));
    }
  }, []);
  aEff(() => {
    // recompute on canvas dims change
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const pad = 32 * 2;
    const sw = rect.width - pad;
    const sh = rect.height - pad;
    const s = Math.min(sw / state.canvas.width, sh / state.canvas.height, 1);
    setStageScale(Math.max(0.05, s));
  }, [state.canvas.width, state.canvas.height]);

  // ---- Render ----
  const m = state.media;
  const a = state.audio;
  const hasMedia = m.kind !== "none";
  const isPlayingAny = m.isPlaying || a.isPlaying;
  const expert = state.ui.mode === "expert";

  return (
    <div className="app">
      {/* Top toolbar */}
      <div className="toolbar">
        <div className="tb-section">
          <span className="logo">HelloDither</span>
        </div>
        <div className="tb-section">
          <label className="btn small" style={{ cursor: "pointer" }}>
            <Icons.Upload size={11} /> Upload
            <input
              type="file"
              className="sr-only"
              accept="image/*,video/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f, "media");
                e.target.value = "";
              }}
            />
          </label>
          <label className="btn small" style={{ cursor: "pointer" }}>
            <Icons.Music size={11} /> Audio
            <input
              type="file"
              className="sr-only"
              accept="audio/*,.mp3,.wav"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f, "audio");
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <div className="tb-section flex-grow no-border" />
        <div
          className="tb-section right"
          style={{
            borderRight: 0,
            justifyContent: "space-between",
            width: "339px",
          }}
          data-comment-anchor="910ab08f61-div-393-9"
        >
          <div className="mode-toggle">
            <button
              className={"pill" + (state.ui.mode === "basic" ? " active" : "")}
              onClick={() => update({ ui: { ...state.ui, mode: "basic" } })}
              style={{ height: "28px" }}
            >
              Basic
            </button>
            <button
              className={"pill" + (state.ui.mode === "expert" ? " active" : "")}
              onClick={() => update({ ui: { ...state.ui, mode: "expert" } })}
              style={{ height: "28px" }}
            >
              Expert
            </button>
          </div>
          <Popover
            trigger={
              <button className="btn dark small">
                <Icons.Download size={12} /> Export
              </button>
            }
          >
            <button onClick={exportPNG}>
              <Icons.Image size={11} /> PNG
            </button>
            <button onClick={exportSVG}>
              <Icons.Diamond size={11} /> SVG
            </button>
            <button onClick={toggleRecord}>
              <Icons.Record size={11} />{" "}
              {recording ? "Stop recording (WebM)" : "Record WebM"}
            </button>
            <button
              className="disabled"
              title="Use 'Record WebM' then convert with ffmpeg"
              onClick={(e) => e.stopPropagation()}
            >
              <Icons.Video size={11} /> MP4 (via WebM)
            </button>
            <button
              className="disabled"
              title="GIF export not yet wired — use WebM + external tool"
              onClick={(e) => e.stopPropagation()}
            >
              <Icons.Activity size={11} /> GIF (planned)
            </button>
          </Popover>
        </div>
      </div>

      {/* Body */}
      <div className="body">
        {/* Canvas area */}
        <div className="canvas-area">
          <div
            className="canvas-stage"
            ref={stageRef}
            data-comment-anchor="05c49f7e9a-div-403-11"
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (!f) return;
              if (f.type.startsWith("audio/") || /\.(mp3|wav)$/i.test(f.name))
                onUpload(f, "audio");
              else onUpload(f, "media");
            }}
          >
            <div
              className="canvas-wrap"
              style={{
                width: state.canvas.width * stageScale,
                height: state.canvas.height * stageScale,
                outlineColor: recording ? "var(--primary)" : "var(--fg-1)",
                visibility: hasMedia ? "visible" : "hidden",
              }}
            >
              <canvas
                ref={canvasRef}
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            {!hasMedia ? (
              <div className="empty-canvas-cta">
                <div className="empty-load-text">Load an image</div>
              </div>
            ) : null}

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
                className="icon-btn small"
                onClick={fitToMedia}
                disabled={!hasMedia}
                title="Fit canvas to media"
                aria-label="Fit canvas to media"
              >
                <Icons.Maximize size={11} />
              </button>
              <button
                className="icon-btn small"
                onClick={() =>
                  update({ grid: { ...window.DEFAULT_STATE.grid } })
                }
                title="Reset grid to defaults"
                aria-label="Reset grid"
              >
                <Icons.Refresh size={11} />
              </button>
            </div>
          </div>

          {/* Playback bar */}
          <div className="playbar">
            <button
              className={"icon-btn"}
              onClick={togglePlayAll}
              disabled={!(m.kind === "video" || a.loaded)}
              title="Play/pause"
            >
              {isPlayingAny ? (
                <Icons.Pause size={13} />
              ) : (
                <Icons.Play size={13} />
              )}
            </button>

            {m.kind === "video" ? (
              <Scrubber
                value={m.currentTime}
                max={m.duration}
                onSeek={seekMedia}
                className=""
              />
            ) : a.loaded ? (
              <Scrubber
                value={a.currentTime}
                max={a.duration}
                onSeek={seekAudio}
                className="audio-track"
              />
            ) : (
              <div className="scrubber">
                <div className="scrubber-track" />
              </div>
            )}

            <div className="time">
              {m.kind === "video"
                ? `${formatTime(m.currentTime)} / ${formatTime(m.duration)}`
                : a.loaded
                  ? `${formatTime(a.currentTime)} / ${formatTime(a.duration)}`
                  : "—:—— / —:——"}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          <MediaSection
            state={state}
            update={update}
            onUpload={onUpload}
            onClearMedia={clearMedia}
            expert={expert}
          />
          <CanvasSection
            state={state}
            update={update}
            fitToMedia={fitToMedia}
            expert={expert}
          />
          <GridSection state={state} update={update} expert={expert} />
          <ColorSection state={state} update={update} expert={expert} />
          <AudioSection
            state={state}
            update={update}
            onUpload={onUpload}
            onClearAudio={clearAudio}
            onTogglePlay={togglePlayAudio}
            expert={expert}
          />
        </div>
      </div>

      <ToastHost toasts={toasts} />
    </div>
  );
}

function Scrubber({ value, max, onSeek, className = "" }) {
  const ref = aRef(null);
  const [dragging, setDragging] = aState(false);
  const pct = max > 0 ? (value / max) * 100 : 0;

  const handle = aCb(
    (clientX) => {
      if (!ref.current || !max) return;
      const r = ref.current.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      onSeek(t * max);
    },
    [max, onSeek],
  );

  aEff(() => {
    if (!dragging) return;
    const mv = (e) => handle(e.touches ? e.touches[0].clientX : e.clientX);
    const up = () => setDragging(false);
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", mv);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", mv);
      window.removeEventListener("touchend", up);
    };
  }, [dragging, handle]);

  return (
    <div
      ref={ref}
      className={"scrubber " + className}
      onMouseDown={(e) => {
        setDragging(true);
        handle(e.clientX);
      }}
      onTouchStart={(e) => {
        setDragging(true);
        handle(e.touches[0].clientX);
      }}
    >
      <div className="scrubber-track">
        <div className="scrubber-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="scrubber-head" style={{ left: `${pct}%` }} />
    </div>
  );
}

window.App = App;

// Mount
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
