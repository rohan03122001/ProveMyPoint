const axios = require("axios");

exports.analyzeResearch = async (papers, claim) => {
  try {
    if (!process.env.GOOGLE_GEMINI_KEY) {
      throw new Error("❌ Google Gemini API Key is missing.");
    }

    const formattedPapers = papers
      .map(
        (p, i) =>
          `🔹 **Study ${i + 1}**\n**Title:** ${p.title}\n**Source:** ${
            p.url
          }\n**Abstract:** ${p.abstract}`
      )
      .join("\n\n");

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_GEMINI_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are an AI that evaluates scientific claims using real research papers.
                                
                                **Claim:** ${claim}  
                                
                                Below are multiple research papers. Your job is to:
                                - Summarize combined findings.
                                - Determine if the **overall evidence** supports, refutes, or is inconclusive.
                                - Provide a **scientific confidence rating**.

                                ---
                                **Research Papers Analyzed:**  
                                ${formattedPapers}
                                ---

                                **Final Answer Format:**  
                                - **Summary of Key Findings:**  
                                - **Does the research support or refute the claim?** (**Supports / Refutes / Inconclusive**)  
                                - **Scientific Confidence Rating:** (**Strong / Moderate / Weak**)
                                `,
              },
            ],
          },
        ],
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    return (
      response.data.candidates[0]?.content?.parts[0]?.text ||
      "No conclusion available."
    );
  } catch (error) {
    console.error(
      "❌ AI Processing Error:",
      error.response?.data || error.message
    );
    return "❌ Error analyzing the claim.";
  }
};
