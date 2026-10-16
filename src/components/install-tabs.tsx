"use client";

import { useState } from "react";

// Where tokenstat with leaderboard support is installed from. It is the fork
// until tornikegomareli/tokenstat#1 is merged and released upstream; then
// change it to "tornikegomareli/tokenstat".
const REPO = "tornikegomareli/tokenstat";

const OPTIONS = [
  {
    id: "unix",
    label: "macOS / Linux",
    note: "Installs to ~/.local/bin and removes older copies on your PATH.",
    command: `curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | sh`,
  },
  {
    id: "windows",
    label: "Windows",
    note: "Run in PowerShell. Installs to %LOCALAPPDATA%\\Programs\\tokenstat and adds it to your PATH.",
    command: `irm https://raw.githubusercontent.com/${REPO}/main/install.ps1 | iex`,
  },
  {
    id: "go",
    label: "From source",
    note: "Needs Go 1.25 or newer.",
    command: `git clone https://github.com/${REPO} && cd tokenstat && go install .`,
  },
] as const;

export function InstallTabs() {
  const [active, setActive] = useState<(typeof OPTIONS)[number]["id"]>("unix");
  const option = OPTIONS.find((o) => o.id === active) ?? OPTIONS[0];
  return (
    <div className="space-y-2">
      <div role="tablist" aria-label="Install options" className="inline-flex flex-wrap rounded-md border border-line bg-bg p-0.5 text-xs">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            role="tab"
            type="button"
            aria-selected={o.id === active}
            onClick={() => setActive(o.id)}
            className={`rounded px-2.5 py-1.5 ${o.id === active ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <Command text={option.command} />
      <p className="text-xs text-muted">{option.note}</p>
    </div>
  );
}

export function Command({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch overflow-hidden rounded-md border border-line bg-bg">
      <pre className="num min-w-0 flex-1 overflow-x-auto px-3 py-2 text-xs">{text}</pre>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(text).then(
            () => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            },
            () => {},
          );
        }}
        className="shrink-0 border-l border-line px-3 text-xs text-muted hover:text-fg"
        aria-label="Copy command"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
