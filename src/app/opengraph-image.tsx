import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Marxel · Seguros, Salud y Viajero · Salta, Argentina";
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
          background: "linear-gradient(140deg, #051e36 0%, #0a355c 45%, #0d5752 100%)",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Glow decorativo top-right */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 500,
            height: 500,
            borderRadius: "9999px",
            background: "rgba(42,181,173,0.18)",
            filter: "blur(100px)",
          }}
        />
        {/* Glow decorativo bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -60,
            width: 400,
            height: 400,
            borderRadius: "9999px",
            background: "rgba(74,160,207,0.14)",
            filter: "blur(90px)",
          }}
        />

        {/* Contenido principal */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            padding: "64px 72px",
            position: "relative",
          }}
        >
          {/* Header: badge + nombre */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                borderRadius: "12px",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                fontSize: 22,
              }}
            >
              🛡
            </div>
            <span
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "white",
                letterSpacing: "-0.02em",
              }}
            >
              Marxel
            </span>
            <div
              style={{
                marginLeft: 8,
                padding: "4px 14px",
                borderRadius: "999px",
                background: "rgba(42,181,173,0.2)",
                border: "1px solid rgba(42,181,173,0.35)",
                fontSize: 13,
                fontWeight: 600,
                color: "#2ab5ad",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Salta, Argentina
            </div>
          </div>

          {/* Centro: titular */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                fontSize: 72,
                fontWeight: 800,
                color: "white",
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
              }}
            >
              Tu protección,
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg, #2ab5ad, #4aa0cf)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                sin vueltas.
              </span>
            </div>

            <div
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.5,
                maxWidth: 640,
              }}
            >
              Seguros, prepagas y asistencia al viajero con asesoramiento
              claro, humano y a tu medida.
            </div>
          </div>

          {/* Footer: tres pilares + URL */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            {/* Pilares */}
            <div style={{ display: "flex", gap: 12 }}>
              {[
                { emoji: "🛡️", label: "Seguros" },
                { emoji: "❤️", label: "Salud · Prepagas" },
                { emoji: "✈️", label: "Asistencia al Viajero" },
              ].map((p) => (
                <div
                  key={p.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 18px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{p.emoji}</span>
                  {p.label}
                </div>
              ))}
            </div>

            {/* URL */}
            <div
              style={{
                fontSize: 15,
                color: "rgba(255,255,255,0.35)",
                fontWeight: 500,
                letterSpacing: "0.02em",
              }}
            >
              marxel-omega.vercel.app
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
