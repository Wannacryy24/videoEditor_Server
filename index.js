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
const allowedOrigins = [
  "https://clipforgee.netlify.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
];

// ✅ More robust CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g., curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS not allowed for this origin: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Handle preflight OPTIONS globally
app.options("*", cors());

app.use(express.json());

app.use((req, res, next) => {
  console.log("🌍 Request Origin:", req.headers.origin);
  next();
});

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
videoOperationsRoute(app);

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