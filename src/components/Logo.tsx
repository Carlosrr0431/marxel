import Link from "next/link";

type LogoProps = {
  href?: string | null;
  showSalud?: boolean;
  className?: string;
  light?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
};

const sizes = {
  xs: { width: 128, height: 36 },
  sm: { width: 168, height: 48 },
  md: { width: 196, height: 56 },
  lg: { width: 236, height: 68 },
  xl: { width: 300, height: 86 },
} as const;

function MarxelWordmark({
  light,
  width,
  height,
  className,
}: {
  light: boolean;
  width: number;
  height: number;
  className: string;
}) {
  const word = light ? "#c8c8c8" : "#4d4c4c";
  const tag = light ? "#a3a3a3" : "#7a7a7a";

  return (
    <svg
      viewBox="180.57 390.94 210 60"
      width={width}
      height={height}
      role="img"
      aria-label="marxen Protección Integral"
      className={className}
      style={{ width, height: "auto", display: "block" }}
      overflow="visible"
    >
      <text
        fill={word}
        fontFamily="Montserrat, 'Plus Jakarta Sans', Arial, sans-serif"
        fontSize="51.5"
        transform="translate(246 426)"
      >
        ar
      </text>
      <path
        fill="#5fc4e5"
        d="M203.7,419.2c-1.3,1.8-.9,4.4.9,5.7.8.6,1.8.8,2.8.7,1-.2,2-.7,2.6-1.6l2.4-3.5-4.8-6.9-3.9,5.6Z"
      />
      <path
        fill="#5fc4e5"
        d="M244.9,419.2l-14.8-21.3c-1.5-2.1-3.6-3.3-5.8-3.3s-4.3,1.2-5.8,3.3l-4.6,6.6,4.8,6.9,5.6-8.1,14.3,20.7c.7,1,1.9,1.7,3.1,1.7s1.6-.3,2.2-.7c1.8-1.3,2.2-3.9.9-5.7Z"
      />
      <path
        fill="#352872"
        d="M222.6,419.2l-14.8-21.3c-1.5-2.1-3.6-3.3-5.8-3.3s-4.3,1.2-5.8,3.3l-14.8,21.3c-1.3,1.8-.9,4.4.9,5.7.8.6,1.8.8,2.8.7,1-.2,2-.7,2.6-1.6l14.3-20.7,14.3,20.7c.7,1,1.9,1.7,3.1,1.7s1.6-.3,2.2-.7c1.8-1.3,2.2-3.9.9-5.7Z"
      />
      <text
        fill={word}
        fontFamily="Montserrat, 'Plus Jakarta Sans', Arial, sans-serif"
        fontSize="51.5"
        transform="translate(331.8 425.7)"
      >
        en
      </text>
      <path
        fill="#5fc4e5"
        d="M319.3,410.1l10.4-8.2c1.7-1.4,2.1-4,.7-5.8-.6-.9-1.6-1.4-2.6-1.5-.1,0-.3,0-.4,0-.8,0-1.6.3-2.3.8l-10.5,8.3.7.5c1.9,1.5,2.9,3.6,2.9,5.9s-1.1,4.4-2.9,5.9l-.7.5,10.5,8.3c.7.5,1.5.8,2.3.8,1.2,0,2.3-.6,3-1.6,1.3-1.8,1-4.4-.7-5.8l-10.4-8.2Z"
      />
      <path
        fill="#352872"
        d="M314.4,415.1c1.6-1.3,2.5-3.1,2.5-5s-.9-3.7-2.5-5l-12.3-9.7c-.7-.5-1.5-.8-2.3-.8s-.3,0-.4,0c-1,.1-2,.7-2.6,1.5-1.3,1.8-1,4.4.7,5.8l10.4,8.2-10.4,8.2c-1.7,1.4-2.1,4-.7,5.8,1.3,1.7,3.7,2,5.4.8l12.3-9.7Z"
      />
      <circle fill="#352872" cx="313.6" cy="395" r="3.7" />
      <text
        fill={tag}
        fontFamily="Montserrat, 'Plus Jakarta Sans', Arial, sans-serif"
        fontSize="11.4"
        fontWeight="400"
        letterSpacing="0.02em"
        textAnchor="end"
        x="390.4"
        y="447.8"
      >
        Protección Integral
      </text>
    </svg>
  );
}

export function Logo({
  href = "/",
  className = "",
  light = false,
  size = "md",
}: LogoProps) {
  const { width, height } = sizes[size];
  const mark = (
    <MarxelWordmark light={light} width={width} height={height} className={className} />
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
