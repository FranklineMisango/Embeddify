"use client";
import { useState } from "react";
import { Download, Sparkles, FileText } from "lucide-react";
import axios from "axios";
import { useCvProfile } from "@/components/CvProvider";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
// Variants are now a style hint only; use a fixed default

export default function CVBuilderPage() {
  const { profile, hydrated } = useCvProfile();
  const [jd, setJd] = useState("");
  const variant = "data_science";
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const customize = async () => {
    if (!profile?.text) {
      return;
    }

    setLoading(true);
    try {
      const r = await axios.post(`${API}/cv/customize`, { variant, cv_text: profile.text, job_description: jd });
      setResult(r.data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const download = () => {
    if (!result?.text) return;
    const blob = new Blob([result.text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `CV_${variant}_tailored.txt`;
    a.click();
  };

  if (hydrated && !profile?.text) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-100 mb-2">AI CV Customizer</h1>
          <p className="text-slate-400">Upload a CV on the Home tab first. The customizer now works directly from your extracted CV text.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-100 mb-2">AI CV Customizer</h1>
        <p className="text-slate-400">Tailor your uploaded CV to specific job descriptions using AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8 space-y-6">
          {/* CV variant selection removed — customizer uses uploaded CV text and a default style */}

          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">Source CV</p>
            <p className="mt-1 text-slate-400">{profile?.filename ?? "No resume loaded"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Job Description</label>
            <textarea
              placeholder="Paste the job description here to customize your CV..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              className="w-full h-64 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-none"
            />
          </div>

          <button
            onClick={customize}
            disabled={loading || !jd || !profile?.text}
            className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 font-semibold transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            {loading ? "Customizing with AI..." : "Customize CV"}
          </button>
        </div>

        {/* Results Section */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full border-2 border-brand-500 border-t-transparent animate-spin mx-auto mb-4"></div>
                <p className="text-slate-300">Customizing your CV with AI...</p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">Tailored CV Output</h3>
                <button
                  onClick={download}
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors"
                >
                  <Download size={16} />
                  Download .txt
                </button>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 max-h-96 overflow-y-auto border border-slate-600">
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words">
                  {result.text}
                </pre>
              </div>
              {result.match && (
                <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-lg">
                  <p className="text-sm text-slate-300 mb-2">AI Match Score:</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-brand-400"
                        style={{ width: `${Math.round(result.match.overall * 100)}%` }}
                      />
                    </div>
                    <span className="text-xl font-bold text-brand-400">
                      {Math.round(result.match.overall * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{result.match.confidence_label}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <FileText className="text-slate-600 mb-4" size={32} />
              <p className="text-slate-400">Your customized CV will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
