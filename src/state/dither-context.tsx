"use client";

import * as React from "react";
import { toast as sonnerToast } from "sonner";
import {
  DEFAULT_STATE,
  MAX_BYTES,
  VALID_AUDIO_TYPES,
  VALID_IMAGE_TYPES,
  VALID_VIDEO_TYPES,
} from "@/lib/presets";
import { createAudioEngine } from "@/lib/engines/audio-engine";
import { createDitherEngine } from "@/lib/engines/dither-engine";
import { exportGIF } from "@/lib/engines/gif-export";
import type {
  AudioEngine,
  AudioReading,
  DitherEngine,
  DitherState,
  GifExportOptions,
  RecordingHandle,
  ToastKind,
} from "@/lib/types";

type FileRole = "media" | "audio";

interface DitherActions {
  update: (patch: Partial<DitherState>) => void;
  setCanvasRef: (el: HTMLCanvasElement | null) => void;
  setStageEl: (el: HTMLElement | null) => void;
  loadFile: (file: File, role: FileRole) => void;
  clearMedia: () => void;
  clearAudio: () => void;
  togglePlayMedia: () => void;
  togglePlayAudio: () => void;
  togglePlayAll: () => void;
  seekMedia: (t: number) => void;
  seekAudio: (t: number) => void;
  fitToMedia: () => void;
  resetGrid: () => void;
  setMode: (mode: "basic" | "expert") => void;
  exportPNG: () => void;
  exportSVG: () => void;
  exportGIF: (opts: GifExportOptions) => Promise<void>;
  toggleRecord: () => void;
  pushToast: (message: string, kind?: ToastKind) => void;
}

interface DitherMeta {
  stageScale: number;
  recording: boolean;
}

export interface DitherContextValue {
  state: DitherState;
  actions: DitherActions;
  meta: DitherMeta;
}

const DitherContext = React.createContext<DitherContextValue | null>(null);

export function useDither(): DitherContextValue {
  const ctx = React.use(DitherContext);
  if (!ctx) throw new Error("useDither must be used inside DitherProvider");
  return ctx;
}

function isValidAudio(file: File): boolean {
  const t = file.type as (typeof VALID_AUDIO_TYPES)[number];
  return (
    VALID_AUDIO_TYPES.includes(t) || /\.(mp3|wav)$/i.test(file.name)
  );
}
function isValidImage(file: File): boolean {
  const t = file.type as (typeof VALID_IMAGE_TYPES)[number];
  return VALID_IMAGE_TYPES.includes(t);
}
function isValidVideo(file: File): boolean {
  const t = file.type as (typeof VALID_VIDEO_TYPES)[number];
  return VALID_VIDEO_TYPES.includes(t);
}

export function DitherProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<DitherState>(DEFAULT_STATE);
  const [recording, setRecording] = React.useState(false);
  const [stageScale, setStageScale] = React.useState(1);

  // ---- Refs (transient — no re-render on change) ----
  const stateRef = React.useRef(state);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const stageRef = React.useRef<HTMLElement | null>(null);
  const engineRef = React.useRef<DitherEngine | null>(null);
  const audioEngineRef = React.useRef<AudioEngine | null>(null);
  const mediaElementRef = React.useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const mediaUrlRef = React.useRef<string | null>(null);
  const audioElementRef = React.useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = React.useRef<string | null>(null);
  const recorderRef = React.useRef<RecordingHandle | null>(null);
  const videoListenersRef = React.useRef<Array<() => void>>([]);
  const audioListenersRef = React.useRef<Array<() => void>>([]);

  // Keep stateRef in sync so callbacks see the latest state.
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ---- Toasts ----
  const pushToast = React.useCallback(
    (message: string, kind: ToastKind = "info"): void => {
      if (kind === "error") sonnerToast.error(message);
      else sonnerToast(message);
    },
    [],
  );

  // ---- update helper ----
  const update = React.useCallback((patch: Partial<DitherState>): void => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  // ---- Canvas/stage ref setters ----
  const setCanvasRef = React.useCallback((el: HTMLCanvasElement | null): void => {
    canvasRef.current = el;
    if (!el) {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      return;
    }
    if (engineRef.current) return;
    const engine = createDitherEngine(el);
    engineRef.current = engine;
    engine.setSettings(stateRef.current);
    engine.resizeCanvasToTarget(
      stateRef.current.canvas.width,
      stateRef.current.canvas.height,
    );
    engine.start();
  }, []);

  const setStageEl = React.useCallback((el: HTMLElement | null): void => {
    stageRef.current = el;
  }, []);

  // ---- Push state to engine ----
  React.useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    e.setSettings(state);
    e.resizeCanvasToTarget(state.canvas.width, state.canvas.height);
    if (audioEngineRef.current) {
      audioEngineRef.current.setSmoothing(state.audio.smoothing);
    }
  }, [state]);

  // ---- ResizeObserver for stage scale ----
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const computeScale = () => {
      const s = stageRef.current;
      if (!s) return;
      const rect = s.getBoundingClientRect();
      const pad = 64;
      const sw = rect.width - pad;
      const sh = rect.height - pad;
      const cw = stateRef.current.canvas.width;
      const ch = stateRef.current.canvas.height;
      const scale = Math.min(sw / cw, sh / ch, 1);
      setStageScale(Math.max(0.05, scale));
    };
    const ro = new ResizeObserver(computeScale);
    ro.observe(stage);
    computeScale();
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    const s = stageRef.current;
    if (!s) return;
    const rect = s.getBoundingClientRect();
    const pad = 64;
    const sw = rect.width - pad;
    const sh = rect.height - pad;
    const scale = Math.min(sw / state.canvas.width, sh / state.canvas.height, 1);
    setStageScale(Math.max(0.05, scale));
  }, [state.canvas.width, state.canvas.height]);

  // ---- Media cleanup helpers ----
  const clearMediaInternal = React.useCallback((): void => {
    const v = mediaElementRef.current;
    videoListenersRef.current.forEach((off) => off());
    videoListenersRef.current = [];
    if (v && v.tagName === "VIDEO") {
      try {
        const vid = v as HTMLVideoElement;
        vid.pause();
        vid.removeAttribute("src");
        vid.load();
      } catch {}
    }
    if (v && v.tagName === "IMG" && v.parentNode) v.parentNode.removeChild(v);
    if (mediaUrlRef.current) URL.revokeObjectURL(mediaUrlRef.current);
    mediaElementRef.current = null;
    mediaUrlRef.current = null;
    engineRef.current?.setMedia(null);
  }, []);

  const clearAudioInternal = React.useCallback((): void => {
    audioListenersRef.current.forEach((off) => off());
    audioListenersRef.current = [];
    if (audioEngineRef.current) audioEngineRef.current.detach();
    const a = audioElementRef.current;
    if (a) {
      try {
        a.pause();
        a.removeAttribute("src");
      } catch {}
    }
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioElementRef.current = null;
    audioUrlRef.current = null;
    engineRef.current?.setAudio(null);
  }, []);

  const clearMedia = React.useCallback((): void => {
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
  }, [clearMediaInternal]);

  const clearAudio = React.useCallback((): void => {
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
  }, [clearAudioInternal]);

  // ---- Image loader ----
  const loadImage = React.useCallback(
    (file: File): void => {
      clearMediaInternal();
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.crossOrigin = "anonymous";
      const isGif =
        file.type === "image/gif" || /\.gif$/i.test(file.name);
      img.onload = () => {
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
        pushToast(isGif ? `Loaded ${file.name} (animated)` : `Loaded ${file.name}`);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        pushToast("Image failed to load", "error");
      };
      img.src = url;
    },
    [clearMediaInternal, pushToast],
  );

  // ---- Video loader ----
  const loadVideo = React.useCallback(
    (file: File): void => {
      clearMediaInternal();
      const url = URL.createObjectURL(file);
      const vid = document.createElement("video");
      vid.crossOrigin = "anonymous";
      vid.src = url;
      vid.muted = true;
      vid.playsInline = true;
      vid.loop = true;
      vid.preload = "auto";

      const offMeta = () => vid.removeEventListener("loadedmetadata", onMeta);
      const onMeta = () => {
        offMeta();
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
        vid.play()
          .then(() => {
            setState((s) =>
              s.media.kind === "video"
                ? { ...s, media: { ...s.media, isPlaying: true } }
                : s,
            );
          })
          .catch(() => {});
        pushToast(`Loaded ${file.name}`);
      };
      vid.addEventListener("loadedmetadata", onMeta);
      vid.onerror = () => {
        URL.revokeObjectURL(url);
        pushToast("Video failed to load", "error");
      };
      const onTime = () => {
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
      };
      const onPlay = () =>
        setState((s) =>
          s.media.kind === "video"
            ? { ...s, media: { ...s.media, isPlaying: true } }
            : s,
        );
      const onPause = () =>
        setState((s) =>
          s.media.kind === "video"
            ? { ...s, media: { ...s.media, isPlaying: false } }
            : s,
        );
      vid.addEventListener("timeupdate", onTime);
      vid.addEventListener("play", onPlay);
      vid.addEventListener("pause", onPause);
      videoListenersRef.current = [
        () => vid.removeEventListener("timeupdate", onTime),
        () => vid.removeEventListener("play", onPlay),
        () => vid.removeEventListener("pause", onPause),
      ];
    },
    [clearMediaInternal, pushToast],
  );

  // ---- Audio loader ----
  const loadAudio = React.useCallback(
    (file: File): void => {
      clearAudioInternal();
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.src = url;
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";
      audio.loop = true;

      const onMeta = () => {
        audio.removeEventListener("loadedmetadata", onMeta);
        audioElementRef.current = audio;
        audioUrlRef.current = url;
        if (!audioEngineRef.current) {
          audioEngineRef.current = createAudioEngine();
        }
        const ae = audioEngineRef.current;
        ae.attach(audio);
        ae.setSmoothing(stateRef.current.audio.smoothing);
        engineRef.current?.setAudio(
          (): AudioReading | null => audioEngineRef.current?.read() ?? null,
        );
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
        pushToast(`Loaded ${file.name}`);
      };
      audio.addEventListener("loadedmetadata", onMeta);
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        pushToast("Audio failed to load", "error");
      };
      const onTime = () =>
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
      const onPlay = () =>
        setState((s) => ({ ...s, audio: { ...s.audio, isPlaying: true } }));
      const onPause = () =>
        setState((s) => ({ ...s, audio: { ...s.audio, isPlaying: false } }));
      audio.addEventListener("timeupdate", onTime);
      audio.addEventListener("play", onPlay);
      audio.addEventListener("pause", onPause);
      audioListenersRef.current = [
        () => audio.removeEventListener("timeupdate", onTime),
        () => audio.removeEventListener("play", onPlay),
        () => audio.removeEventListener("pause", onPause),
      ];
    },
    [clearAudioInternal, pushToast],
  );

  const loadFile = React.useCallback(
    (file: File, role: FileRole): void => {
      if (file.size > MAX_BYTES) {
        pushToast(`File too large (${(file.size / 1e6).toFixed(1)} MB)`, "error");
        return;
      }
      if (role === "media") {
        if (isValidImage(file)) loadImage(file);
        else if (isValidVideo(file)) loadVideo(file);
        else pushToast(`Unsupported media: ${file.type || file.name}`, "error");
      } else {
        if (isValidAudio(file)) loadAudio(file);
        else pushToast(`Unsupported audio: ${file.type || file.name}`, "error");
      }
    },
    [loadAudio, loadImage, loadVideo, pushToast],
  );

  // ---- Playback toggles ----
  const togglePlayMedia = React.useCallback((): void => {
    const v = mediaElementRef.current;
    if (!v || v.tagName !== "VIDEO") return;
    const vid = v as HTMLVideoElement;
    if (vid.paused) void vid.play().catch(() => {});
    else vid.pause();
    if (stateRef.current.audio.syncWithVideo && audioElementRef.current) {
      if (vid.paused) audioElementRef.current.pause();
      else void audioElementRef.current.play().catch(() => {});
    }
  }, []);

  const togglePlayAudio = React.useCallback((): void => {
    const a = audioElementRef.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => {});
    else a.pause();
    if (
      stateRef.current.audio.syncWithVideo &&
      mediaElementRef.current?.tagName === "VIDEO"
    ) {
      const vid = mediaElementRef.current as HTMLVideoElement;
      if (a.paused) vid.pause();
      else void vid.play().catch(() => {});
    }
  }, []);

  const togglePlayAll = React.useCallback((): void => {
    const hasVid =
      !!mediaElementRef.current && mediaElementRef.current.tagName === "VIDEO";
    const hasAud = !!audioElementRef.current;
    if (hasVid && (!hasAud || stateRef.current.audio.syncWithVideo)) {
      togglePlayMedia();
    } else if (hasAud) {
      togglePlayAudio();
    } else if (hasVid) {
      togglePlayMedia();
    }
  }, [togglePlayMedia, togglePlayAudio]);

  const seekMedia = React.useCallback((t: number): void => {
    const v = mediaElementRef.current;
    if (v && v.tagName === "VIDEO") (v as HTMLVideoElement).currentTime = t;
  }, []);

  const seekAudio = React.useCallback((t: number): void => {
    const a = audioElementRef.current;
    if (a) a.currentTime = t;
  }, []);

  // ---- Fit to media ----
  const fitToMedia = React.useCallback((): void => {
    const el = mediaElementRef.current;
    if (!el) return;
    const w =
      (el as HTMLImageElement).naturalWidth ||
      (el as HTMLVideoElement).videoWidth;
    const h =
      (el as HTMLImageElement).naturalHeight ||
      (el as HTMLVideoElement).videoHeight;
    if (!w || !h) return;
    let W = w;
    let H = h;
    const cap = 1920;
    if (W > cap || H > cap) {
      const sc = cap / Math.max(W, H);
      W = Math.round(W * sc);
      H = Math.round(H * sc);
    }
    update({
      canvas: { ...stateRef.current.canvas, preset: "custom", width: W, height: H },
    });
    pushToast(`Canvas set to ${W}×${H}`);
  }, [update, pushToast]);

  const resetGrid = React.useCallback((): void => {
    update({ grid: { ...DEFAULT_STATE.grid } });
    pushToast("Grid reset to defaults");
  }, [update, pushToast]);

  const setMode = React.useCallback(
    (mode: "basic" | "expert"): void => {
      update({ ui: { ...stateRef.current.ui, mode } });
    },
    [update],
  );

  // ---- Exports ----
  const exportPNG = React.useCallback((): void => {
    engineRef.current?.exportPNG(`dither-${Date.now()}.png`);
    pushToast("PNG exported");
  }, [pushToast]);

  const exportSVG = React.useCallback((): void => {
    engineRef.current?.exportSVG(`dither-${Date.now()}.svg`);
    pushToast("SVG exported");
  }, [pushToast]);

  const exportGif = React.useCallback(
    async (opts: GifExportOptions): Promise<void> => {
      const engine = engineRef.current;
      if (!engine) return;
      const el = mediaElementRef.current;
      const source =
        el && el.tagName === "VIDEO"
          ? { kind: "video" as const, el: el as HTMLVideoElement }
          : el && el.tagName === "IMG"
            ? {
                kind: "image" as const,
                el: el as HTMLImageElement,
                durationSeconds: opts.end - opts.start,
              }
            : null;
      try {
        await exportGIF({ engine, source, opts });
        pushToast("GIF exported");
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          pushToast("GIF export cancelled");
        } else {
          pushToast("GIF export failed", "error");
        }
      }
    },
    [pushToast],
  );

  const toggleRecord = React.useCallback((): void => {
    if (recording) {
      try {
        recorderRef.current?.stop();
      } catch {}
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
      } else {
        pushToast("Recording not supported in this browser", "error");
      }
    }
  }, [recording, pushToast]);

  // ---- Unmount cleanup ----
  React.useEffect(() => {
    return () => {
      clearMediaInternal();
      clearAudioInternal();
      audioEngineRef.current?.destroy();
      audioEngineRef.current = null;
      if (recorderRef.current) {
        try {
          recorderRef.current.stop();
        } catch {}
      }
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [clearMediaInternal, clearAudioInternal]);

  const actions = React.useMemo<DitherActions>(
    () => ({
      update,
      setCanvasRef,
      setStageEl,
      loadFile,
      clearMedia,
      clearAudio,
      togglePlayMedia,
      togglePlayAudio,
      togglePlayAll,
      seekMedia,
      seekAudio,
      fitToMedia,
      resetGrid,
      setMode,
      exportPNG,
      exportSVG,
      exportGIF: exportGif,
      toggleRecord,
      pushToast,
    }),
    [
      update,
      setCanvasRef,
      setStageEl,
      loadFile,
      clearMedia,
      clearAudio,
      togglePlayMedia,
      togglePlayAudio,
      togglePlayAll,
      seekMedia,
      seekAudio,
      fitToMedia,
      resetGrid,
      setMode,
      exportPNG,
      exportSVG,
      exportGif,
      toggleRecord,
      pushToast,
    ],
  );

  const value = React.useMemo<DitherContextValue>(
    () => ({
      state,
      actions,
      meta: { stageScale, recording },
    }),
    [state, actions, stageScale, recording],
  );

  return <DitherContext value={value}>{children}</DitherContext>;
}
