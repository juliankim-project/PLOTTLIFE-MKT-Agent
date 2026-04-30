import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
/* Pretendard Variable — 한국어 본문/UI 통일 폰트.
   Dynamic subset: 사용된 한글만 lazy-load → 빠름 (~50KB) */
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/sidebar";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PLOTTLIFE-MKT",
  description: "MKT AGENT DASHBOARD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <TooltipProvider>
          <Sidebar />
          <main className="flex-1 overflow-auto bg-muted/30">
            {children}
          </main>
        </TooltipProvider>
      </body>
    </html>
  );
}
