const express = require("express");
const router = express.Router();
const {
  fetchResearchAnalysis,
  getSearchSuggestions,
  getTrendingTopics,
} = require("../controllers/researchController");
const { summarizePaper } = require("../controllers/summaryController");
const rateLimit = require("express-rate-limit");

// Rate limiting: 60 requests per hour per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: {
    error: "Too many requests from this IP. Please try again in an hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Main research analysis endpoint
router.get("/research", apiLimiter, fetchResearchAnalysis);

// Paper summary endpoint
router.post("/summary", apiLimiter, summarizePaper);

// Search suggestions endpoint
router.get("/suggestions", getSearchSuggestions);

// Trending topics endpoint
router.get("/trending", getTrendingTopics);

module.exports = router;
