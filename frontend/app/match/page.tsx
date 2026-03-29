"use client";
import { useState } from "react";
import axios from "axios";
import MatchViz from "@/components/MatchViz";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const VARIANTS = ["data_science", "quant", "bi_sc", "research", "full"];

export default function MatchPage() {
  const [jd, setJd] = useState("");
  const [variant, setVariant] = useState("data_science");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const score = async () => {
    setLoading(true);
    const r = await axios.post(`${API}/cv/score`, { variant, job_description: jd });
    setResult(r.data);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Match CV to Job</h1>
      <div className="flex flex-col gap-3 mb-6">
        <select className="bg-gray-800 rounded-lg px-4 py-2 text-sm"
          value={variant} onChange={(e) => setVariant(e.target.value)}>
          {VARIANTS.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <textarea className="bg-gray-800 rounded-lg px-4 py-2 text-sm h-40 resize-none"
          placeholder="Paste job description here..."
          value={jd} onChange={(e) => setJd(e.target.value)} />
        <button onClick={score} disabled={loading || !jd}
          className="bg-brand-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium">
          {loading ? "Analyzing..." : "Score Match"}
        </button>
      </div>
      {result && <MatchViz data={result} />}
    </div>
  );
}
