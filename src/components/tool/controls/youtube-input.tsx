"use client";

import * as React from "react";
import { Link, Loader2 } from "lucide-react";
import { useDither } from "@/state/dither-context";
import { isYoutubeUrl } from "@/lib/youtube-loader";

export function YoutubeInput() {
  const { actions, meta } = useDither();
  const [url, setUrl] = React.useState("");
  const { youtubeLoading: loading, youtubeProgress: progress, youtubeLabel: label } = meta;

  const handleLoad = async () => {
    const value = url.trim();
    if (!value) return;
    if (!isYoutubeUrl(value)) {
      actions.pushToast("Inserisci un URL YouTube valido", "error");
      return;
    }
    try {
      await actions.loadFromYoutube(value);
      setUrl("");
    } catch {
      /* toast già mostrato dal context */
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      e.preventDefault();
      void handleLoad();
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Link
            size={11}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-(--hb-black)"
          />
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
            placeholder="Incolla URL YouTube"
            className="h-7 w-full min-w-0 border border-foreground bg-background pl-6 pr-2 text-[10px] uppercase tracking-[0.04em] text-foreground placeholder:text-(--fg-2) focus:outline-none focus:bg-(--hb-grigio) disabled:opacity-50"
          />
        </div>
        {loading ? (
          <button
            type="button"
            onClick={actions.cancelYoutubeLoad}
            className="h-7 shrink-0 border border-foreground bg-background px-2 text-[10px] uppercase tracking-[0.04em] text-foreground hover:bg-(--hb-rosso) hover:text-background"
          >
            Annulla
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleLoad()}
            disabled={!url.trim()}
            className="h-7 shrink-0 border border-foreground bg-foreground px-2.5 text-[10px] uppercase tracking-[0.04em] text-background hover:bg-(--hb-rosso) hover:border-(--hb-rosso) disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Carica
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex flex-col gap-1">
          <div className="h-1 w-full border border-foreground bg-background">
            <div
              className="h-full bg-foreground transition-[width] duration-200"
              style={{ width: `${Math.max(2, progress)}%` }}
            />
          </div>
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-[0.04em] text-(--fg-2)">
            <Loader2 size={9} className="animate-spin" />
            <span className="truncate">
              {label} {progress > 0 ? `· ${progress}%` : ""}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
