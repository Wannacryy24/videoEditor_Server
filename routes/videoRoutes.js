// routes/videoRoutes.js
import express from "express";
import upload from "../middlewares/uploadMiddleware.js";
import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";
import ffprobePath from "ffprobe-static";

const router = express.Router();

// ================== HELPER: GET METADATA ==================
function getVideoMetadata(filePath) {
  try {
    const probe = spawnSync(ffprobePath.path, [
      "-v", "error",
      "-print_format", "json",
      "-show_format",
      "-show_streams",
      filePath,
    ]);

    if (probe.status !== 0) {
      console.error("ffprobe failed:", probe.stderr?.toString());
      return { duration: 0 };
    }

    const info = JSON.parse(probe.stdout.toString());
    let duration = 0;

    if (info.format?.duration) {
      duration = parseFloat(info.format.duration);
    } else {
      const vStream = (info.streams || []).find((s) => s.codec_type === "video");
      if (vStream?.duration) {
        duration = parseFloat(vStream.duration);
      }
    }

    return {
      duration: isNaN(duration) ? 0 : duration,
      width: info.streams?.find((s) => s.codec_type === "video")?.width || null,
      height: info.streams?.find((s) => s.codec_type === "video")?.height || null,
      fps: info.streams?.find((s) => s.codec_type === "video")?.avg_frame_rate || null,
      hasAudio: !!info.streams?.find((s) => s.codec_type === "audio"),
    };
  } catch (err) {
    console.error("Metadata parse error:", err);
    return { duration: 0 };
  }
}

// ================== UPLOAD MULTIPLE VIDEOS ==================
router.post("/uploads", upload.array("files", 10), (req, res) => {
  try {
    const host = `${req.protocol}://${req.get("host")}`;

    const processedDir = path.join(process.cwd(), "processed");
    fs.mkdirSync(processedDir, { recursive: true });

    const items = req.files.map((f) => {
      const meta = getVideoMetadata(f.path);

      const audioOutput = `${f.filename}.wav`;
      const audioOutPath = path.join(processedDir, audioOutput);

      // ✅ Extract high-quality WAV audio
      const ffmpegRes = spawnSync("ffmpeg", [
        "-i", f.path,
        "-vn",                 // no video stream
        "-ac", "2",            // stereo
        "-ar", "48000",        // 48 kHz sample rate
        "-acodec", "pcm_s16le", // uncompressed WAV audio
        audioOutPath,
        "-y"
      ]);

      const audioUrl =
        ffmpegRes.status === 0
          ? `${host}/processed/${audioOutput}`
          : null;

      return {
        id: f.filename,
        originalName: f.originalname,
        url: `${host}/uploads/${f.filename}`,
        audioUrl, // ✅ Added clean extracted audio URL
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        fps: meta.fps,
        hasAudio: meta.hasAudio,
        status: "uploaded",
      };
    });

    res.json({ items });
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ================== EXPORT PROJECT (stub for now) ==================
router.post("/export", (req, res) => {
  const jobId = Date.now().toString();
  res.json({ jobId, status: "processing" });
});

// ================== GET JOB STATUS (stub) ==================
router.get("/jobs/:id", (req, res) => {
  const { id } = req.params;
  res.json({ id, status: "done", url: `/processed/final_${id}.mp4` });
});

export default router;
