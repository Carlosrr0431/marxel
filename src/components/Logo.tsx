import Link from "next/link";

type LogoProps = {
  href?: string | null;
  showSalud?: boolean;
  className?: string;
  light?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
};

const LOGO_W = 694;
const LOGO_H = 166;

const widths = {
  xs: 128,
  sm: 168,
  md: 196,
  lg: 236,
  xl: 300,
} as const;

export function Logo({
  href = "/",
  className = "",
  light = false,
  size = "md",
}: LogoProps) {
  const width = widths[size];
  const height = Math.round((width * LOGO_H) / LOGO_W);
  const src = light ? "/brand/marxel-lockup-light.svg" : "/brand/marxel-lockup.svg";
  const mark = (
    <img
      src={src}
      alt="marxen Protección Integral"
      width={LOGO_W}
      height={LOGO_H}
      className={`brand-lockup ${className}`.trim()}
      style={{ width, height, maxHeight: height }}
    />
  );

  if (href === null || href === "") return mark;

  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/40 focus-visible:ring-offset-2"
      aria-label="marxen Protección Integral"
    >
      {mark}
    </Link>
  );
}
