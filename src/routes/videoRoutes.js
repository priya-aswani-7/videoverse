const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const {
  uploadVideo,
  trimVideo,
  mergeVideos,
} = require("../controllers/videoController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    cb(null, `${crypto.randomUUID()}-${file.originalname}`);
  },
});

const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 },
  storage: storage,
});

router.post("/upload", authMiddleware, upload.single("video"), uploadVideo);
router.post("/trim", trimVideo);
router.post("/merge", authMiddleware, mergeVideos);

module.exports = router;
