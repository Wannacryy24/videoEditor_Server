import { spawn } from "child_process";
import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import upload from "../middlewares/uploadMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function brightnessRoute(app) {
  app.post("/brightness-contrast", upload.single("video"), (req, res) => {
    try {
      const { brightness, contrast } = req.body;
      const inputPath = req.file.path;
      const outputFilename = `brightness_${Date.now()}.mp4`;
      const outputPath = join(__dirname, "../processed", outputFilename);

      const ffmpeg = spawn(ffmpegPath.path, [
        "-i", inputPath,
        "-vf", `eq=brightness=${brightness}:contrast=${contrast}`,
        "-c:a", "copy",
        outputPath,
      ]);

      ffmpeg.stderr.on("data", (data) => console.log(`FFmpeg: ${data}`));

      ffmpeg.on("close", (code) => {
        fs.unlinkSync(inputPath);
        if (code === 0) res.json({ url: `/processed/${outputFilename}` });
        else res.status(500).json({ error: "Brightness/Contrast failed" });
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
