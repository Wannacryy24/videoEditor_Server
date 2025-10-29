import { spawn } from "child_process";
import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import upload from "../middlewares/uploadMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function rotateRoute(app) {
  app.post("/rotate", upload.single("video"), (req, res) => {
    try {
      const { angle } = req.body;
      const inputPath = req.file.path;
      const outputFilename = `rotated_${Date.now()}.mp4`;
      const outputPath = join(__dirname, "../processed", outputFilename);

      let filter;
      const deg = parseInt(angle);
      if (deg === 90) filter = "transpose=1";
      else if (deg === 180) filter = "transpose=1,transpose=1";
      else if (deg === 270) filter = "transpose=2";
      else return res.status(400).json({ error: "Angle must be 90, 180, or 270" });

      const ffmpeg = spawn(ffmpegPath.path, [
        "-i", inputPath,
        "-vf", filter,
        "-c:a", "copy",
        outputPath,
      ]);

      ffmpeg.stderr.on("data", (data) => console.log(`FFmpeg: ${data}`));

      ffmpeg.on("close", (code) => {
        fs.unlinkSync(inputPath);
        if (code === 0) res.json({ url: `/processed/${outputFilename}` });
        else res.status(500).json({ error: "Rotate failed" });
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
