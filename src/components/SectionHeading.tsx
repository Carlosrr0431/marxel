import Link from "next/link";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <h2 className="font-display text-[1.85rem] font-semibold text-navy sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-[0.98rem] leading-relaxed text-muted sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: { href?: string; label: string }[];
}) {
  return (
    <nav aria-label="Miga de pan" className="mb-5 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden>/</span> : null}
              {last || !item.href ? (
                <span className="font-medium text-navy" aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-navy hover:underline">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  cta,
  crumbs,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  cta?: { href: string; label: string };
  crumbs?: { href?: string; label: string }[];
}) {
  return (
    <section className="relative overflow-hidden border-b border-line/70 bg-atmosphere">
      <div className="container-mx py-14 sm:py-16 lg:py-20">
        {crumbs?.length ? <Breadcrumbs items={crumbs} /> : null}
        {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
        <h1 className="max-w-3xl font-display text-[2.1rem] font-semibold leading-[1.15] text-navy sm:text-5xl">
          {title}
        </h1>
        <p
          data-seo-lede
          className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg"
        >
          {description}
        </p>
        {cta ? (
          <Link href={cta.href} className="btn btn-primary btn-lg mt-8">
            {cta.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
