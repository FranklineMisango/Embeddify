"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BookOpen, CheckCircle2, FileText, Loader, MapPin, Quote, RefreshCw, Sparkles, Target } from "lucide-react";
import axios from "axios";
import { useCvProfile } from "@/components/CvProvider";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SENIORITY_OPTIONS = [
  { value: "any", label: "Any level" },
  { value: "internship", label: "Internship" },
  { value: "entry", label: "Entry level" },
  { value: "mid", label: "Mid level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead / Principal" },
] as const;

type StrategyEvidence = {
  sourceId: string;
  quote: string;
  whyItMatters: string;
};

type StrategyAnalysis = {
  targetRole: string;
  bestTemplateVariant: string;
  bestTemplateLabel: string;
  variantRationale: string;
  resumeSentiment: {
    tone: string;
    confidence: number;
    notes: string;
  };
  marketSentiment: {
    tone: string;
    confidence: number;
    notes: string;
  };
  focusNotes: string[];
  targetRecommendation: string;
  similarResumeSignals: string[];
  jobRequirements: string[];
  evidence: StrategyEvidence[];
  actionPlan: string[];
  caveats: string[];
};

function SentimentPill({ tone }: { tone: string }) {
  const map: Record<string, string> = {
    positive: "bg-green-500/15 text-green-200 border-green-500/20",
    strong: "bg-green-500/15 text-green-200 border-green-500/20",
    mixed: "bg-amber-500/15 text-amber-200 border-amber-500/20",
    competitive: "bg-amber-500/15 text-amber-200 border-amber-500/20",
    neutral: "bg-slate-500/15 text-slate-200 border-slate-500/20",
    "gap-heavy": "bg-red-500/15 text-red-200 border-red-500/20",
    uncertain: "bg-slate-500/15 text-slate-200 border-slate-500/20",
    niche: "bg-blue-500/15 text-blue-200 border-blue-500/20",
  };

  return <span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${map[tone] ?? map.neutral}`}>{tone}</span>;
}

export default function DocumentsPage() {
  const { profile, hydrated } = useCvProfile();
  const [targetRole, setTargetRole] = useState("");
  const [isTargetRoleManuallySet, setIsTargetRoleManuallySet] = useState(false);
  const [location, setLocation] = useState("Worldwide");
  const [seniority, setSeniority] = useState<(typeof SENIORITY_OPTIONS)[number]["value"]>("any");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<StrategyAnalysis | null>(null);

  const hasCv = Boolean(profile?.text);
  const currentSkills = profile?.insights.keySkills ?? [];
  const currentHighlights = profile?.insights.experienceHighlights ?? [];
  const currentSections = profile?.insights.sectionsDetected ?? [];

  const resumeSnapshot = useMemo(() => {
    return {
      filename: profile?.filename ?? "No resume loaded",
      textPreview: profile?.textPreview ?? "Upload your current CV on Home to begin.",
      pageCount: profile?.pageCount ?? 0,
      textLength: profile?.textLength ?? 0,
    };
  }, [profile]);

  useEffect(() => {
    // Only auto-fill if not manually set
    if (!profile || isTargetRoleManuallySet) {
      return;
    }

    const haystack = `${profile.filename} ${profile.textPreview} ${(profile.insights.keySkills ?? []).join(" ")} ${(profile.insights.sectionsDetected ?? []).join(" ")}`.toLowerCase();

    if (haystack.includes("quant")) {
      setTargetRole("Quantitative Developer");
    } else if (haystack.includes("research")) {
      setTargetRole("Research Scientist");
    } else if (haystack.includes("supply") || haystack.includes("power bi") || haystack.includes("tableau")) {
      setTargetRole("Business Intelligence Analyst");
    } else if (haystack.includes("machine learning") || haystack.includes("data science") || haystack.includes("analytics")) {
      setTargetRole("Data Scientist");
    }
  }, [profile, isTargetRoleManuallySet]);

  const generateStrategy = async () => {
    if (!profile?.text) {
      setError("Upload your CV on Home first.");
      return;
    }

    if (!targetRole.trim()) {
      setError("Enter a target role before generating strategy.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API}/cv/target-strategy`, {
        cv_text: profile.text,
        target_role: targetRole.trim(),
        location: location.trim() || "worldwide",
        seniority,
      });

      setAnalysis(response.data.analysis ?? null);
    } catch (requestError) {
      console.error("Documents strategy failed:", requestError);
      setError("Could not generate strategy. Check the backend logs and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (hydrated && !hasCv) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-100 mb-2">Documents</h1>
          <p className="text-slate-400">Your current resume is the source. Upload it first to generate a target-role strategy.</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-100">
          Upload your CV on the Home tab to unlock the strategy analysis, focus notes, and cited recommendations.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold text-slate-100 mb-2">Documents</h1>
          <p className="text-slate-400">Current resume is the source. Target role drives the analysis, style suggestions, and focus notes.</p>
        </div>

        <button
          onClick={generateStrategy}
          disabled={loading || !hasCv}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:from-brand-600 hover:to-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
          Generate strategy
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6 rounded-xl border border-slate-700 bg-slate-800/30 p-6">
          <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/40 p-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Target role</label>
              <input
                value={targetRole}
                onChange={(event) => {
                  setTargetRole(event.target.value);
                  setIsTargetRoleManuallySet(true);
                }}
                placeholder="e.g. Quantitative Developer, Research Scientist, Data Scientist"
                className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <MapPin size={14} className="text-slate-400" />
                  Location
                </span>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Worldwide, London, Remote, etc."
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-300">Seniority</span>
                <select
                  value={seniority}
                  onChange={(event) => setSeniority(event.target.value as (typeof SENIORITY_OPTIONS)[number]["value"])}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {SENIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              onClick={generateStrategy}
              disabled={loading || !targetRole.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm font-semibold text-brand-200 transition-all hover:border-brand-500/50 hover:bg-brand-500/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Target size={16} />
              Generate focus notes and recommendation
            </button>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="rounded-lg border border-brand-500/20 bg-brand-500/10 p-4 text-sm text-slate-200">
              <p className="font-semibold text-brand-300">Source resume</p>
              <p className="mt-1 text-slate-300">{resumeSnapshot.filename}</p>
              <p className="mt-1 text-xs text-slate-400">{resumeSnapshot.pageCount} pages • {resumeSnapshot.textLength} characters</p>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/40 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-brand-500/15 p-3 text-brand-300">
                <BookOpen size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Current Resume Snapshot</h2>
                <p className="text-sm text-slate-400">This is the working source the agent will analyze.</p>
              </div>
            </div>

            <p className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-sm leading-6 text-slate-300">
              {resumeSnapshot.textPreview}
            </p>

            <section>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Extracted skills</p>
              <div className="flex flex-wrap gap-2">
                {currentSkills.length > 0 ? currentSkills.slice(0, 16).map((skill) => (
                  <span key={skill} className="rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs text-brand-200">
                    {skill}
                  </span>
                )) : (
                  <span className="text-sm text-slate-500">No skills extracted yet.</span>
                )}
              </div>
            </section>

            <section>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Top highlights</p>
              <ul className="space-y-2 text-sm text-slate-300">
                {currentHighlights.length > 0 ? currentHighlights.slice(0, 4).map((item, index) => (
                  <li key={`${item}-${index}`} className="flex gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-400" />
                    <span>{item}</span>
                  </li>
                )) : (
                  <li className="text-slate-500">No extracted highlights yet.</li>
                )}
              </ul>
            </section>

            <section>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Detected sections</p>
              <div className="flex flex-wrap gap-2">
                {currentSections.length > 0 ? currentSections.map((section) => (
                  <span key={section} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {section}
                  </span>
                )) : (
                  <span className="text-sm text-slate-500">No sections detected yet.</span>
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="space-y-6 rounded-xl border border-slate-700 bg-slate-800/30 p-6">
          {loading ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 rounded-xl border border-slate-700 bg-slate-950/40 p-8 text-center">
              <Loader className="animate-spin text-brand-500" size={32} />
              <div>
                <p className="text-lg font-semibold text-slate-100">Building a target strategy…</p>
                <p className="mt-1 text-sm text-slate-400">Reading your current resume, comparing a similar template, and pulling live job signals.</p>
              </div>
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 to-brand-500/5 p-6">
                <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-100">{analysis.targetRole}</h2>
                    <p className="text-sm text-slate-400">Best template match: {analysis.bestTemplateLabel}</p>
                  </div>
                  <SentimentPill tone={analysis.resumeSentiment.tone} />
                </div>
                <p className="text-sm leading-6 text-slate-300">{analysis.variantRationale}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Resume sentiment</p>
                  <div className="flex items-center gap-3">
                    <SentimentPill tone={analysis.resumeSentiment.tone} />
                    <span className="text-sm text-slate-400">Confidence {analysis.resumeSentiment.confidence}%</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{analysis.resumeSentiment.notes}</p>
                </div>

                <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Market sentiment</p>
                  <div className="flex items-center gap-3">
                    <SentimentPill tone={analysis.marketSentiment.tone} />
                    <span className="text-sm text-slate-400">Confidence {analysis.marketSentiment.confidence}%</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{analysis.marketSentiment.notes}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-5">
                <div className="flex items-center gap-2 mb-3 text-brand-300">
                  <Sparkles size={16} />
                  <h3 className="font-semibold text-slate-100">Auto-generated focus notes</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.focusNotes.map((note, index) => (
                    <li key={`${note}-${index}`} className="flex gap-2 text-sm text-slate-300">
                      <span className="text-brand-400 mt-1">→</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-5">
                <h3 className="mb-3 font-semibold text-slate-100">Target recommendation</h3>
                <p className="text-sm leading-6 text-slate-300">{analysis.targetRecommendation}</p>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-5">
                  <h3 className="mb-3 font-semibold text-slate-100">Similar resume signals</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.similarResumeSignals.map((signal, index) => (
                      <span key={`${signal}-${index}`} className="rounded-full bg-brand-500/10 px-3 py-1 text-xs text-brand-200">
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-5">
                  <h3 className="mb-3 font-semibold text-slate-100">Job requirements surfaced</h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {analysis.jobRequirements.map((requirement, index) => (
                      <li key={`${requirement}-${index}`} className="flex gap-2">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-400" />
                        <span>{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-5">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-100">
                  <Quote size={16} className="text-brand-300" />
                  Evidence and citations
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {analysis.evidence.map((item, index) => (
                    <div key={`${item.sourceId}-${index}`} className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                        <span className="text-xs uppercase tracking-wide text-brand-300">{item.sourceId}</span>
                        <span className="text-xs text-slate-500">Citation {index + 1}</span>
                      </div>
                      <p className="text-sm leading-6 text-slate-200">“{item.quote}”</p>
                      <p className="mt-2 text-xs leading-5 text-slate-400">{item.whyItMatters}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-5">
                  <h3 className="mb-3 font-semibold text-slate-100">Action plan</h3>
                  <ol className="space-y-2 text-sm text-slate-300">
                    {analysis.actionPlan.map((step, index) => (
                      <li key={`${step}-${index}`} className="flex gap-3">
                        <span className="font-semibold text-brand-400">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-5">
                  <h3 className="mb-3 font-semibold text-slate-100">Caveats</h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {analysis.caveats.map((item, index) => (
                      <li key={`${item}-${index}`} className="flex gap-2">
                        <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 rounded-xl border border-slate-700 bg-slate-950/40 p-8 text-center">
              <div className="rounded-full bg-brand-500/10 p-4 text-brand-300">
                <Target size={30} />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-100">Deep target-role analysis</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">Generate focus notes, sentiment, cited evidence, a similar template reference, and a concrete action plan for the role you want.</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
                Your current resume is the source. The target role becomes the analysis focus.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
