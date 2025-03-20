export default function SearchBar({ query, setQuery, searchPapers }) {
  return (
    <div className="flex flex-col items-center mt-6">
      <input
        type="text"
        placeholder="Enter a topic"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="p-3 border rounded-md w-96"
      />
      <button
        onClick={searchPapers}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md"
      >
        Search
      </button>
    </div>
  );
}
