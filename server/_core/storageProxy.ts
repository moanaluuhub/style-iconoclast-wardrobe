import type { Express } from "express";
import { storageGetSignedUrl } from "../storage";

// Serves /manus-storage/<key> by 307-redirecting to a short-lived signed URL
// (or a public custom-domain URL if R2_PUBLIC_URL is configured). The path
// prefix is preserved for backward-compatibility with existing DB rows.
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      const url = await storageGetSignedUrl(key);
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
