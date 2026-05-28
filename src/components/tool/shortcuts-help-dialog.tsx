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
        <div className="mt-3.5 flex flex-col gap-1.5">
          {ROWS.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between border-b border-(--fg-3) py-1.5 text-[11px] uppercase tracking-[0.06em] text-foreground"
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
