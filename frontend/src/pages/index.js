import { useState, useEffect } from "react";
import Head from "next/head";

export default function Home() {
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);

  // Load search history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("searchHistory");
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error parsing search history:", e);
      }
    }
  }, []);

  // Fetch research data
  const fetchResearchData = async () => {
    if (!query.trim()) {
      setError("Please enter a research question");
      return;
    }

    setLoading(true);
    setError(null);
    setSummary(null);
    setPapers([]);

    try {
      const response = await fetch(
        `http://localhost:5000/api/research?query=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error("Server error occurred");
      }

      const data = await response.json();
      
      setSummary(data.ai_conclusion);
      setPapers(data.research_papers);
      
      // Update search history
      const updatedHistory = [
        query,
        ...searchHistory.filter((item) => item !== query),
      ].slice(0, 5);
      setSearchHistory(updatedHistory);
      localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
    } catch (err) {
      setError("Failed to fetch research data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Prove My Point</title>
        <meta name="description" content="Research paper analysis tool" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-black text-white">
        {/* Header */}
        <header className="py-8 text-center">
          <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Prove My Point
          </h1>
          <p className="text-blue-200">Research-backed answers to your questions</p>
        </header>

        {/* Main Content */}
        <main className="max-w-3xl mx-auto px-4 pb-12">
          {/* Search Box */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-xl mb-8">
            <h2 className="text-xl font-medium mb-4">Ask a question to research</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Does coffee reduce the risk of heart disease?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-blue-300/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                onKeyPress={(e) => e.key === 'Enter' && fetchResearchData()}
              />
              {searchHistory.length > 0 && query === "" && (
                <div className="mt-3">
                  <p className="text-xs text-blue-300 mb-1">Recent searches:</p>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => setQuery(item)}
                        className="px-3 py-1 text-xs rounded-full bg-blue-500/30 hover:bg-blue-500/50"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={fetchResearchData}
              disabled={loading}
              className="mt-4 w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 font-medium transition-all"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Researching...
                </div>
              ) : (
                "Research This"
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
              {error}
            </div>
          )}

          {/* Results */}
          {summary && (
            <div className="space-y-6">
              {/* AI Analysis */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-xl">
                <h2 className="text-xl font-semibold mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Research Summary
                </h2>
                <div 
                  className="prose prose-invert prose-blue prose-p:text-gray-300 max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: summary
                      .replace(/\n\n/g, '</p><p>')
                      .replace(/\n/g, '<br>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-300">$1</strong>')
                      .replace(/\[(SUPPORTED|REFUTED|INCONCLUSIVE)\]/g, 
                        match => {
                          const term = match.replace(/[\[\]]/g, '');
                          const color = term === 'SUPPORTED' ? 'text-green-400' : 
                                      term === 'REFUTED' ? 'text-red-400' : 'text-yellow-400';
                          return `<span class="text-lg font-bold ${color}">${term}</span>`;
                        })
                      .replace(/\[(HIGH|MODERATE|LOW)\]/g, 
                        match => {
                          const term = match.replace(/[\[\]]/g, '');
                          const color = term === 'HIGH' ? 'text-green-400' : 
                                      term === 'MODERATE' ? 'text-yellow-400' : 'text-red-400';
                          return `<span class="font-bold ${color}">${term}</span>`;
                        })
                  }}
                />
              </div>

              {/* Paper Cards */}
              {papers.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Research Sources ({papers.length})
                  </h2>
                  <div className="space-y-4">
                    {papers.map((paper, index) => (
                      <div 
                        key={index}
                        className="bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-blue-500/20 rounded-lg p-4 transition-all"
                      >
                        <h3 className="font-medium text-blue-300 mb-1">
                          {paper.title}
                        </h3>
                        
                        <div className="flex flex-wrap text-xs text-blue-200/70 gap-x-4 mb-2">
                          {paper.authors && <span>{paper.authors}</span>}
                          {paper.year && <span>Published: {paper.year}</span>}
                          {paper.journal && <span>Journal: {paper.journal}</span>}
                          {paper.citationCount > 0 && <span>Citations: {paper.citationCount}</span>}
                        </div>
                        
                        {paper.credibilityScore && (
                          <div className="mb-2 flex items-center">
                            <span className="text-xs mr-2">Credibility:</span>
                            <div className="h-1.5 w-20 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${
                                  paper.credibilityScore >= 80 ? 'bg-green-500' : 
                                  paper.credibilityScore >= 60 ? 'bg-blue-500' : 
                                  paper.credibilityScore >= 40 ? 'bg-yellow-500' : 
                                  'bg-red-500'
                                }`}
                                style={{ width: `${paper.credibilityScore}%` }}
                              ></div>
                            </div>
                            <span className="text-xs ml-2">{paper.credibilityScore}</span>
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                          {paper.abstract || "No abstract available"}
                        </p>
                        
                        <a 
                          href={paper.url} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs text-blue-400 hover:text-blue-300"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Read Full Paper
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="py-4 text-center text-blue-300/50 text-sm">
          <p>Prove My Point • Research backed by AI • {new Date().getFullYear()}</p>
        </footer>
      </div>
    </>
  );
}