"use client";
import { useEffect, useState } from "react";
import { Upload, Briefcase, TrendingUp, CheckCircle2, FileText, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { makeCvProfile } from "@/lib/cv-profile";
import { useCvProfile } from "@/components/CvProvider";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_FALLBACK = API.includes("localhost")
  ? API.replace("localhost", "127.0.0.1")
  : API.includes("127.0.0.1")
    ? API.replace("127.0.0.1", "localhost")
    : null;

const displayInsight = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    const preferred = item.name ?? item.description ?? item.skill ?? item.title;
    if (typeof preferred === "string") return preferred;
  }
  return JSON.stringify(value);
};

const formatUploadError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      const messages = detail
        .map((entry) => {
          if (typeof entry === "string") {
            return entry;
          }

          if (entry && typeof entry === "object" && "msg" in entry && typeof entry.msg === "string") {
            return entry.msg;
          }

          return null;
        })
        .filter((message): message is string => Boolean(message));

      if (messages.length > 0) {
        return messages.join(" ");
      }
    }

    if (error.response) {
      return `Upload failed with status ${error.response.status}.`;
    }

    return `Upload could not reach API at ${API}${API_FALLBACK ? ` (also tried ${API_FALLBACK})` : ""}.`;
  }

  if (error instanceof Error && error.message === "API_UNREACHABLE") {
    return `Upload could not reach API at ${API}${API_FALLBACK ? ` (also tried ${API_FALLBACK})` : ""}.`;
  }

  return "Upload failed. Please try again.";
};

export default function Home() {
  const { profile, hydrated, setProfile } = useCvProfile();
  const [cvUploaded, setCvUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  useEffect(() => {
    setCvUploaded(Boolean(profile));
  }, [profile]);

  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<{stage: string; message: string; progress: number} | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Validate file type
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setUploadError("Only PDF files are allowed");
      return;
    }
    
    setUploading(true);
    setUploadError("");
    setUploadProgress({ stage: "reading", message: "Starting upload...", progress: 0 });
    
    const formData = new FormData();
    formData.append("file", selectedFile);
    
    try {
      const candidates = [API, API_FALLBACK].filter((u): u is string => Boolean(u));
      let response: any = null;
      let networkFailure = false;

      for (const base of candidates) {
        try {
          // Use streaming endpoint for real-time progress
          const fetchResponse = await fetch(`${base}/cv/upload-stream`, {
            method: "POST",
            body: formData,
          });

          if (!fetchResponse.ok) {
            throw new Error(`HTTP ${fetchResponse.status}`);
          }

          // Process streaming response
          const reader = fetchResponse.body?.getReader();
          if (!reader) throw new Error("No response body");

          const decoder = new TextDecoder();
          let buffer = "";
          let hasError = false;
          let errorMessage = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const event = JSON.parse(line);
                
                if (event.stage === "error") {
                  hasError = true;
                  errorMessage = event.message;
                  console.error("[STREAM ERROR]", event.message);
                  setUploadProgress({ stage: "error", message: event.message, progress: 0 });
                } else if (event.stage === "complete" && event.data) {
                  response = event.data;
                  setUploadProgress({ stage: "complete", message: "Analysis complete!", progress: 100 });
                } else {
                  setUploadProgress({
                    stage: event.stage,
                    message: event.message,
                    progress: event.progress,
                  });
                }
              } catch (parseErr) {
                console.error("Failed to parse event:", line, parseErr);
              }
            }
          }

          if (hasError) {
            throw new Error(errorMessage || "Stream processing failed");
          }

          if (response) break;
        } catch (err: unknown) {
          if (err instanceof TypeError && err.message.includes("fetch")) {
            networkFailure = true;
            continue;
          }
          throw err;
        }
      }

      if (!response) {
        if (networkFailure) {
          throw new Error("API_UNREACHABLE");
        }
        throw new Error("UPLOAD_FAILED");
      }

      const savedProfile = await makeCvProfile({
        filename: selectedFile.name,
        text: response.text,
        textPreview: response.text_preview,
        textLength: response.text_length,
        pageCount: response.page_count,
      });

      setProfile(savedProfile);

      setCvUploaded(true);
      setUploadError("");
      setUploadResult(response ?? null);
      // Reset form after success
      e.currentTarget.value = "";
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(null);
      }, 1000);
    } catch (error: unknown) {
      console.error("Upload failed:", error);
      setUploadError(formatUploadError(error));
      setCvUploaded(false);
      setUploadResult(null);
      setUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      {hydrated && profile && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">CV Loaded</p>
            <p className="text-lg font-semibold text-slate-100 mt-1 truncate">{profile.filename}</p>
          </div>
          <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Key Skills</p>
            <p className="text-lg font-semibold text-brand-400 mt-1">{profile.insights.keySkills.length}</p>
          </div>
          <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Highlights</p>
            <p className="text-lg font-semibold text-slate-100 mt-1">{profile.insights.experienceHighlights.length}</p>
          </div>
          <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Publications</p>
            <p className="text-lg font-semibold text-slate-100 mt-1">{profile.insights.publications.length}</p>
          </div>
        </div>
      )}

      {/* CV Upload Section */}
      <div className="bg-gradient-to-br from-brand-500/10 to-brand-500/5 border border-brand-500/20 rounded-xl p-8 backdrop-blur">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-brand-500/20 rounded-lg">
            <Upload className="text-brand-500" size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-100">Upload Your CV</h2>
            <p className="text-sm text-slate-400">Get started by uploading your resume in PDF format</p>
          </div>
          {profile && (
            <button
              onClick={() => { setProfile(null); setCvUploaded(false); setUploadResult(null); }}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
              title="Clear uploaded CV"
            >
              <Trash2 size={15} />
              Clear CV
            </button>
          )}
        </div>
        <label className="block cursor-pointer">
          <input
            type="file"
            accept=".pdf"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          <div className={`border-2 border-dashed rounded-lg p-8 transition-all text-center ${
            uploadError 
              ? "border-red-500/50 bg-red-500/5" 
              : cvUploaded 
              ? "border-green-500/50 bg-green-500/5"
              : "border-brand-500/30 hover:border-brand-500/50"
          }`}>
            {uploading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></div>
                <div className="space-y-3 w-full">
                  <div>
                    <p className="text-sm font-medium text-slate-300 mb-1">{uploadProgress?.message || "Uploading your CV..."}</p>
                    <div className="w-full max-w-xs mx-auto h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-300"
                        style={{ width: `${uploadProgress?.progress || 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{uploadProgress?.stage || "preparing"}</span>
                    <span className="font-semibold text-brand-400">{uploadProgress?.progress || 0}%</span>
                  </div>
                </div>
              </div>
            ) : cvUploaded ? (
              <p className="text-sm text-green-400 font-medium">✓ CV uploaded successfully!</p>
            ) : uploadError ? (
              <p className="text-sm text-red-400 font-medium">{uploadError}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-300">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-400 mt-1">PDF up to 10MB</p>
              </>
            )}
          </div>
        </label>
        {profile && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <div className="flex items-center gap-2 text-brand-400 mb-2">
                <Sparkles size={16} />
                <p className="text-sm font-semibold">Key Skills</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.insights.keySkills.length > 0 ? profile.insights.keySkills.map((skill, index) => (
                  <span key={index} className="rounded-full bg-brand-500/15 px-3 py-1 text-xs text-brand-200">
                    {displayInsight(skill)}
                  </span>
                )) : (
                  <p className="text-sm text-slate-400">No clear skills detected yet.</p>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <div className="flex items-center gap-2 text-brand-400 mb-2">
                <FileText size={16} />
                <p className="text-sm font-semibold">Experience Highlights</p>
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                {profile.insights.experienceHighlights.length > 0 ? profile.insights.experienceHighlights.slice(0, 4).map((line, index) => (
                  <li key={index} className="line-clamp-2">{displayInsight(line)}</li>
                )) : (
                  <li className="text-slate-400">No obvious highlight lines found yet.</li>
                )}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <div className="flex items-center gap-2 text-brand-400 mb-2">
                <CheckCircle2 size={16} />
                <p className="text-sm font-semibold">Publications</p>
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                {profile.insights.publications.length > 0 ? profile.insights.publications.slice(0, 4).map((line, index) => (
                  <li key={index} className="line-clamp-2">{displayInsight(line)}</li>
                )) : (
                  <li className="text-slate-400">No publication lines detected yet.</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {profile && (profile.insights.technicalProjects?.length > 0 || profile.insights.awards?.length > 0 || profile.insights.certifications?.length > 0 || profile.insights.researchAreas?.length > 0 || profile.insights.languages?.length > 0) && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {profile.insights.technicalProjects?.length > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <Briefcase size={16} />
                  <p className="text-sm font-semibold">Technical Projects</p>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  {profile.insights.technicalProjects.slice(0, 5).map((project, index) => (
                    <li key={index} className="line-clamp-2 flex items-start gap-2">
                      <span className="text-blue-400 mt-1">→</span>
                      <span>{displayInsight(project)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {profile.insights.awards?.length > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <TrendingUp size={16} />
                  <p className="text-sm font-semibold">Awards & Recognition</p>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  {profile.insights.awards.slice(0, 5).map((award, index) => (
                    <li key={index} className="line-clamp-2 flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">★</span>
                      <span>{displayInsight(award)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {profile.insights.certifications?.length > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <CheckCircle2 size={16} />
                  <p className="text-sm font-semibold">Certifications</p>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  {profile.insights.certifications.slice(0, 5).map((cert, index) => (
                    <li key={index} className="line-clamp-2 flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span>{displayInsight(cert)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {profile.insights.researchAreas?.length > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <FileText size={16} />
                  <p className="text-sm font-semibold">Research Areas</p>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  {profile.insights.researchAreas.slice(0, 5).map((area, index) => (
                    <li key={index} className="line-clamp-2 flex items-start gap-2">
                      <span className="text-purple-400 mt-1">◆</span>
                      <span>{displayInsight(area)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {profile.insights.languages?.length > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                  <Sparkles size={16} />
                  <p className="text-sm font-semibold">Languages & Tools</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.insights.languages?.slice(0, 10).map((lang, index) => (
                    <span key={index} className="rounded-full bg-cyan-500/15 px-2 py-1 text-xs text-cyan-200">
                      {displayInsight(lang)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {uploadResult && (
          <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-sm font-semibold text-slate-100 mb-3">Extracted CV text</p>
            <p className="text-xs text-slate-500 mb-4">
              The upload succeeded and the backend extracted {uploadResult.text_length ?? 0} characters across {uploadResult.page_count ?? 0} page(s).
            </p>
            <div className="mt-4 max-h-[28rem] overflow-auto rounded-lg border border-slate-700 bg-slate-950/60 p-4">
              <pre className="text-sm leading-6 text-slate-300 whitespace-pre-wrap">
                {uploadResult.text || uploadResult.text_preview || "No readable text was extracted."}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/search" className="group p-6 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-slate-700/50 group-hover:bg-brand-500/20 rounded-lg transition-colors">
              <Briefcase className="text-slate-400 group-hover:text-brand-500" size={20} />
            </div>
          </div>
          <h3 className="font-semibold text-slate-100 mb-1">Search Jobs</h3>
          <p className="text-sm text-slate-400">Find opportunities across the internet tailored to your skills</p>
        </Link>

        <Link href="/match" className="group p-6 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-slate-700/50 group-hover:bg-brand-500/20 rounded-lg transition-colors">
              <TrendingUp className="text-slate-400 group-hover:text-brand-500" size={20} />
            </div>
          </div>
          <h3 className="font-semibold text-slate-100 mb-1">Match Analysis</h3>
          <p className="text-sm text-slate-400">Get AI advice on your CV match with jobs</p>
        </Link>
      </div>
    </div>
  );
}
