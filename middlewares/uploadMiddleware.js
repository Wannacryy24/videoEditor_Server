import multer from "multer";
import fs from "fs";
import { join } from "path";
import crypto from "crypto";

const UPLOAD_DIR = join(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    const id = crypto.randomUUID();
    cb(null, `${id}.${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("video/")) return cb(new Error("Only videos allowed"), false);
  cb(null, true);
};

export default multer({ storage, fileFilter, limits: { fileSize: 500 * 1024 * 1024 } });
