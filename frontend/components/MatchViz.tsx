"use client";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import clsx from "clsx";

// AlphaFold-inspired confidence color scale
const confColor = (score: number) => {
  if (score >= 0.80) return { bg: "bg-blue-600", label: "Very High", hex: "#2563eb" };
  if (score >= 0.65) return { bg: "bg-cyan-500", label: "High", hex: "#06b6d4" };
  if (score >= 0.50) return { bg: "bg-yellow-400", label: "Medium", hex: "#facc15" };
  if (score >= 0.35) return { bg: "bg-orange-500", label: "Low", hex: "#f97316" };
  return { bg: "bg-red-600", label: "Very Low", hex: "#dc2626" };
};

export default function MatchViz({ data }: { data: any }) {
  const overall = data.overall ?? 0;
  const conf = confColor(overall);
  const sections = data.sections ?? {};

  const radarData = Object.entries(sections).map(([key, val]) => ({
    section: key.charAt(0).toUpperCase() + key.slice(1),
    score: Math.round((val as number) * 100),
  }));

  return (
    <div className="bg-gray-900 rounded-2xl p-6 space-y-6">
      {/* Overall score — AlphaFold pTM style */}
      <div className="flex items-center gap-6">
        <div className={clsx("w-24 h-24 rounded-full flex flex-col items-center justify-center font-bold text-white", conf.bg)}>
          <span className="text-2xl">{Math.round(overall * 100)}</span>
          <span className="text-xs opacity-80">/ 100</span>
        </div>
        <div>
          <div className="text-lg font-semibold">{conf.label} Match</div>
          <div className="text-gray-400 text-sm">Keyword overlap: {Math.round((data.keyword_overlap ?? 0) * 100)}%</div>
        </div>
      </div>

      {/* Per-section confidence bars — like pLDDT per residue */}
      <div>
        <div className="text-sm font-medium text-gray-400 mb-3">Section Confidence</div>
        <div className="space-y-2">
          {Object.entries(sections).map(([sec, val]) => {
            const pct = Math.round((val as number) * 100);
            const c = confColor(val as number);
            return (
              <div key={sec} className="flex items-center gap-3">
                <div className="w-24 text-xs text-gray-400 capitalize">{sec}</div>
                <div className="flex-1 bg-gray-800 rounded-full h-3">
                  <div className={clsx("h-3 rounded-full transition-all", c.bg)} style={{ width: `${pct}%` }} />
                </div>
                <div className="w-10 text-xs text-right text-gray-400">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Radar chart */}
      {radarData.length > 0 && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="section" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Radar dataKey="score" stroke={conf.hex} fill={conf.hex} fillOpacity={0.25} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 flex-wrap text-xs">
        {[["Very High ≥80", "bg-blue-600"], ["High ≥65", "bg-cyan-500"], ["Medium ≥50", "bg-yellow-400"],
          ["Low ≥35", "bg-orange-500"], ["Very Low <35", "bg-red-600"]].map(([label, bg]) => (
          <span key={label} className="flex items-center gap-1 text-gray-400">
            <span className={clsx("w-3 h-3 rounded-sm inline-block", bg)} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}
