// routes/videoOperations.js
import { spawn } from "child_process";
import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LATEST_DIR = join(process.cwd(), "processed", "latest");
fs.mkdirSync(LATEST_DIR, { recursive: true });

export default function videoOperationsRoute(app) {
  // Trim endpoint - saves to latest folder
  app.post("/trim", (req, res) => {
    const { filename, start, end } = req.body;

    if (!filename || start == null || end == null) {
      return res.status(400).json({ error: "Missing filename, start, or end" });
    }

    // ✅ Check both uploads and latest folders
    let inputPath = join(process.cwd(), "uploads", filename);
    if (!fs.existsSync(inputPath)) {
      inputPath = join(process.cwd(), "processed", "latest", filename);
      if (!fs.existsSync(inputPath)) {
        return res.status(404).json({ error: "File not found" });
      }
    }

    const outFile = `${path.parse(filename).name}_latest.mp4`;
    const outPath = join(LATEST_DIR, outFile);

    const args = [
      "-i", inputPath,
      "-ss", start.toString(),
      "-to", end.toString(),
      "-c", "copy",
      outPath,
    ];

    const ffmpeg = spawn(ffmpegPath.path, args);

    ffmpeg.stderr.on("data", (d) => console.log("FFmpeg:", d.toString()));

    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: "FFmpeg trim failed" });
      }

      res.json({
        trimmedUrl: `/processed/latest/${outFile}`,
        filename: outFile,
        start,
        end,
      });
    });
  });

  // Get the current latest video
  app.get("/latest/:filename", (req, res) => {
    const { filename } = req.params;
    const latestPath = join(LATEST_DIR, filename);
    
    if (fs.existsSync(latestPath)) {
      res.sendFile(latestPath);
    } else {
      // Fallback to original
      const uploadsPath = join(process.cwd(), "uploads", filename);
      if (fs.existsSync(uploadsPath)) {
        res.sendFile(uploadsPath);
      } else {
        res.status(404).json({ error: "Video not found" });
      }
    }
  });

  // Other operations can be added here later
  app.post("/crop", (req, res) => {
    // Implementation for crop
  });

  app.post("/rotate", (req, res) => {
    // Implementation for rotate
  });
}