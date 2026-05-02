"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Zap, Briefcase, FileText, UploadCloud } from "lucide-react";
import clsx from "clsx";
import { useCvProfile } from "@/components/CvProvider";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/match", label: "Matches", icon: Zap },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/documents", label: "Documents", icon: FileText },
];

export default function Sidebar() {
  const path = usePathname();
  const { profile, hydrated } = useCvProfile();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-slate-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-400">CVMatcher</h1>
          <p className="text-sm text-slate-400">Upload once. Match everywhere.</p>
        </div>

        <nav className="flex flex-wrap items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 p-2">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
              path === href
                ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}>
            <Icon size={16} /> {label}
          </Link>
        ))}
        </nav>

        <div className="flex items-center gap-3 self-start rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-300 lg:self-auto">
          <UploadCloud size={16} className="text-brand-400" />
          {hydrated && profile ? (
            <span className="truncate">
              CV loaded: <span className="text-slate-100">{profile.filename}</span>
            </span>
          ) : (
            <span>No CV loaded yet</span>
          )}
        </div>
      </div>
    </header>
  );
}
