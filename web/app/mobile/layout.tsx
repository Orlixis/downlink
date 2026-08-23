import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Downlink Mobile Companion",
  description: "Send video & torrent downloads to your Mac or PC from anywhere.",
  manifest: "./mobile-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Downlink",
  },
  icons: {
    icon: "./downlink-square.png",
    apple: "./downlink-square.png",
  },
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
