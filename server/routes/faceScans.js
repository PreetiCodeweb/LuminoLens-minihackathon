const express = require("express");
const db = require("../db");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

// Called by the browser after it classifies a face shape locally.
// Storing this just powers "your past scans" and admin analytics - the
// actual detection always happens on-device with the webcam.
router.post("/", optionalAuth, (req, res) => {
  const { faceShape, metrics } = req.body;
  const validShapes = ["round", "oval", "square", "heart", "diamond", "oblong"];
  if (!validShapes.includes(faceShape)) {
    return res.status(400).json({ error: "Unrecognized face shape" });
  }
  const info = db
    .prepare("INSERT INTO face_scans (user_id, face_shape, metrics) VALUES (?, ?, ?)")
    .run(req.user ? req.user.id : null, faceShape, JSON.stringify(metrics || {}));
  res.status(201).json({ id: info.lastInsertRowid });
});

module.exports = router;
