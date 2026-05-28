"use client";

import * as React from "react";
import { Image as ImageIcon, Upload, X } from "lucide-react";
import { Section } from "./section";
import { Dropzone } from "../controls/dropzone";
import { useDither } from "@/state/dither-context";
import Image from "next/image";

export function MediaSection() {
  const { state, actions } = useDither();
  const m = state.media;
  return (
    <Section title="Media" icon={<ImageIcon size={13} />}>
      {m.kind === "none" ? (
        <Dropzone
          accept={{
            "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"],
            "video/*": [".mp4", ".webm", ".mov"],
          }}
          onFile={(f) => actions.loadFile(f, "media")}
          icon={<Upload size={20} />}
          label="Drop image or video"
          hint="JPG · PNG · WEBP · GIF · MP4 · WEBM"
        />
      ) : (
        <div className="relative aspect-video overflow-hidden border border-foreground bg-(--hb-black)">
          {m.kind === "image" ? (
            // Blob URL preview: bypass Next.js image optimizer (it can't fetch blob:).
            <Image
              src={m.url}
              alt={m.name}
              width={m.width || 320}
              height={m.height || 180}
              unoptimized
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              src={m.url}
              muted
              loop
              playsInline
              className="block h-full w-full object-contain"
            />
          )}
          <button
            type="button"
            className="absolute right-1 top-1 z-[2] inline-flex h-[22px] w-[22px] items-center justify-center border border-foreground bg-background text-foreground hover:bg-(--hb-rosso)"
            onClick={actions.clearMedia}
            title="Remove"
            aria-label="Remove media"
          >
            <X size={12} />
          </button>
          <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-[3px] text-[9px] uppercase tracking-[0.04em] text-(--hb-grigio)">
            {m.kind} · {m.width}×{m.height}
          </div>
        </div>
      )}
    </Section>
  );
}
