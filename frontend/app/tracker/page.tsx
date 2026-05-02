"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Eye, Trash2, ExternalLink } from "lucide-react";
import axios from "axios";
import KanbanBoard from "@/components/KanbanBoard";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const STATUSES = ["scraped", "applied", "interview", "offer", "rejected"];

export default function TrackerPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  useEffect(() => {
    axios.get(`${API}/jobs/`).then((r) => setJobs(r.data));
  }, []);

  const updateStatus = async (id: number, status: string) => {
    await axios.patch(`${API}/jobs/${id}/status`, { status });
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
  };

  const deleteJob = async (id: number) => {
    await axios.delete(`${API}/jobs/${id}`);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const byStatus = (s: string) => jobs.filter((j) => j.status === s);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-100 mb-2">Job Tracker</h1>
          <p className="text-slate-400">Track your job applications and interview progress</p>
        </div>
        <div className="flex gap-2 bg-slate-800/50 border border-slate-700 rounded-lg p-1">
          <button
            onClick={() => setView("kanban")}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              view === "kanban"
                ? "bg-brand-500 text-white"
                : "text-slate-400 hover:text-slate-100"
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              view === "list"
                ? "bg-brand-500 text-white"
                : "text-slate-400 hover:text-slate-100"
            }`}
          >
            List
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((s) => (
            <KanbanBoard key={s} status={s} jobs={byStatus(s)} onStatusChange={updateStatus} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/30 border border-slate-700 rounded-lg">
              <Clock className="mx-auto text-slate-600 mb-3" size={32} />
              <p className="text-slate-400">No jobs tracked yet. Start by scraping jobs!</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-100 mb-1">{job.title}</h3>
                    <p className="text-sm text-slate-400 mb-3">{job.company}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {job.location && (
                        <span>📍 {job.location}</span>
                      )}
                      {job.salary && (
                        <span>💰 {job.salary}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={job.status}
                      onChange={(e) => updateStatus(job.id, e.target.value)}
                      className="bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-brand-400 transition-colors"
                      >
                        <ExternalLink size={18} />
                      </a>
                    )}
                    <button
                      onClick={() => deleteJob(job.id)}
                      className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Stats Summary */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-6 border-t border-slate-700">
          {STATUSES.map((status) => {
            const count = byStatus(status).length;
            return (
              <div key={status} className="text-center">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                  {status}
                </p>
                <p className="text-2xl font-bold text-slate-100">{count}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
