import { exec } from "child_process";
import { readFileSync } from "fs";
import supabase from "../config/supabaseClient.js";
import path from "path";

export const saveVideoToSupabase = async (file) => {
  const filePath = path.resolve(file.path);
  const fileData = readFileSync(filePath);

  const { data, error } = await supabase.storage
    .from("videos") // Make sure you created this bucket in Supabase
    .upload(`uploads/${file.filename}`, fileData, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (error) throw error;

  const { data: publicUrl } = supabase.storage
    .from("videos")
    .getPublicUrl(`uploads/${file.filename}`);

  return publicUrl.publicUrl;
};

export const runFFmpegOnVideo = async (videoId) => {
  return new Promise((resolve, reject) => {
    // Example: trimming video with ffmpeg
    const inputPath = `uploads/${videoId}`;
    const outputPath = `uploads/output-${Date.now()}.mp4`;

    const command = `ffmpeg -i ${inputPath} -t 10 -c copy ${outputPath}`;

    exec(command, (error) => {
      if (error) return reject(error);
      resolve(outputPath);
    });
  });
};
