const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const ffmpeg = require("fluent-ffmpeg");
const { dbPromise } = require("../config/db");

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

exports.uploadVideo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const db = await dbPromise;
  try {
    await db.run("INSERT INTO videos (filename, path) VALUES (?, ?)", [
      req.file.filename,
      req.file.filename,
    ]);
    res.json({
      message: "Video uploaded successfully",
      filename: req.file.filename,
    });
  } catch (error) {
    res.status(500).json({ message: "Database error", error: error.message });
  }
};

exports.trimVideo = async (req, res) => {
  const { filename, start, duration } = req.body;

  if (!filename || start === undefined || duration === undefined) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const inputPath = path.join(UPLOAD_DIR, filename);

  try {
    await fs.promises.access(inputPath);
  } catch {
    return res.status(404).json({ message: "Video not found" });
  }

  const outputFilename = `trimmed-${crypto.randomUUID()}-${filename}`;
  const outputPath = path.join(UPLOAD_DIR, outputFilename);

  ffmpeg(inputPath)
    .setStartTime(start)
    .setDuration(duration)
    .output(outputPath)
    .on("end", async () => {
      const db = await dbPromise;
      await db.run("INSERT INTO videos (filename, path) VALUES (?, ?)", [
        outputFilename,
        outputPath,
      ]);
      res.json({
        message: "Video trimmed successfully",
        filename: outputFilename,
      });
    })
    .on("error", (err) => {
      res
        .status(500)
        .json({ message: "Error trimming video", error: err.message });
    })
    .run();
};

exports.mergeVideos = async (req, res) => {
  const { filenames } = req.body;

  if (!filenames || !Array.isArray(filenames) || filenames.length < 2) {
    return res
      .status(400)
      .json({ message: "At least two video files are required for merging" });
  }

  const filePaths = filenames.map((file) => path.join(UPLOAD_DIR, file));

  for (const filePath of filePaths) {
    try {
      await fs.promises.access(filePath);
    } catch {
      return res.status(404).json({ message: `File not found: ${filePath}` });
    }
  }

  const outputFilename = `merged-${crypto.randomUUID()}.mp4`;
  const outputPath = path.join(UPLOAD_DIR, outputFilename);
  const listFilePath = path.join(
    UPLOAD_DIR,
    `merge-list-${crypto.randomUUID()}.txt`
  );

  fs.writeFileSync(
    listFilePath,
    filePaths.map((file) => `file '${file}'`).join("\n")
  );

  ffmpeg()
    .input(listFilePath)
    .inputOptions(["-f concat", "-safe 0"])
    .output(outputPath)
    .on("end", async () => {
      const db = await dbPromise;
      await db.run("INSERT INTO videos (filename, path) VALUES (?, ?)", [
        outputFilename,
        outputPath,
      ]);
      fs.unlinkSync(listFilePath);
      res.json({
        message: "Videos merged successfully",
        filename: outputFilename,
      });
    })
    .on("error", (err) => {
      res
        .status(500)
        .json({ message: "Error merging videos", error: err.message });
    })
    .run();
};
