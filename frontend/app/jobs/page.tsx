"use client";
import { useState } from "react";
import { Search, MapPin, Briefcase } from "lucide-react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function JobsPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [sources, setSources] = useState(["linkedin", "indeed"]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  const scrape = async () => {
    setLoading(true);
    setProgress(0);
    try {
      const r = await axios.post(`${API}/jobs/scrape`, { query, location, sources, limit: 20 });
      setResult(r.data);
      setProgress(100);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-4xl font-bold text-slate-100 mb-2">Scrape Jobs</h1>
        <p className="text-slate-400">Search and collect job listings from multiple sources</p>
      </div>

      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8 space-y-6">
        {/* Job Title Input */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Job Title or Keywords</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="e.g., Data Scientist, Machine Learning Engineer"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>
        </div>

        {/* Location Input */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Location (Optional)</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="e.g., New York, Remote, London"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>
        </div>

        {/* Sources Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Job Sources</label>
          <div className="flex gap-4">
            {["linkedin", "indeed"].map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={sources.includes(s)}
                  onChange={(e) => setSources(e.target.checked ? [...sources, s] : sources.filter((x) => x !== s))}
                  className="w-4 h-4 rounded border-slate-600 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-slate-100">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Scrape Button */}
        <button
          onClick={scrape}
          disabled={loading || !query}
          className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 font-semibold transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Briefcase size={18} />
          {loading ? "Scraping..." : "Scrape Jobs"}
        </button>

        {/* Result */}
        {result && (
          <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <p className="font-semibold text-green-400">Scraping Complete!</p>
                <p className="text-sm text-green-300 mt-1">
                  Found <span className="font-bold">{result.scraped}</span> jobs — <span className="font-bold">{result.new}</span> new jobs saved to database.
                </p>
              </div>
              <a href="/match" className="inline-flex items-center text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors">
                View Matches →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
