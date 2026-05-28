import { resolveYoutubeAudio } from "@/app/actions/youtube";

export const YOUTUBE_URL_RE =
  /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\/[^\s]+$/i;

export function isYoutubeUrl(value: string): boolean {
  return YOUTUBE_URL_RE.test(value.trim());
}

export interface LoadYoutubeOptions {
  onProgress?: (percent: number, label: string) => void;
  signal?: AbortSignal;
}

function sanitizeName(title: string): string {
  const safe = title
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${safe || "youtube"}.mp3`;
}

export async function loadYoutubeAsFile(
  url: string,
  options: LoadYoutubeOptions = {},
): Promise<File> {
  const { onProgress, signal } = options;

  if (signal?.aborted) throw new DOMException("aborted", "AbortError");
  onProgress?.(5, "Risoluzione URL…");

  const resolved = await resolveYoutubeAudio(url);
  if (!resolved.ok) throw new Error(resolved.error.message);

  if (signal?.aborted) throw new DOMException("aborted", "AbortError");
  onProgress?.(30, "Scaricamento file…");

  const proxyUrl = `/api/yt-fetch?u=${encodeURIComponent(resolved.data.downloadUrl)}`;
  const res = await fetch(proxyUrl, { signal });
  if (!res.ok) {
    let detail = "";
    try {
      const data = (await res.json()) as { error?: string };
      detail = data.error || "";
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Trasferimento fallito (${res.status})`);
  }

  const total = Number(res.headers.get("Content-Length")) || 0;
  let blob: Blob;
  if (res.body && total > 0) {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal?.aborted) {
        reader.cancel().catch(() => {});
        throw new DOMException("aborted", "AbortError");
      }
      chunks.push(value);
      received += value.length;
      const pct = 30 + Math.min(65, Math.round((received / total) * 65));
      onProgress?.(pct, "Scaricamento file…");
    }
    blob = new Blob(chunks as BlobPart[]);
  } else {
    blob = await res.blob();
  }

  if (signal?.aborted) throw new DOMException("aborted", "AbortError");
  onProgress?.(100, "Pronto");

  return new File([blob], sanitizeName(resolved.data.title), {
    type: res.headers.get("Content-Type") || "audio/mpeg",
  });
}
