import { spawn } from "child_process";
import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import upload from "../middlewares/uploadMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function exportRoute(app) {
  app.post("/export", upload.single("video"), (req, res) => {
    try {
      const { format } = req.body;
      const inputPath = req.file.path;
      const outputFilename = `export_${Date.now()}.${format || "mp4"}`;
      const outputPath = join(__dirname, "../processed", outputFilename);

      const ffmpeg = spawn(ffmpegPath.path, [
        "-i", inputPath,
        "-c:v", "libx264",
        "-c:a", "aac",
        outputPath,
      ]);

      ffmpeg.stderr.on("data", (data) => console.log(`FFmpeg: ${data}`));

      ffmpeg.on("close", (code) => {
        fs.unlinkSync(inputPath);
        if (code === 0) res.json({ url: `/processed/${outputFilename}` });
        else res.status(500).json({ error: "Export failed" });
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
