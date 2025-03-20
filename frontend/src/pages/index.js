import { useState } from "react";

export default function Home() {
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState(null);
  const [papers, setPapers] = useState([]); // ✅ Always initialize papers as an empty array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🔍 Fetch research papers & AI analysis
  const fetchResearchData = async () => {
    if (!query.trim()) {
      setError("Please enter a claim to analyze.");
      return;
    }

    setLoading(true);
    setError(null);
    setSummary(null);
    setPapers([]); // Reset previous results

    try {
      const response = await fetch(
        `http://localhost:5000/api/research?query=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();
      if (!data || !data.research_papers) {
        throw new Error("Invalid API response");
      }

      setSummary(data.ai_conclusion);
      setPapers(data.research_papers);
    } catch (err) {
      console.error("❌ API Fetch Error:", err);
      setError("Failed to fetch research data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-4">Prove My Point</h1>
      <div className="w-full max-w-2xl">
        <input
          type="text"
          placeholder="Enter a claim (e.g., Aspartame is safe)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-3 rounded-md bg-gray-800 border border-gray-700 text-white"
        />
        <button
          onClick={fetchResearchData}
          className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md"
          disabled={loading}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>

        {error && <p className="mt-4 text-red-500">{error}</p>}

        {/* 🔍 AI Conclusion */}
        {summary && (
          <div className="mt-6 p-4 border rounded-md bg-gray-800 w-full">
            <h3 className="text-lg font-semibold">📢 AI Conclusion:</h3>
            <p className="mt-2">{summary}</p>
          </div>
        )}

        {/* 📚 Research Papers */}
        <div className="mt-6 w-full max-w-3xl">
          {papers.length > 0 ? (
            papers.map((paper, index) => (
              <div
                key={index}
                className="border p-4 rounded-md mb-2 shadow-md bg-gray-800"
              >
                <h3 className="text-lg font-semibold">{paper.title}</h3>
                <p>{paper.abstract || "No abstract available."}</p>
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400"
                >
                  Read More
                </a>
              </div>
            ))
          ) : (
            <p className="text-gray-400">
              No research papers found. Try another search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
