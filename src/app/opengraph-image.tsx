import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #120f1f 0%, #241a3f 42%, #fb7a8e 135%)",
          color: "#f6f3ef",
          padding: "70px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              position: "relative",
              width: 96,
              height: 96,
              borderRadius: 26,
              border: "2px solid rgba(247,242,235,0.14)",
              background: "linear-gradient(135deg, #171322 0%, #1f1830 58%, #2a203d 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              fontWeight: 800,
              color: "#f9f5ee",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 56,
                height: 50,
                borderRadius: 999,
                border: "5px solid #ff8ea3",
                opacity: 0.95,
                transform: "rotate(-24deg)",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 18,
                top: 18,
                width: 10,
                height: 10,
                borderRadius: 999,
                background: "#ffe0c8",
              }}
            />
            K
          </div>
          <div style={{ fontSize: 42, fontWeight: 700 }}>Kai Focus</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 76,
              lineHeight: 0.98,
              letterSpacing: 0,
              fontWeight: 800,
              maxWidth: 920,
            }}
          >
            AI focus coach for the right next block.
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 30,
              lineHeight: 1.35,
              color: "rgba(246,243,239,0.76)",
              maxWidth: 920,
            }}
          >
            Adaptive Pomodoro, calendar planning, voice, Spotify music, and
            productivity trends.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
