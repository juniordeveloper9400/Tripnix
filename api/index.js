import app from "../backend/src/index.js";

export default function handler(req, res) {
  try {
    return app(req, res);
  } catch (err) {
    console.error("Vercel Serverless Handler Error:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
}
