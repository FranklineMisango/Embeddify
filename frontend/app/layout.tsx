import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "CVMatcher - AI Job Matching",
  description: "Upload your CV, find matching jobs, and get AI-powered advice",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex min-h-screen antialiased">
        <Sidebar />
        <main className="flex-1 ml-64 min-h-screen">
          <div className="p-8 max-w-7xl">{children}</div>
        </main>
      </body>
    </html>
  );
}
