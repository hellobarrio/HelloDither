// UI primitives + icon set (inline SVG, lucide-style).
// All components are written to window for cross-script use.

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// -------------------- Icons (lucide-inspired inline SVGs) --------------------
const Icon = ({ d, size = 16, stroke = 1.5, children, fill = "none" }) =>
<svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d} /> : children}
  </svg>;


const Icons = {
  Upload: (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></Icon>,
  Play: (p) => <Icon {...p} fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" stroke="currentColor" /></Icon>,
  Pause: (p) => <Icon {...p} fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></Icon>,
  Stop: (p) => <Icon {...p} fill="currentColor"><rect x="6" y="6" width="12" height="12" /></Icon>,
  Download: (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></Icon>,
  ChevronDown: (p) => <Icon {...p}><polyline points="6 9 12 15 18 9" /></Icon>,
  ChevronRight: (p) => <Icon {...p}><polyline points="9 18 15 12 9 6" /></Icon>,
  X: (p) => <Icon {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>,
  Image: (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></Icon>,
  Video: (p) => <Icon {...p}><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" /></Icon>,
  Music: (p) => <Icon {...p}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></Icon>,
  Settings: (p) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></Icon>,
  Grid: (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></Icon>,
  Palette: (p) => <Icon {...p}><circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" /><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></Icon>,
  Sliders: (p) => <Icon {...p}><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></Icon>,
  Activity: (p) => <Icon {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Icon>,
  Trash: (p) => <Icon {...p}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></Icon>,
  Maximize: (p) => <Icon {...p}><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></Icon>,
  Record: (p) => <Icon {...p} fill="currentColor"><circle cx="12" cy="12" r="6" /></Icon>,
  ArrowLeftRight: (p) => <Icon {...p}><polyline points="17 11 21 7 17 3" /><line x1="21" y1="7" x2="9" y2="7" /><polyline points="7 21 3 17 7 13" /><line x1="15" y1="17" x2="3" y2="17" /></Icon>,
  ArrowUpDown: (p) => <Icon {...p}><polyline points="11 7 7 3 3 7" /><line x1="7" y1="3" x2="7" y2="21" /><polyline points="13 17 17 21 21 17" /><line x1="17" y1="21" x2="17" y2="3" /></Icon>,
  Move: (p) => <Icon {...p}><polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" /><polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" /></Icon>,
  Square: (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" /></Icon>,
  Circle: (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /></Icon>,
  Diamond: (p) => <Icon {...p}><polygon points="12 2 22 12 12 22 2 12" /></Icon>,
  Refresh: (p) => <Icon {...p}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" /><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" /></Icon>
};

// -------------------- Section --------------------
function Section({ id, title, icon, defaultOpen = true, expertOnly = false, expertActive = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  if (expertOnly && !expertActive) return null;
  return (
    <div className="section">
      <div className={"section-header" + (open ? "" : " collapsed")} onClick={() => setOpen(!open)}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon}
          {title}
          {expertOnly ? <span className="expert-only-tag">EXPERT</span> : null}
        </span>
        <span className="chev"><Icons.ChevronDown size={14} /></span>
      </div>
      {open ? <div className="section-body">{children}</div> : null}
    </div>);

}

// -------------------- Slider --------------------
function Slider({ value, min = 0, max = 100, step = 1, onChange, label, unit = "", precision = 0 }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const pct = (value - min) / (max - min) * 100;

  const handleMove = useCallback((clientX) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    let t = (clientX - rect.left) / rect.width;
    t = Math.max(0, Math.min(1, t));
    let raw = min + t * (max - min);
    raw = Math.round(raw / step) * step;
    raw = Math.max(min, Math.min(max, raw));
    onChange(parseFloat(raw.toFixed(6)));
  }, [min, max, step, onChange]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => handleMove(e.touches ? e.touches[0].clientX : e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, handleMove]);

  const displayValue = precision > 0 ? value.toFixed(precision) : Math.round(value);

  const onInputChange = (e) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
  };

  return (
    <div className="ctrl">
      <div className="ctrl-label">
        <span className="name">{label}</span>
        <input
          className="value-input"
          type="number"
          min={min}
          max={max}
          step={step}
          value={displayValue}
          onChange={onInputChange} />
        
      </div>
      <div
        ref={trackRef}
        className={"slider" + (dragging ? " dragging" : "")}
        onMouseDown={(e) => {setDragging(true);handleMove(e.clientX);}}
        onTouchStart={(e) => {setDragging(true);handleMove(e.touches[0].clientX);}}>
        
        <div className="slider-track">
          <div className="slider-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="slider-thumb" style={{ left: `${pct}%` }} />
      </div>
    </div>);

}

// -------------------- Range slider (min/max thumbs) --------------------
// Renders only two sub-sliders, no parent label row. The parent label is folded into
// each sub-slider as "Min ${label}" / "Max ${label}".
function RangeSlider({ minValue, maxValue, min = 0, max = 100, step = 1, onChange, label, unit = "" }) {
  return (
    <div className="ctrl" style={{ gap: 8 }}>
      <Slider
        label={`Min ${label}`}
        value={minValue}
        min={min}
        max={max}
        step={step}
        onChange={(v) => onChange(Math.min(v, maxValue), maxValue)}
      />
      <Slider
        label={`Max ${label}`}
        value={maxValue}
        min={min}
        max={max}
        step={step}
        onChange={(v) => onChange(minValue, Math.max(v, minValue))}
      />
    </div>
  );
}

// -------------------- Toggle --------------------
function Toggle({ label, value, onChange }) {
  return (
    <div className="toggle">
      <span className="toggle-label">{label}</span>
      <div className={"toggle-switch" + (value ? " on" : "")} onClick={() => onChange(!value)}>
        <div className="knob" />
      </div>
    </div>);

}

// -------------------- Segmented --------------------
function Segmented({ value, options, onChange, label }) {
  return (
    <div className="ctrl">
      {label ? <div className="ctrl-label"><span className="name">{label}</span></div> : null}
      <div className="segmented">
        {options.map((opt) =>
        <button
          key={opt.value}
          className={value === opt.value ? "active" : ""}
          onClick={() => onChange(opt.value)}
          title={opt.label}>
          
            {opt.icon ? opt.icon : null}
            <span>{opt.label}</span>
          </button>
        )}
      </div>
    </div>);

}

// -------------------- Select --------------------
function Select({ value, options, onChange, label }) {
  return (
    <div className="ctrl">
      {label ? <div className="ctrl-label"><span className="name">{label}</span></div> : null}
      <div className="select">
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
    </div>);

}

// -------------------- Color --------------------
function ColorField({ label, value, onChange }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = (v) => {
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
  };

  return (
    <div className="ctrl">
      <div className="ctrl-label"><span className="name">{label}</span></div>
      <div className="color-chip-row">
        <div className="color-chip" style={{ background: value }}>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)} />
          
        </div>
        <input
          className="hex-input"
          value={draft}
          onChange={(e) => {setDraft(e.target.value);commit(e.target.value);}}
          onBlur={() => setDraft(value)}
          spellCheck="false" />
        
      </div>
    </div>);

}

// -------------------- Gradient preset chip --------------------
function GradientChip({ preset, active, onClick }) {
  const bg = useMemo(() => {
    const stops = preset.stops.map((s) => `${s.color} ${(s.pos * 100).toFixed(1)}%`).join(", ");
    return `linear-gradient(90deg, ${stops})`;
  }, [preset]);
  return (
    <div
      className={"preset-chip" + (active ? " active" : "")}
      style={{ background: bg }}
      onClick={onClick}
      title={preset.label}>
      
      <span className="lbl">{preset.label}</span>
    </div>);

}

// -------------------- Popover --------------------
function Popover({ trigger, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {if (ref.current && !ref.current.contains(e.target)) setOpen(false);};
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div className="popover-wrap" ref={ref}>
      {React.cloneElement(trigger, { onClick: () => setOpen(!open), className: (trigger.props.className || "") + (open ? " active" : "") })}
      {open ? <div className="popover" onClick={(e) => {
        if (e.target.tagName === "BUTTON") setOpen(false);
      }}>{children}</div> : null}
    </div>);

}

// -------------------- Toast --------------------
function ToastHost({ toasts }) {
  return (
    <div className="toast-host">
      {toasts.map((t) =>
      <div key={t.id} className={"toast" + (t.kind === "error" ? " err" : "")}>
          <span className="dot" />
          <span>{t.message}</span>
        </div>
      )}
    </div>);

}

Object.assign(window, {
  Icons, Icon,
  Section, Slider, RangeSlider, Toggle, Segmented, Select,
  ColorField, GradientChip, Popover, ToastHost
});