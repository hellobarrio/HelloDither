// Gradient + size presets for the dithering tool

const GRADIENT_PRESETS = [
  { id: "mist",       label: "Mist",        stops: [{ pos: 0, color: "#0b1d2a" }, { pos: 1, color: "#dfe6ec" }] },
  { id: "ink-mint",   label: "Ink Mint",    stops: [{ pos: 0, color: "#0e1b1a" }, { pos: 0.55, color: "#16453c" }, { pos: 1, color: "#a8f1bd" }] },
  { id: "four-state", label: "Four State",  stops: [{ pos: 0, color: "#1a1717" }, { pos: 0.33, color: "#ff3737" }, { pos: 0.66, color: "#ffd23f" }, { pos: 1, color: "#fffae6" }] },
  { id: "signal",     label: "Signal",      stops: [{ pos: 0, color: "#000000" }, { pos: 0.5, color: "#ff4141" }, { pos: 1, color: "#ffffff" }] },
  { id: "cyan-rose",  label: "Cyan Rose",   stops: [{ pos: 0, color: "#003d52" }, { pos: 0.5, color: "#1ed7ff" }, { pos: 1, color: "#ff7ea8" }] },
  { id: "graphite-lime", label: "Graphite Lime", stops: [{ pos: 0, color: "#191a17" }, { pos: 0.7, color: "#6b8a2c" }, { pos: 1, color: "#dcff7a" }] },
];

const SIZE_PRESETS = [
  { id: "custom",     label: "Custom",      w: null, h: null },
  { id: "sq-1080",    label: "Square 1080", w: 1080, h: 1080 },
  { id: "poster-45",  label: "Poster 4:5",  w: 1080, h: 1350 },
  { id: "story-916",  label: "Story 9:16",  w: 1080, h: 1920 },
  { id: "hd-169",     label: "HD 16:9",     w: 1920, h: 1080 },
  { id: "wide-32",    label: "Wide 3:2",    w: 1620, h: 1080 },
];

// Default state for the entire tool
const DEFAULT_STATE = {
  // Canvas
  canvas: {
    preset: "sq-1080",
    width: 1080,
    height: 1080,
    aspectLock: true,
    fitToMedia: false,
    background: "#1e1e1c",   // hb-black
    fit: "cover",            // "cover" | "contain" | "stretch" — how media fills the canvas
  },
  // Grid / dithering
  grid: {
    cols: 60,
    rows: 60,
    gap: 1,
    pixelSize: 14,       // base cell size (derived if cols/rows set)
    mode: "height",      // "height" | "width" | "both"
    minH: 0,             // % of base
    maxH: 100,           // %
    minW: 100,
    maxW: 100,
    invert: false,
    intensity: 1.0,
    contrast: 1.0,
    gamma: 1.0,
    threshold: 0,        // 0..1; 0 = none, otherwise hard cut
    shape: "rect",       // "rect" | "circle" | "diamond"
    // Stretch / line controls — toggle on to render each cell as a tapered line that can
    // extend beyond its grid cell. Lines taper toward both tips by `lineTaper`%.
    stretchEnabled: false,
    stretchAxis: "vertical", // "vertical" | "horizontal" | "both"
    stretchH: 0,         // 0..500 — horizontal length multiplier (% of cellW)
    stretchV: 100,       // 0..500 — vertical length multiplier (% of cellH)
    lineThickness: 60,   // 0..100 — base thickness as % of perpendicular cell size
    lineTaper: 60,       // 0..100 — % of thickness lost at each tip (100 = point)
  },
  // Color
  color: {
    bg: "#ededed",       // hb-grigio
    fg: "#ff4141",       // hb-rosso
    useGradientFg: false,
    useGradientBg: false,
    gradientType: "linear", // "linear" | "radial"
    gradientAngle: 90,   // degrees, linear only
    gradientMap: "luminance", // "luminance" | "position" — only for fg
    presetId: "signal",
    // Editable custom stops, used when presetId === "custom"
    customStops: [
      { pos: 0, color: "#000000" },
      { pos: 0.5, color: "#ff4141" },
      { pos: 1, color: "#ffffff" },
    ],
  },
  // Media (object URLs + cached HTMLElements live outside React state)
  media: {
    kind: "none",        // "none" | "image" | "video"
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
    band: "full",        // "low" | "mid" | "high" | "full"
    influence: 0.5,
    mix: "media+audio",  // "media" | "audio" | "media+audio"
    syncWithVideo: true,
  },
  ui: {
    mode: "basic",       // "basic" | "expert"
    collapsed: {},       // sectionId -> bool
  },
};

window.GRADIENT_PRESETS = GRADIENT_PRESETS;
window.SIZE_PRESETS = SIZE_PRESETS;
window.DEFAULT_STATE = DEFAULT_STATE;
