import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/// Cloudflare R2 speaks the S3 API, so the AWS SDK works unchanged. The only
/// R2-specific bits are region "auto" and the account-scoped endpoint.
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const BUCKET = process.env.R2_BUCKET || "tripnix";

/// Where uploaded objects are read from. Set this to the bucket's r2.dev
/// public URL (or a custom domain) once public access is enabled. Until then
/// the API serves files itself via /api/uploads/file/<key>.
const PUBLIC_BASE = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

export const r2Configured = Boolean(
  ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
);

export const bucketName = BUCKET;
export const hasPublicUrl = Boolean(PUBLIC_BASE);

let client = null;

export function r2() {
  if (!r2Configured) {
    throw new Error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET."
    );
  }
  client ||= new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });
  return client;
}

/// Builds a collision-proof object key, keeping the original extension so the
/// browser still infers a sensible type: trips/2026-08/9f3c1a2b.jpg
export function buildKey(folder, originalName = "") {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const match = String(originalName).match(/\.([a-zA-Z0-9]{1,5})$/);
  const ext = match ? `.${match[1].toLowerCase()}` : "";
  const safeFolder = String(folder || "misc").replace(/[^a-z0-9/_-]/gi, "");
  return `${safeFolder}/${month}/${randomUUID()}${ext}`;
}

/// The URL clients should use to read an object back.
export function publicUrlFor(key) {
  if (PUBLIC_BASE) return `${PUBLIC_BASE}/${key}`;
  // No public bucket URL yet — read it back through this API instead.
  return `/api/uploads/file/${key}`;
}

export async function putObject({ key, body, contentType }) {
  await r2().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream"
    })
  );
  return publicUrlFor(key);
}

/// Fetches an object, optionally just a byte range.
///
/// `range` is passed straight through as an HTTP Range header ("bytes=0-1023").
/// Video players need this to seek, and Safari refuses to play a video at all
/// unless the server answers ranged requests.
export async function getObject(key, range) {
  return r2().send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key, Range: range || undefined })
  );
}

export async function deleteObject(key) {
  await r2().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/// Presigned PUT so big files (video) go browser -> R2 directly, bypassing the
/// serverless request body limit.
export async function presignUpload({ key, contentType, expiresIn = 900 }) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType || "application/octet-stream"
  });
  return getSignedUrl(r2(), command, { expiresIn });
}
