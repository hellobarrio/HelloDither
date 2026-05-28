// Web Audio analysis: returns a read function that yields current band levels.
// Manages AudioContext + AnalyserNode lifecycle.

(function () {
  function createAudioEngine() {
    let ctx = null;
    let source = null;
    let analyser = null;
    let mediaEl = null;
    let freqArray = null;
    let timeArray = null;

    function ensureCtx() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) throw new Error("Web Audio not supported");
        ctx = new AC();
      }
      if (ctx.state === "suspended") ctx.resume();
    }

    function attach(el) {
      detach();
      ensureCtx();
      mediaEl = el;
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
      freqArray = new Uint8Array(analyser.frequencyBinCount);
      timeArray = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      return true;
    }

    function detach() {
      if (source) try { source.disconnect(); } catch (e) {}
      if (analyser) try { analyser.disconnect(); } catch (e) {}
      source = null;
      analyser = null;
      mediaEl = null;
      freqArray = null;
      timeArray = null;
    }

    function setSmoothing(s) {
      if (analyser) analyser.smoothingTimeConstant = Math.max(0, Math.min(0.99, s));
    }

    function read() {
      if (!analyser || !freqArray) return null;
      analyser.getByteFrequencyData(freqArray);
      analyser.getByteTimeDomainData(timeArray);
      const N = freqArray.length;
      // Bands by index ranges (rough): low 0..N*0.1, mid N*0.1..N*0.4, high N*0.4..N
      const lowEnd = Math.floor(N * 0.1);
      const midEnd = Math.floor(N * 0.4);
      let low = 0, mid = 0, high = 0, full = 0;
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
      // Amplitude from time-domain (rms-ish)
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

    function destroy() {
      detach();
      if (ctx) try { ctx.close(); } catch (e) {}
      ctx = null;
    }

    return {
      attach, detach, read, setSmoothing, destroy,
      get isAttached() { return !!analyser; },
    };
  }

  window.createAudioEngine = createAudioEngine;
})();
