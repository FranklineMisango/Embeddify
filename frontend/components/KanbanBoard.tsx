"use client";
import clsx from "clsx";

const STATUS_COLORS: Record<string, string> = {
  scraped: "border-gray-600",
  applied: "border-blue-500",
  interview: "border-yellow-500",
  offer: "border-green-500",
  rejected: "border-red-500",
};

const CONF_COLOR = (score: number | null) => {
  if (!score) return "bg-gray-700";
  if (score >= 0.8) return "bg-blue-600";
  if (score >= 0.65) return "bg-cyan-500";
  if (score >= 0.5) return "bg-yellow-400 text-gray-900";
  if (score >= 0.35) return "bg-orange-500";
  return "bg-red-600";
};

export default function KanbanBoard({ status, jobs, onStatusChange }: {
  status: string; jobs: any[]; onStatusChange: (id: number, s: string) => void;
}) {
  return (
    <div className={clsx("min-w-[220px] bg-gray-900 rounded-xl border-t-2 p-3", STATUS_COLORS[status])}>
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
        {status} <span className="text-gray-600">({jobs.length})</span>
      </div>
      <div className="flex flex-col gap-2">
        {jobs.map((job) => (
          <div key={job.id} className="bg-gray-800 rounded-lg p-3 text-sm">
            <div className="font-medium text-white truncate">{job.title}</div>
            <div className="text-gray-400 text-xs truncate">{job.company}</div>
            <div className="text-gray-500 text-xs">{job.location}</div>
            {job.match_score != null && (
              <span className={clsx("inline-block mt-2 px-2 py-0.5 rounded text-xs font-bold", CONF_COLOR(job.match_score))}>
                {Math.round(job.match_score * 100)}% match
              </span>
            )}
            <select
              className="mt-2 w-full bg-gray-700 text-gray-300 text-xs rounded px-1 py-0.5"
              value={status}
              onChange={(e) => onStatusChange(job.id, e.target.value)}
            >
              {["scraped","applied","interview","offer","rejected"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
