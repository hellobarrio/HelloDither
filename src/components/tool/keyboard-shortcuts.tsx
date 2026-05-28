"use client";

import * as React from "react";
import { useDither } from "@/state/dither-context";
import { isInputTarget, matchesMod } from "@/lib/shortcuts";

interface KeyboardShortcutsProps {
  onOpenExportMenu: () => void;
  onOpenGifDialog: () => void;
  onShowHelp: () => void;
}

export function KeyboardShortcuts({
  onOpenExportMenu,
  onOpenGifDialog,
  onShowHelp,
}: KeyboardShortcutsProps) {
  const { actions } = useDither();

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isInputTarget(e.target)) return;

      if (matchesMod(e)) {
        if (e.key.toLowerCase() === "p") {
          e.preventDefault();
          actions.exportPNG();
          return;
        }
        if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          actions.exportSVG();
          return;
        }
        if (e.key.toLowerCase() === "e") {
          e.preventDefault();
          onOpenExportMenu();
          return;
        }
        if (e.key.toLowerCase() === "g") {
          e.preventDefault();
          onOpenGifDialog();
          return;
        }
      }

      if (e.shiftKey && e.key === "?") {
        e.preventDefault();
        onShowHelp();
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        actions.togglePlayAll();
        return;
      }

      switch (e.key.toLowerCase()) {
        case "f":
          actions.fitToMedia();
          break;
        case "r":
          actions.resetGrid();
          break;
        case "b":
          actions.setMode("basic");
          break;
        case "e":
          actions.setMode("expert");
          break;
        case "?":
          onShowHelp();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actions, onOpenExportMenu, onOpenGifDialog, onShowHelp]);

  return null;
}
