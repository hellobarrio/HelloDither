// Web Audio analysis: wraps AudioContext + AnalyserNode lifecycle.
// Returns a `read()` that yields band levels + RMS + raw freq bins.

import type { AudioEngine, AudioReading } from "@/lib/types";

interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export function createAudioEngine(): AudioEngine {
  let ctx: AudioContext | null = null;
  let source: MediaElementAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  let freqArray: Uint8Array<ArrayBuffer> | null = null;
  let timeArray: Uint8Array<ArrayBuffer> | null = null;

  function ensureCtx(): void {
    if (!ctx) {
      const w = window as WebkitWindow;
      const AC = window.AudioContext ?? w.webkitAudioContext;
      if (!AC) throw new Error("Web Audio not supported");
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
  }

  function attach(el: HTMLMediaElement): boolean {
    detach();
    ensureCtx();
    if (!ctx) return false;
    try {
      source = ctx.createMediaElementSource(el);
    } catch (e) {
      // Already attached to a context — happens on hot reload
      console.warn("MediaElementSource already attached", e);
      return false;
    }
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;
    freqArray = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    timeArray = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    source.connect(analyser);
    analyser.connect(ctx.destination);
    return true;
  }

  function detach(): void {
    if (source) {
      try {
        source.disconnect();
      } catch {}
    }
    if (analyser) {
      try {
        analyser.disconnect();
      } catch {}
    }
    source = null;
    analyser = null;
    freqArray = null;
    timeArray = null;
  }

  function setSmoothing(s: number): void {
    if (analyser) {
      analyser.smoothingTimeConstant = Math.max(0, Math.min(0.99, s));
    }
  }

  function read(): AudioReading | null {
    if (!analyser || !freqArray || !timeArray) return null;
    analyser.getByteFrequencyData(freqArray);
    analyser.getByteTimeDomainData(timeArray);
    const N = freqArray.length;
    const lowEnd = Math.floor(N * 0.1);
    const midEnd = Math.floor(N * 0.4);
    let low = 0;
    let mid = 0;
    let high = 0;
    let full = 0;
    for (let i = 0; i < N; i++) {
      const v = freqArray[i] / 255;
      full += v;
      if (i < lowEnd) low += v;
      else if (i < midEnd) mid += v;
      else high += v;
    }
    low /= Math.max(1, lowEnd);
    mid /= Math.max(1, midEnd - lowEnd);
    high /= Math.max(1, N - midEnd);
    full /= N;
    let rms = 0;
    for (let i = 0; i < timeArray.length; i++) {
      const v = (timeArray[i] - 128) / 128;
      rms += v * v;
    }
    rms = Math.sqrt(rms / timeArray.length);
    return {
      lowLevel: low,
      midLevel: mid,
      highLevel: high,
      fullLevel: full,
      rms,
      freq: freqArray,
    };
  }

  function destroy(): void {
    detach();
    if (ctx) {
      try {
        void ctx.close();
      } catch {}
    }
    ctx = null;
  }

  return {
    attach,
    detach,
    read,
    setSmoothing,
    destroy,
    get isAttached() {
      return !!analyser;
    },
  };
}
