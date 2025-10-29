// routes/metadata.js
import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import ffprobePath from "ffprobe-static"; // ✅ Correct import

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function metadataRoute(app) {
  app.get("/metadata/:filename", (req, res) => {
    try {
      const { filename } = req.params;

      // ✅ Look in all possible folders where processed videos may exist
      const possiblePaths = [
        path.join(process.cwd(), "uploads", filename),
        path.join(process.cwd(), "processed", "trimmed", filename),
        path.join(process.cwd(), "processed", "cropped", filename),
        path.join(process.cwd(), "processed", "rotated", filename),
        path.join(process.cwd(), "processed", "split", filename),
        path.join(process.cwd(), "processed", filename),
      ];

      const inputPath = possiblePaths.find((p) => fs.existsSync(p));

      if (!inputPath) {
        return res.status(404).json({ error: "File not found", searched: possiblePaths });
      }

      // ✅ ffprobe-static exports path directly — no `.path`
      const probe = spawnSync(ffprobePath, [
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        inputPath,
      ]);

      // ✅ Handle empty or failed ffprobe output
      if (probe.status !== 0 || !probe.stdout?.toString()) {
        console.error("ffprobe stderr:", probe.stderr?.toString());
        return res.status(500).json({ error: "Failed to extract metadata" });
      }

      const json = JSON.parse(probe.stdout.toString());
      const format = json.format || {};
      const streams = json.streams || [];

      const videoStream = streams.find((s) => s.codec_type === "video");
      const audioStream = streams.find((s) => s.codec_type === "audio");

      // ✅ Calculate FPS safely
      const fps =
        videoStream && videoStream.avg_frame_rate
          ? (() => {
              const [num, den] = videoStream.avg_frame_rate.split("/");
              return den ? parseFloat(num) / parseFloat(den) : 0;
            })()
          : 0;

      // ✅ Send complete structured metadata
      res.json({
        filename: path.basename(inputPath),
        duration: parseFloat(format.duration) || 0,
        size: parseInt(format.size || 0),
        hasAudio: !!audioStream, // ✅ Handy for frontend display
        video: videoStream
          ? {
              codec: videoStream.codec_name,
              width: videoStream.width,
              height: videoStream.height,
              fps,
            }
          : null,
        audio: audioStream
          ? {
              codec: audioStream.codec_name,
              channels: audioStream.channels,
              sample_rate: audioStream.sample_rate,
            }
          : null,
      });
    } catch (err) {
      console.error("Metadata error:", err);
      res.status(500).json({ error: err.message });
    }
  });
}
