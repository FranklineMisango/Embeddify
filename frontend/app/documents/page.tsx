"use client";

import { useMemo, useState } from "react";
import { FileText, Sparkles } from "lucide-react";

const VARIANT_OPTIONS = [
  {
    id: "data_science",
    label: "Data Science",
    summary: "Strong analytics, experiments, and model-building focus.",
    skills: ["Python", "SQL", "Machine Learning", "Experiment Design", "Dashboards"],
    bullets: [
      "Built end-to-end analytics workflows for product teams.",
      "Designed experiments and reported findings to stakeholders.",
      "Partnered with engineering to ship data products faster.",
    ],
  },
  {
    id: "quant",
    label: "Quant Research",
    summary: "Quantitative modeling, research rigor, and risk-aware thinking.",
    skills: ["Statistics", "Time Series", "Python", "Optimization", "Research"],
    bullets: [
      "Developed statistical models to evaluate trading signals.",
      "Documented methodology and backtesting assumptions clearly.",
      "Worked with research teams to refine candidate features.",
    ],
  },
  {
    id: "bi_sc",
    label: "BI / Supply Chain",
    summary: "Operations visibility, reporting, and planning improvements.",
    skills: ["Power BI", "Excel", "SQL", "Forecasting", "Process Improvement"],
    bullets: [
      "Created reporting views that improved decision speed.",
      "Analyzed operational bottlenecks and suggested process fixes.",
      "Collaborated with business teams on planning and inventory.",
    ],
  },
  {
    id: "research",
    label: "Research",
    summary: "Publication-ready work, literature review, and experimental clarity.",
    skills: ["Research", "Writing", "Python", "Analysis", "Presentation"],
    bullets: [
      "Synthesized literature and framed open research questions.",
      "Prepared experiment summaries for review and publication.",
      "Presented findings with concise visual explanations.",
    ],
  },
  {
    id: "full",
    label: "Full CV",
    summary: "Broad profile with strong academic and professional depth.",
    skills: ["Leadership", "Python", "SQL", "Research", "Delivery"],
    bullets: [
      "Balanced technical execution with stakeholder communication.",
      "Shipped work across analysis, tooling, and reporting.",
      "Kept the resume broad while keeping relevance explicit.",
    ],
  },
] as const;

type VariantId = (typeof VARIANT_OPTIONS)[number]["id"];

const getVariant = (variantId: string) => VARIANT_OPTIONS.find((variant) => variant.id === variantId) ?? VARIANT_OPTIONS[0];

export default function DocumentsPage() {
  const [variant, setVariant] = useState<VariantId>("data_science");
  const [customName, setCustomName] = useState("My Target Variant");
  const [targetRole, setTargetRole] = useState("Senior Data Scientist");
  const [focus, setFocus] = useState("Python, ML, SQL, and stakeholder impact");

  const preview = useMemo(() => {
    const selected = getVariant(variant);

    return {
      title: customName.trim() || selected.label,
      role: targetRole.trim() || selected.label,
      focus: focus.trim() || selected.summary,
      summary: selected.summary,
      skills: selected.skills,
      bullets: selected.bullets,
    };
  }, [customName, targetRole, focus, variant]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-100 mb-2">Documents</h1>
        <p className="text-slate-400">Define a variant and preview a sample CV. No auto-generated LaTeX yet.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6 rounded-xl border border-slate-700 bg-slate-800/30 p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Variant</label>
            <select
              value={variant}
              onChange={(event) => setVariant(event.target.value as VariantId)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {VARIANT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Variant Name</label>
            <input
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="My Target Variant"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Target Role</label>
            <input
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Senior Data Scientist"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Focus Notes</label>
            <textarea
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
              className="h-32 w-full resize-none rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="What should this sample CV emphasize?"
            />
          </div>

          <div className="rounded-lg border border-brand-500/20 bg-brand-500/10 p-4 text-sm text-slate-200">
            <p className="font-semibold text-brand-300">{getVariant(variant).label}</p>
            <p className="mt-1 text-slate-300">{getVariant(variant).summary}</p>
          </div>
        </div>

        <div className="space-y-6 rounded-xl border border-slate-700 bg-slate-800/30 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-brand-500/15 p-3 text-brand-300">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Sample CV Preview</h2>
              <p className="text-sm text-slate-400">{preview.role} • {preview.title}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-6">
            <div className="space-y-4 border-b border-slate-700 pb-4">
              <div>
                <p className="text-2xl font-bold text-slate-100">{preview.title}</p>
                <p className="text-sm text-slate-400">{preview.role}</p>
              </div>
              <p className="text-sm leading-6 text-slate-300">{preview.focus}</p>
            </div>

            <div className="mt-5 space-y-5">
              <section>
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Profile Summary</p>
                <p className="text-sm leading-6 text-slate-300">{preview.summary}</p>
              </section>

              <section>
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Core Skills</p>
                <div className="flex flex-wrap gap-2">
                  {preview.skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-brand-500/15 px-3 py-1 text-xs text-brand-200">
                      {skill}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Selected Experience Bullets</p>
                <ul className="space-y-2 text-sm text-slate-300">
                  {preview.bullets.map((bullet, index) => (
                    <li key={`${bullet}-${index}`} className="flex gap-2">
                      <Sparkles className="mt-0.5 shrink-0 text-brand-400" size={14} />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
