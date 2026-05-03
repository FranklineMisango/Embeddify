"use client";
import { useState } from "react";
import { Search, MapPin, Briefcase, ExternalLink, Loader, Sparkles, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import axios from "axios";
import { useCvProfile } from "@/components/CvProvider";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const LEVELS = [
  { value: "internship", label: "Internship" },
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid-Level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead/Principal" },
];

export default function JobSearchPage() {
  const { profile } = useCvProfile();
  const [location, setLocation] = useState("");
  const [level, setLevel] = useState("mid");
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showDescription, setShowDescription] = useState(false);
  const [fullDescription, setFullDescription] = useState<string | null>(null);
  const [fetchingDescription, setFetchingDescription] = useState(false);

  const handleSearch = async () => {
    if (!location.trim()) {
      alert("Please enter a location");
      return;
    }

    if (!profile) {
      alert("Please upload your CV first");
      return;
    }

    setLoading(true);
    setSearched(true);
    setJobs([]);
    setSelectedJob(null);
    setAnalysis(null);

    try {
      const response = await axios.post(`${API}/job-search/search`, {
        skills: profile.insights.keySkills,
        location,
        level,
      });

      setJobs(response.data.jobs || []);
    } catch (error) {
      console.error("Search failed:", error);
      alert("Job search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeJob = async (job: any) => {
    if (!profile) return;

    setSelectedJob(job);
    setAnalyzing(true);
    setAnalysis(null);

    try {
      // First, try to fetch full job description
      let jobDescription = job.snippet;
      try {
        const descResponse = await axios.post(`${API}/job-search/fetch-job-description`, {
          url: job.url,
        });
        if (descResponse.data.status === "success") {
          jobDescription = descResponse.data.description;
        }
      } catch (descErr) {
        console.warn("Could not fetch full description, using snippet:", descErr);
      }

      // Then analyze the job
      const response = await axios.post(`${API}/job-search/analyze-jd`, {
        cv_text: profile.text,
        job_description: jobDescription,
        job_title: job.title,
        company: job.company,
      });

      setAnalysis(response.data.analysis);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Job analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleShowDescription = async (job: any) => {
    if (fullDescription) {
      setShowDescription(!showDescription);
      return;
    }

    setFetchingDescription(true);
    try {
      const response = await axios.post(`${API}/job-search/fetch-job-description`, {
        url: job.url,
      });
      if (response.data.status === "success") {
        setFullDescription(response.data.description);
        setShowDescription(true);
      } else {
        setFullDescription(job.snippet);
        setShowDescription(true);
      }
    } catch (error) {
      console.error("Failed to fetch description:", error);
      setFullDescription(job.snippet);
      setShowDescription(true);
    } finally {
      setFetchingDescription(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-100 mb-2">Job Search</h1>
        <p className="text-slate-400">Find opportunities tailored to your skills and experience</p>
      </div>

      {/* Search Panel */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Location Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
            <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3">
              <MapPin size={18} className="text-slate-400" />
              <input
                type="text"
                placeholder="e.g., San Francisco, Remote, New York"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Level Select */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Experience Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-brand-500"
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading || !profile}
              className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Search size={18} />
              {loading ? "Searching..." : "Search Jobs"}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {searched && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Jobs List */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">
                {loading ? "Searching..." : `Found ${jobs.length} Jobs`}
              </h2>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="animate-spin text-brand-500" size={24} />
                </div>
              ) : jobs.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
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
                      <p className="font-medium text-slate-100 line-clamp-2">{job.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{job.company}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">No jobs found. Try different search criteria.</p>
              )}
            </div>
          </div>

          {/* Analysis Panel */}
          <div className="lg:col-span-2">
            {selectedJob ? (
              <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 space-y-4">
                {/* Job Header */}
                <div className="border-b border-slate-700 pb-4">
                  <h3 className="text-xl font-semibold text-slate-100">{selectedJob.title}</h3>
                  <p className="text-slate-400 mt-1">{selectedJob.company}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <a
                      href={selectedJob.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 text-sm"
                    >
                      View Full Job <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => handleShowDescription(selectedJob)}
                      disabled={fetchingDescription}
                      className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-300 text-sm ml-auto disabled:opacity-50"
                    >
                      {fetchingDescription ? "Loading..." : showDescription ? "Hide" : "Show"} Description
                    </button>
                  </div>
                </div>

                {/* Job Description Preview */}
                {showDescription && (
                  <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-700">
                    <p className="text-xs font-medium text-slate-400 mb-2">JOB DESCRIPTION</p>
                    <div className="max-h-64 overflow-y-auto text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                      <p>{fullDescription || selectedJob.snippet}</p>
                    </div>
                  </div>
                )}

                {/* Analysis Loading */}
                {analyzing ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader className="animate-spin text-brand-500 mx-auto mb-4" size={32} />
                      <p className="text-slate-300">Analyzing job match...</p>
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
                          {analysis.matchedSkills.map((skill: string, idx: number) => (
                            <span key={idx} className="bg-green-500/15 text-green-200 text-sm px-3 py-1 rounded-full">
                              {skill}
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
                              <p className="text-red-200 font-medium">{typeof skill === 'string' ? skill : skill.skill}</p>
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
                  <div className="flex items-center justify-center py-12 text-slate-400">
                    <p>Click "Analyze" to see detailed match analysis</p>
                  </div>
                )}

                {/* Analyze Button */}
                {!analysis && !analyzing && (
                  <button
                    onClick={() => handleAnalyzeJob(selectedJob)}
                    className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white rounded-lg px-6 py-3 font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Sparkles size={18} />
                    Analyze Match
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 flex items-center justify-center min-h-96">
                <p className="text-slate-400">Select a job to view details and analysis</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
