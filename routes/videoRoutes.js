// routes/videoRoutes.js
import express from "express";
import upload from "../middlewares/uploadMiddleware.js";
import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";
import ffprobePath from "ffprobe-static";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

const router = express.Router();

/* ------------------ HELPER: GET METADATA ------------------ */
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
    const videoStream = info.streams?.find((s) => s.codec_type === "video");
    const audioStream = info.streams?.find((s) => s.codec_type === "audio");

    const duration = parseFloat(info.format?.duration || videoStream?.duration || 0);
    return {
      duration: isNaN(duration) ? 0 : duration,
      width: videoStream?.width || null,
      height: videoStream?.height || null,
      fps: videoStream?.avg_frame_rate || null,
      hasAudio: !!audioStream,
    };
  } catch (err) {
    console.error("Metadata parse error:", err);
    return { duration: 0 };
  }
}

/* ------------------ UPLOAD MULTIPLE VIDEOS ------------------ */
router.post("/uploads", upload.array("files", 10), (req, res) => {
  try {
    // ✅ Always detect correct protocol, even behind Render proxy
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.get("host");

    // ✅ Build correct base URL (fixes https// bug)
    const baseUrl = `${protocol}://${host}`;
    console.log("🌍 Using baseUrl:", baseUrl);

    const processedDir = path.join(process.cwd(), "processed");
    fs.mkdirSync(processedDir, { recursive: true });

    const items = req.files.map((f) => {
      const meta = getVideoMetadata(f.path);
      const audioOutput = `${f.filename}.wav`;
      const audioOutPath = path.join(processedDir, audioOutput);

      // ✅ Extract high-quality WAV audio
      const ffmpegRes = spawnSync(ffmpegPath.path, [
        "-i", f.path,
        "-vn",
        "-ac", "2",
        "-ar", "48000",
        "-acodec", "pcm_s16le",
        audioOutPath,
        "-y",
      ]);

      const audioUrl = ffmpegRes.status === 0 ? `${baseUrl}/processed/${audioOutput}` : null;
      const videoUrl = `${baseUrl}/uploads/${f.filename}`;

      console.log("✅ Video uploaded:", videoUrl);

      return {
        id: f.filename,
        originalName: f.originalname,
        url: videoUrl,
        audioUrl,
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

/* ------------------ EXPORT PROJECT (stub) ------------------ */
router.post("/export", (req, res) => {
  const jobId = Date.now().toString();
  res.json({ jobId, status: "processing" });
});

/* ------------------ JOB STATUS (stub) ------------------ */
router.get("/jobs/:id", (req, res) => {
  const { id } = req.params;
  res.json({ id, status: "done", url: `/processed/final_${id}.mp4` });
});

export default router;