const puppeteer = require("puppeteer");

exports.getGoogleScholarPapers = async (query) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const searchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(
    query
  )}`;
  await page.goto(searchUrl);

  const results = await page.evaluate(() => {
    const papers = [];
    document.querySelectorAll(".gs_r").forEach((el) => {
      const titleElement = el.querySelector(".gs_rt a");
      const authorElement = el.querySelector(".gs_a");
      const snippetElement = el.querySelector(".gs_rs");
      const link = titleElement ? titleElement.href : null;
      const title = titleElement ? titleElement.innerText : "No Title";
      const authors = authorElement
        ? authorElement.innerText
        : "Unknown Authors";
      const snippet = snippetElement
        ? snippetElement.innerText
        : "No summary available.";

      papers.push({ title, authors, url: link, snippet });
    });
    return papers;
  });

  await browser.close();
  return results;
};
