import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "CV Job Matcher",
  description: "AI-powered job scraper and CV customizer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-56 p-8">{children}</main>
      </body>
    </html>
  );
}
