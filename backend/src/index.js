import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import tripsRouter from "./routes/trips.js";
import vehiclesRouter from "./routes/vehicles.js";
import bookingsRouter from "./routes/bookings.js";
import authRouter from "./routes/auth.js";
import uploadsRouter from "./routes/uploads.js";
import subscriptionsRouter from "./routes/subscriptions.js";
import { databaseConfigured, configReport } from "./lib/firebase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/public", express.static(path.join(__dirname, "../public")));

// Serve Admin Portal at /admin
const adminDir = path.resolve(__dirname, "../../admin");
const adminPublicDir = path.resolve(__dirname, "../../admin/public");

app.use("/admin", express.static(adminPublicDir));
app.use("/admin", express.static(adminDir));

app.get(["/admin", "/admin/*"], (req, res) => {
  res.sendFile(path.join(adminDir, "index.html"));
});

// Health check
app.get(["/", "/api"], (req, res) => {
  res.json({
    name: "Tripnix API",
    status: "ok",
    version: "1.0.0",
    firebaseDatabaseConnected: databaseConfigured,
    adminUrl: `http://localhost:${PORT}/admin`
  });
});

// Feature routes
app.use("/api/auth", authRouter);
app.use("/api/trips", tripsRouter);
app.use("/api/vehicles", vehiclesRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/uploads", uploadsRouter);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Tripnix backend running on http://localhost:${PORT}`);
    console.log(`Tripnix Admin Portal live at http://localhost:${PORT}/admin`);
    const cfg = configReport();
    if (cfg.databaseConfigured && cfg.authConfigured) {
      console.log(`[Firebase] Realtime Database + Auth connected (project ${cfg.projectId}).`);
    } else {
      console.log(`[Firebase] NOT fully configured - accounts will NOT be saved.`);
      console.log(`[Firebase] Missing: ${cfg.missing.join(", ")}`);
      console.log(`[Firebase] Fix backend/.env, then check http://localhost:${PORT}/api/auth/health`);
    }
  });
}

export default app;
