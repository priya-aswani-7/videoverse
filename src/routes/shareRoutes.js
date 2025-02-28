const express = require("express");
const { shareVideo, accessVideo } = require("../controllers/shareController");

const router = express.Router();

router.post("/share", shareVideo);
router.get("/access/:id", accessVideo);

module.exports = router;
