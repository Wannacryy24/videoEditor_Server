// routes/split.js
import { spawnSync, spawn } from "child_process";
import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffprobePath from "ffprobe-static";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SPLIT_DIR = join(process.cwd(), "processed", "split");
fs.mkdirSync(SPLIT_DIR, { recursive: true });

// Helper: get metadata using ffprobe
function getVideoMetadata(filePath) {
  try {
    const probe = spawnSync(ffprobePath.path, [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ]);

    if (probe.status !== 0) return null;

    const json = JSON.parse(probe.stdout.toString());
    const format = json.format || {};
    const streams = json.streams || [];

    const videoStream = streams.find((s) => s.codec_type === "video");
    const audioStream = streams.find((s) => s.codec_type === "audio");

    const fps =
      videoStream && videoStream.avg_frame_rate
        ? (() => {
            const [num, den] = videoStream.avg_frame_rate.split("/");
            return den ? parseFloat(num) / parseFloat(den) : 0;
          })()
        : 0;

    return {
      duration: parseFloat(format.duration) || 0,
      size: parseInt(format.size || 0),
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
    };
  } catch (err) {
    console.error("ffprobe metadata error:", err);
    return null;
  }
}

export default function splitRoute(app) {
  app.post("/split", async (req, res) => {
    try {
      const { filename, chunkDuration = 10 } = req.body;

      if (!filename) {
        return res.status(400).json({ error: "Missing filename" });
      }

      const inputPath = join(process.cwd(), "uploads", filename);
      if (!fs.existsSync(inputPath)) {
        return res.status(404).json({ error: "File not found" });
      }

      const outputPattern = join(
        SPLIT_DIR,
        `${path.parse(filename).name}_part_%03d.mp4`
      );

      console.log("🎬 Splitting video with FFmpeg:");
      console.log(
        ffmpegPath.path,
        "-i",
        inputPath,
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-f",
        "segment",
        "-segment_time",
        chunkDuration.toString(),
        "-reset_timestamps",
        "1",
        "-map",
        "0",
        outputPattern
      );

      const args = [
        "-i",
        inputPath,
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-f",
        "segment",
        "-segment_time",
        chunkDuration.toString(),
        "-reset_timestamps",
        "1",
        "-map",
        "0",
        outputPattern,
      ];

      const ffmpeg = spawn(ffmpegPath.path, args);
      ffmpeg.stderr.on("data", (d) => console.log("FFmpeg:", d.toString()));

      ffmpeg.on("close", async (code) => {
        if (code !== 0) {
          console.error("❌ FFmpeg split failed with code:", code);
          return res.status(500).json({ error: "Split failed" });
        }

        // ✅ Collect all output files
        const baseName = path.parse(filename).name;
        const allParts = fs
          .readdirSync(SPLIT_DIR)
          .filter(
            (f) =>
              f.startsWith(baseName) &&
              (f.endsWith(".mp4") || f.endsWith(".mov") || f.endsWith(".mkv"))
          )
          .sort();

        // ✅ Build absolute URLs + metadata
        const partsWithMetadata = allParts.map((f) => {
          const filePath = join(SPLIT_DIR, f);
          const meta = getVideoMetadata(filePath);
          return {
            url: `/processed/split/${f}`,
            filename: f,
            ...meta,
          };
        });

        console.log("✅ Split completed:", partsWithMetadata.length, "parts");

        res.json({
          success: true,
          count: partsWithMetadata.length,
          parts: partsWithMetadata,
        });
      });
    } catch (err) {
      console.error("Split route error:", err);
      res.status(500).json({ error: err.message });
    }
  });
}
