import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1038",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 118,
            height: 96,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 70,
              height: 96,
              background: "#352872",
              clipPath: "polygon(50% 0, 100% 100%, 72% 100%, 50% 42%, 28% 100%, 0 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: 70,
              height: 96,
              background: "#5fc4e5",
              clipPath: "polygon(50% 0, 100% 100%, 72% 100%, 50% 42%, 28% 100%, 0 100%)",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
