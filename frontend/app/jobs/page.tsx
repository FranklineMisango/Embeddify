"use client";
import { useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function JobsPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [sources, setSources] = useState(["linkedin", "indeed"]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const scrape = async () => {
    setLoading(true);
    const r = await axios.post(`${API}/jobs/scrape`, { query, location, sources, limit: 20 });
    setResult(r.data);
    setLoading(false);
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Scrape Jobs</h1>
      <div className="flex flex-col gap-3">
        <input className="bg-gray-800 rounded-lg px-4 py-2 text-sm" placeholder="Job title / keywords"
          value={query} onChange={(e) => setQuery(e.target.value)} />
        <input className="bg-gray-800 rounded-lg px-4 py-2 text-sm" placeholder="Location (optional)"
          value={location} onChange={(e) => setLocation(e.target.value)} />
        <div className="flex gap-4 text-sm text-gray-400">
          {["linkedin", "indeed"].map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={sources.includes(s)}
                onChange={(e) => setSources(e.target.checked ? [...sources, s] : sources.filter((x) => x !== s))} />
              {s}
            </label>
          ))}
        </div>
        <button onClick={scrape} disabled={loading || !query}
          className="bg-brand-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium">
          {loading ? "Scraping..." : "Scrape Jobs"}
        </button>
        {result && (
          <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
            Found {result.scraped} jobs — {result.new} new saved to DB.
            <a href="/" className="ml-2 text-brand-500 underline">View on dashboard →</a>
          </div>
        )}
      </div>
    </div>
  );
}
