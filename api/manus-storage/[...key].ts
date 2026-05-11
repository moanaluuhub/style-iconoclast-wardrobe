// Vercel serverless function that serves /manus-storage/<key> by
// 307-redirecting to a short-lived signed R2 URL.
//
// A rewrite in vercel.json maps /manus-storage/:path* → /api/manus-storage/:path*
// so existing image URLs stored in the database (which still start with
// /manus-storage/) keep working without a DB migration.

import { storageGetSignedUrl } from "../../server/storage";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  // /api/manus-storage/<key…> → "<key…>"
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
