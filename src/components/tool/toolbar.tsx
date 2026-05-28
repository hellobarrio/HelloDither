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
    <header className="app-toolbar">
      <div className="tb-section">{logo}</div>
      <div className="tb-section">
        <label className="btn small" style={{ cursor: "pointer" }}>
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
        <label className="btn small" style={{ cursor: "pointer" }}>
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
      <div className="tb-section flex-1">
        <Playbar />
      </div>
      <div
        className="tb-section justify-between right w-84.75"
        style={{ borderRight: 0, gap: 12 }}
      >
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
