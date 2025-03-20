const puppeteer = require("puppeteer");
const axios = require("axios");

// Scrape Google Scholar with improved extraction
async function scrapeGoogleScholar(query) {
  console.log(`🔍 Scraping Google Scholar for: "${query}"`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Set a realistic user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36"
    );

    // Add random delay using setTimeout instead of waitForTimeout
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 2000)
    );

    // Navigate to Google Scholar
    await page.goto(
      `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}&hl=en`,
      { waitUntil: "networkidle2" }
    );

    // Check if we hit a CAPTCHA
    const captchaExists = await page.evaluate(() => {
      return document.querySelector('form[action="/sorry/index"]') !== null;
    });

    if (captchaExists) {
      console.error("❌ Google Scholar CAPTCHA detected!");
      throw new Error("Google Scholar is requiring CAPTCHA verification");
    }

    // Extract papers with more metadata
    const papers = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".gs_r.gs_or.gs_scl")).map(
        (el) => {
          // Extract title and link
          const titleEl = el.querySelector(".gs_rt a");
          const title = titleEl ? titleEl.innerText.trim() : "Unknown Title";
          const link = titleEl ? titleEl.href : null;

          // Extract snippet/abstract
          const snippetEl = el.querySelector(".gs_rs");
          const snippet = snippetEl
            ? snippetEl.innerText.trim()
            : "No abstract available";

          // Extract metadata (authors, publication, year)
          const metadataEl = el.querySelector(".gs_a");
          const metadata = metadataEl ? metadataEl.innerText.trim() : "";

          // Try to extract year
          const yearMatch = metadata.match(/\b(19|20)\d{2}\b/);
          const year = yearMatch ? yearMatch[0] : null;

          // Try to extract authors
          const authorsMatch = metadata.split("-")[0];
          const authors = authorsMatch
            ? authorsMatch.trim()
            : "Unknown Authors";

          // Try to extract publication
          const publicationMatch = metadata.split("-")[1];
          const publication = publicationMatch ? publicationMatch.trim() : "";

          // Try to extract citation count
          const citedByEl = el.querySelector(".gs_fl a");
          let citationCount = 0;
          if (citedByEl && citedByEl.textContent.includes("Cited by")) {
            const citationMatch = citedByEl.textContent.match(/\d+/);
            citationCount = citationMatch ? parseInt(citationMatch[0]) : 0;
          }

          // Extract DOI or ArXiv ID (if available)
          const doiMatch = link ? link.match(/doi\.org\/([\w.\/-]+)/) : null;
          const arxivMatch = link
            ? link.match(/arxiv\.org\/abs\/([\d.]+)/)
            : null;
          const pubmedMatch = link
            ? link.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/)
            : null;

          return {
            title,
            url: link || "",
            abstract: snippet,
            metadata,
            authors,
            publication,
            year,
            citationCount,
            doi: doiMatch ? doiMatch[1] : null,
            arxiv_id: arxivMatch ? arxivMatch[1] : null,
            pmid: pubmedMatch ? pubmedMatch[1] : null,
          };
        }
      );
    });

    await browser.close();

    // Filter out papers without URLs
    const validPapers = papers.filter((paper) => paper.url);

    // Return top 10 relevant results
    return validPapers.slice(0, 10);
  } catch (error) {
    console.error("❌ Google Scholar scraping error:", error);
    await browser.close();

    // Fallback to a secondary source if Google Scholar fails
    return await searchFallbackSource(query);
  }
}

// Fallback search using arXiv API directly
async function searchFallbackSource(query) {
  try {
    console.log("🔄 Falling back to arXiv API for search");

    const response = await axios.get(
      `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(
        query
      )}&max_results=10`,
      {
        headers: {
          "User-Agent": "ProveMyPoint/1.0 (mailto:your-email@example.com)",
        },
      }
    );

    // Parse XML
    const { JSDOM } = require("jsdom");
    const dom = new JSDOM(response.data, { contentType: "text/xml" });
    const document = dom.window.document;

    const entries = document.querySelectorAll("entry");
    const results = Array.from(entries).map((entry) => {
      const title =
        entry.querySelector("title")?.textContent || "Unknown Title";
      const abstract =
        entry.querySelector("summary")?.textContent || "No abstract available";
      const authorNodes = entry.querySelectorAll("author name");
      const authors =
        Array.from(authorNodes)
          .map((a) => a.textContent)
          .join(", ") || "Unknown Authors";
      const published = entry.querySelector("published")?.textContent || "";
      const year = published ? published.split("-")[0] : "Unknown Year";
      const url = entry.querySelector("id")?.textContent || "";
      const arxiv_id = url.split("/").pop();

      return {
        title,
        url,
        abstract,
        metadata: `${authors} - arXiv, ${year}`,
        authors,
        publication: "arXiv",
        year,
        citationCount: 0,
        doi: null,
        arxiv_id,
        pmid: null,
      };
    });

    return results;
  } catch (error) {
    console.error("❌ arXiv API search error:", error);
    // Return empty array if all search methods fail
    return [];
  }
}

// Add a function to extract additional paper details when available
async function enrichPaperData(papers) {
  const enrichedPapers = [];

  for (const paper of papers) {
    let enriched = { ...paper };

    // Try to get citation count if available
    if (paper.doi) {
      try {
        const response = await axios.get(
          `https://api.crossref.org/works/${paper.doi}`
        );
        if (response.data && response.data.message) {
          enriched.citationCount =
            response.data.message.is_referenced_by_count || 0;
        }
      } catch (error) {
        console.log(`Unable to enrich paper with DOI ${paper.doi}`);
      }

      // Respect rate limits
      await new Promise((r) => setTimeout(r, 1000));
    }

    enrichedPapers.push(enriched);
  }

  return enrichedPapers;
}

module.exports = {
  scrapeGoogleScholar,
  enrichPaperData,
};
