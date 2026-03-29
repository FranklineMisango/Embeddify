"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, FileText, Zap } from "lucide-react";
import clsx from "clsx";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Search },
  { href: "/match", label: "Match CV", icon: Zap },
  { href: "/cv", label: "CV Builder", icon: FileText },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-gray-900 border-r border-gray-800 flex flex-col p-4 gap-1">
      <div className="text-brand-500 font-bold text-lg mb-6 px-2">⚡ CVMatcher</div>
      {nav.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}
          className={clsx("flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
            path === href ? "bg-brand-500 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
          )}>
          <Icon size={16} /> {label}
        </Link>
      ))}
    </aside>
  );
}
