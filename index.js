// index.js
import express from "express";
import cors from "cors";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";

// Import middlewares & routes
import videoRoutes from "./routes/videoRoutes.js"; // new unified multi-upload + export + jobs
// import trimRoute from "./routes/trim.js";
import cropRoute from "./routes/crop.js";
import rotateRoute from "./routes/rotate.js";
import exportRoute from "./routes/export.js";
import brightnessRoute from "./routes/brightnessContrast.js";
import transitionsRoute from "./routes/transitions.js";
import removeAudioRoute from "./routes/removeAudio.js";
import addAudioRoute from "./routes/addAudio.js";
import thumbnailRoute from "./routes/thumbnail.js";
import metadataRoute from "./routes/metadata.js";
import videoOperationsRoute from "./routes/videoOperations.js"; // ✅ Add this import
import splitRoute from "./routes/split.js";

const app = express();
const PORT = 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ================== STATIC FILES ==================
// Serve processed videos
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

// Serve raw uploads
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
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// ================== ROUTES ==================
// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// New unified video API
app.use("/api", videoRoutes);


videoOperationsRoute(app);

// Legacy modular routes (refactored to import uploadMiddleware directly)
// trimRoute(app);
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
// ================== START SERVER ==================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});