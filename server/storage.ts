// Cloudflare R2 storage helpers (S3-compatible API).
// Uploads go directly to R2 via the AWS SDK; downloads return short-lived
// signed URLs (or, if R2_PUBLIC_URL is set, the public bucket URL).
//
// Required env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
// Optional env: R2_PUBLIC_URL (e.g. "https://media.example.com" for a custom
//                              domain bound to the bucket — bypasses signing)
//                R2_SIGNED_URL_TTL_SECONDS (default 3600)

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client: S3Client | null = null;

function getClient() {
  if (_client) return _client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 storage misconfigured: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY"
    );
  }

  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

function getBucket() {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET is not configured");
  return bucket;
}

function getSignedUrlTtl() {
  const raw = process.env.R2_SIGNED_URL_TTL_SECONDS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3600;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function buildPublicUrl(key: string): string | null {
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");
  if (!publicBase) return null;
  return `${publicBase}/${key}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const client = getClient();
  const Bucket = getBucket();
  const key = appendHashSuffix(normalizeKey(relKey));

  const Body =
    typeof data === "string"
      ? Buffer.from(data, "utf-8")
      : Buffer.isBuffer(data)
        ? data
        : Buffer.from(data);

  await client.send(
    new PutObjectCommand({
      Bucket,
      Key: key,
      Body,
      ContentType: contentType,
    })
  );

  // Return the in-app proxy path — actual signing happens lazily in
  // storageProxy.ts when the browser fetches it. This keeps URLs stable in DB
  // even if the bucket configuration changes later.
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);

  const publicUrl = buildPublicUrl(key);
  if (publicUrl) return publicUrl;

  const client = getClient();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn: getSignedUrlTtl() }
  );
}
