import { useState, useEffect } from "react";
import Head from "next/head";

export default function Home() {
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [trending, setTrending] = useState([]);
  const [dataQuality, setDataQuality] = useState("unknown");

  // Load search history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("searchHistory");
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error parsing search history:", e);
      }
    }

    // Fetch trending topics
    fetchTrendingTopics();
  }, []);

  // Fetch trending topics from the API
  const fetchTrendingTopics = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/trending");
      if (response.ok) {
        const data = await response.json();
        setTrending(data);
      }
    } catch (error) {
      console.error("Error fetching trending topics:", error);
    }
  };

  // Fetch search suggestions as user types
  useEffect(() => {
    const getSuggestions = async () => {
      if (query.length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:5000/api/suggestions?term=${encodeURIComponent(
            query
          )}`
        );

        if (response.ok) {
          const data = await response.json();

          // Combine API suggestions with local search history
          const historyMatches = searchHistory
            .filter((item) => item.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 3);

          const allSuggestions = [...new Set([...historyMatches, ...data])];
          setSuggestions(allSuggestions.slice(0, 5));
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    };

    const timeoutId = setTimeout(getSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [query, searchHistory]);

  // Fetch research data from API
  const fetchResearchData = async () => {
    if (!query.trim()) {
      setError("Please enter a claim to analyze.");
      return;
    }

    setLoading(true);
    setError(null);
    setSummary(null);
    setPapers([]);
    setDataQuality("unknown");
    setShowSuggestions(false);

    try {
      const response = await fetch(
        `http://localhost:5000/api/research?query=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server Error: ${response.status}`);
      }

      const data = await response.json();
      if (!data || !data.research_papers) {
        throw new Error("Invalid API response");
      }

      // Update state with results
      setSummary(data.ai_conclusion);
      setPapers(data.research_papers);
      setDataQuality(data.data_quality || "unknown");

      // Update search history in state and localStorage
      const updatedHistory = [
        query,
        ...searchHistory.filter((item) => item !== query),
      ].slice(0, 10);
      setSearchHistory(updatedHistory);
      localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
    } catch (err) {
      console.error("❌ API Fetch Error:", err);
      setError(
        err.message || "Failed to fetch research data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  // Handle trending topic selection
  const handleTrendingClick = (topic) => {
    setQuery(topic);
    fetchResearchData();
  };

  return (
    <>
      <Head>
        <title>Prove My Point - Research Claim Analyzer</title>
        <meta
          name="description"
          content="Analyze scientific claims with AI-powered research paper analysis"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen flex flex-col bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 p-4 shadow-lg">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Prove My Point
            </h1>
            <div className="text-sm text-gray-400">
              AI-Powered Research Analysis
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow p-6">
          <div className="max-w-6xl mx-auto">
            {/* Search Section */}
            <div className="mb-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold mb-2">
                  Analyze Any Scientific Claim
                </h2>
                <p className="text-gray-400">
                  Enter a claim or research question to find and analyze
                  relevant scientific papers
                </p>
              </div>

              <div className="max-w-3xl mx-auto relative">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter a claim (e.g., Aspartame is safe)"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full p-4 rounded-lg bg-gray-800 border border-gray-700 text-white shadow-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />

                  {/* Search suggestions dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded-md mt-1 shadow-lg">
                      {suggestions.map((item, index) => (
                        <div
                          key={index}
                          className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0"
                          onClick={() => handleSuggestionClick(item)}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={fetchResearchData}
                  className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg shadow-md transition-colors"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Analyzing Research...
                    </div>
                  ) : (
                    "Analyze Research"
                  )}
                </button>
              </div>

              {/* Trending topics section */}
              {trending.length > 0 && !loading && !summary && (
                <div className="mt-8 max-w-3xl mx-auto">
                  <h3 className="text-xl font-semibold mb-3">
                    Trending Research Topics
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trending.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleTrendingClick(item.topic)}
                        className="bg-gray-800 hover:bg-gray-700 text-sm py-2 px-4 rounded-full text-blue-400 border border-gray-700"
                      >
                        {item.topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-900/50 border border-red-800 rounded-lg text-white">
                <div className="flex items-center">
                  <svg
                    className="w-6 h-6 mr-2 text-red-400"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Results Display */}
            {summary && (
              <div className="max-w-5xl mx-auto">
                {/* Data quality indicator */}
                {dataQuality && (
                  <div
                    className={`mb-4 text-sm px-4 py-2 rounded-full inline-block ${
                      dataQuality === "high"
                        ? "bg-green-900/50 text-green-400"
                        : dataQuality === "moderate"
                        ? "bg-yellow-900/50 text-yellow-400"
                        : dataQuality === "limited"
                        ? "bg-orange-900/50 text-orange-400"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    <span className="font-medium">Data Quality: </span>
                    <span>
                      {dataQuality.charAt(0).toUpperCase() +
                        dataQuality.slice(1)}
                    </span>
                  </div>
                )}

                {/* AI Analysis Results */}
                <div className="mb-8 p-6 border rounded-lg bg-gray-800/80 backdrop-blur-sm shadow-lg border-gray-700">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <svg
                      className="w-6 h-6 mr-2 text-blue-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    Research Analysis
                  </h3>
                  <div
                    className="prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: summary
                        .replace(/\n\n/g, "</p><p>")
                        .replace(/\n/g, "<br>")
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(
                          /\[(SUPPORTED|REFUTED|INCONCLUSIVE)\]/g,
                          '<span class="text-xl font-bold">$1</span>'
                        )
                        .replace(
                          /\[(HIGH|MODERATE|LOW)\]/g,
                          '<span class="font-bold">$1</span>'
                        ),
                    }}
                  />
                </div>

                {/* Research Papers Section */}
                {papers.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                      <svg
                        className="w-6 h-6 mr-2 text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                      Research Papers ({papers.length})
                    </h3>

                    <div className="space-y-5">
                      {papers.map((paper, index) => (
                        <div
                          key={index}
                          className="p-5 rounded-lg shadow-lg border bg-gray-800/70 backdrop-blur-sm border-gray-700 hover:bg-gray-800 transition-colors"
                        >
                          <h4 className="text-lg font-semibold text-blue-400 mb-1">
                            {paper.title}
                          </h4>

                          <div className="flex flex-wrap items-center gap-x-4 text-sm text-gray-400 mb-2">
                            {paper.authors && (
                              <div className="flex items-center">
                                <svg
                                  className="w-4 h-4 mr-1"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                                <span>{paper.authors}</span>
                              </div>
                            )}

                            {paper.year && (
                              <div className="flex items-center">
                                <svg
                                  className="w-4 h-4 mr-1"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                <span>{paper.year}</span>
                              </div>
                            )}

                            {paper.journal && (
                              <div className="flex items-center">
                                <svg
                                  className="w-4 h-4 mr-1"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                                  />
                                </svg>
                                <span>{paper.journal}</span>
                              </div>
                            )}

                            {paper.citationCount !== undefined && (
                              <div className="flex items-center">
                                <svg
                                  className="w-4 h-4 mr-1"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                                  />
                                </svg>
                                <span>Cited {paper.citationCount} times</span>
                              </div>
                            )}
                          </div>

                          {/* Credibility score */}
                          {paper.credibilityScore !== undefined && (
                            <div className="mb-3">
                              <div className="flex items-center mb-1">
                                <span className="text-sm font-medium text-gray-300 mr-2">
                                  Credibility:
                                </span>
                                <div className="h-2 w-24 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${
                                      paper.credibilityScore >= 80
                                        ? "bg-green-500"
                                        : paper.credibilityScore >= 60
                                        ? "bg-blue-500"
                                        : paper.credibilityScore >= 40
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                    }`}
                                    style={{
                                      width: `${paper.credibilityScore}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className="ml-2 text-sm text-gray-400">
                                  {paper.credibilityScore}/100
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Abstract */}
                          <p className="text-gray-300 mb-3 line-clamp-3">
                            {paper.abstract || "No abstract available."}
                          </p>

                          {/* Action links */}
                          <div className="flex items-center justify-between">
                            <a
                              href={paper.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 flex items-center transition-colors"
                            >
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                              View Full Paper
                            </a>

                            <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-400">
                              Source {index + 1}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 py-6 text-center text-gray-400 text-sm">
          <div className="max-w-6xl mx-auto px-4">
            <p>Prove My Point - AI-Powered Research Analysis Tool</p>
            <p className="mt-1">
              © {new Date().getFullYear()} Your Company |{" "}
              <a href="#" className="text-blue-400 hover:underline">
                Terms of Service
              </a>{" "}
              |{" "}
              <a href="#" className="text-blue-400 hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
