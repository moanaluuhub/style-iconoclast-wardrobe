// Next.js Route Handler serving /manus-storage/<key> by 307-redirecting to a
// signed R2 URL. A rewrite in next.config.ts maps /manus-storage/:path* →
// /api/manus-storage/:path*, so existing DB rows that store /manus-storage/...
// keep resolving without a data migration.

import { storageGetSignedUrl } from "@/server/storage";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.pathname
    .replace(/^\/api\/manus-storage\/?/, "")
    .replace(/^\/manus-storage\/?/, "");

  if (!key) {
    return new Response("Missing storage key", { status: 400 });
  }

  try {
    const signed = await storageGetSignedUrl(key);
    return new Response(null, {
      status: 307,
      headers: {
        location: signed,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    console.error("[StorageProxy] failed:", err);
    return new Response("Storage proxy error", { status: 502 });
  }
}
