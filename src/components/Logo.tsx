import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  href?: string | null;
  showSalud?: boolean;
  className?: string;
  light?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
};

const sizes = {
  sm: { width: 132, height: 38 },
  md: { width: 164, height: 47 },
  lg: { width: 214, height: 61 },
  xl: { width: 280, height: 80 },
} as const;

export function Logo({
  href = "/",
  className = "",
  light = false,
  size = "md",
}: LogoProps) {
  const { width, height } = sizes[size];
  const src = light ? "/brand/marxel-logo-light.svg" : "/brand/marxel-logo.svg";

  const mark = (
    <Image
      src={src}
      alt="marxen Protección Integral"
      width={width}
      height={height}
      className={`h-auto w-auto ${className}`}
      style={{ width, height: "auto" }}
      priority={size === "md" || size === "lg"}
      unoptimized
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
