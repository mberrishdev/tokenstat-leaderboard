import type { Metadata } from "next";
import Link from "next/link";
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
  title: { default: "tokenstat leaderboard", template: "%s · tokenstat leaderboard" },
  description: "Who burns the most Claude Code, Codex, and Copilot tokens. Totals come from tokenstat, which reads local session logs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <Link href="/" className="num text-sm font-semibold tracking-tight">
              tokenstat<span className="text-muted">/</span>leaderboard
            </Link>
            <nav className="flex items-center gap-5 text-sm text-muted">
              <Link href="/#join" className="hover:text-fg">
                Join
              </Link>
              <a href="https://github.com/tornikegomareli/tokenstat" className="hover:text-fg">
                tokenstat
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
        <footer className="border-t border-line">
          <p className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted sm:px-6">
            Only daily token totals by tool and model are uploaded. No projects, paths, prompts, or code. Numbers are
            self-reported.
          </p>
        </footer>
      </body>
    </html>
  );
}
