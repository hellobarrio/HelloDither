"use client";

import * as React from "react";
import { Music, Upload } from "lucide-react";
import { ExportMenu } from "./export-menu";
import { useDither } from "@/state/dither-context";
import { Playbar } from "./playbar";

interface ToolbarProps {
  logo: React.ReactNode;
  gifOpen: boolean;
  setGifOpen: (v: boolean) => void;
  popoverOpen: boolean;
  setPopoverOpen: (v: boolean) => void;
}

export function Toolbar({
  logo,
  gifOpen,
  setGifOpen,
  popoverOpen,
  setPopoverOpen,
}: ToolbarProps) {
  const { state, actions } = useDither();

  return (
    <header className="flex min-h-14 flex-wrap items-stretch border-b border-foreground bg-background lg:h-14 lg:flex-nowrap justify-between">
      <div className="flex h-14 items-center border-r border-foreground px-3">
        {logo}
      </div>
      <div className="flex h-14 items-center gap-2 lg:border-r border-foreground px-3">
        <label className="btn small cursor-pointer">
          <Upload size={11} /> Upload
          <input
            type="file"
            className="sr-only"
            accept="image/*,video/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) actions.loadFile(f, "media");
              e.target.value = "";
            }}
          />
        </label>
        <label className="btn small cursor-pointer">
          <Music size={11} /> Audio
          <input
            type="file"
            className="sr-only"
            accept="audio/*,.mp3,.wav"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) actions.loadFile(f, "audio");
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <div className="order-3 flex h-14 min-w-0 flex-1 basis-full items-center border-t border-foreground lg:order-none lg:basis-auto lg:border-t-0">
        <Playbar />
      </div>
      <div className="ml-auto flex h-14 w-full items-center justify-between gap-3 border-t border-foreground px-3 lg:w-[340px] lg:border-l lg:border-t-0">
        <div className="mode-toggle">
          <button
            type="button"
            className={"pill" + (state.ui.mode === "basic" ? " active" : "")}
            onClick={() => actions.setMode("basic")}
            aria-pressed={state.ui.mode === "basic"}
          >
            Basic
          </button>
          <button
            type="button"
            className={"pill" + (state.ui.mode === "expert" ? " active" : "")}
            onClick={() => actions.setMode("expert")}
            aria-pressed={state.ui.mode === "expert"}
          >
            Expert
          </button>
        </div>
        <ExportMenu
          gifOpen={gifOpen}
          setGifOpen={setGifOpen}
          popoverOpen={popoverOpen}
          setPopoverOpen={setPopoverOpen}
        />
      </div>
    </header>
  );
}
