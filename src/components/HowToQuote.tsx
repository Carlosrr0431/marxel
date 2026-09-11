import Link from "next/link";
import { AUTO_QUOTE_STEPS } from "@/lib/auto-coverages";

export function HowToQuote({ quoteHref = "/seguro-de-auto#cotizar-online" }: { quoteHref?: string }) {
  return (
    <section className="border-b border-line/70 bg-mist/30">
      <div className="container-mx py-14 sm:py-16 lg:py-20">
        <p className="eyebrow">Cómo cotizar</p>
        <h2 className="mt-2 max-w-2xl font-display text-2xl font-semibold text-navy sm:text-3xl">
          Cuatro pasos, sin compromiso
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AUTO_QUOTE_STEPS.map((step, index) => (
            <li key={step.name} className="surface p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">
                Paso {index + 1}
              </p>
              <h3 className="mt-2 font-display text-lg font-semibold text-navy">{step.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
        <Link href={quoteHref} className="btn btn-primary mt-8">
          Ir al cotizador
        </Link>
      </div>
    </section>
  );
}
