import { ImageResponse } from "next/og";

export const alt = "NovelGit — AI-powered novel management";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: 72,
          background: "linear-gradient(145deg, #0c1222 0%, #151e35 45%, #0f172a 100%)",
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(148, 163, 184, 0.95)",
            marginBottom: 24,
            fontFamily: "ui-monospace, monospace",
          }}
        >
          git-backed · markdown · AI
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              background:
                "linear-gradient(120deg, #e2e8f0 0%, #94a3b8 40%, #cbd5e1 100%)",
              backgroundClip: "text",
              color: "transparent",
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}
          >
            NovelGit
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 500,
              color: "#cbd5e1",
              maxWidth: 900,
              lineHeight: 1.35,
            }}
          >
            Novel management system for long-form fiction — synced to GitHub, with
            lore, Global Bible, and AI chat.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
