const express = require("express");
const router = express.Router();
const { fetchResearchAnalysis } = require("../controllers/researchController");

// ✅ Correct API Route Definition
router.get("/research", fetchResearchAnalysis);

module.exports = router;
