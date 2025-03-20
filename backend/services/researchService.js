const puppeteer = require("puppeteer");

// ✅ Scrape Google Scholar & Extract DOI/arXiv IDs
async function scrapeGoogleScholar(query) {
  console.log(`🔍 Scraping Google Scholar for: "${query}"`);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(
    `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`
  );

  const papers = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".gs_r")).map((el) => {
      const title = el.querySelector(".gs_rt")?.innerText || "Unknown Title";
      const link = el.querySelector(".gs_rt a")?.href || "No Link";
      const snippet =
        el.querySelector(".gs_rs")?.innerText || "No abstract available";
      const metadata =
        el.querySelector(".gs_a")?.innerText || "Unknown Authors";

      // Extract DOI or ArXiv ID (if available)
      const doiMatch = metadata.match(/doi\.org\/([\w.\/-]+)/);
      const arxivMatch = metadata.match(/arxiv.org\/abs\/([\d.]+)/);

      return {
        title,
        url: link,
        abstract: snippet,
        metadata,
        doi: doiMatch ? doiMatch[1] : null,
        arxiv_id: arxivMatch ? arxivMatch[1] : null,
      };
    });
  });

  await browser.close();
  return papers.slice(0, 5); // Return top 5 relevant results
}

// ✅ Export function properly
module.exports = { scrapeGoogleScholar };
