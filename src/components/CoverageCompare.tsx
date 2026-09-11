import Link from "next/link";
import {
  AUTO_COVERAGES,
  COVERAGE_ROWS,
  type CoverageKey,
  type CoverageMark,
} from "@/lib/auto-coverages";

const MARK: Record<CoverageMark, string> = {
  si: "Sí",
  no: "No",
  segun: "Según plan",
};

const COLS: { key: CoverageKey; label: string }[] = [
  { key: "terceros-basico", label: "Terceros básico" },
  { key: "terceros-completo", label: "Terceros completo" },
  { key: "todo-riesgo", label: "Todo riesgo" },
];

export function CoverageCompare() {
  return (
    <section className="border-b border-line/70 bg-cloud">
      <div className="container-mx py-14 sm:py-16 lg:py-20">
        <p className="eyebrow">Comparativa</p>
        <h2 className="mt-2 max-w-2xl font-display text-2xl font-semibold text-navy sm:text-3xl">
          Terceros básico, completo y todo riesgo
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Misma lógica que las fichas públicas de San Cristóbal: el básico cubre a
          terceros; el completo suma robo, incendio y destrucción total; el todo
          riesgo agrega daños parciales de tu auto, con franquicia. El detalle se
          confirma al cotizar.
        </p>

        <div className="mt-8 overflow-x-auto rounded-[1.25rem] border border-line/80 bg-white">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line/80 bg-mist/50">
                <th className="px-4 py-3 font-semibold text-navy">Cobertura</th>
                {COLS.map((col) => (
                  <th key={col.key} className="px-4 py-3 font-semibold text-navy">
                    <Link href={AUTO_COVERAGES[col.key].path} className="hover:underline">
                      {col.label}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COVERAGE_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-line/60 last:border-0">
                  <th className="px-4 py-3 font-medium text-ink">{row.label}</th>
                  {COLS.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-muted">
                      {MARK[row.valores[col.key]]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
