// routes/crop.js
import { spawn } from "child_process";
import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CROP_DIR = join(process.cwd(), "processed", "cropped");
fs.mkdirSync(CROP_DIR, { recursive: true });

export default function cropRoute(app) {
  app.post("/crop", (req, res) => {
    const { filename, x, y, width, height } = req.body;
    console.log("inside Crop");

    if (!filename || !width || !height) {
      return res.status(400).json({ error: "Missing filename, width or height" });
    }

    const inputPath = join(process.cwd(), "uploads", filename);
    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    
    const outputFile = `cropped_${Date.now()}.mp4`;
    const outputPath = join(CROP_DIR, outputFile);

    const ffmpeg = spawn(ffmpegPath.path, [
      "-i", inputPath,
      "-filter:v", `crop=${width}:${height}:${x || 0}:${y || 0}`,
      "-c:a", "copy",
      outputPath,
    ]);

    ffmpeg.stderr.on("data", (data) => console.log(`FFmpeg: ${data}`));

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        res.json({ url: `/processed/cropped/${outputFile}` });
      } else {
        res.status(500).json({ error: "Crop failed" });
      }
    });
  });
}
