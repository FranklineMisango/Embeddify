"use client";
import { useState, useEffect, useCallback } from "react";
import { MapPin, ExternalLink, Loader, Sparkles, CheckCircle2, AlertCircle, Zap, RefreshCw } from "lucide-react";
import axios from "axios";
import { useCvProfile } from "@/components/CvProvider";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const LEVELS = [
  { value: "any", label: "Any Level" },
  { value: "internship", label: "Internship" },
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid-Level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead/Principal" },
];

// ─── Comprehensive analysis panel (same as match page) ───────────────────────

function ComprehensiveAnalysis({ analysis }: { analysis: any }) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-brand-500/10 to-brand-500/5 border border-brand-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-100">Overall Match</h2>
          <span className="text-5xl font-bold text-brand-400">{analysis.overallMatch}%</span>
        </div>
        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400" style={{ width: `${analysis.overallMatch}%` }} />
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

      {analysis.matchScore && (
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(analysis.matchScore).map(([key, score]: [string, any]) => (
            <div key={key} className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
              <p className="text-xs text-slate-400 uppercase mb-2">{key}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-slate-100">{score}%</span>
                <div className="w-12 h-12 rounded-full border-2 border-slate-700 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full" style={{ background: `conic-gradient(from 0deg, rgb(99 102 241) 0deg ${score * 3.6}deg, rgb(51 65 85) ${score * 3.6}deg)` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
                <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400" style={{ width: `${data.match}%` }} />
              </div>
              <p className="text-sm text-slate-300">{data.details}</p>
            </div>
          ))}
        </div>
      )}

      {analysis.matchedSkills?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-green-400" />
            Matched Skills ({analysis.matchedSkills.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {analysis.matchedSkills.map((skill: string, idx: number) => (
              <span key={idx} className="bg-green-500/15 text-green-200 text-sm px-3 py-1 rounded-full">{skill}</span>
            ))}
          </div>
        </div>
      )}

      {analysis.missingSkills?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <AlertCircle size={20} className="text-red-400" />
            Missing Skills ({analysis.missingSkills.length})
          </h3>
          <div className="space-y-2">
            {analysis.missingSkills.map((skill: any, idx: number) => (
              <div key={idx} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-200 font-medium">{typeof skill === "string" ? skill : skill.skill}</p>
                {typeof skill === "object" && skill.importance && (
                  <p className="text-xs text-red-300 mt-1">Importance: {skill.importance}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
                <span>{typeof win === "string" ? win : JSON.stringify(win)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
                <span>{typeof gap === "string" ? gap : JSON.stringify(gap)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
                <span>{typeof rec === "string" ? rec : rec.recommendation || JSON.stringify(rec)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.interviewTopics?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-100 mb-3">Interview Preparation Topics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {analysis.interviewTopics.map((topic: any, idx: number) => (
              <div key={idx} className="bg-slate-800/30 border border-slate-700 rounded-lg p-3">
                <p className="text-slate-300 text-sm">{typeof topic === "string" ? topic : JSON.stringify(topic)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.nextSteps?.length > 0 && (
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-3">Next Steps</h3>
          <ol className="space-y-2">
            {analysis.nextSteps.map((step: any, idx: number) => (
              <li key={idx} className="flex gap-3 text-slate-300">
                <span className="font-semibold text-brand-400">{idx + 1}.</span>
                <span>{typeof step === "string" ? step : JSON.stringify(step)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function JobSearchPage() {
  const { profile, hydrated } = useCvProfile();

  // Search setup + filters
  const [searchConfigured, setSearchConfigured] = useState(false);
  const [location, setLocation] = useState("");
  const [level, setLevel] = useState("");
  const [locationInput, setLocationInput] = useState("");

  // Results
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inferredPersona, setInferredPersona] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Selected job + analysis
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showDescription, setShowDescription] = useState(false);
  const [fullDescription, setFullDescription] = useState<string | null>(null);
  const [fetchingDescription, setFetchingDescription] = useState(false);

  // ── Core search function ──────────────────────────────────────────────────
  const runSearch = useCallback(async (loc: string, lvl: string) => {
    if (!profile) return;

    setLoading(true);
    setSearchError(null);
    setJobs([]);
    setSelectedJob(null);
    setAnalysis(null);
    setInferredPersona(null);

    try {
      const response = await axios.post(`${API}/job-search/search-and-rank`, {
        skills: profile.insights.keySkills,
        location: loc || "worldwide",
        level: lvl || "any",
        job_title: profile.filename,
        cv_text: profile.text,
      });
      setJobs(response.data.jobs || []);
      if (response.data.persona) setInferredPersona(response.data.persona);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // ── Auto-search only after the user has explicitly configured the search ──
  useEffect(() => {
    if (hydrated && profile && searchConfigured) {
      runSearch(location, level);
    }
  }, [hydrated, profile, searchConfigured, location, level]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter handlers ───────────────────────────────────────────────────────
  const applyLocation = () => {
    const loc = locationInput.trim();
    setLocation(loc);
    if (searchConfigured) {
      runSearch(loc, level);
    }
  };

  const applyLevel = (lvl: string) => {
    setLevel(lvl);
    if (searchConfigured) {
      runSearch(location, lvl);
    }
  };

  const startSearch = () => {
    const loc = locationInput.trim();
    if (!loc || !level) {
      return;
    }

    setLocation(loc);
    setSearchConfigured(true);
    runSearch(loc, level);
  };

  // ── Job analysis ──────────────────────────────────────────────────────────
  const handleAnalyzeJob = async (job: any) => {
    if (!profile) return;
    setSelectedJob(job);
    setAnalyzing(true);
    setAnalysis(null);
    setShowDescription(false);
    setFullDescription(null);

    try {
      let jobDescription = job.snippet;
      try {
        const descRes = await axios.post(`${API}/job-search/fetch-job-description`, { url: job.url });
        if (descRes.data.status === "success") jobDescription = descRes.data.description;
      } catch { /* use snippet fallback */ }

      const res = await axios.post(`${API}/job-search/analyze-jd`, {
        cv_text: profile.text,
        job_description: jobDescription,
        job_title: job.title,
        company: job.company,
      });
      setAnalysis(res.data.analysis);
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleShowDescription = async (job: any) => {
    if (fullDescription) { setShowDescription(v => !v); return; }
    setFetchingDescription(true);
    try {
      const res = await axios.post(`${API}/job-search/fetch-job-description`, { url: job.url });
      setFullDescription(res.data.status === "success" ? res.data.description : job.snippet);
      setShowDescription(true);
    } catch {
      setFullDescription(job.snippet);
      setShowDescription(true);
    } finally {
      setFetchingDescription(false);
    }
  };

  // ── No CV state ───────────────────────────────────────────────────────────
  if (hydrated && !profile) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-100 mb-2">Job Search</h1>
          <p className="text-slate-400">Find opportunities tailored to your skills and experience</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-100">
          Upload your CV on the Home tab first to enable automatic job search.
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-100 mb-2">Job Search</h1>
          <p className="text-slate-400">
            {inferredPersona
              ? <>Showing results for <span className="text-brand-400 font-medium">{inferredPersona}</span></>
              : "Finding opportunities tailored to your CV…"}
          </p>
        </div>
        <button
          onClick={() => runSearch(location, level)}
          disabled={loading || !searchConfigured}
          title="Refresh results"
          className="mt-1 p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-100 hover:border-slate-500 disabled:opacity-40 transition-all"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {!searchConfigured ? (
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Set your search preferences</h2>
            <p className="text-sm text-slate-400 mt-1">Choose a location and seniority level before we query the job engine.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-sm text-slate-300 flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" />
                Location
              </span>
              <input
                type="text"
                placeholder="e.g. London, Remote, New York"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startSearch()}
                className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500/70"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">Seniority level</span>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500/70"
              >
                <option value="" disabled>Select a seniority level</option>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-slate-500">You can refine location and level after the first search.</p>
            <button
              onClick={startSearch}
              disabled={!locationInput.trim() || !level || loading}
              className="bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white rounded-lg px-5 py-2.5 font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Search jobs
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {/* Location */}
          <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2">
            <MapPin size={15} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Location"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyLocation()}
              className="bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none w-44"
            />
            {locationInput.trim() && locationInput.trim() !== location && (
              <button
                onClick={applyLocation}
                className="text-xs text-brand-400 hover:text-brand-300 font-medium shrink-0"
              >
                Apply
              </button>
            )}
            {location && (
              <button
                onClick={() => { setLocationInput(""); setLocation(""); runSearch("", level); }}
                className="text-xs text-slate-500 hover:text-slate-300 shrink-0"
              >
                ✕
              </button>
            )}
          </div>

          {/* Level chips */}
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                onClick={() => applyLevel(l.value)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all disabled:opacity-50 ${
                  level === l.value
                    ? "bg-brand-500 border-brand-500 text-white"
                    : "bg-slate-800/50 border-slate-700 text-slate-300 hover:border-brand-500/60 hover:text-slate-100"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job list */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <p className="text-sm font-medium text-slate-400 mb-3">
              {loading ? "Searching…" : `${jobs.length} jobs found`}
            </p>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader className="animate-spin text-brand-500" size={28} />
                <p className="text-xs text-slate-400 text-center">
                  Analyzing your CV and finding the best matches…
                </p>
              </div>
            ) : searchError ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-red-400 text-sm">{searchError}</p>
                <button onClick={() => runSearch(location, level)} className="text-xs text-brand-400 hover:underline">
                  Try again
                </button>
              </div>
            ) : jobs.length > 0 ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {jobs.map((job, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnalyzeJob(job)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedJob?.url === job.url
                        ? "bg-brand-500/20 border-brand-500"
                        : "bg-slate-900/40 border-slate-700 hover:border-brand-500/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-100 line-clamp-2 text-sm">{job.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{job.company}</p>
                      </div>
                      {job.ai_match_score && (
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-brand-400">{job.ai_match_score}%</p>
                          <p className="text-xs text-slate-500">match</p>
                        </div>
                      )}
                    </div>
                    {job.ai_reason && (
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{job.ai_reason}</p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-12 text-sm">No jobs found. Try adjusting the filters.</p>
            )}
          </div>
        </div>

        {/* Detail / analysis panel */}
        <div className="lg:col-span-2">
          {selectedJob ? (
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 space-y-4">
              {/* Job header */}
              <div className="border-b border-slate-700 pb-4">
                <h3 className="text-xl font-semibold text-slate-100">{selectedJob.title}</h3>
                <p className="text-slate-400 mt-1">{selectedJob.company}</p>
                <div className="flex items-center gap-3 mt-3">
                  <a
                    href={selectedJob.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 text-sm"
                  >
                    View Full Job <ExternalLink size={13} />
                  </a>
                  <button
                    onClick={() => handleShowDescription(selectedJob)}
                    disabled={fetchingDescription}
                    className="ml-auto inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-300 text-sm disabled:opacity-50"
                  >
                    {fetchingDescription ? "Loading…" : showDescription ? "Hide" : "Show"} Description
                  </button>
                </div>
              </div>

              {showDescription && (
                <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-700">
                  <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Job Description</p>
                  <div className="max-h-64 overflow-y-auto text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {fullDescription || selectedJob.snippet}
                  </div>
                </div>
              )}

              {analyzing ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader className="animate-spin text-brand-500" size={32} />
                  <p className="text-slate-300 text-sm">Analyzing job match…</p>
                </div>
              ) : analysis ? (
                <ComprehensiveAnalysis analysis={analysis} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <p className="text-slate-400 text-sm">Get a detailed breakdown of how well you match this role.</p>
                  <button
                    onClick={() => handleAnalyzeJob(selectedJob)}
                    className="bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white rounded-lg px-6 py-2.5 font-semibold transition-all flex items-center gap-2 text-sm"
                  >
                    <Sparkles size={16} />
                    Analyze Match
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center min-h-96 gap-3">
              {loading ? (
                <>
                  <Loader className="animate-spin text-brand-500" size={32} />
                  <p className="text-slate-400 text-sm">Finding your best matches…</p>
                </>
              ) : (
                <p className="text-slate-400 text-sm">Select a job from the list to view details and run a match analysis.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
