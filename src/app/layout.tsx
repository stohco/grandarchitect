import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Live Architect Studio",
  description: "The Live Architect Studio — a deterministic xianxia world editor for the Grand Architect control plane. Built with Next.js 16, Three.js, and Zustand on the project's determinism stack.",
  keywords: ["xianxia", "Live Architect", "world editor", "Three.js", "Next.js", "deterministic simulation"],
  authors: [{ name: "Grand Architect" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Live Architect Studio",
    description: "A deterministic xianxia world editor for the Grand Architect control plane.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Live Architect Studio",
    description: "A deterministic xianxia world editor for the Grand Architect control plane.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
