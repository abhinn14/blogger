import React, { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";

export default function App() {
  const [topic, setTopic] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const mdComponents = useMemo(
    () => ({
      strong: ({ children }) => <span className="font-normal">{children}</span>,
      em: ({ children }) => <span className="not-italic">{children}</span>,
      h1: ({ node, ...props }) => (
        <h1 className="text-3xl font-bold mt-2 mb-4 leading-tight" {...props} />
      ),
      h2: ({ node, ...props }) => (
        <h2 className="text-2xl font-bold mt-6 mb-3 leading-snug" {...props} />
      ),
      h3: ({ node, ...props }) => (
        <h3 className="text-xl font-bold mt-4 mb-2" {...props} />
      ),
      p: ({ node, ...props }) => <p className="leading-7 mb-4 text-gray-700" {...props} />,
      li: ({ node, ...props }) => <li className="mb-1" {...props} />,
    }),
    []
  );

  const generateBlog = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    setError("");
    setMarkdown("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/generate-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, wordCount: 1000 }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Request failed with status ${res.status}`);
        return;
      }

      setMarkdown(data.markdown || "");
    } catch (err) {
      setError("Network error: " + (err.message || "unknown"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-6">
      <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-3xl">
        <header className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold">AI Blog Generator</h1>
          <p className="text-sm text-gray-500 mt-1">Enter a topic and get a ~1000 word blog, instantly.</p>
        </header>

        <div className="space-y-4">
          <label className="sr-only" htmlFor="topic">Blog topic</label>
          <input
            id="topic"
            type="text"
            placeholder="e.g. How to build a portfolio with React"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          <button
            onClick={generateBlog}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:opacity-95 disabled:opacity-60"
          >
            {loading && (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            <span>{loading ? "Generating…" : "Generate Blog"}</span>
          </button>

          {error && <div className="text-sm text-red-600">⚠️ {error}</div>}
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">📖 Blog Preview</h2>
          <div className="border border-gray-100 rounded-lg p-5 bg-white shadow-sm">
            {markdown ? (
              <article className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[]} components={mdComponents}>
                  {markdown}
                </ReactMarkdown>
              </article>
            ) : (
              <div className="text-gray-400">Generate a blog to see the preview here.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
