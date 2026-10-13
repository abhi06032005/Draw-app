import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sketio — Real-Time AI Collaborative Whiteboard",
  description:
    "Sketio is an ultra-fast, intelligent collaborative whiteboard with AI diagram generation, infinite canvas, and live teamwork.",
  keywords: [
    "Sketio",
    "collaborative whiteboard",
    "AI diagram generator",
    "real-time canvas",
    "team visual workspace",
  ],
  openGraph: {
    title: "Sketio — Real-Time AI Collaborative Whiteboard",
    description:
      "Draw, design architecture diagrams with AI, collaborate in real-time with Sketio.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700..800&family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=JetBrains+Mono:wght@400..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="antialiased font-[var(--font-dm-sans)] bg-[#f5efe2] text-[#17140d]"
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
