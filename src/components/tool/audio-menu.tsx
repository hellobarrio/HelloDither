"use client";

import * as React from "react";
import { Loader2, Music, Upload } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Dropzone } from "./controls/dropzone";
import { YoutubeInput } from "./controls/youtube-input";
import { useDither } from "@/state/dither-context";

export function AudioMenu() {
  const { actions, meta } = useDither();
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="btn small">
          {meta.youtubeLoading ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Music size={11} />
          )}{" "}
          Audio
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-72">
        <div className="flex flex-col gap-2">
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
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.04em] text-(--fg-2)">
            <div className="h-px flex-1 bg-(--fg-2) opacity-40" />
            <span>oppure</span>
            <div className="h-px flex-1 bg-(--fg-2) opacity-40" />
          </div>
          <YoutubeInput />
        </div>
      </PopoverContent>
    </Popover>
  );
}
