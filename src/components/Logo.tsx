import Link from "next/link";

type LogoProps = {
  href?: string;
  showSalud?: boolean;
  className?: string;
  light?: boolean;
};

export function Logo({
  href = "/",
  showSalud = false,
  className = "",
  light = false,
}: LogoProps) {
  const content = (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span
        className={`font-display text-[1.55rem] font-bold tracking-[-0.04em] sm:text-[1.7rem] ${
          light ? "text-white" : "text-navy"
        }`}
      >
        Mar
        <span className={light ? "text-gold" : "text-teal"}>X</span>
        el
      </span>
      {showSalud ? (
        <span
          className={`mt-0.5 pl-[2.55rem] text-[0.65rem] font-semibold uppercase tracking-[0.28em] sm:pl-[2.85rem] ${
            light ? "text-white/75" : "text-teal"
          }`}
        >
          Salud
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-block focus-visible:outline-none">
      {content}
    </Link>
  );
}
