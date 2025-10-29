import { spawn, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffprobePath from "@ffprobe-installer/ffprobe";

const PROCESSED_DIR = path.join(process.cwd(), "processed");
fs.mkdirSync(PROCESSED_DIR, { recursive: true });

// In-memory stores
global.library = global.library || new Map();
global.jobs = global.jobs || new Map();

/**
 * Upload multiple videos
 * - Saves them via multer
 * - Runs ffprobe to extract duration
 * - Stores in `global.library`
 */
export const uploadVideos = (req, res) => {
  try {
    const host = `${req.protocol}://${req.get("host")}`;

    const items = req.files.map((f) => {
      const id = crypto.randomUUID();

      // ✅ Step 1: Probe metadata
      let duration = 0;
      try {
        const probe = spawnSync(ffprobePath.path, [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          f.path,
        ]);
        if (probe.stdout) {
          duration = parseFloat(probe.stdout.toString().trim());
        }
      } catch (err) {
        console.error("ffprobe failed:", err);
      }

      // ✅ Step 2: Extract clean .wav audio
      const audioFilename = `${id}.wav`;
      const audioPath = path.join(PROCESSED_DIR, audioFilename);

      const ffmpeg = spawnSync("ffmpeg", [
        "-i", f.path,
        "-vn",                 // no video
        "-ac", "2",            // stereo
        "-ar", "48000",        // high quality sample rate
        "-acodec", "pcm_s16le",// RAW wav audio
        audioPath,
        "-y",                  // overwrite if exists
      ]);

      const audioUrl =
        ffmpeg.status === 0 ? `${host}/processed/${audioFilename}` : null;

      // ✅ Build library record
      const item = {
        id,
        originalName: f.originalname,
        path: f.path,
        url: `${host}/uploads/${f.filename}`,
        audioUrl,  // ✅ IMPORTANT for video editor
        duration: isNaN(duration) ? 0 : duration,
        status: "uploaded",
      };

      global.library.set(id, item);
      return item;
    });

    res.json({ items });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
};


/**
 * Process video (example: copy or re-encode)
 * - Takes id from library
 * - Writes processed file to /processed
 */
export const processVideo = (req, res) => {
  const { id } = req.params;
  const video = global.library.get(id);
  if (!video) return res.status(404).json({ error: "Not found" });

  const outName = `processed_${Date.now()}.mp4`;
  const outPath = path.join(PROCESSED_DIR, outName);

  const ffmpeg = spawn(ffmpegPath.path, ["-i", video.path, "-c", "copy", outPath]);

  ffmpeg.stderr.on("data", (d) => console.log("FFmpeg:", d.toString()));

  ffmpeg.on("close", (code) => {
    if (code === 0) {
      video.status = "processed";
      video.processedUrl = `/processed/${outName}`;
      res.json({ id, url: video.processedUrl });
    } else {
      res.status(500).json({ error: "Processing failed" });
    }
  });
};

/**
 * Export project (concat clips, transitions, etc.)
 * - For now: simulate job with timeout
 */
export const exportProject = (req, res) => {
  const jobId = crypto.randomUUID();
  const job = { id: jobId, status: "processing", url: null };
  global.jobs.set(jobId, job);

  // TODO: real ffmpeg concat based on timeline
  setTimeout(() => {
    job.status = "done";
    job.url = `/processed/final_${jobId}.mp4`;
    fs.writeFileSync(path.join(PROCESSED_DIR, `final_${jobId}.mp4`), "FAKE FILE"); // stub
  }, 5000);

  res.json(job);
};

/**
 * Get export job status
 */
export const getJobStatus = (req, res) => {
  const job = global.jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "Not found" });
  res.json(job);
};
