import express from "express";
import cors from "cors";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";

// Import middlewares & routes
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

// ================== STATIC FILES ==================
app.use(
  "/processed",
  express.static(join(__dirname, "processed"), {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    },
  })
);

app.use(
  "/uploads",
  express.static(join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    },
  })
);

// ================== MIDDLEWARE ==================
app.use(
  cors({
    origin: [
      "https://clipforgee.netlify.app",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ================== ROUTES ==================

// ✅ Root route for Render health check
app.get("/", (req, res) => {
  res.send("🎬 ClipForge Backend is Live ✅");
});

// ✅ Health check route
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// ✅ Mount clean routes
app.use("/api", videoRoutes);
app.use("/api", (req, res, next) => videoOperationsRoute(app)); // <— SAFE FIX ✅

// ✅ Legacy modular routes
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

// ✅ Catch-all (for debugging unexpected full URLs)
app.use((req, res, next) => {
  console.log("⚠️ Unhandled path:", req.originalUrl);
  next();
});

// ================== START SERVER ==================
app.listen(PORT, () => {
  console.log(`🚀 Server running at port ${PORT}`);
});