import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sketio — Real-Time AI Collaborative Whiteboard",
  description:
    "Sketio is an ultra-fast, intelligent collaborative whiteboard with AI diagram generation, infinite canvas, and live teamwork.",
  keywords: ["Sketio", "collaborative whiteboard", "AI diagram generator", "real-time canvas", "team visual workspace"],
  openGraph: {
    title: "Sketio — Real-Time AI Collaborative Whiteboard",
    description: "Draw, design architecture diagrams with AI, collaborate in real-time with Sketio.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isKeyConfigured =
    publishableKey &&
    !publishableKey.includes("placeholder") &&
    publishableKey.startsWith("pk_");

  const bodyContent = (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${bricolage.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased font-[var(--font-dm-sans)] bg-[#f5efe2] text-[#17140d]`}
      >
        {children}
      </body>
    </html>
  );

  if (isKeyConfigured) {
    return (
      <ClerkProvider
        publishableKey={publishableKey}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
      >
        {bodyContent}
      </ClerkProvider>
    );
  }

  return bodyContent;
}
