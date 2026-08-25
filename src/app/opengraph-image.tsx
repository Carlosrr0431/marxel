import { ImageResponse } from "next/og";

export const alt = "Tu protección, sin vueltas. MARXEN — Salta, Argentina";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px 56px",
          background: "linear-gradient(148deg, #1a1038 0%, #352872 52%, #2a6f8a 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 42,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: "#c8c8c8",
            }}
          >
            marxen
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 16,
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Protección Integral
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              color: "white",
            }}
          >
            <span>Tu protección,</span>
            <span style={{ color: "#5fc4e5" }}>sin vueltas.</span>
          </div>
          <div
            style={{
              marginTop: 22,
              maxWidth: 760,
              fontSize: 24,
              lineHeight: 1.45,
              color: "rgba(255,255,255,0.72)",
            }}
          >
            Seguros, prepagas y asistencia al viajero con asesoramiento claro,
            humano y a tu medida.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 20,
            fontWeight: 500,
            color: "rgba(255,255,255,0.48)",
          }}
        >
          <span>Salta, Argentina</span>
          <span>marxen.com.ar</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
