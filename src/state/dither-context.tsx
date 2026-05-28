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
import { loadYoutubeAsFile } from "@/lib/youtube-loader";
import type {
  AudioEngine,
  AudioReading,
  DitherEngine,
  DitherState,
  GifExportOptions,
  GifFrame,
  RecordingHandle,
  ToastKind,
} from "@/lib/types";

type FileRole = "media" | "audio";

interface LoadYoutubeOptions {
  onProgress?: (percent: number, label: string) => void;
  signal?: AbortSignal;
}

interface DitherActions {
  update: (patch: Partial<DitherState>) => void;
  setCanvasRef: (el: HTMLCanvasElement | null) => void;
  setStageEl: (el: HTMLElement | null) => void;
  loadFile: (file: File, role: FileRole) => void;
  loadFromYoutube: (url: string, opts?: LoadYoutubeOptions) => Promise<void>;
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
  return VALID_AUDIO_TYPES.includes(t) || /\.(mp3|wav)$/i.test(file.name);
}

interface DecodedFrameLike {
  image: { duration?: number | null; close?: () => void } & CanvasImageSource;
}
interface ImageDecoderLike {
  tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } };
  decode: (init: { frameIndex: number }) => Promise<DecodedFrameLike>;
  close?: () => void;
}
interface ImageDecoderCtor {
  new (init: {
    data: ArrayBuffer | ReadableStream;
    type: string;
  }): ImageDecoderLike;
}

async function decodeGifFrames(file: File): Promise<GifFrame[] | null> {
  const Ctor = (globalThis as unknown as { ImageDecoder?: ImageDecoderCtor })
    .ImageDecoder;
  if (!Ctor) return null;
  let decoder: ImageDecoderLike | null = null;
  try {
    const buf = await file.arrayBuffer();
    decoder = new Ctor({ data: buf, type: "image/gif" });
    await decoder.tracks.ready;
    const count = decoder.tracks.selectedTrack.frameCount;
    if (!count) return null;
    const frames: GifFrame[] = [];
    for (let i = 0; i < count; i++) {
      const { image } = await decoder.decode({ frameIndex: i });
      const bitmap = await createImageBitmap(image);
      const durationMs = image.duration ? image.duration / 1000 : 100;
      frames.push({ bitmap, durationMs });
      image.close?.();
    }
    return frames;
  } catch {
    return null;
  } finally {
    decoder?.close?.();
  }
}

function closeGifFrames(frames: GifFrame[] | null): void {
  frames?.forEach((f) => f.bitmap.close());
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
  const mediaElementRef = React.useRef<
    HTMLImageElement | HTMLVideoElement | null
  >(null);
  const mediaUrlRef = React.useRef<string | null>(null);
  const audioElementRef = React.useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = React.useRef<string | null>(null);
  const recorderRef = React.useRef<RecordingHandle | null>(null);
  const videoListenersRef = React.useRef<Array<() => void>>([]);
  const audioListenersRef = React.useRef<Array<() => void>>([]);
  const gifFramesRef = React.useRef<GifFrame[] | null>(null);
  const mediaLoadTokenRef = React.useRef(0);
  const audioLoadTokenRef = React.useRef(0);

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
  const setCanvasRef = React.useCallback(
    (el: HTMLCanvasElement | null): void => {
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
    },
    [],
  );

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
    const scale = Math.min(
      sw / state.canvas.width,
      sh / state.canvas.height,
      1,
    );
    setStageScale(Math.max(0.05, scale));
  }, [state.canvas.width, state.canvas.height]);

  // ---- Media cleanup helpers ----
  const clearMediaInternal = React.useCallback((): void => {
    mediaLoadTokenRef.current += 1;
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
    closeGifFrames(gifFramesRef.current);
    gifFramesRef.current = null;
    engineRef.current?.setMedia(null);
  }, []);

  const clearAudioInternal = React.useCallback((): void => {
    audioLoadTokenRef.current += 1;
    audioListenersRef.current.forEach((off) => off());
    audioListenersRef.current = [];
    if (audioEngineRef.current) audioEngineRef.current.detach();
    const a = audioElementRef.current;
    if (a) {
      try {
        a.pause();
        a.removeAttribute("src");
        a.load();
      } catch {}
    }
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioElementRef.current = null;
    audioUrlRef.current = null;
    engineRef.current?.setAudioActive(false);
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
      const token = ++mediaLoadTokenRef.current;
      const url = URL.createObjectURL(file);
      mediaUrlRef.current = url;
      const img = new Image();
      img.crossOrigin = "anonymous";
      const isGif = file.type === "image/gif" || /\.gif$/i.test(file.name);
      img.onload = async () => {
        if (token !== mediaLoadTokenRef.current) {
          if (mediaUrlRef.current === url) {
            URL.revokeObjectURL(url);
            mediaUrlRef.current = null;
          }
          return;
        }
        let frames: GifFrame[] | null = null;
        if (isGif) {
          frames = await decodeGifFrames(file);
          if (token !== mediaLoadTokenRef.current) {
            closeGifFrames(frames);
            if (mediaUrlRef.current === url) {
              URL.revokeObjectURL(url);
              mediaUrlRef.current = null;
            }
            return;
          }
          if (frames && frames.length > 1) {
            gifFramesRef.current = frames;
          } else {
            closeGifFrames(frames);
            frames = null;
            img.style.cssText =
              "position:fixed;top:0;left:0;width:2px;height:2px;z-index:-1;pointer-events:none;";
            document.body.appendChild(img);
          }
        }
        mediaElementRef.current = img;
        engineRef.current?.setMedia(img, {
          animated: isGif,
          gifFrames: frames,
        });
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
        if (token !== mediaLoadTokenRef.current) return;
        if (mediaUrlRef.current === url) {
          URL.revokeObjectURL(url);
          mediaUrlRef.current = null;
        }
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
      const token = ++mediaLoadTokenRef.current;
      const url = URL.createObjectURL(file);
      mediaUrlRef.current = url;
      const vid = document.createElement("video");
      vid.crossOrigin = "anonymous";
      vid.src = url;
      vid.muted = true;
      vid.playsInline = true;
      vid.loop = true;
      vid.preload = "auto";

      const cleanupStartup = () => {
        vid.removeEventListener("loadedmetadata", onMeta);
        vid.removeEventListener("error", onError);
      };
      const onMeta = () => {
        cleanupStartup();
        if (token !== mediaLoadTokenRef.current) return;
        mediaElementRef.current = vid;
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
      const onError = () => {
        cleanupStartup();
        if (token !== mediaLoadTokenRef.current) return;
        if (mediaUrlRef.current === url) {
          URL.revokeObjectURL(url);
          mediaUrlRef.current = null;
        }
        pushToast("Video failed to load", "error");
      };
      vid.addEventListener("error", onError);
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
        cleanupStartup,
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
      const token = ++audioLoadTokenRef.current;
      const url = URL.createObjectURL(file);
      audioUrlRef.current = url;
      const audio = new Audio();
      audio.src = url;
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";
      audio.loop = true;

      const cleanupStartup = () => {
        audio.removeEventListener("loadedmetadata", onMeta);
        audio.removeEventListener("error", onError);
      };
      const onMeta = () => {
        cleanupStartup();
        if (token !== audioLoadTokenRef.current) return;
        audioElementRef.current = audio;
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
      const onError = () => {
        cleanupStartup();
        if (token !== audioLoadTokenRef.current) return;
        if (audioUrlRef.current === url) {
          URL.revokeObjectURL(url);
          audioUrlRef.current = null;
        }
        pushToast("Audio failed to load", "error");
      };
      audio.addEventListener("error", onError);
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
      const onPlay = () => {
        engineRef.current?.setAudioActive(true);
        setState((s) => ({ ...s, audio: { ...s.audio, isPlaying: true } }));
      };
      const onPause = () => {
        engineRef.current?.setAudioActive(false);
        setState((s) => ({ ...s, audio: { ...s.audio, isPlaying: false } }));
      };
      audio.addEventListener("timeupdate", onTime);
      audio.addEventListener("play", onPlay);
      audio.addEventListener("pause", onPause);
      audioListenersRef.current = [
        cleanupStartup,
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
        pushToast(
          `File too large (${(file.size / 1e6).toFixed(1)} MB)`,
          "error",
        );
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

  const loadFromYoutube = React.useCallback(
    async (url: string, opts: LoadYoutubeOptions = {}): Promise<void> => {
      try {
        const file = await loadYoutubeAsFile(url, opts);
        loadFile(file, "audio");
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
        const msg = (e as Error)?.message || "Errore caricamento YouTube";
        pushToast(msg, "error");
        throw e;
      }
    },
    [loadFile, pushToast],
  );

  // ---- Playback toggles ----
  const togglePlayMedia = React.useCallback((): void => {
    const v = mediaElementRef.current;
    if (!v || v.tagName !== "VIDEO") return;
    const vid = v as HTMLVideoElement;
    if (vid.paused) void vid.play().catch(() => {});
    else vid.pause();
    if (stateRef.current.audio.syncWithVideo && audioElementRef.current) {
      if (vid.paused) {
        engineRef.current?.setAudioActive(false);
        audioElementRef.current.pause();
      } else {
        engineRef.current?.setAudioActive(true);
        void audioElementRef.current.play().catch(() => {});
      }
    }
  }, []);

  const togglePlayAudio = React.useCallback((): void => {
    const a = audioElementRef.current;
    if (!a) return;
    if (a.paused) {
      engineRef.current?.setAudioActive(true);
      void a.play().catch(() => {});
    } else {
      engineRef.current?.setAudioActive(false);
      a.pause();
    }
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
      canvas: {
        ...stateRef.current.canvas,
        preset: "custom",
        width: W,
        height: H,
      },
    });
    pushToast(`Canvas set to ${W}×${H}`);
  }, [update, pushToast]);

  const resetGrid = React.useCallback((): void => {
    const currentAudio = stateRef.current.audio;
    update({
      canvas: { ...DEFAULT_STATE.canvas },
      grid: { ...DEFAULT_STATE.grid },
      color: { ...DEFAULT_STATE.color },
      transform: { ...DEFAULT_STATE.transform },
      ui: { ...DEFAULT_STATE.ui },
      audio: {
        ...currentAudio,
        sensitivity: DEFAULT_STATE.audio.sensitivity,
        smoothing: DEFAULT_STATE.audio.smoothing,
        band: DEFAULT_STATE.audio.band,
        influence: DEFAULT_STATE.audio.influence,
        mix: DEFAULT_STATE.audio.mix,
        syncWithVideo: DEFAULT_STATE.audio.syncWithVideo,
      },
    });
    pushToast("Reset settings to default values");
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
      loadFromYoutube,
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
      loadFromYoutube,
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
