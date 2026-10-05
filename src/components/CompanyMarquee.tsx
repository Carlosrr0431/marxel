import { companias } from "@/lib/content";
import { CompanyMark } from "./CompanyMark";

export function CompanyMarquee() {
  const loop = [...companias, ...companias];

  return (
    <section id="companias" className="company-marquee" aria-label="Compañías">
      <p className="company-marquee__label">Compañías con las que cotizamos</p>
      <div className="company-marquee__viewport">
        <div className="company-track">
          {loop.map((company, index) => (
            <div className="company-card" key={`${company.slug}-${index}`}>
              <CompanyMark company={company} />
              <span>{company.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
