import type { DitherState, GradientPreset, SizePreset } from "@/lib/types";

export const GRADIENT_PRESETS: readonly GradientPreset[] = [
  {
    id: "mist",
    label: "Mist",
    stops: [
      { pos: 0, color: "#0b1d2a" },
      { pos: 1, color: "#dfe6ec" },
    ],
  },
  {
    id: "ink-mint",
    label: "Ink Mint",
    stops: [
      { pos: 0, color: "#0e1b1a" },
      { pos: 0.55, color: "#16453c" },
      { pos: 1, color: "#a8f1bd" },
    ],
  },
  {
    id: "four-state",
    label: "Four State",
    stops: [
      { pos: 0, color: "#1a1717" },
      { pos: 0.33, color: "#ff3737" },
      { pos: 0.66, color: "#ffd23f" },
      { pos: 1, color: "#fffae6" },
    ],
  },
  {
    id: "signal",
    label: "Signal",
    stops: [
      { pos: 0, color: "#000000" },
      { pos: 0.5, color: "#ff4141" },
      { pos: 1, color: "#ffffff" },
    ],
  },
  {
    id: "cyan-rose",
    label: "Cyan Rose",
    stops: [
      { pos: 0, color: "#003d52" },
      { pos: 0.5, color: "#1ed7ff" },
      { pos: 1, color: "#ff7ea8" },
    ],
  },
  {
    id: "graphite-lime",
    label: "Graphite Lime",
    stops: [
      { pos: 0, color: "#191a17" },
      { pos: 0.7, color: "#6b8a2c" },
      { pos: 1, color: "#dcff7a" },
    ],
  },
] as const;

export const SIZE_PRESETS: readonly SizePreset[] = [
  { id: "custom", label: "Custom", w: null, h: null },
  { id: "sq-1080", label: "Square 1080", w: 1080, h: 1080 },
  { id: "poster-45", label: "Poster 4:5", w: 1080, h: 1350 },
  { id: "story-916", label: "Story 9:16", w: 1080, h: 1920 },
  { id: "hd-169", label: "HD 16:9", w: 1920, h: 1080 },
  { id: "wide-32", label: "Wide 3:2", w: 1620, h: 1080 },
] as const;

export const DEFAULT_STATE: DitherState = {
  canvas: {
    preset: "sq-1080",
    width: 1080,
    height: 1080,
    fit: "cover",
  },
  grid: {
    cols: 60,
    rows: 60,
    gap: 1,
    mode: "height",
    minH: 25,
    maxH: 100,
    minW: 25,
    maxW: 100,
    invert: false,
    intensity: 1.0,
    contrast: 1.0,
    gamma: 1.0,
    threshold: 0,
    shape: "rect",
    stretchEnabled: false,
    stretchAxis: "vertical",
    stretchH: 0,
    stretchV: 100,
    lineThickness: 60,
    lineTaper: 75,
  },
  color: {
    bg: "#FFFFFF",
    fg: "#000000",
    useGradient: false,
    gradientType: "linear",
    gradientAngle: 90,
    gradientMap: "luminance",
    presetId: "signal",
    customStops: [
      { pos: 0, color: "#000000" },
      { pos: 0.5, color: "#ff4141" },
      { pos: 1, color: "#ffffff" },
    ],
  },
  media: {
    kind: "none",
    name: "",
    width: 0,
    height: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  },
  audio: {
    loaded: false,
    name: "",
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    sensitivity: 1.0,
    smoothing: 0.7,
    band: "full",
    influence: 0.5,
    mix: "media+audio",
    syncWithVideo: true,
  },
  ui: {
    mode: "basic",
  },
  transform: {
    zoom: 1,
    flipH: false,
    flipV: false,
    scaleX: 0,
    scaleY: 0,
    offsetX: 0,
    offsetY: 0,
  },
} satisfies DitherState;

export const VALID_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
] as const;

export const VALID_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const VALID_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/wave",
  "audio/mp3",
  "audio/x-wav",
] as const;

export const MAX_BYTES = 200 * 1024 * 1024;
