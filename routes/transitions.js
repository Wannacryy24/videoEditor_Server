import { spawn } from "child_process";
import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import upload from "../middlewares/uploadMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function transitionsRoute(app) {
  app.post("/transitions", upload.single("video"), (req, res) => {
    try {
      const { transitionType, duration } = req.body;
      const inputPath = req.file.path;
      const outputFilename = `transition_${Date.now()}.mp4`;
      const outputPath = join(__dirname, "../processed", outputFilename);

      let filter;
      if (transitionType === "fade") {
        filter = `fade=t=in:st=0:d=${duration},fade=t=out:st=5:d=${duration}`;
      } else if (transitionType === "dissolve") {
        filter = `fade=t=out:st=5:d=${duration}`;
      } else {
        return res.status(400).json({ error: "Invalid transition type" });
      }

      const ffmpeg = spawn(ffmpegPath.path, [
        "-i", inputPath,
        "-filter:v", filter,
        "-c:a", "copy",
        outputPath,
      ]);

      ffmpeg.stderr.on("data", (data) => console.log(`FFmpeg: ${data}`));

      ffmpeg.on("close", (code) => {
        fs.unlinkSync(inputPath);
        if (code === 0) res.json({ url: `/processed/${outputFilename}` });
        else res.status(500).json({ error: "Transition failed" });
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
