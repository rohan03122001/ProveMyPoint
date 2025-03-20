const axios = require("axios");

// ✅ Fetch Paper Details from CrossRef (For DOI-based papers)
async function fetchCrossRefDetails(doi) {
  try {
    const response = await axios.get(`https://api.crossref.org/works/${doi}`);
    if (!response.data || !response.data.message) return null;

    return {
      title: response.data.message.title[0],
      abstract: response.data.message.abstract || "No abstract available",
      authors:
        response.data.message.author
          ?.map((a) => `${a.given} ${a.family}`)
          .join(", ") || "Unknown Authors",
      journal:
        response.data.message["container-title"]?.[0] || "Unknown Journal",
      year:
        response.data.message["published-print"]?.["date-parts"]?.[0]?.[0] ||
        "Unknown Year",
      url: response.data.message.URL,
    };
  } catch (error) {
    console.error("❌ Error fetching CrossRef paper:", error.message);
    return null;
  }
}

// ✅ Fetch Paper Details from ArXiv (For ArXiv papers)
async function fetchArXivDetails(arxivId) {
  try {
    const response = await axios.get(
      `http://export.arxiv.org/api/query?id_list=${arxivId}`
    );
    if (!response.data) return null;

    const parser = new DOMParser();
    const xml = parser.parseFromString(response.data, "text/xml");
    const entry = xml.querySelector("entry");

    return {
      title: entry.querySelector("title")?.textContent || "Unknown Title",
      abstract:
        entry.querySelector("summary")?.textContent || "No abstract available",
      authors:
        Array.from(entry.querySelectorAll("author name"))
          .map((a) => a.textContent)
          .join(", ") || "Unknown Authors",
      year:
        entry.querySelector("published")?.textContent.split("-")[0] ||
        "Unknown Year",
      url: entry.querySelector("id")?.textContent || "No Link",
    };
  } catch (error) {
    console.error("❌ Error fetching ArXiv paper:", error.message);
    return null;
  }
}

// ✅ Combine Data Sources
async function getPaperDetails(papers) {
  const fullPapers = [];

  for (const paper of papers) {
    if (paper.doi) {
      const details = await fetchCrossRefDetails(paper.doi);
      if (details) fullPapers.push(details);
    } else if (paper.arxiv_id) {
      const details = await fetchArXivDetails(paper.arxiv_id);
      if (details) fullPapers.push(details);
    } else {
      // If no DOI/ArXiv, fallback to Scholar data
      fullPapers.push(paper);
    }
  }

  return fullPapers;
}

module.exports = { getPaperDetails };
