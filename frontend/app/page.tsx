"use client";
import { useEffect, useState } from "react";
import { Upload, Briefcase, TrendingUp, CheckCircle2, FileText, Sparkles } from "lucide-react";
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
  const [stats, setStats] = useState({ totalJobs: 0, appliedJobs: 0, interviews: 0, offers: 0 });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cvUploaded, setCvUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    setCvUploaded(Boolean(profile));
  }, [profile]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/jobs/`);
      const jobs = response.data;
      setStats({
        totalJobs: jobs.length,
        appliedJobs: jobs.filter((j: any) => j.status === "applied").length,
        interviews: jobs.filter((j: any) => j.status === "interview").length,
        offers: jobs.filter((j: any) => j.status === "offer").length,
      });
      setRecentJobs(jobs.slice(0, 5));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const [uploadError, setUploadError] = useState("");

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
    
    const formData = new FormData();
    formData.append("file", selectedFile);
    
    try {
      const candidates = [API, API_FALLBACK].filter((u): u is string => Boolean(u));
      let response: any = null;
      let networkFailure = false;

      for (const base of candidates) {
        try {
          response = await axios.post(`${base}/cv/upload`, formData);
          break;
        } catch (err: unknown) {
          if (axios.isAxiosError(err) && !err.response) {
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

      const savedProfile = makeCvProfile({
        filename: selectedFile.name,
        text: response.data.text,
        textPreview: response.data.text_preview,
        textLength: response.data.text_length,
        pageCount: response.data.page_count,
      });

      setProfile(savedProfile);

      setCvUploaded(true);
      setUploadError("");
      setUploadResult(response.data ?? null);
      // Reset form after success
      e.currentTarget.value = "";
      setTimeout(() => setUploading(false), 1000);
    } catch (error: unknown) {
      console.error("Upload failed:", error);
      setUploadError(formatUploadError(error));
      setCvUploaded(false);
      setUploadResult(null);
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-100 mb-2">Welcome to CVMatcher</h1>
        <p className="text-slate-400">Upload your CV and discover personalized job opportunities with AI-powered matching</p>
      </div>

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
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Upload Your CV</h2>
            <p className="text-sm text-slate-400">Get started by uploading your resume in PDF format</p>
          </div>
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
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></div>
                <p className="text-sm text-slate-300">Uploading your CV...</p>
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
                {profile.insights.keySkills.length > 0 ? profile.insights.keySkills.map((skill) => (
                  <span key={skill} className="rounded-full bg-brand-500/15 px-3 py-1 text-xs text-brand-200">
                    {skill}
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
                  <li key={`${line}-${index}`} className="line-clamp-2">{line}</li>
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
                  <li key={`${line}-${index}`} className="line-clamp-2">{line}</li>
                )) : (
                  <li className="text-slate-400">No publication lines detected yet.</li>
                )}
              </ul>
            </div>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/jobs" className="group p-6 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-slate-700/50 group-hover:bg-brand-500/20 rounded-lg transition-colors">
              <Briefcase className="text-slate-400 group-hover:text-brand-500" size={20} />
            </div>
          </div>
          <h3 className="font-semibold text-slate-100 mb-1">Scrape Jobs</h3>
          <p className="text-sm text-slate-400">Search and scrape jobs from LinkedIn & Indeed</p>
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

        <Link href="/documents" className="group p-6 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-slate-700/50 group-hover:bg-brand-500/20 rounded-lg transition-colors">
              <FileText className="text-slate-400 group-hover:text-brand-500" size={20} />
            </div>
          </div>
          <h3 className="font-semibold text-slate-100 mb-1">Documents</h3>
          <p className="text-sm text-slate-400">Manage and customize your CVs</p>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Jobs</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{stats.totalJobs}</p>
        </div>
        <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Applied</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{stats.appliedJobs}</p>
        </div>
        <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Interviews</p>
          <p className="text-2xl font-bold text-brand-400 mt-1">{stats.interviews}</p>
        </div>
        <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Offers</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{stats.offers}</p>
        </div>
      </div>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Recent Jobs</h3>
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-slate-100">{job.title}</p>
                  <p className="text-sm text-slate-400">{job.company}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full bg-slate-700 text-slate-300">
                  <CheckCircle2 size={14} />
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
