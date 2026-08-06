import { Router } from "express";
import multer from "multer";
import {
  r2Configured,
  hasPublicUrl,
  bucketName,
  buildKey,
  putObject,
  getObject,
  presignUpload,
  publicUrlFor
} from "../lib/r2.js";

const router = Router();

// Serverless platforms cap the request body (Vercel: 4.5 MB), so there anything
// bigger has to go browser -> R2 directly via a presigned URL — which in turn
// needs a CORS rule on the bucket.
//
// A self-hosted server has no such cap, so it accepts the file directly and
// streams it on to R2. That keeps video uploads working without any CORS setup,
// which is why the limit is environment-dependent rather than a flat 4 MB.
const VERCEL_BODY_LIMIT = 4 * 1024 * 1024;
const SELF_HOSTED_DEFAULT_MB = 200;

const MAX_DIRECT_UPLOAD = process.env.VERCEL
  ? VERCEL_BODY_LIMIT
  : Number(process.env.MAX_UPLOAD_MB || SELF_HOSTED_DEFAULT_MB) * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DIRECT_UPLOAD, files: 10 }
});

/// Turns the API-served path into an absolute URL. Without this the app —
/// which runs on a different origin during development — would resolve
/// "/api/uploads/file/..." against its own host and fail to load the image.
function absolute(req, url) {
  if (/^https?:\/\//i.test(url)) return url;
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  return `${proto}://${req.get("host")}${url}`;
}

const IMAGE_TYPES = /^image\/(jpeg|jpg|png|webp|gif|avif|heic|heif)$/i;
const VIDEO_TYPES = /^video\/(mp4|webm|quicktime|x-matroska|3gpp)$/i;

function isAllowed(mimetype) {
  return IMAGE_TYPES.test(mimetype) || VIDEO_TYPES.test(mimetype);
}

// GET /api/uploads/config - what the clients need to know before uploading.
router.get("/config", (req, res) => {
  res.json({
    configured: r2Configured,
    bucket: bucketName,
    publicUrl: hasPublicUrl,
    maxDirectUploadBytes: MAX_DIRECT_UPLOAD
  });
});

// POST /api/uploads - multipart upload straight through the API to R2.
// Field name: "files" (repeatable) or "file". Best for images.
router.post("/", upload.any(), async (req, res) => {
  if (!r2Configured) {
    return res.status(503).json({
      error: "R2 is not configured on the server. Set the R2_* environment variables."
    });
  }

  const files = req.files || [];
  if (!files.length) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const rejected = files.find((f) => !isAllowed(f.mimetype));
  if (rejected) {
    return res.status(415).json({
      error: `Unsupported file type: ${rejected.mimetype}. Images and video only.`
    });
  }

  const folder = (req.query.folder || req.body?.folder || "media").toString();

  try {
    const uploaded = await Promise.all(
      files.map(async (file) => {
        const key = buildKey(folder, file.originalname);
        const url = await putObject({
          key,
          body: file.buffer,
          contentType: file.mimetype
        });
        return {
          key,
          url: absolute(req, url),
          name: file.originalname,
          size: file.size,
          contentType: file.mimetype,
          kind: VIDEO_TYPES.test(file.mimetype) ? "video" : "image"
        };
      })
    );

    res.status(201).json({ files: uploaded, urls: uploaded.map((f) => f.url) });
  } catch (err) {
    console.error("R2 upload failed:", err);
    res.status(502).json({ error: `Upload to R2 failed: ${err.message}` });
  }
});

// POST /api/uploads/presign - hand back a short-lived PUT URL so the client can
// send a large file (video) to R2 without it passing through this API.
router.post("/presign", async (req, res) => {
  if (!r2Configured) {
    return res.status(503).json({
      error: "R2 is not configured on the server. Set the R2_* environment variables."
    });
  }

  const { fileName, contentType, folder } = req.body || {};
  if (!contentType) {
    return res.status(400).json({ error: "contentType is required" });
  }
  if (!isAllowed(contentType)) {
    return res.status(415).json({ error: `Unsupported file type: ${contentType}` });
  }

  try {
    const key = buildKey(folder || "media", fileName || "");
    const uploadUrl = await presignUpload({ key, contentType });
    res.json({
      key,
      uploadUrl,
      url: absolute(req, publicUrlFor(key)),
      expiresIn: 900
    });
  } catch (err) {
    console.error("Presign failed:", err);
    res.status(502).json({ error: `Could not presign upload: ${err.message}` });
  }
});

// GET /api/uploads/file/<key> - streams an object back. This is what keeps
// things working before the bucket's public r2.dev URL is switched on.
router.get("/file/*", async (req, res) => {
  if (!r2Configured) {
    return res.status(503).json({ error: "R2 is not configured on the server." });
  }

  const key = req.params[0];
  if (!key) return res.status(400).json({ error: "Missing object key" });

  try {
    // Forwarding the browser's Range header is what lets a video be scrubbed
    // and lets playback start before the whole file has downloaded.
    const range = req.headers.range;
    const object = await getObject(key, range);

    if (object.ContentType) res.set("Content-Type", object.ContentType);
    if (object.ContentLength) res.set("Content-Length", String(object.ContentLength));
    // Uploads are immutable — the key changes whenever the file does.
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.set("Accept-Ranges", "bytes");

    if (range && object.ContentRange) {
      res.status(206);
      res.set("Content-Range", object.ContentRange);
    }

    object.Body.pipe(res);
  } catch (err) {
    // A range beyond the end of the file must say so rather than 502.
    if (err?.name === "InvalidRange" || err?.$metadata?.httpStatusCode === 416) {
      return res.status(416).json({ error: "Requested range not satisfiable" });
    }
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === "NoSuchKey") {
      return res.status(404).json({ error: "File not found" });
    }
    console.error("R2 read failed:", err);
    res.status(502).json({ error: `Could not read from R2: ${err.message}` });
  }
});

// Multer rejects oversized files before the handler runs.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: `File is larger than ${Math.round(MAX_DIRECT_UPLOAD / 1024 / 1024)} MB. Use /api/uploads/presign for large files.`,
        usePresign: true
      });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;
