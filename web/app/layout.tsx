import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Downlink — High-Performance Video & Torrent Downloader",
  description:
    "Cross-platform media downloader powered by yt-dlp & Aria2 with seamless mobile-to-desktop Cloud Relay Continuity.",
  icons: {
    icon: "/downlink-square.png",
    apple: "/downlink-square.png",
  },
  openGraph: {
    title: "Downlink",
    description: "High-performance video & torrent downloader with Universal Continuity.",
    images: ["/downlink.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#09090b] text-zinc-100 min-h-screen selection:bg-cyan-500/30 selection:text-cyan-200`}>
        {children}
      </body>
    </html>
  );
}
