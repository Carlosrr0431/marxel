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
    <span className={`company-mark ${className}`}>
      <img src={company.logo} alt={company.name} />
    </span>
  );
}
