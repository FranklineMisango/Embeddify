"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, ListChecks, Search, Sparkles } from "lucide-react";
import axios from "axios";
import MatchViz from "@/components/MatchViz";
import { useCvProfile } from "@/components/CvProvider";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_FALLBACK = API.includes("localhost")
  ? API.replace("localhost", "127.0.0.1")
  : API.includes("127.0.0.1")
    ? API.replace("127.0.0.1", "localhost")
    : null;

const TABS = [
  { id: "jobs", label: "Job Matches", icon: ListChecks },
  { id: "jd", label: "JD Analyzer", icon: Search },
] as const;

type ScoredJob = {
  id: number;
  title: string;
  company: string;
  location?: string;
  url?: string;
  status?: string;
  description?: string;
  match_score?: number | null;
  analysis?: {
    overall: number;
    keyword_overlap?: number;
    confidence_label?: string;
    sections?: Record<string, number>;
  } | null;
};

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
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("jobs");
  const [jobMatches, setJobMatches] = useState<ScoredJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobError, setJobError] = useState("");
  const [jd, setJd] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const hasCv = Boolean(profile?.text);

  const sortedJobMatches = useMemo(() => {
    return [...jobMatches].sort((left, right) => {
      const leftScore = left.analysis?.overall ?? left.match_score ?? 0;
      const rightScore = right.analysis?.overall ?? right.match_score ?? 0;
      return rightScore - leftScore;
    });
  }, [jobMatches]);

  const loadMatches = async () => {
    setLoadingJobs(true);
    setJobError("");

    try {
      const response = await axios.get<ScoredJob[]>(`${API}/jobs/`);
      const currentJobs = response.data.slice(0, 12);

      if (!profile?.text) {
        setJobMatches(currentJobs);
        return;
      }

      const scored = await Promise.all(
        currentJobs.map(async (job) => {
          if (!job.description) {
            return job;
          }

          try {
            const result = await axios.post(`${API}/cv/score-text`, {
              cv_text: profile.text,
              job_description: job.description,
            });

            return {
              ...job,
              analysis: result.data,
            };
          } catch {
            return job;
          }
        })
      );

      setJobMatches(scored);
    } catch (error: unknown) {
      setJobError(formatRequestError(error));
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (activeTab === "jobs") {
      loadMatches();
    }
  }, [activeTab, profile?.text]);

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
      const result = await axios.post(`${API}/cv/score-text`, {
        cv_text: profile.text,
        job_description: jd,
      });
      setAnalysis(result.data);
    } catch (error: unknown) {
      setAnalysisError(formatRequestError(error));
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-100 mb-2">Matches</h1>
          <p className="text-slate-400">Your saved CV powers automatic job matching and manual JD analysis.</p>
        </div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 rounded-lg border border-brand-500/30 bg-brand-500/10 px-4 py-2 text-sm font-medium text-brand-300 hover:bg-brand-500/20"
        >
          <Briefcase size={16} />
          Scrape more jobs
        </Link>
      </div>

      {hydrated && !hasCv && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
          Upload your CV on the Home tab first. Matches uses that saved CV and does not ask for a second upload.
        </div>
      )}

      {hydrated && profile && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Loaded CV</p>
            <p className="mt-1 truncate font-semibold text-slate-100">{profile.filename}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Skills</p>
            <p className="mt-1 text-2xl font-bold text-brand-400">{profile.insights.keySkills.length}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Highlights</p>
            <p className="mt-1 text-2xl font-bold text-slate-100">{profile.insights.experienceHighlights.length}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Publications</p>
            <p className="mt-1 text-2xl font-bold text-slate-100">{profile.insights.publications.length}</p>
          </div>
        </div>
      )}

      <div className="flex w-fit flex-wrap gap-2 rounded-full border border-slate-700 bg-slate-900/60 p-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-brand-500 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "jobs" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Automatic job matches</h2>
                <p className="text-sm text-slate-400">Scores are computed against your saved CV text.</p>
              </div>
              <button
                onClick={loadMatches}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Sparkles size={16} />
                Refresh
              </button>
            </div>

            {jobError && <p className="mt-4 text-sm text-red-300">{jobError}</p>}

            {loadingJobs ? (
              <div className="mt-6 flex items-center gap-3 text-slate-300">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                Matching your CV against scraped jobs...
              </div>
            ) : sortedJobMatches.length === 0 ? (
              <div className="mt-6 rounded-lg border border-dashed border-slate-600 p-8 text-center text-slate-400">
                No scraped jobs yet. Use the Jobs tab to bring in LinkedIn and Indeed results.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {sortedJobMatches.map((job) => {
                  const score = job.analysis?.overall ?? job.match_score ?? 0;

                  return (
                    <div key={job.id} className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-100">{job.title}</p>
                          <p className="text-sm text-slate-400">{job.company}</p>
                          <p className="mt-1 text-xs text-slate-500">{job.location || "Location not listed"}</p>
                        </div>
                        <div className="rounded-full bg-brand-500/15 px-3 py-1 text-sm font-semibold text-brand-300">
                          {Math.round(score * 100)}%
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                        <span className="rounded-full bg-slate-800 px-3 py-1">{job.analysis?.confidence_label ?? "Pending"}</span>
                        {typeof job.analysis?.keyword_overlap === "number" && (
                          <span className="rounded-full bg-slate-800 px-3 py-1">
                            Keyword overlap {Math.round(job.analysis.keyword_overlap * 100)}%
                          </span>
                        )}
                        {job.status && <span className="rounded-full bg-slate-800 px-3 py-1">{job.status}</span>}
                      </div>
                      {job.url && (
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-brand-300 hover:text-brand-200">
                          Open listing
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-100">CV Snapshot</h3>
            {profile ? (
              <div className="space-y-5 text-sm text-slate-300">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Key Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.insights.keySkills.length > 0 ? profile.insights.keySkills.map((skill) => (
                      <span key={skill} className="rounded-full bg-brand-500/15 px-3 py-1 text-xs text-brand-200">
                        {skill}
                      </span>
                    )) : <span className="text-slate-400">No clear skills detected.</span>}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Experience Highlights</p>
                  <ul className="space-y-2">
                    {profile.insights.experienceHighlights.slice(0, 4).map((line, index) => (
                      <li key={`${line}-${index}`}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Publications</p>
                  <ul className="space-y-2">
                    {profile.insights.publications.slice(0, 4).map((line, index) => (
                      <li key={`${line}-${index}`}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">Upload a CV on Home to enable match scoring.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/30 p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">JD Analyzer</h2>
              <p className="text-sm text-slate-400">Use your saved CV to score a specific job description.</p>
            </div>
            <textarea
              placeholder="Paste the full job description here..."
              value={jd}
              onChange={(event) => setJd(event.target.value)}
              className="h-80 w-full resize-none rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              disabled={!hasCv}
            />
            {analysisError && <p className="text-sm text-red-300">{analysisError}</p>}
            <button
              onClick={analyze}
              disabled={analysisLoading || !hasCv}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 font-semibold text-white transition-all hover:from-brand-600 hover:to-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={18} />
              {analysisLoading ? "Analyzing..." : "Analyze Match"}
            </button>
            {!hasCv && <p className="text-sm text-slate-400">Upload your CV on Home to unlock this tab.</p>}
          </div>
          <div className="space-y-6">
            {analysis ? (
              <MatchViz data={analysis} />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/30 p-8 text-center text-slate-400">
                Your JD match will appear here.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
