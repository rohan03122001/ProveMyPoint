const axios = require("axios");

/**
 * Generate a concise summary of a research paper abstract using Gemini
 * @param {string} abstract - The abstract text to summarize
 * @returns {Promise<string>} - A concise summary
 */
exports.generateSummary = async (abstract) => {
  if (!process.env.GOOGLE_GEMINI_KEY) {
    throw new Error("Google Gemini API key is not configured");
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_GEMINI_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are a scientific research assistant that creates concise summaries of research paper abstracts.
                Extract the key findings, methodology, and implications. Focus on factual information.
                Format your response as a brief paragraph of 2-3 sentences.
                
                Abstract to summarize: ${abstract}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 150,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    return (
      response.data.candidates[0]?.content?.parts[0]?.text ||
      "Unable to generate summary"
    );
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error("Failed to generate summary");
  }
};

/**
 * Extract key points from a research paper using Gemini
 * @param {string} abstract - The abstract text to analyze
 * @returns {Promise<Array<string>>} - List of key points
 */
exports.extractKeyPoints = async (abstract) => {
  if (!process.env.GOOGLE_GEMINI_KEY) {
    throw new Error("Google Gemini API key is not configured");
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_GEMINI_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are a research analysis tool that extracts the key points from scientific paper abstracts.
                Identify the 3-5 most important findings, methodologies, or conclusions from this abstract.
                Format your response as a JSON array of strings with no other text.
                
                Abstract: ${abstract}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 250,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const content =
      response.data.candidates[0]?.content?.parts[0]?.text || "[]";
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error("Error parsing key points JSON:", e);
      return [];
    }
  } catch (error) {
    console.error("Error extracting key points:", error);
    return [];
  }
};

/**
 * Evaluate the quality and reliability of a research paper
 * @param {Object} paper - Paper details including abstract, journal, year, etc.
 * @returns {Promise<Object>} - Evaluation results
 */
exports.evaluatePaperQuality = async (paper) => {
  if (!process.env.GOOGLE_GEMINI_KEY) {
    throw new Error("Google Gemini API key is not configured");
  }

  const paperInfo = `
    Title: ${paper.title}
    Authors: ${paper.authors || "Unknown"}
    Journal: ${paper.journal || "Unknown"}
    Year: ${paper.year || "Unknown"}
    Abstract: ${paper.abstract || "Not available"}
    Citation Count: ${paper.citationCount || "Unknown"}
  `;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GOOGLE_GEMINI_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are a scientific research evaluator that assesses the quality and reliability of research papers.
                Analyze this paper and provide a quality assessment on a scale of 1-10, with strengths and limitations.
                
                Format your response EXACTLY as a JSON object with these fields:
                - qualityScore: number (1-10)
                - strengths: array of strings
                - limitations: array of strings
                - reliability: string (one of: "High", "Moderate", "Low", "Insufficient Information")
                - explanation: string (brief explanation of your assessment)
                
                Return ONLY the JSON object with no additional text.
                
                Paper to evaluate:
                ${paperInfo}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const content =
      response.data.candidates[0]?.content?.parts[0]?.text || "{}";
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error("Error parsing paper quality JSON:", e);
      return {
        qualityScore: 0,
        strengths: [],
        limitations: ["Unable to evaluate due to processing error"],
        reliability: "Insufficient Information",
        explanation: "Could not complete evaluation due to technical error",
      };
    }
  } catch (error) {
    console.error("Error evaluating paper quality:", error);
    return {
      qualityScore: 0,
      strengths: [],
      limitations: ["Unable to evaluate due to processing error"],
      reliability: "Insufficient Information",
      explanation: "Could not complete evaluation due to technical error",
    };
  }
};

/**
 * Fact-check claims against research papers using Gemini
 * @param {string} claim - The claim to be fact-checked
 * @param {Array<Object>} papers - Array of paper objects with abstracts
 * @returns {Promise<Object>} - Fact-checking results
 */
exports.factCheckClaim = async (claim, papers) => {
  if (!process.env.GOOGLE_GEMINI_KEY) {
    throw new Error("Google Gemini API key is not configured");
  }

  // Format papers for the prompt
  const papersText = papers
    .map(
      (p, i) =>
        `Paper ${i + 1}:\nTitle: ${p.title}\nAbstract: ${
          p.abstract || "Not available"
        }\n`
    )
    .join("\n");

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GOOGLE_GEMINI_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are a scientific fact-checker evaluating claims against published research.
                Analyze this claim and the provided research papers to determine if the claim is supported.
                
                Format your response EXACTLY as a JSON object with these fields:
                - verdict: string (one of: "Supported", "Contradicted", "Partially Supported", "Insufficient Evidence")
                - confidence: string (one of: "High", "Moderate", "Low")
                - evidenceFor: array of strings (evidence supporting the claim)
                - evidenceAgainst: array of strings (evidence contradicting the claim)
                - explanation: string (explanation of your verdict)
                
                Return ONLY the JSON object with no additional text.
                
                Claim: "${claim}"
                
                Research Papers:
                ${papersText}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 800,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const content =
      response.data.candidates[0]?.content?.parts[0]?.text || "{}";
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error("Error parsing fact-check JSON:", e);
      return {
        verdict: "Error",
        confidence: "Low",
        evidenceFor: [],
        evidenceAgainst: [],
        explanation: "Could not complete fact-checking due to technical error",
      };
    }
  } catch (error) {
    console.error("Error fact-checking claim:", error);
    return {
      verdict: "Error",
      confidence: "Low",
      evidenceFor: [],
      evidenceAgainst: [],
      explanation: "Could not complete fact-checking due to technical error",
    };
  }
};
