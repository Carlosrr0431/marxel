import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  href?: string | null;
  /** Kept for compatibility; official lockup always includes Salud */
  showSalud?: boolean;
  className?: string;
  /** Light wordmark for dark backgrounds */
  light?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
};

const sizes = {
  sm: { width: 118, height: 34 },
  md: { width: 148, height: 42 },
  lg: { width: 196, height: 56 },
  xl: { width: 260, height: 74 },
} as const;

export function Logo({
  href = "/",
  className = "",
  light = false,
  size = "md",
}: LogoProps) {
  const { width, height } = sizes[size];
  const src = light
    ? "/brand/marxel-logo-light.png"
    : "/brand/marxel-logo.png";

  const mark = (
    <Image
      src={src}
      alt="MARXEN Protección integral"
      width={width}
      height={height}
      className={`h-auto w-auto ${className}`}
      style={{ width, height: "auto" }}
      priority={size === "md" || size === "lg"}
    />
  );

  if (href === null || href === "") return mark;

  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/40 focus-visible:ring-offset-2"
      aria-label="MARXEN Protección integral"
    >
      {mark}
    </Link>
  );
}
