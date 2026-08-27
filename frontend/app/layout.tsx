import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import CvProvider from "@/components/CvProvider";

export const metadata: Metadata = {
  title: "Embeddify - AI Job Matching",
  description: "Upload your CV, find matching jobs, and get AI-powered advice",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 min-h-screen antialiased">
        <CvProvider>
          <Sidebar />
          <main className="min-h-screen">
            <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
          </main>
        </CvProvider>
      </body>
    </html>
  );
}
