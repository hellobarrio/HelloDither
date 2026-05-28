// Strict typed state for the HelloDither tool.
// Mirrors DEFAULT_STATE in the design prototype.

export type CanvasFit = "cover" | "contain" | "stretch";

export interface CanvasSettings {
  preset: string;
  width: number;
  height: number;
  aspectLock: boolean;
  fitToMedia: boolean;
  background: string;
  fit: CanvasFit;
}

export type DeformMode = "height" | "width" | "both";
export type CellShape = "rect" | "circle" | "diamond";
export type StretchAxis = "vertical" | "horizontal" | "both";

export interface GridSettings {
  cols: number;
  rows: number;
  gap: number;
  pixelSize: number;
  mode: DeformMode;
  minH: number;
  maxH: number;
  minW: number;
  maxW: number;
  invert: boolean;
  intensity: number;
  contrast: number;
  gamma: number;
  threshold: number;
  shape: CellShape;
  stretchEnabled: boolean;
  stretchAxis: StretchAxis;
  stretchH: number;
  stretchV: number;
  lineThickness: number;
  lineTaper: number;
}

export type GradientType = "linear" | "radial";
export type GradientMap = "luminance" | "position";

export interface GradientStop {
  pos: number;
  color: string;
}

export interface ColorSettings {
  bg: string;
  fg: string;
  useGradient: boolean;
  gradientType: GradientType;
  gradientAngle: number;
  gradientMap: GradientMap;
  presetId: string;
  customStops: GradientStop[];
}

export type MediaState =
  | {
      kind: "none";
      name: "";
      width: 0;
      height: 0;
      isPlaying: false;
      currentTime: 0;
      duration: 0;
    }
  | {
      kind: "image";
      name: string;
      width: number;
      height: number;
      isPlaying: false;
      currentTime: 0;
      duration: 0;
      url: string;
      animated?: boolean;
    }
  | {
      kind: "video";
      name: string;
      width: number;
      height: number;
      isPlaying: boolean;
      currentTime: number;
      duration: number;
      url: string;
    };

export type AudioBand = "low" | "mid" | "high" | "full";
export type AudioMix = "media" | "audio" | "media+audio";

export interface AudioSettings {
  loaded: boolean;
  name: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  sensitivity: number;
  smoothing: number;
  band: AudioBand;
  influence: number;
  mix: AudioMix;
  syncWithVideo: boolean;
}

export type UIMode = "basic" | "expert";

export interface UISettings {
  mode: UIMode;
  collapsed: Record<string, boolean>;
}

export interface DitherState {
  canvas: CanvasSettings;
  grid: GridSettings;
  color: ColorSettings;
  media: MediaState;
  audio: AudioSettings;
  ui: UISettings;
}

export interface GradientPreset {
  id: string;
  label: string;
  stops: GradientStop[];
}

export interface SizePreset {
  id: string;
  label: string;
  w: number | null;
  h: number | null;
}

// ---- Engine API ----

export interface AudioReading {
  lowLevel: number;
  midLevel: number;
  highLevel: number;
  fullLevel: number;
  rms: number;
  freq: Uint8Array;
}

export interface AudioEngine {
  attach: (el: HTMLMediaElement) => boolean;
  detach: () => void;
  read: () => AudioReading | null;
  setSmoothing: (s: number) => void;
  destroy: () => void;
  readonly isAttached: boolean;
}

export interface RecordingHandle {
  stop: () => void;
}

export interface RecordingOptions {
  fps?: number;
  bitrate?: number;
  filename?: string;
  onStop?: () => void;
}

export interface GifFrame {
  bitmap: ImageBitmap;
  durationMs: number;
}

export interface DitherEngine {
  setSettings: (s: DitherState) => void;
  setMedia: (
    el: HTMLImageElement | HTMLVideoElement | null,
    opts?: { animated?: boolean; gifFrames?: GifFrame[] | null },
  ) => void;
  setAudio: (fn: (() => AudioReading | null) | null) => void;
  setAudioActive: (active: boolean) => void;
  resizeCanvasToTarget: (w: number, h: number) => void;
  invalidate: () => void;
  start: () => void;
  stop: () => void;
  exportPNG: (filename?: string) => void;
  exportSVG: (filename?: string) => void;
  startRecording: (opts?: RecordingOptions) => RecordingHandle | null;
  destroy: () => void;
  drawNow: () => void;
  getCanvas: () => HTMLCanvasElement;
}

// ---- GIF export ----

export interface GifExportOptions {
  fps: number;
  start: number;
  end: number;
  width?: number;
  height?: number;
  filename?: string;
  onProgress?: (t: number) => void;
  signal?: AbortSignal;
}

// ---- Toast ----

export type ToastKind = "info" | "error";

export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}
