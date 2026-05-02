"use client";

import { useState } from "react";
import { Download, FileText, Sparkles, Trash2 } from "lucide-react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const VARIANTS = ["data_science", "quant", "bi_sc", "research", "full"];

type GeneratedDoc = {
  id: number;
  variant: string;
  title: string;
  date: string;
  content: string;
};

type CustomizeResponse = {
  latex: string;
  match?: {
    overall: number;
  };
};

export default function DocumentsPage() {
  const [jd, setJd] = useState("");
  const [variant, setVariant] = useState("data_science");
  const [result, setResult] = useState<CustomizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<GeneratedDoc[]>([]);

  const customize = async () => {
    setLoading(true);
    try {
      const r = await axios.post<CustomizeResponse>(`${API}/cv/customize`, {
        variant,
        job_description: jd,
      });
      setResult(r.data);

      const newDoc: GeneratedDoc = {
        id: Date.now(),
        variant,
        title: `Customized CV - ${variant}`,
        date: new Date().toLocaleDateString(),
        content: r.data.latex,
      };
      setDocuments((prev) => [newDoc, ...prev]);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const download = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  const deleteDoc = (id: number) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-100 mb-2">Documents</h1>
        <p className="text-slate-400">Create and manage customized CV versions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-slate-800/30 border border-slate-700 rounded-lg p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">CV Variant</label>
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            >
              {VARIANTS.map((v) => (
                <option key={v} value={v}>
                  {v.replace(/_/g, " ").toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Job Description</label>
            <textarea
              placeholder="Paste a job description to customize your CV for this position..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              className="w-full h-40 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-none"
            />
          </div>

          <button
            onClick={customize}
            disabled={loading || !jd}
            className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 font-semibold transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            {loading ? "Customizing..." : "Customize CV"}
          </button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {result && (
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-100">Customized LaTeX</h3>
                <button
                  onClick={() => download(result.latex, `CV_${variant}_tailored.tex`)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors"
                >
                  <Download size={16} />
                  Download .tex
                </button>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words">
                  {result.latex.substring(0, 500)}...
                </pre>
              </div>
              {result.match && (
                <div className="mt-4 p-3 bg-brand-500/10 border border-brand-500/20 rounded-lg">
                  <p className="text-sm text-slate-300">
                    Match Score:{" "}
                    <span className="font-bold text-brand-400">
                      {Math.round(result.match.overall * 100)}%
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {documents.length > 0 && (
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Saved Documents</h3>
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="text-brand-400 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-medium text-slate-100">{doc.title}</p>
                        <p className="text-xs text-slate-400">{doc.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => download(doc.content, `CV_${doc.variant}.tex`)}
                        className="p-2 text-slate-400 hover:text-brand-400 transition-colors"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => deleteDoc(doc.id)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!result && documents.length === 0 && (
            <div className="bg-slate-800/30 border border-dashed border-slate-600 rounded-lg p-8 text-center">
              <FileText className="mx-auto text-slate-600 mb-3" size={32} />
              <p className="text-slate-400">No documents yet. Create your first customized CV!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
