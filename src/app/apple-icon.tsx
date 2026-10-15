import { ImageResponse } from "next/og";

// The home-screen icon: the favicon's three token bars, at 180 px.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const BARS = [
  { color: "#e2805a", width: 112 },
  { color: "#6d97f2", width: 74 },
  { color: "#5cc27c", width: 46 },
];

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 12,
          padding: "0 34px",
          background: "#0f0f0d",
        }}
      >
        {BARS.map((b) => (
          <div key={b.color} style={{ display: "flex", width: b.width, height: 22, borderRadius: 11, background: b.color }} />
        ))}
      </div>
    ),
    size,
  );
}
