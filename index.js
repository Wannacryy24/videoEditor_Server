// index.js
import express from "express";
import cors from "cors";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";

// Import routes
import videoRoutes from "./routes/videoRoutes.js";
import cropRoute from "./routes/crop.js";
import rotateRoute from "./routes/rotate.js";
import exportRoute from "./routes/export.js";
import brightnessRoute from "./routes/brightnessContrast.js";
import transitionsRoute from "./routes/transitions.js";
import removeAudioRoute from "./routes/removeAudio.js";
import addAudioRoute from "./routes/addAudio.js";
import thumbnailRoute from "./routes/thumbnail.js";
import metadataRoute from "./routes/metadata.js";
import videoOperationsRoute from "./routes/videoOperations.js";
import splitRoute from "./routes/split.js";

const app = express();
const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ================== ✅ GLOBAL CORS (must come FIRST) ==================
app.use(
  cors({
    origin: [
      "https://clipforgee.netlify.app",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors()); // handle all preflight requests

// ================== BASIC MIDDLEWARE ==================
app.use(express.json());

// ================== STATIC FILES ==================
app.use(
  "/uploads",
  express.static(join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
    },
  })
);

app.use(
  "/processed",
  express.static(join(__dirname, "processed"), {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
    },
  })
);

// ================== ROUTES ==================

// ✅ Root route
app.get("/", (req, res) => {
  res.send("🎬 ClipForge Backend is Live ✅");
});

// ✅ Health check route (for Render + frontend)
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// ✅ Unified routes
app.use("/api", videoRoutes);
videoOperationsRoute(app);

// ✅ Modular routes
cropRoute(app);
rotateRoute(app);
exportRoute(app);
brightnessRoute(app);
transitionsRoute(app);
removeAudioRoute(app);
addAudioRoute(app);
thumbnailRoute(app);
metadataRoute(app);
splitRoute(app);

// ✅ Debug route (optional, helps with Render troubleshooting)
app.get("/debug/env", (req, res) => {
  res.json({
    protocol: req.protocol,
    forwardedProto: req.headers["x-forwarded-proto"],
    host: req.get("host"),
    resolvedBase: `${req.headers["x-forwarded-proto"] || req.protocol}://${req.get("host")}`,
  });
});

// ================== START SERVER ==================
app.listen(PORT, () => {
  console.log(`🚀 Server running at port ${PORT}`);
});