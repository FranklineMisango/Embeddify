"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import KanbanBoard from "@/components/KanbanBoard";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const STATUSES = ["scraped", "applied", "interview", "offer", "rejected"];

export default function Dashboard() {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    axios.get(`${API}/jobs/`).then((r) => setJobs(r.data));
  }, []);

  const updateStatus = async (id: number, status: string) => {
    await axios.patch(`${API}/jobs/${id}/status`, { status });
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
  };

  const byStatus = (s: string) => jobs.filter((j) => j.status === s);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Job Tracker</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((s) => (
          <KanbanBoard key={s} status={s} jobs={byStatus(s)} onStatusChange={updateStatus} />
        ))}
      </div>
    </div>
  );
}
