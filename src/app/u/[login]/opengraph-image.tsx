import { ImageResponse } from "next/og";
import { formatDay, formatTokens, shortModel } from "@/lib/format";
import { profile } from "@/lib/queries";

// The preview image of a profile link: rank, totals, and the last 30 days.
// No avatar, so a shared link never shows someone's GitHub picture.

export const alt = "tokenstat leaderboard profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = {
  bg: "#0f0f0d",
  fg: "#edebe4",
  muted: "#8f8a80",
  line: "#2a2924",
  gold: "#e5b73b",
  claude: "#e2805a",
  codex: "#6d97f2",
  copilot: "#5cc27c",
};

export default async function Image({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  const p = await profile(decodeURIComponent(login)).catch(() => null);

  if (!p) {
    return new ImageResponse(
      (
        <div style={{ ...frame, justifyContent: "center", alignItems: "center", fontSize: 56 }}>
          tokenstat/leaderboard
        </div>
      ),
      size,
    );
  }

  const last30 = p.daily.reduce((s, d) => s + d.total, 0);
  const peak = Math.max(...p.daily.map((d) => d.total), 1);
  const top = p.models[0]?.model;
  const stats = [
    { label: "Rank, 30 days", value: p.rank30 ? `#${p.rank30}` : "–", gold: p.rank30 === 1 },
    { label: "Last 30 days", value: formatTokens(last30) },
    { label: "All time", value: formatTokens(p.allTime.total) },
    { label: "Active days", value: String(p.allTime.activeDays) },
  ];

  return new ImageResponse(
    (
      <div style={frame}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: C.muted }}>
          <div style={{ display: "flex" }}>tokenstat/leaderboard</div>
          {top && <div style={{ display: "flex" }}>top model {shortModel(top)}</div>}
        </div>

        <div style={{ display: "flex", fontSize: 84, fontWeight: 700, letterSpacing: -2 }}>{p.login}</div>

        <div style={{ display: "flex", gap: 20 }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: "18px 22px",
                border: `2px solid ${C.line}`,
                borderRadius: 14,
              }}
            >
              <div style={{ display: "flex", fontSize: 22, color: C.muted }}>{s.label}</div>
              <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: s.gold ? C.gold : C.fg }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
            {p.daily.map((d) => (
              <div key={d.day} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", flex: 1, height: "100%" }}>
                {(["copilot", "codex", "claude"] as const).map((t) =>
                  d[t] > 0 ? (
                    <div key={t} style={{ display: "flex", height: `${(d[t] / peak) * 100}%`, background: C[t], borderRadius: 2 }} />
                  ) : null,
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: C.muted }}>
            <div style={{ display: "flex" }}>{formatDay(p.daily[0].day)}</div>
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ display: "flex", color: C.claude }}>Claude Code</div>
              <div style={{ display: "flex", color: C.codex }}>Codex</div>
              <div style={{ display: "flex", color: C.copilot }}>Copilot</div>
            </div>
            <div style={{ display: "flex" }}>{formatDay(p.daily[p.daily.length - 1].day)}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

const frame = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
  padding: "56px 72px",
  background: C.bg,
  color: C.fg,
};
