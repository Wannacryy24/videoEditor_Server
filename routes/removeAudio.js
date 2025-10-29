import { spawn } from "child_process";
import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import upload from "../middlewares/uploadMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function removeAudioRoute(app) {
  app.post("/remove-audio", upload.single("video"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No video uploaded" });

    const inputPath = req.file.path;
    const outputFileName = `noaudio_${Date.now()}.mp4`;
    const outputPath = join(__dirname, "../processed", outputFileName);

    const ffmpeg = spawn(ffmpegPath.path, ["-i", inputPath, "-c", "copy", "-an", outputPath]);

    ffmpeg.stderr.on("data", (data) => console.log(`FFmpeg: ${data}`));

    ffmpeg.on("close", (code) => {
      fs.unlinkSync(inputPath);
      if (code === 0) res.json({ url: `/processed/${outputFileName}` });
      else res.status(500).json({ error: "Remove audio failed" });
    });
  });
}
