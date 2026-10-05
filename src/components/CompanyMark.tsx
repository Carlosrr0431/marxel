import { companias } from "@/lib/content";

type Compania = (typeof companias)[number];

export function CompanyMark({
  company,
  className = "",
}: {
  company: Compania;
  className?: string;
}) {
  return (
    <span className={`company-mark ${className}`} style={{ color: company.color }}>
      <svg viewBox="0 0 160 64" role="img" aria-label={company.name}>
        <rect x="1" y="1" width="158" height="62" rx="12" fill="#fff" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10" y="10" width="8" height="44" rx="4" fill={company.accent} />
        <text x="28" y="38" fill="currentColor" fontFamily="Arial, Helvetica, sans-serif" fontSize="18" fontWeight="700">
          {company.mark}
        </text>
        <text x="28" y="52" fill={company.accent} fontFamily="Arial, Helvetica, sans-serif" fontSize="9" fontWeight="600" letterSpacing="1.2">
          {company.line.toUpperCase()}
        </text>
      </svg>
    </span>
  );
}
