import type { NextRequest } from "next/server";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Solo questi host CDN sono accettati dal proxy per prevenire SSRF.
const ALLOWED_HOST_SUFFIXES = [
  ".zm.io.vn",
  "zm.io.vn",
  "j2download.com",
  ".j2download.com",
  ".rapidapi.com",
];

function isAllowedHost(host: string): boolean {
  const lower = host.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => lower === suffix || lower.endsWith(suffix),
  );
}

export async function GET(req: NextRequest): Promise<Response> {
  const u = req.nextUrl.searchParams.get("u");
  if (!u) {
    return Response.json({ error: "Missing u param" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return Response.json({ error: "Invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return Response.json({ error: "Bad protocol" }, { status: 400 });
  }

  if (!isAllowedHost(target.hostname)) {
    return Response.json(
      { error: `Host non autorizzato: ${target.hostname}` },
      { status: 403 },
    );
  }

  const upstream = await fetch(target.toString(), {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "*/*",
    },
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    return Response.json(
      { error: `Upstream ${upstream.status}` },
      { status: 502 },
    );
  }

  const contentType =
    upstream.headers.get("Content-Type") || "application/octet-stream";
  const contentLength = upstream.headers.get("Content-Length");

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "private, max-age=600",
  };
  if (contentLength) headers["Content-Length"] = contentLength;

  return new Response(upstream.body, { status: 200, headers });
}
