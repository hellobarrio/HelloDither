"use client";

import * as React from "react";
import { Activity, Download, Film, Image as ImageIcon, Square, Video } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Kbd } from "@/components/ui/kbd";
import { GifExportDialog } from "./gif-export-dialog";
import { useDither } from "@/state/dither-context";
import { SHORTCUTS } from "@/lib/shortcuts";

interface ExportMenuProps {
  gifOpen: boolean;
  setGifOpen: (v: boolean) => void;
  popoverOpen: boolean;
  setPopoverOpen: (v: boolean) => void;
}

export function ExportMenu({
  gifOpen,
  setGifOpen,
  popoverOpen,
  setPopoverOpen,
}: ExportMenuProps) {
  const { actions, meta } = useDither();

  const close = () => setPopoverOpen(false);

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="btn dark small">
            <Download size={12} /> Export
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6}>
          <div className="popover-menu">
            <button
              type="button"
              className="item"
              onClick={() => {
                actions.exportPNG();
                close();
              }}
            >
              <span className="label">
                <ImageIcon size={11} /> PNG
              </span>
              <Kbd>{SHORTCUTS.exportPng.hint}</Kbd>
            </button>
            <button
              type="button"
              className="item"
              onClick={() => {
                actions.exportSVG();
                close();
              }}
            >
              <span className="label">
                <Square size={11} /> SVG
              </span>
              <Kbd>{SHORTCUTS.exportSvg.hint}</Kbd>
            </button>
            <button
              type="button"
              className="item"
              onClick={() => {
                actions.toggleRecord();
                close();
              }}
            >
              <span className="label">
                <Video size={11} /> {meta.recording ? "Stop recording" : "Record WebM"}
              </span>
            </button>
            <button
              type="button"
              className="item"
              onClick={() => {
                close();
                setGifOpen(true);
              }}
            >
              <span className="label">
                <Activity size={11} /> GIF…
              </span>
              <Kbd>{SHORTCUTS.exportGif.hint}</Kbd>
            </button>
            <button
              type="button"
              className="item disabled"
              title="Record WebM then convert externally"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="label">
                <Film size={11} /> MP4 (use WebM)
              </span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
      <GifExportDialog open={gifOpen} onOpenChange={setGifOpen} />
    </>
  );
}
