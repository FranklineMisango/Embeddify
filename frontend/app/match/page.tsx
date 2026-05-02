"use client";
import { useState } from "react";
import { TrendingUp, Sparkles } from "lucide-react";
import axios from "axios";
import MatchViz from "@/components/MatchViz";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function MatchPage() {
  const [jd, setJd] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const score = async () => {
    setError("");
    setLoading(true);
    try {
      if (!cvFile) {
        setError("Please select a CV PDF before analyzing.");
        setLoading(false);
        return;
      }

      const uploadForm = new FormData();
      uploadForm.append("file", cvFile);
      const uploadResp = await axios.post(`${API}/cv/upload`, uploadForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const r = await axios.post(`${API}/cv/score-text`, {
        cv_text: uploadResp.data.text,
        job_description: jd,
      });
      setResult(r.data);
    } catch (error: unknown) {
      console.error(error);
      if (axios.isAxiosError(error)) {
        setError((error.response?.data as { detail?: string } | undefined)?.detail || "Failed to analyze match.");
      } else {
        setError("Failed to analyze match.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-4xl font-bold text-slate-100 mb-2">Matches</h1>
        <p className="text-slate-400">Analyze how well your CV matches a job description</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">CV PDF File</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 file:mr-4 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-white hover:file:bg-brand-700"
            />
            <p className="text-xs text-slate-400 mt-2">Upload a text-based PDF CV (scanned-image PDFs may fail).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Job Description</label>
            <textarea
              placeholder="Paste the full job description here..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              className="w-full h-80 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <button
            onClick={score}
            disabled={loading || !jd || !cvFile}
            className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 font-semibold transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            {loading ? "Analyzing..." : "Analyze Match"}
          </button>
        </div>

        {/* Results Section */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full border-2 border-brand-500 border-t-transparent animate-spin mx-auto mb-4"></div>
                <p className="text-slate-300">Analyzing your CV...</p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Overall Match Score</p>
                <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500"
                    style={{ width: `${Math.round(result.overall * 100)}%` }}
                  />
                </div>
                <p className="text-3xl font-bold text-brand-400 mt-3">
                  {Math.round(result.overall * 100)}%
                </p>
                <p className="text-sm text-slate-400 mt-1">{result.confidence_label}</p>
              </div>
              {result.skills && (
                <div>
                  <p className="text-sm font-semibold text-slate-300 mb-3">Matching Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {result.skills.slice(0, 6).map((skill: string, i: number) => (
                      <span key={i} className="text-xs px-3 py-1 bg-brand-500/20 text-brand-300 rounded-full font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.missing_skills && (
                <div>
                  <p className="text-sm font-semibold text-slate-300 mb-3">Skills to Develop</p>
                  <div className="flex flex-wrap gap-2">
                    {result.missing_skills.slice(0, 6).map((skill: string, i: number) => (
                      <span key={i} className="text-xs px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.recommendations && (
                <div>
                  <p className="text-sm font-semibold text-slate-300 mb-3">Recommendations</p>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {result.recommendations.slice(0, 3).map((rec: string, i: number) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-brand-400 flex-shrink-0">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <TrendingUp className="text-slate-600 mb-4" size={32} />
              <p className="text-slate-400">Your match analysis will appear here</p>
            </div>
          )}
        </div>
      </div>

      {result && <MatchViz data={result} />}
    </div>
  );
}
