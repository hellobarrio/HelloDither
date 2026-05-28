"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { SHORTCUTS } from "@/lib/shortcuts";

interface ShortcutsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROWS = [
  SHORTCUTS.playPause,
  SHORTCUTS.exportPng,
  SHORTCUTS.exportSvg,
  SHORTCUTS.exportMenu,
  SHORTCUTS.exportGif,
  SHORTCUTS.fitToMedia,
  SHORTCUTS.resetGrid,
  SHORTCUTS.toggleBasic,
  SHORTCUTS.toggleExpert,
  SHORTCUTS.help,
];

export function ShortcutsHelpDialog({ open, onOpenChange }: ShortcutsHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
          {ROWS.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: "1px solid var(--fg-3)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--fg-1)",
              }}
            >
              <span>{s.label}</span>
              <Kbd>{s.hint}</Kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
