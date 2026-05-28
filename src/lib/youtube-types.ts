export type YoutubeResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
