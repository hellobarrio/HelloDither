"use server";

import type { YoutubeResult } from "@/lib/youtube-types";

const API_HOST = "youtube-mp3-2025.p.rapidapi.com";
const AUDIO_ENDPOINT = `https://${API_HOST}/v1/social/youtube/audio`;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const YT_URL_RE =
  /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\/[^\s]+$/i;

export interface YoutubeAudioResult {
  downloadUrl: string;
  title: string;
}

function err(code: string, message: string) {
  return { ok: false as const, error: { code, message } };
}

function extractVideoId(rawUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\.|^music\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return id || null;
  }
  if (host === "youtube.com") {
    if (u.pathname === "/watch") return u.searchParams.get("v");
    const m = u.pathname.match(/^\/(shorts|embed|v)\/([^/]+)/);
    if (m) return m[2];
  }
  return null;
}

interface ApiResponse {
  linkDownload?: string;
  linkDownloadProgress?: string;
  title?: string;
  error?: string | boolean;
  message?: string;
}

export async function resolveYoutubeAudio(
  rawUrl: string,
): Promise<YoutubeResult<YoutubeAudioResult>> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    return err(
      "NO_KEY",
      "Servizio YouTube non configurato (RAPIDAPI_KEY mancante in .env.local)",
    );
  }
  if (!YT_URL_RE.test(rawUrl)) {
    return err("BAD_URL", "URL YouTube non valido");
  }
  const id = extractVideoId(rawUrl);
  if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
    return err("BAD_URL", "Impossibile estrarre l'ID del video");
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  let res: Response;
  try {
    res = await fetch(AUDIO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": API_HOST,
        "User-Agent": BROWSER_UA,
        Accept: "application/json",
      },
      body: JSON.stringify({
        id,
        url: `https://www.youtube.com/watch?v=${id}`,
        quality: "192kbps",
        ext: "mp3",
      }),
      signal: ctrl.signal,
      cache: "no-store",
    });
  } catch (e) {
    clearTimeout(timer);
    if ((e as Error)?.name === "AbortError") {
      return err("TIMEOUT", "Timeout chiamata servizio YouTube");
    }
    console.error("[youtube] network error", e);
    return err("NETWORK", "Errore di rete verso il servizio YouTube");
  }
  clearTimeout(timer);

  let raw = "";
  let data: ApiResponse | null = null;
  try {
    raw = await res.text();
    data = JSON.parse(raw) as ApiResponse;
  } catch {
    /* not JSON */
  }

  if (res.status === 429) {
    return err(
      "RATE_LIMIT",
      "Limite di richieste raggiunto, riprova tra qualche minuto",
    );
  }
  if (!res.ok) {
    console.error(`[youtube] ${res.status}: ${raw.slice(0, 300)}`);
    const msg =
      data?.message ||
      (typeof data?.error === "string" ? data.error : "") ||
      `Errore servizio (${res.status})`;
    return err("UPSTREAM", msg);
  }
  if (!data) {
    console.error(`[youtube] non-JSON response: ${raw.slice(0, 300)}`);
    return err("BAD_RESPONSE", "Risposta servizio non valida");
  }

  const errFlag = data.error;
  const isError =
    (typeof errFlag === "boolean" && errFlag === true) ||
    (typeof errFlag === "string" && errFlag.toLowerCase() === "true");
  if (isError) {
    return err(
      "API_ERROR",
      data.message || "Il servizio ha rifiutato la richiesta",
    );
  }

  const link = data.linkDownload || data.linkDownloadProgress;
  if (!link) {
    return err("BAD_RESPONSE", "Il servizio non ha restituito un link di download");
  }
  return {
    ok: true,
    data: { downloadUrl: link, title: data.title || "youtube-audio" },
  };
}
