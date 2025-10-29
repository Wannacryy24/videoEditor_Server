import { spawn, spawnSync } from "child_process";
import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffprobePath from "ffprobe-static";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const THUMBNAILS_DIR = join(process.cwd(), "processed", "thumbnails");
fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });

// ✅ Helper: get duration in seconds
function getVideoDuration(filePath) {
  try {
    const result = spawnSync(ffprobePath.path, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);

    if (result.status === 0) {
      return parseFloat(result.stdout.toString().trim()) || 0;
    }
    return 0;
  } catch (err) {
    console.error("ffprobe error:", err);
    return 0;
  }
}

export default function thumbnailRoute(app) {
  app.post("/thumbnails/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      const { count = 10 } = req.body;

      // ✅ Check both uploads and latest folders
      let inputPath = join(process.cwd(), "uploads", filename);
      if (!fs.existsSync(inputPath)) {
        inputPath = join(process.cwd(), "processed", "latest", filename);
        if (!fs.existsSync(inputPath)) {
          return res.status(404).json({ error: "Video not found" });
        }
      }

      const outDir = join(THUMBNAILS_DIR, filename);
      fs.mkdirSync(outDir, { recursive: true });

      const pattern = join(outDir, "frame_%03d.png");

      // ✅ Get real video duration
      const duration = getVideoDuration(inputPath);
      if (duration <= 0) {
        return res.status(500).json({ error: "Could not determine video duration" });
      }


      // ✅ Interval = total duration / count (so we spread evenly)
      const interval = duration / count;

      // ✅ ffmpeg command: grab 1 frame every `interval` seconds
      const ffmpeg = spawn(ffmpegPath.path, [
        "-i", inputPath,
        "-vf", `fps=1/${interval}`,
        pattern,
      ]);

      ffmpeg.stderr.on("data", (d) => console.log("FFmpeg:", d.toString()));

      ffmpeg.on("close", (code) => {
        if (code !== 0) {
          return res.status(500).json({ error: "Thumbnail extraction failed" });
        }

        const files = fs.readdirSync(outDir)
          .filter(f => f.endsWith(".png"))
          .map((f, i) => ({
            time: i * interval, // ✅ actual second mark
            url: `/processed/thumbnails/${filename}/${f}`,
          }));

        res.json({ filename, duration, thumbnails: files });
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
