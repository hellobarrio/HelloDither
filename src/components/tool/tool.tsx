"use client";

import * as React from "react";
import { Toaster } from "@/components/ui/sonner";
import { DitherProvider } from "@/state/dither-context";
import { Toolbar } from "./toolbar";
import { CanvasStage } from "./canvas-stage";
import { Sidebar } from "./sidebar";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import { ShortcutsHelpDialog } from "./shortcuts-help-dialog";

interface ToolProps {
  logo: React.ReactNode;
  emptyHero: React.ReactNode;
}

export function Tool({ logo, emptyHero }: ToolProps) {
  const [gifOpen, setGifOpen] = React.useState(false);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);

  return (
    <DitherProvider>
      <div className="grid h-dvh w-full grid-rows-[auto_minmax(0,1fr)]">
        <Toolbar
          logo={logo}
          gifOpen={gifOpen}
          setGifOpen={setGifOpen}
          popoverOpen={popoverOpen}
          setPopoverOpen={setPopoverOpen}
        />
        <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-1">
          <div className="relative flex min-h-0 flex-col overflow-hidden bg-background">
            <CanvasStage emptyHero={emptyHero} />
          </div>
          <Sidebar onShowHelp={() => setHelpOpen(true)} />
        </div>
      </div>
      <KeyboardShortcuts
        onOpenExportMenu={() => setPopoverOpen(true)}
        onOpenGifDialog={() => setGifOpen(true)}
        onShowHelp={() => setHelpOpen(true)}
      />
      <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <Toaster position="bottom-right" />
    </DitherProvider>
  );
}
