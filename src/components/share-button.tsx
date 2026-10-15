"use client";

import { useState } from "react";

// ShareButton shares the current profile: the system share sheet where
// there is one (phones), else it copies the link.
export function ShareButton({ text, url }: { text: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, text, url });
      } catch {
        // cancelled
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link", url);
    }
  };
  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        type="button"
        onClick={share}
        className="rounded-md border border-line bg-card px-3 py-1.5 hover:border-muted"
      >
        {copied ? "Link copied" : "Share"}
      </button>
      <a
        href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md border border-line bg-card px-3 py-1.5 text-muted hover:border-muted hover:text-fg"
      >
        Post on X
      </a>
    </div>
  );
}
