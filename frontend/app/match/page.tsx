"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, ListChecks, Search, Sparkles, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import axios from "axios";
import { useCvProfile } from "@/components/CvProvider";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function displayAnalysisValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    const preferred = item.name ?? item.description ?? item.recommendation ?? item.skill;
    if (typeof preferred === "string") return preferred;
  }
  return JSON.stringify(value);
}
const API_FALLBACK = API.includes("localhost")
  ? API.replace("localhost", "127.0.0.1")
  : API.includes("127.0.0.1")
    ? API.replace("127.0.0.1", "localhost")
    : null;

const TABS = [
  { id: "jd", label: "JD Analyzer", icon: Search },
] as const;

const formatRequestError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      const messages = detail
        .map((entry) => {
          if (typeof entry === "string") {
            return entry;
          }

          if (entry && typeof entry === "object" && "msg" in entry && typeof entry.msg === "string") {
            return entry.msg;
          }

          return null;
        })
        .filter((message): message is string => Boolean(message));

      if (messages.length > 0) {
        return messages.join(" ");
      }
    }

    if (error.response) {
      return `Request failed with status ${error.response.status}.`;
    }

    return `Could not reach API at ${API}${API_FALLBACK ? ` (also tried ${API_FALLBACK})` : ""}.`;
  }

  return error instanceof Error ? error.message : "Failed to analyze match.";
};

export default function MatchPage() {
  const { profile, hydrated } = useCvProfile();
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jd, setJd] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const hasCv = Boolean(profile?.text);

  const analyze = async () => {
    if (!profile?.text) {
      setAnalysisError("Upload your CV on Home first.");
      return;
    }

    if (!jd.trim()) {
      setAnalysisError("Paste a job description to analyze.");
      return;
    }

    setAnalysisError("");
    setAnalysisLoading(true);

    try {
      const result = await axios.post(`${API}/job-search/analyze-jd`, {
        cv_text: profile.text,
        job_description: jd,
        job_title: jobTitle || "Job Opportunity",
        company: company || "Company",
      });
      setAnalysis(result.data.analysis);
    } catch (error: unknown) {
      setAnalysisError(formatRequestError(error));
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-100 mb-2">Custom Job Match Analysis</h1>
        <p className="text-slate-400">Paste a job description to get detailed AI-powered matching analysis</p>
      </div>

      {hydrated && !hasCv && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
          Upload your CV on the Home tab first to enable job matching analysis.
        </div>
      )}

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Job Title</label>
              <input
                type="text"
                placeholder="e.g., Senior Python Developer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Company</label>
              <input
                type="text"
                placeholder="e.g., Google"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Job Description</label>
              <textarea
                placeholder="Paste the full job description here..."
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                className="w-full h-64 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
                disabled={!hasCv}
              />
            </div>

            {analysisError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {analysisError}
              </div>
            )}

            <button
              onClick={analyze}
              disabled={analysisLoading || !hasCv}
              className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              {analysisLoading ? "Analyzing..." : "Analyze Match"}
            </button>

            {!hasCv && <p className="text-sm text-slate-400">Upload your CV on Home to unlock analysis.</p>}
          </div>
        </div>

        {/* Analysis Results */}
        <div className="lg:col-span-2">
          {analysisLoading ? (
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8 flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full border-2 border-brand-500 border-t-transparent animate-spin mx-auto mb-4"></div>
                <p className="text-slate-300">Analyzing job match with AI...</p>
              </div>
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              {/* Overall Match */}
              <div className="bg-gradient-to-br from-brand-500/10 to-brand-500/5 border border-brand-500/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-slate-100">Overall Match</h2>
                  <span className="text-5xl font-bold text-brand-400">{analysis.overallMatch}%</span>
                </div>
                <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-brand-400"
                    style={{ width: `${analysis.overallMatch}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-slate-300">
                    <span className="font-semibold capitalize">{analysis.estimatedFit}</span> fit for this role
                  </p>
                  <span className="text-sm text-slate-400">Keyword overlap: {analysis.keywordOverlap}%</span>
                </div>
                {analysis.fitExplanation && (
                  <p className="mt-4 text-sm text-slate-300 leading-relaxed">{analysis.fitExplanation}</p>
                )}
              </div>

              {/* Match Score Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(analysis.matchScore).map(([key, score]: [string, any]) => (
                  <div key={key} className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                    <p className="text-xs text-slate-400 uppercase mb-2">{key}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-slate-100">{score}%</span>
                      <div className="w-12 h-12 rounded-full border-2 border-slate-700 flex items-center justify-center">
                        <div
                          className="w-10 h-10 rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                          style={{
                            background: `conic-gradient(from 0deg, rgb(var(--color-brand-500)) 0deg ${score * 3.6}deg, rgb(var(--color-slate-700)) ${score * 3.6}deg)`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Section Analysis */}
              {analysis.sectionAnalysis && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-slate-100">Section Analysis</h3>
                  {Object.entries(analysis.sectionAnalysis).map(([section, data]: [string, any]) => (
                    <div key={section} className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-slate-100 capitalize">{section}</p>
                        <span className="text-sm font-semibold text-brand-400">{data.match}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-brand-400"
                          style={{ width: `${data.match}%` }}
                        />
                      </div>
                      <p className="text-sm text-slate-300">{data.details}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Matched Skills */}
              {analysis.matchedSkills?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-green-400" />
                    Matched Skills ({analysis.matchedSkills.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.matchedSkills.map((skill: unknown, idx: number) => (
                      <span key={idx} className="bg-green-500/15 text-green-200 text-sm px-3 py-1 rounded-full">
                        {displayAnalysisValue(skill)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              {analysis.missingSkills?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <AlertCircle size={20} className="text-red-400" />
                    Missing Skills ({analysis.missingSkills.length})
                  </h3>
                  <div className="space-y-2">
                    {analysis.missingSkills.map((skill: any, idx: number) => (
                      <div key={idx} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <p className="text-red-200 font-medium">{displayAnalysisValue(skill)}</p>
                        {typeof skill === 'object' && skill.importance && (
                          <p className="text-xs text-red-300 mt-1">Importance: {skill.importance}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Wins */}
              {analysis.quickWins?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Zap size={20} className="text-yellow-400" />
                    Quick Wins
                  </h3>
                  <ul className="space-y-2">
                    {analysis.quickWins.map((win: any, idx: number) => (
                      <li key={idx} className="flex gap-2 text-slate-300">
                        <span className="text-yellow-400 mt-1">→</span>
                        <span>{typeof win === 'string' ? win : JSON.stringify(win)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Critical Gaps */}
              {analysis.criticalGaps?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <AlertCircle size={20} className="text-orange-400" />
                    Critical Gaps
                  </h3>
                  <ul className="space-y-2">
                    {analysis.criticalGaps.map((gap: any, idx: number) => (
                      <li key={idx} className="flex gap-2 text-slate-300">
                        <span className="text-orange-400 mt-1">⚠</span>
                        <span>{typeof gap === 'string' ? gap : JSON.stringify(gap)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Sparkles size={20} className="text-blue-400" />
                    Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((rec: any, idx: number) => (
                      <li key={idx} className="flex gap-2 text-slate-300">
                        <span className="text-blue-400 mt-1">→</span>
                        <span>{typeof rec === 'string' ? rec : rec.recommendation || JSON.stringify(rec)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interview Topics */}
              {analysis.interviewTopics?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">Interview Preparation Topics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {analysis.interviewTopics.map((topic: any, idx: number) => (
                      <div key={idx} className="bg-slate-800/30 border border-slate-700 rounded-lg p-3">
                        <p className="text-slate-300 text-sm">{typeof topic === 'string' ? topic : JSON.stringify(topic)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {analysis.nextSteps?.length > 0 && (
                <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">Next Steps</h3>
                  <ol className="space-y-2">
                    {analysis.nextSteps.map((step: any, idx: number) => (
                      <li key={idx} className="flex gap-3 text-slate-300">
                        <span className="font-semibold text-brand-400">{idx + 1}.</span>
                        <span>{typeof step === 'string' ? step : JSON.stringify(step)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8 flex items-center justify-center min-h-96">
              <p className="text-slate-400">Enter job details and paste a description to see analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
