const express = require("express");
const { summarizePaper } = require("../controllers/summaryController");
const router = express.Router();

router.post("/", summarizePaper);

module.exports = router;
