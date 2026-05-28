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
      <div className="app-root">
        <Toolbar
          logo={logo}
          gifOpen={gifOpen}
          setGifOpen={setGifOpen}
          popoverOpen={popoverOpen}
          setPopoverOpen={setPopoverOpen}
        />
        <div className="app-body">
          <div className="canvas-area">
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
