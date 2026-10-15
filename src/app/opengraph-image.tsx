import { ImageResponse } from "next/og";

// The preview image for shared links, on every page. Without one, chat apps
// pick the first image on the page, which is a GitHub avatar.

export const alt = "tokenstat leaderboard: who burns the most Claude Code, Codex, and Copilot tokens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TOOLS = [
  { name: "Claude Code", color: "#e2805a", width: 520 },
  { name: "Codex", color: "#6d97f2", width: 330 },
  { name: "Copilot", color: "#5cc27c", width: 210 },
];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0f0f0d",
          color: "#edebe4",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, letterSpacing: -0.5 }}>tokenstat/leaderboard</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
            Who burns the most tokens?
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {TOOLS.map((t) => (
              <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ display: "flex", width: t.width, height: 22, borderRadius: 4, background: t.color }} />
                <div style={{ display: "flex", fontSize: 26, color: "#8f8a80" }}>{t.name}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#8f8a80" }}>
          Daily token totals from local session logs. No code, no prompts, no projects.
        </div>
      </div>
    ),
    size,
  );
}
