// routes/thumbnails.js
import { spawn } from "child_process";
import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const THUMBNAILS_DIR = path.join(process.cwd(), "processed", "thumbnails");
fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });

export default function thumbnailRoute(app) {
  app.post("/thumbnails/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { count = 10 } = req.body;

      // locate uploaded video (for now assume in uploads/)
      const inputPath = path.join(process.cwd(), "uploads", id);
      if (!fs.existsSync(inputPath)) {
        return res.status(404).json({ error: "Video not found" });
      }

      const outDir = path.join(THUMBNAILS_DIR, id);
      fs.mkdirSync(outDir, { recursive: true });

      const pattern = path.join(outDir, "frame_%03d.png");

      // Simple ffmpeg thumbnail generation: capture 1 every N seconds
      const ffmpeg = spawn(ffmpegPath.path, [
        "-i", inputPath,
        "-vf", `fps=1/${Math.max(1, Math.floor(count))}`,
        pattern,
      ]);

      ffmpeg.stderr.on("data", (d) => console.log("FFmpeg:", d.toString()));

      ffmpeg.on("close", (code) => {
        if (code !== 0) return res.status(500).json({ error: "Thumbnail extraction failed" });

        const files = fs.readdirSync(outDir)
          .filter(f => f.endsWith(".png"))
          .map((f, i) => ({
            time: i, // fake time for now
            url: `/processed/thumbnails/${id}/${f}`,
          }));

        res.json({ id, thumbnails: files });
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
