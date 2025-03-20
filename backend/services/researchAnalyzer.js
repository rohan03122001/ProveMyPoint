const axios = require("axios");

// Enhanced research analysis function
exports.analyzeResearch = async (papers, claim) => {
  try {
    if (!process.env.GOOGLE_GEMINI_KEY) {
      throw new Error("❌ Google Gemini API Key is missing.");
    }

    // Calculate credibility score for each paper
    const scoredPapers = papers.map((p) => {
      // Base score: 40 points
      let score = 40;

      // Recency: up to +25 points (newer papers get higher scores)
      const currentYear = new Date().getFullYear();
      const publicationYear = parseInt(p.year) || currentYear;
      const yearsOld = currentYear - publicationYear;

      // Papers less than 2 years old: +25 points
      // Papers 2-5 years old: +20 points
      // Papers 5-10 years old: +10 points
      // Papers 10+ years old: +0 points
      if (yearsOld < 2) score += 25;
      else if (yearsOld < 5) score += 20;
      else if (yearsOld < 10) score += 10;

      // Citations: up to +25 points
      const citationCount = p.citationCount || 0;
      if (citationCount > 100) score += 25;
      else if (citationCount > 50) score += 20;
      else if (citationCount > 20) score += 15;
      else if (citationCount > 5) score += 10;
      else if (citationCount > 0) score += 5;

      // Publication source: up to +10 points
      const journal = (p.journal || "").toLowerCase();
      const isPeerReviewed =
        journal.includes("journal") ||
        journal.includes("proceedings") ||
        journal.includes("transactions");

      if (isPeerReviewed) score += 10;

      // Cap score at 100
      return {
        ...p,
        credibilityScore: Math.min(100, score),
      };
    });

    // Sort papers by credibility score (highest first)
    const sortedPapers = scoredPapers.sort(
      (a, b) => b.credibilityScore - a.credibilityScore
    );

    // Format papers for AI analysis with scores and highlights
    const formattedPapers = sortedPapers
      .map((p, i) => {
        // Extract key sentences from abstract that may contain findings (if abstract is long)
        let abstractHighlights = p.abstract;
        if (p.abstract && p.abstract.length > 200) {
          const sentences = p.abstract
            .split(/[.!?] /)
            .filter((s) => s.length > 10);
          const keyPhrases = [
            "find",
            "conclude",
            "suggest",
            "show",
            "demonstrate",
            "indicate",
            "report",
            "discover",
            "observe",
            "result",
          ];
          const keyFindings = sentences.filter((s) =>
            keyPhrases.some((phrase) => s.toLowerCase().includes(phrase))
          );

          if (keyFindings.length > 0) {
            abstractHighlights = keyFindings.join(". ") + ".";
          }
        }

        return `🔹 **Study ${i + 1}**\n**Title:** ${p.title}\n**Source:** ${
          p.journal || "Unknown"
        } (${p.year || "Unknown year"})\n**Authors:** ${
          p.authors || "Unknown"
        }\n**Credibility Score:** ${p.credibilityScore}/100\n**URL:** ${
          p.url
        }\n**Abstract:** ${abstractHighlights}`;
      })
      .join("\n\n");

    // Determine if we have good data
    const hasGoodData = sortedPapers.length >= 3;
    const confidenceLevel = hasGoodData ? "high" : "limited";

    // Create an enhanced prompt for Gemini
    const geminiPrompt = `You are ScienceNexus, an AI that evaluates scientific claims using published research.
                                
    **Claim to analyze:** "${claim}"  
    
    ${
      hasGoodData
        ? `I've found ${sortedPapers.length} research papers related to this claim. Each paper has been assigned a credibility score (0-100) based on publication date, citation count, and source reputation.`
        : `I've found ${sortedPapers.length} research papers related to this claim, but the data quality is limited. Please provide the best analysis possible with these limitations in mind.`
    }
    
    Below are the research papers:

    ---
    ${formattedPapers}
    ---

    Your task is to analyze these papers and evaluate the claim with the following structure:
    
    **Summary of Findings:**
    [Provide a concise summary of what the collective research indicates about the claim]
    
    **Evidence Assessment:**
    [Analyze the quality and strength of evidence across papers, noting consistency or contradictions]
    
    **Supporting Evidence:**
    [Highlight key evidence supporting the claim]
    
    **Contradicting Evidence:**
    [Highlight key evidence refuting the claim]
    
    **Conclusion:** [SUPPORTED / REFUTED / INCONCLUSIVE]
    [Explain the reasoning behind this conclusion]
    
    **Confidence Level:** [HIGH / MODERATE / LOW]
    [Explain why this confidence level is appropriate]
    
    **Important Nuances:**
    [Note any important context, limitations, or nuance that affects interpretation]
    
    Write for an educated general audience. Be objective, balanced, and nuanced. If the evidence is mixed or insufficient, acknowledge this openly rather than forcing a conclusion.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_GEMINI_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: geminiPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    // Extract the response text
    const aiResponse =
      response.data.candidates[0]?.content?.parts[0]?.text ||
      "Unable to analyze the research papers. Please try again later.";

    // Add paper metadata to return value for frontend display
    return {
      analysis: aiResponse,
      papers: sortedPapers.map((p) => ({
        title: p.title,
        url: p.url,
        authors: p.authors,
        year: p.year,
        journal: p.journal,
        credibilityScore: p.credibilityScore,
        abstract: p.abstract,
        citationCount: p.citationCount || 0,
      })),
      dataQuality: confidenceLevel,
    };
  } catch (error) {
    console.error(
      "❌ AI Processing Error:",
      error.response?.data || error.message
    );

    return {
      analysis:
        "❌ Error analyzing the research. Our AI system encountered an issue processing the papers. Please try again later.",
      papers: papers.map((p) => ({
        title: p.title,
        url: p.url,
        authors: p.authors,
        abstract: p.abstract,
        year: p.year,
      })),
      dataQuality: "error",
    };
  }
};
