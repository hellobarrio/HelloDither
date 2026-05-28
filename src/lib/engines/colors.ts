import type { GradientStop } from "@/lib/types";

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

// Relative luminance from 0..255 RGB.
export const lum = (r: number, g: number, b: number): number =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => clamp(v | 0, 0, 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

// Linear sample of a sorted gradient stop list at t in 0..1.
export function sampleGradient(
  stops: readonly GradientStop[],
  t: number,
): [number, number, number] {
  const tt = clamp(t, 0, 1);
  if (tt <= stops[0].pos) return hexToRgb(stops[0].color);
  if (tt >= stops[stops.length - 1].pos)
    return hexToRgb(stops[stops.length - 1].color);
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (tt >= a.pos && tt <= b.pos) {
      const f = (tt - a.pos) / (b.pos - a.pos || 1);
      const ca = hexToRgb(a.color);
      const cb = hexToRgb(b.color);
      return [
        lerp(ca[0], cb[0], f),
        lerp(ca[1], cb[1], f),
        lerp(ca[2], cb[2], f),
      ];
    }
  }
  return hexToRgb(stops[0].color);
}
