const axios = require("axios");
const { JSDOM } = require("jsdom");
const { convert } = require("xml-js");

// Fetch Paper Details from CrossRef (For DOI-based papers)
async function fetchCrossRefDetails(doi) {
  try {
    const response = await axios.get(`https://api.crossref.org/works/${doi}`, {
      headers: {
        "User-Agent": "ProveMyPoint/1.0 (mailto:your-email@example.com)",
      },
    });

    if (!response.data || !response.data.message) return null;
    const data = response.data.message;

    // Extract journal impact factor if available
    let journalImpactFactor = null;
    if (data.is_referenced_by_count) {
      journalImpactFactor = data.is_referenced_by_count;
    }

    return {
      title: data.title?.[0] || "Unknown Title",
      abstract: data.abstract || "No abstract available",
      authors:
        data.author
          ?.map((a) => `${a.given || ""} ${a.family || ""}`)
          .join(", ") || "Unknown Authors",
      journal: data["container-title"]?.[0] || "Unknown Journal",
      year:
        data["published-print"]?.["date-parts"]?.[0]?.[0] ||
        data["published-online"]?.["date-parts"]?.[0]?.[0] ||
        "Unknown Year",
      url: data.URL,
      citationCount: data.is_referenced_by_count || 0,
      journalImpactFactor,
    };
  } catch (error) {
    console.error(`❌ Error fetching CrossRef paper (${doi}):`, error.message);
    return null;
  }
}

// Fetch Paper Details from ArXiv
async function fetchArXivDetails(arxivId) {
  try {
    const response = await axios.get(
      `http://export.arxiv.org/api/query?id_list=${arxivId}`,
      {
        headers: {
          "User-Agent": "ProveMyPoint/1.0 (mailto:your-email@example.com)",
        },
      }
    );

    if (!response.data) return null;

    // Use JSDOM to parse XML
    const dom = new JSDOM(response.data, { contentType: "text/xml" });
    const document = dom.window.document;

    const entry = document.querySelector("entry");
    if (!entry) return null;

    const title = entry.querySelector("title")?.textContent || "Unknown Title";
    const abstract =
      entry.querySelector("summary")?.textContent || "No abstract available";
    const authorNodes = entry.querySelectorAll("author name");
    const authors =
      Array.from(authorNodes)
        .map((a) => a.textContent)
        .join(", ") || "Unknown Authors";
    const published = entry.querySelector("published")?.textContent || "";
    const year = published ? published.split("-")[0] : "Unknown Year";
    const url = entry.querySelector("id")?.textContent || "No Link";

    return {
      title,
      abstract,
      authors,
      year,
      url,
      journal: "arXiv",
      citationCount: 0,
    };
  } catch (error) {
    console.error(`❌ Error fetching ArXiv paper (${arxivId}):`, error.message);
    return null;
  }
}

// New function to fetch from PubMed
async function fetchPubMedDetails(pmid) {
  try {
    // First get the summary
    const summaryResponse = await axios.get(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`,
      {
        headers: {
          "User-Agent": "ProveMyPoint/1.0 (mailto:your-email@example.com)",
        },
      }
    );

    if (
      !summaryResponse.data ||
      !summaryResponse.data.result ||
      !summaryResponse.data.result[pmid]
    ) {
      return null;
    }

    const summaryData = summaryResponse.data.result[pmid];

    // Then get the abstract
    const abstractResponse = await axios.get(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`,
      {
        headers: {
          "User-Agent": "ProveMyPoint/1.0 (mailto:your-email@example.com)",
        },
      }
    );

    // Parse XML to get abstract
    const dom = new JSDOM(abstractResponse.data, { contentType: "text/xml" });
    const document = dom.window.document;

    const abstractText =
      document.querySelector("AbstractText")?.textContent ||
      "No abstract available";
    const citationCount =
      document.querySelector("CommentsCorrections[RefType='Cites']")?.length ||
      0;

    return {
      title: summaryData.title || "Unknown Title",
      abstract: abstractText,
      authors:
        summaryData.authors?.map((a) => a.name).join(", ") || "Unknown Authors",
      journal: summaryData.fulljournalname || "Unknown Journal",
      year: summaryData.pubdate?.split(" ")[0] || "Unknown Year",
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      citationCount,
    };
  } catch (error) {
    console.error(`❌ Error fetching PubMed paper (${pmid}):`, error.message);
    return null;
  }
}

// Enhanced function to combine and prioritize data sources
async function getPaperDetails(papers) {
  const fullPapers = [];
  const processedUrls = new Set();

  for (const paper of papers) {
    // Avoid duplicates
    if (processedUrls.has(paper.url)) continue;

    let details = null;

    // Try to extract IDs from URL if not explicitly provided
    const doiMatch = paper.url.match(/doi\.org\/([^\/&?#]+)/);
    const arxivMatch = paper.url.match(/arxiv\.org\/abs\/([^\/&?#]+)/);
    const pubmedMatch = paper.url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/);

    const doi = paper.doi || (doiMatch ? doiMatch[1] : null);
    const arxivId = paper.arxiv_id || (arxivMatch ? arxivMatch[1] : null);
    const pmid = paper.pmid || (pubmedMatch ? pubmedMatch[1] : null);

    // Try each source in order of priority
    if (doi) {
      details = await fetchCrossRefDetails(doi);
      await new Promise((r) => setTimeout(r, 1000)); // Respect rate limits
    }

    if (!details && arxivId) {
      details = await fetchArXivDetails(arxivId);
      await new Promise((r) => setTimeout(r, 1000)); // Respect rate limits
    }

    if (!details && pmid) {
      details = await fetchPubMedDetails(pmid);
      await new Promise((r) => setTimeout(r, 1000)); // Respect rate limits
    }

    // Fallback to original data
    if (!details) {
      details = {
        title: paper.title || "Unknown Title",
        abstract: paper.abstract || "No abstract available",
        authors: paper.metadata || "Unknown Authors",
        year: "Unknown Year",
        journal: "Unknown Source",
        url: paper.url || "#",
        citationCount: 0,
      };
    }

    fullPapers.push(details);
    processedUrls.add(paper.url);

    // Stop after 8 papers to avoid long processing times
    if (fullPapers.length >= 8) break;
  }

  return fullPapers;
}

module.exports = { getPaperDetails };
