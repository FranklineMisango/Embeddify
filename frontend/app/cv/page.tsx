"use client";
import { useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const VARIANTS = ["data_science", "quant", "bi_sc", "research", "full"];

export default function CVBuilderPage() {
  const [jd, setJd] = useState("");
  const [variant, setVariant] = useState("data_science");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const customize = async () => {
    setLoading(true);
    const r = await axios.post(`${API}/cv/customize`, { variant, job_description: jd });
    setResult(r.data);
    setLoading(false);
  };

  const download = () => {
    const blob = new Blob([result.latex], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `CV_${variant}_tailored.tex`;
    a.click();
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">AI CV Customizer</h1>
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <select className="bg-gray-800 rounded-lg px-4 py-2 text-sm"
            value={variant} onChange={(e) => setVariant(e.target.value)}>
            {VARIANTS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <textarea className="bg-gray-800 rounded-lg px-4 py-2 text-sm h-64 resize-none"
            placeholder="Paste job description..."
            value={jd} onChange={(e) => setJd(e.target.value)} />
          <button onClick={customize} disabled={loading || !jd}
            className="bg-brand-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium">
            {loading ? "Customizing with DeepSeek..." : "Customize CV"}
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {result && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Tailored LaTeX</span>
                <button onClick={download} className="text-xs text-brand-500 hover:underline">Download .tex</button>
              </div>
              <pre className="bg-gray-800 rounded-lg p-4 text-xs text-gray-300 overflow-auto h-64 whitespace-pre-wrap">
                {result.latex}
              </pre>
              {result.match && (
                <div className="text-sm text-gray-400">
                  Match score after customization: <span className="text-white font-bold">{Math.round(result.match.overall * 100)}%</span>
                  {" "}({result.match.confidence_label})
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
