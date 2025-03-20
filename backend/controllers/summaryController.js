const { generateSummary } = require("../services/geminiService");

exports.summarizePaper = async (req, res) => {
  try {
    const { abstract } = req.body;
    if (!abstract) {
      return res.status(400).json({ error: "Abstract is required" });
    }

    const summary = await generateSummary(abstract);
    res.json({ summary });
  } catch (error) {
    console.error("Error in summarize paper:", error);
    res.status(500).json({
      error: "Error generating summary",
      message: error.message,
    });
  }
};
