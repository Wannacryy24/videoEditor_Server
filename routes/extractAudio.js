// routes/extractAudio.js
import { spawn } from "child_process";
import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import upload from "../middlewares/uploadMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function extractAudioRoute(app) {
  app.post("/extract-audio", upload.single("video"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No video uploaded" });

    const inputPath = req.file.path;
    const outputFileName = `${req.file.filename.split(".")[0]}.wav`;
    const outputPath = join(__dirname, "../processed", outputFileName);

    const ffmpeg = spawn("ffmpeg", [
      "-i", inputPath,
      "-vn",
      "-ac", "2",
      "-ar", "48000",
      "-acodec", "pcm_s16le",
      outputPath,
      "-y"
    ]);

    ffmpeg.stderr.on("data", (data) =>
      console.log(`FFmpeg: ${data}`)
    );

    ffmpeg.on("close", (code) => {
      fs.unlinkSync(inputPath);
      if (code === 0) {
        res.json({
          status: "success",
          audioUrl: `/processed/${outputFileName}`,
          audioFile: outputFileName
        });
      } else {
        res.status(500).json({ error: "Audio extraction failed" });
      }
    });
  });
}