import type { Metadata } from "next";
import { Anton, Work_Sans, Space_Mono, Great_Vibes } from "next/font/google";
import "./globals.css";

const display = Anton({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const body = Work_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const tag = Space_Mono({
  variable: "--font-tag",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const script = Great_Vibes({
  variable: "--font-script",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dell's Sari-Sari Store",
  description:
    "Everyday essentials, snacks, and load — right around the corner from home. Suki-friendly since day one.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${tag.variable} ${script.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--color-paper)] text-[var(--color-ink)] font-[family-name:var(--font-body)]">
        {children}
      </body>
    </html>
  );
}
