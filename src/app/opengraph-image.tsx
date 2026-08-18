import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Tu protección, sin vueltas. MARXEN — Salta, Argentina";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/marxel-logo-light.png"));

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
          background: "linear-gradient(148deg, #051e36 0%, #0a3d5e 52%, #0d5752 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <img
          src={`data:image/png;base64,${logo.toString("base64")}`}
          width={248}
          height={70}
          alt=""
          style={{ objectFit: "contain", objectPosition: "left center" }}
        />

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
            <span style={{ color: "#2ab5ad" }}>sin vueltas.</span>
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
