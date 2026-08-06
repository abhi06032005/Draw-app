import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from "next/font/google";
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
  title: "Loopa — Ship work that actually gets done.",
  description:
    "A loud, playful collaborative workspace & whiteboard. Draw, collaborate, and chat in real-time with your team in Loopa.",
  keywords: ["collaborative drawing", "memphis design", "whiteboard", "real-time canvas", "team collaboration"],
  openGraph: {
    title: "Loopa — Ship work that actually gets done.",
    description: "Real-time collaborative drawing and chat. Create rooms, draw together, share ideas instantly.",
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
      <body
        suppressHydrationWarning
        className={`${bricolage.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased font-[var(--font-dm-sans)] bg-[#f5efe2] text-[#17140d]`}
      >
        {children}
      </body>
    </html>
  );
}
