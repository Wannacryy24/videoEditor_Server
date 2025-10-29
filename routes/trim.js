// routes/trim.js
import { spawn } from "child_process";
import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TRIM_DIR = join(process.cwd(), "processed", "trimmed");
fs.mkdirSync(TRIM_DIR, { recursive: true });

export default function trimRoute(app) {
  app.post("/trim", (req, res) => {
    const { filename, start, end } = req.body;

    if (!filename || start == null || end == null) {
      return res.status(400).json({ error: "Missing filename, start, or end" });
    }

    const inputPath = join(__dirname, "../uploads", filename);
    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const outFile = `${path.parse(filename).name}_${Date.now()}_trimmed.mp4`;
    const outPath = join(TRIM_DIR, outFile);

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
        trimmedUrl: `/processed/trimmed/${outFile}`,
        filename: outFile,
        start,
        end,
      });
    });
  });
}
