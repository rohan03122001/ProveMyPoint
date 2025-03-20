const {
  scrapeGoogleScholar,
  enrichPaperData,
} = require("../services/researchService");
const { getPaperDetails } = require("../services/paperDetailsService");
const { analyzeResearch } = require("../services/researchAnalyzer");
const NodeCache = require("node-cache");

// Cache results for 24 hours
const resultsCache = new NodeCache({ stdTTL: 86400 });

// Enhanced API Handler: Fetch & Analyze Research Papers
exports.fetchResearchAnalysis = async (req, res) => {
  try {
    const query = req.query.query;
    if (!query || query.trim().length < 3) {
      return res.status(400).json({
        error:
          "Please provide a research claim or question with at least 3 characters.",
      });
    }

    console.log(`🔍 Processing Research Query: "${query}"`);

    // Check cache first
    const cacheKey = `research-${query.toLowerCase().trim()}`;
    const cachedResult = resultsCache.get(cacheKey);

    if (cachedResult) {
      console.log("✅ Returning cached result");
      return res.json(cachedResult);
    }

    // Step 1: Scrape Google Scholar for relevant papers
    const scrapedPapers = await scrapeGoogleScholar(query);
    console.log(`✅ Found ${scrapedPapers.length} papers from search`);

    if (scrapedPapers.length === 0) {
      return res.status(404).json({
        error:
          "No research papers found for your query. Try different keywords or a more specific claim.",
      });
    }

    // Step 2: Enrich the papers with additional metadata when possible
    const enrichedPapers = await enrichPaperData(scrapedPapers);
    console.log("✅ Enriched paper metadata");

    // Step 3: Fetch Full Paper Details
    const fullPapers = await getPaperDetails(enrichedPapers);
    console.log(
      `✅ Processed ${fullPapers.length} papers with complete details`
    );

    // Step 4: Analyze the Research Papers using AI
    const analysisResult = await analyzeResearch(fullPapers, query);
    console.log("✅ AI Analysis completed");

    // Step 5: Prepare response
    const response = {
      query,
      timestamp: new Date().toISOString(),
      ai_conclusion: analysisResult.analysis,
      research_papers: analysisResult.papers,
      data_quality: analysisResult.dataQuality,
    };

    // Cache the result
    resultsCache.set(cacheKey, response);

    // Step 6: Send Response
    res.json(response);
  } catch (error) {
    console.error("❌ Research Fetching Error:", error);

    // Provide helpful error message based on the specific error
    let errorMessage =
      "An unexpected error occurred while processing your request.";

    if (error.message && error.message.includes("CAPTCHA")) {
      errorMessage =
        "Research service is temporarily unavailable due to rate limiting. Please try again later.";
    } else if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      errorMessage =
        "Unable to connect to research database. Please check your internet connection and try again.";
    } else if (error.response && error.response.status === 429) {
      errorMessage = "Too many requests. Please try again in a few minutes.";
    }

    res.status(500).json({
      error: errorMessage,
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// New endpoint: Get search suggestions
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { term } = req.query;

    if (!term || term.length < 2) {
      return res.json([]);
    }

    // Get suggestions from trending searches and previous queries
    // This would normally come from a database of popular searches
    const suggestions = [
      "Vitamin D and immune system",
      "Coffee health benefits",
      "Climate change impacts",
      "Artificial intelligence risks",
      "Meditation benefits on stress",
      "Intermittent fasting effects",
      "Screen time impact on children",
      "Plant-based diet benefits",
      "Vaccine effectiveness",
      "Sleep and cognitive performance",
    ].filter((s) => s.toLowerCase().includes(term.toLowerCase()));

    res.json(suggestions.slice(0, 5));
  } catch (error) {
    console.error("Error getting search suggestions:", error);
    res.status(500).json({ error: "Failed to get search suggestions" });
  }
};

// New endpoint: Get trending research topics
exports.getTrendingTopics = async (req, res) => {
  try {
    // This would normally come from analysis of recent searches
    const trendingTopics = [
      { id: 1, topic: "AI safety research", searches: 1240 },
      { id: 2, topic: "CRISPR ethics", searches: 980 },
      { id: 3, topic: "Microplastics health impact", searches: 870 },
      { id: 4, topic: "Longevity research", searches: 820 },
      { id: 5, topic: "Psychedelic therapy", searches: 790 },
    ];

    res.json(trendingTopics);
  } catch (error) {
    console.error("Error getting trending topics:", error);
    res.status(500).json({ error: "Failed to get trending topics" });
  }
};
