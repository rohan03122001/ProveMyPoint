const { scrapeGoogleScholar } = require("../services/researchService");
const { getPaperDetails } = require("../services/paperDetailsService");
const { analyzeResearch } = require("../services/researchAnalyzer");

// ✅ API Handler: Fetch & Analyze Research Papers
exports.fetchResearchAnalysis = async (req, res) => {
  try {
    const query = req.query.query;
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required." });
    }

    console.log(`🔍 Processing Research Query: "${query}"`);

    // Step 1: Scrape Google Scholar for relevant papers
    const scrapedPapers = await scrapeGoogleScholar(query);
    console.log("✅ Scraped Papers:", scrapedPapers);

    // Step 2: Fetch Full Paper Details (DOI/arXiv Lookup)
    const fullPapers = await getPaperDetails(scrapedPapers);
    console.log("✅ Full Paper Details:", fullPapers);

    // Step 3: Analyze the Research Papers using AI
    const aiConclusion = await analyzeResearch(fullPapers, query);
    console.log("✅ AI Conclusion:", aiConclusion);

    // Step 4: Send Response
    res.json({
      ai_conclusion: aiConclusion,
      research_papers: fullPapers,
    });
  } catch (error) {
    console.error("❌ Research Fetching Error:", error);
    res.status(500).json({ error: "Error fetching research papers" });
  }
};
