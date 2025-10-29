import { spawn } from "child_process";
import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import upload from "../middlewares/uploadMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function addAudioRoute(app) {
  app.post("/add-audio", upload.fields([{ name: "video" }, { name: "audio" }]), (req, res) => {
    try {
      if (!req.files || !req.files.video || !req.files.audio) {
        return res.status(400).json({ error: "Both video and audio files are required" });
      }

      const videoPath = req.files.video[0].path;
      const audioPath = req.files.audio[0].path;
      const outputFilename = `addaudio_${Date.now()}.mp4`;
      const outputPath = join(__dirname, "../processed", outputFilename);

      const ffmpeg = spawn(ffmpegPath.path, [
        "-i", videoPath,
        "-i", audioPath,
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
        outputPath,
      ]);

      ffmpeg.stderr.on("data", (data) => console.log(`FFmpeg: ${data}`));

      ffmpeg.on("close", (code) => {
        fs.unlinkSync(videoPath);
        fs.unlinkSync(audioPath);
        if (code === 0) res.json({ url: `/processed/${outputFilename}` });
        else res.status(500).json({ error: "Add audio failed" });
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
