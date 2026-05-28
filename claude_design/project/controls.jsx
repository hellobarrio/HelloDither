// Sidebar control sections — Media, Canvas, Grid, Color, Audio.
// Each takes the state object + setState helper.

import Image from "next/image";

const {
  useRef: cRef,
  useCallback: cCb,
  useEffect: cEff,
  useState: cState,
  useMemo: cMemo,
} = React;

// -------------------- Media Section --------------------
function MediaSection({ state, update, onUpload, onClearMedia, expert }) {
  const m = state.media;
  const fileInput = cRef(null);
  const [drag, setDrag] = cState(false);

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onUpload(f, "media");
  };

  return (
    <Section id="media" title="Media" icon={<Icons.Image size={13} />}>
      {m.kind === "none" ? (
        <div
          className={"dropzone" + (drag ? " active" : "")}
          onClick={() => fileInput.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <Icons.Upload size={20} />
          <div>Drop image or video</div>
          <div className="hint">JPG · PNG · WEBP · GIF · MP4 · WEBM</div>
        </div>
      ) : (
        <div className="media-preview">
          {m.kind === "image" ? (
            <Image src={m.url} alt={m.name} width={m.width} height={m.height} />
          ) : (
            <video src={m.url} muted loop playsInline />
          )}
          <button className="clear-btn" onClick={onClearMedia} title="Remove">
            <Icons.X size={12} />
          </button>
          <div className="meta-overlay">
            {m.kind} · {m.width}×{m.height}
          </div>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f, "media");
          e.target.value = "";
        }}
      />
    </Section>
  );
}

// -------------------- Canvas Section --------------------
function CanvasSection({ state, update, fitToMedia, expert }) {
  const c = state.canvas;
  return (
    <Section id="canvas" title="Canvas" icon={<Icons.Square size={13} />}>
      <Select
        label="Preset"
        value={c.preset}
        options={window.SIZE_PRESETS.map((p) => ({
          value: p.id,
          label: p.label,
        }))}
        onChange={(v) => {
          const preset = window.SIZE_PRESETS.find((p) => p.id === v);
          if (preset && preset.w)
            update({
              canvas: { ...c, preset: v, width: preset.w, height: preset.h },
            });
          else update({ canvas: { ...c, preset: v } });
        }}
      />

      <div className="row-2">
        <Slider
          label="Width"
          min={64}
          max={3840}
          step={1}
          value={c.width}
          onChange={(v) =>
            update({ canvas: { ...c, preset: "custom", width: Math.round(v) } })
          }
        />
        <Slider
          label="Height"
          min={64}
          max={3840}
          step={1}
          value={c.height}
          onChange={(v) =>
            update({
              canvas: { ...c, preset: "custom", height: Math.round(v) },
            })
          }
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn small"
          style={{ flex: 1 }}
          onClick={fitToMedia}
          disabled={state.media.kind === "none"}
        >
          <Icons.Maximize size={11} /> Fit to media
        </button>
      </div>
      <Segmented
        label="Image fit"
        value={c.fit || "cover"}
        options={[
          { value: "cover", label: "Cover" },
          { value: "contain", label: "Contain" },
          { value: "stretch", label: "Stretch" },
        ]}
        onChange={(v) => update({ canvas: { ...c, fit: v } })}
      />
    </Section>
  );
}

// -------------------- Grid Section --------------------
function GridSection({ state, update, expert }) {
  const g = state.grid;
  return (
    <Section id="grid" title="Grid" icon={<Icons.Grid size={13} />}>
      <Segmented
        label="Deformation"
        value={g.mode}
        options={[
          {
            value: "height",
            label: "Height",
            icon: <Icons.ArrowUpDown size={11} />,
          },
          {
            value: "width",
            label: "Width",
            icon: <Icons.ArrowLeftRight size={11} />,
          },
          { value: "both", label: "Both", icon: <Icons.Move size={11} /> },
        ]}
        onChange={(v) => update({ grid: { ...g, mode: v } })}
      />

      <Slider
        label="Columns"
        min={4}
        max={300}
        step={1}
        value={g.cols}
        onChange={(v) => update({ grid: { ...g, cols: Math.round(v) } })}
      />
      <Slider
        label="Rows"
        min={4}
        max={300}
        step={1}
        value={g.rows}
        onChange={(v) => update({ grid: { ...g, rows: Math.round(v) } })}
      />
      <Slider
        label="Gap"
        min={0}
        max={20}
        step={0.5}
        value={g.gap}
        onChange={(v) => update({ grid: { ...g, gap: v } })}
        precision={1}
      />

      {g.mode === "height" || g.mode === "both" ? (
        <RangeSlider
          label="height range"
          min={0}
          max={100}
          step={1}
          minValue={g.minH}
          maxValue={g.maxH}
          unit="%"
          onChange={(min, max) =>
            update({ grid: { ...g, minH: min, maxH: max } })
          }
        />
      ) : null}
      {g.mode === "width" || g.mode === "both" ? (
        <RangeSlider
          label="width range"
          min={0}
          max={100}
          step={1}
          minValue={g.minW}
          maxValue={g.maxW}
          unit="%"
          onChange={(min, max) =>
            update({ grid: { ...g, minW: min, maxW: max } })
          }
        />
      ) : null}

      <Slider
        label="Intensity"
        min={0}
        max={2}
        step={0.01}
        precision={2}
        value={g.intensity}
        onChange={(v) => update({ grid: { ...g, intensity: v } })}
      />

      {expert ? (
        <>
          <Slider
            label="Contrast"
            min={0}
            max={3}
            step={0.01}
            precision={2}
            value={g.contrast}
            onChange={(v) => update({ grid: { ...g, contrast: v } })}
          />
          <Slider
            label="Gamma"
            min={0.1}
            max={3}
            step={0.01}
            precision={2}
            value={g.gamma}
            onChange={(v) => update({ grid: { ...g, gamma: v } })}
          />
          <Slider
            label="Threshold"
            min={0}
            max={1}
            step={0.01}
            precision={2}
            value={g.threshold}
            onChange={(v) => update({ grid: { ...g, threshold: v } })}
          />
          <Segmented
            label="Shape"
            value={g.shape}
            options={[
              {
                value: "rect",
                label: "Rect",
                icon: <Icons.Square size={11} />,
              },
              {
                value: "circle",
                label: "Circle",
                icon: <Icons.Circle size={11} />,
              },
              {
                value: "diamond",
                label: "Diamond",
                icon: <Icons.Diamond size={11} />,
              },
            ]}
            onChange={(v) => update({ grid: { ...g, shape: v } })}
          />
        </>
      ) : null}

      <Toggle
        label="Stretch into lines"
        value={!!g.stretchEnabled}
        onChange={(v) => update({ grid: { ...g, stretchEnabled: v } })}
      />
      {g.stretchEnabled ? (
        <>
          <Segmented
            label="Stretch axis"
            value={g.stretchAxis || "vertical"}
            options={[
              {
                value: "vertical",
                label: "Vert.",
                icon: <Icons.ArrowUpDown size={11} />,
              },
              {
                value: "horizontal",
                label: "Horiz.",
                icon: <Icons.ArrowLeftRight size={11} />,
              },
              { value: "both", label: "Both", icon: <Icons.Move size={11} /> },
            ]}
            onChange={(v) => update({ grid: { ...g, stretchAxis: v } })}
          />
          {g.stretchAxis !== "horizontal" ? (
            <Slider
              label="Vertical stretch"
              min={0}
              max={100}
              step={1}
              value={g.stretchV ?? 0}
              onChange={(v) => update({ grid: { ...g, stretchV: v } })}
            />
          ) : null}
          {g.stretchAxis !== "vertical" ? (
            <Slider
              label="Horizontal stretch"
              min={0}
              max={100}
              step={1}
              value={g.stretchH ?? 0}
              onChange={(v) => update({ grid: { ...g, stretchH: v } })}
            />
          ) : null}
          <Slider
            label="Line thickness"
            min={0}
            max={100}
            step={1}
            value={g.lineThickness ?? 100}
            onChange={(v) => update({ grid: { ...g, lineThickness: v } })}
          />
          <Slider
            label="Line taper"
            min={0}
            max={100}
            step={1}
            value={g.lineTaper ?? 0}
            onChange={(v) => update({ grid: { ...g, lineTaper: v } })}
          />
        </>
      ) : null}

      <Toggle
        label="Invert"
        value={g.invert}
        onChange={(v) => update({ grid: { ...g, invert: v } })}
      />
    </Section>
  );
}

// -------------------- Custom gradient stops editor --------------------
function CustomStopsEditor({ stops, onChange }) {
  const sortedNormalized = (arr) => [...arr].sort((a, b) => a.pos - b.pos);

  const updateStop = (i, patch) => {
    onChange(
      sortedNormalized(
        stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
      ),
    );
  };
  const addStop = () => {
    // Insert at midpoint between the two stops with the largest gap.
    let bestGap = 0,
      bestPos = 0.5;
    const sorted = sortedNormalized(stops);
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].pos - sorted[i].pos;
      if (gap > bestGap) {
        bestGap = gap;
        bestPos = (sorted[i].pos + sorted[i + 1].pos) / 2;
      }
    }
    onChange(sortedNormalized([...stops, { pos: bestPos, color: "#888888" }]));
  };
  const removeStop = (i) => {
    if (stops.length <= 2) return; // need at least 2 stops
    onChange(stops.filter((_, idx) => idx !== i));
  };

  const gradientPreview = cMemo(() => {
    const sorted = sortedNormalized(stops);
    const css = sorted
      .map((s) => `${s.color} ${(s.pos * 100).toFixed(1)}%`)
      .join(", ");
    return `linear-gradient(90deg, ${css})`;
  }, [stops]);

  return (
    <div className="ctrl" style={{ gap: 8 }}>
      <div className="ctrl-label">
        <span className="name">Custom stops</span>
        <button
          className="btn small"
          style={{ height: 22, padding: "0 8px", fontSize: 9 }}
          onClick={addStop}
        >
          + Add
        </button>
      </div>
      <div
        style={{
          height: 28,
          border: "1px solid var(--fg-1)",
          background: gradientPreview,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {stops.map((s, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr 26px",
              gap: 6,
              alignItems: "center",
            }}
          >
            <div
              className="color-chip"
              style={{ width: 28, height: 24, background: s.color }}
            >
              <input
                type="color"
                value={s.color}
                onChange={(e) => updateStop(i, { color: e.target.value })}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Slider
                label=""
                min={0}
                max={1}
                step={0.01}
                precision={2}
                value={s.pos}
                onChange={(v) => updateStop(i, { pos: v })}
              />
            </div>
            <button
              className="icon-btn small"
              style={{ width: 26, height: 24 }}
              disabled={stops.length <= 2}
              onClick={() => removeStop(i)}
              title="Remove stop"
              aria-label="Remove stop"
            >
              <Icons.X size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------- Color Section --------------------
function ColorSection({ state, update, expert }) {
  const c = state.color;
  const anyGradient = c.useGradientFg || c.useGradientBg;

  return (
    <Section id="color" title="Color" icon={<Icons.Palette size={13} />}>
      <ColorField
        label="Background"
        value={c.bg}
        onChange={(v) => update({ color: { ...c, bg: v } })}
      />
      <ColorField
        label="Pixel"
        value={c.fg}
        onChange={(v) => update({ color: { ...c, fg: v } })}
      />

      <Toggle
        label="Gradient · Pixel"
        value={c.useGradientFg}
        onChange={(v) => update({ color: { ...c, useGradientFg: v } })}
      />
      <Toggle
        label="Gradient · Background"
        value={c.useGradientBg}
        onChange={(v) => update({ color: { ...c, useGradientBg: v } })}
      />

      {anyGradient ? (
        <>
          <Segmented
            label="Type"
            value={c.gradientType}
            options={[
              { value: "linear", label: "Linear" },
              { value: "radial", label: "Radial" },
            ]}
            onChange={(v) => update({ color: { ...c, gradientType: v } })}
          />
          {c.gradientType === "linear" ? (
            <Slider
              label="Angle"
              min={0}
              max={360}
              step={1}
              value={c.gradientAngle}
              onChange={(v) => update({ color: { ...c, gradientAngle: v } })}
            />
          ) : null}
          {c.useGradientFg ? (
            <Segmented
              label="Pixel map by"
              value={c.gradientMap}
              options={[
                { value: "luminance", label: "Luminance" },
                { value: "position", label: "Position" },
              ]}
              onChange={(v) => update({ color: { ...c, gradientMap: v } })}
            />
          ) : null}

          <div className="ctrl">
            <div
              className="ctrl-label"
              data-comment-anchor="78e36f4416-div-204-13"
            >
              <span className="name">Preset</span>
            </div>
            <div className="preset-grid">
              {window.GRADIENT_PRESETS.map((p) => (
                <GradientChip
                  key={p.id}
                  preset={p}
                  active={p.id === c.presetId}
                  onClick={() => update({ color: { ...c, presetId: p.id } })}
                />
              ))}
              <GradientChip
                preset={{ id: "custom", label: "Custom", stops: c.customStops }}
                active={c.presetId === "custom"}
                onClick={() => update({ color: { ...c, presetId: "custom" } })}
              />
            </div>
          </div>

          {c.presetId === "custom" ? (
            <CustomStopsEditor
              stops={c.customStops}
              onChange={(next) =>
                update({ color: { ...c, customStops: next } })
              }
            />
          ) : null}
        </>
      ) : null}
    </Section>
  );
}

// -------------------- Audio Section --------------------
function AudioSection({
  state,
  update,
  onUpload,
  onClearAudio,
  onTogglePlay,
  expert,
}) {
  const a = state.audio;
  const fileInput = cRef(null);
  const [drag, setDrag] = cState(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onUpload(f, "audio");
  };
  return (
    <Section
      id="audio"
      title="Audio Reactivity"
      icon={<Icons.Music size={13} />}
    >
      {!a.loaded ? (
        <div
          className={"dropzone" + (drag ? " active" : "")}
          onClick={() => fileInput.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <Icons.Music size={20} />
          <div>Drop audio</div>
          <div className="hint">MP3 · WAV</div>
        </div>
      ) : (
        <div className="audio-preview">
          <button
            className="icon-btn small"
            style={{ background: "var(--hb-grigio)", color: "var(--hb-black)" }}
            onClick={onTogglePlay}
          >
            {a.isPlaying ? <Icons.Pause size={10} /> : <Icons.Play size={10} />}
          </button>
          <span className="audio-name">{a.name}</span>
          <button
            className="icon-btn small"
            style={{ background: "var(--hb-grigio)", color: "var(--hb-black)" }}
            onClick={onClearAudio}
          >
            <Icons.X size={10} />
          </button>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="audio/mpeg,audio/wav,audio/wave,audio/mp3,.mp3,.wav"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f, "audio");
          e.target.value = "";
        }}
      />

      <Segmented
        label="Mix"
        value={a.mix}
        options={[
          { value: "media", label: "Media" },
          { value: "audio", label: "Audio" },
          { value: "media+audio", label: "Both" },
        ]}
        onChange={(v) => update({ audio: { ...a, mix: v } })}
      />

      <Segmented
        label="Frequency band"
        value={a.band}
        options={[
          { value: "low", label: "Low" },
          { value: "mid", label: "Mid" },
          { value: "high", label: "High" },
          { value: "full", label: "Full" },
        ]}
        onChange={(v) => update({ audio: { ...a, band: v } })}
      />

      <Slider
        label="Sensitivity"
        min={0}
        max={3}
        step={0.01}
        precision={2}
        value={a.sensitivity}
        onChange={(v) => update({ audio: { ...a, sensitivity: v } })}
      />
      <Slider
        label="Influence"
        min={0}
        max={1}
        step={0.01}
        precision={2}
        value={a.influence}
        onChange={(v) => update({ audio: { ...a, influence: v } })}
      />
      <Slider
        label="Smoothing"
        min={0}
        max={0.95}
        step={0.01}
        precision={2}
        value={a.smoothing}
        onChange={(v) => update({ audio: { ...a, smoothing: v } })}
      />

      {state.media.kind === "video" ? (
        <Toggle
          label="Sync with video"
          value={a.syncWithVideo}
          onChange={(v) => update({ audio: { ...a, syncWithVideo: v } })}
        />
      ) : null}
    </Section>
  );
}

Object.assign(window, {
  MediaSection,
  CanvasSection,
  GridSection,
  ColorSection,
  AudioSection,
});
