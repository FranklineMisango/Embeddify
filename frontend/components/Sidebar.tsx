"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Zap, Briefcase, CheckSquare, FileText } from "lucide-react";
import clsx from "clsx";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/match", label: "Matches", icon: Zap },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/tracker", label: "Job Tracker", icon: CheckSquare },
  { href: "/documents", label: "Documents", icon: FileText },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 flex flex-col p-6 gap-1">
      <div className="mb-8">
        <h1 className="text-brand-500 font-bold text-xl tracking-wide">CVMatcher</h1>
        <p className="text-xs text-gray-400 mt-1">AI-Powered Job Matching</p>
      </div>
      <nav className="flex-1 flex flex-col gap-2">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={clsx(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
              path === href 
                ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" 
                : "text-gray-300 hover:bg-slate-700 hover:text-white"
            )}>
            <Icon size={18} /> {label}
          </Link>
        ))}
      </nav>
      <div className="pt-4 border-t border-slate-700 text-xs text-gray-400">
        <p>v1.0 • Built with AI</p>
      </div>
    </aside>
  );
}
