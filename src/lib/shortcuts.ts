// Keyboard shortcut definitions. Render-friendly labels for kbd hints.

export interface ShortcutBinding {
  id: string;
  label: string;
  hint: string;
}

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);

const mod = isMac ? "⌘" : "Ctrl";

export const SHORTCUTS = {
  playPause: { id: "play-pause", label: "Play / Pause", hint: "Space" },
  exportPng: { id: "export-png", label: "Export PNG", hint: `${mod} P` },
  exportSvg: {
    id: "export-svg",
    label: "Export SVG",
    hint: `${mod} S`,
  },
  exportMenu: { id: "export-menu", label: "Export menu", hint: `${mod} E` },
  exportGif: { id: "export-gif", label: "Export GIF…", hint: `${mod} G` },
  fitToMedia: { id: "fit-to-media", label: "Fit to media", hint: "F" },
  resetGrid: { id: "reset-grid", label: "Reset grid & transform", hint: "R" },
  toggleBasic: { id: "mode-basic", label: "Basic mode", hint: "B" },
  toggleExpert: { id: "mode-expert", label: "Expert mode", hint: "E" },
  help: { id: "help", label: "Show shortcuts", hint: "?" },
} as const satisfies Record<string, ShortcutBinding>;

export function isInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function matchesMod(e: KeyboardEvent): boolean {
  return isMac ? e.metaKey : e.ctrlKey;
}
