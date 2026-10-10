export const COVER_ROWS = [
  { key: "rc", label: "Responsabilidad civil" },
  { key: "remolque", label: "Remolque" },
  { key: "roboTotal", label: "Robo total" },
  { key: "roboParcial", label: "Robo parcial" },
  { key: "incendioTotal", label: "Incendio total" },
  { key: "incendioParcial", label: "Incendio parcial" },
  { key: "danoTotal", label: "Daño total" },
  { key: "danoParcial", label: "Daño parcial" },
  { key: "granizo", label: "Granizo" },
  { key: "cristales", label: "Cristales" },
  { key: "cerraduras", label: "Cerraduras" },
] as const;

export type CoverKey = (typeof COVER_ROWS)[number]["key"];
export type CoverMap = Record<CoverKey, string>;

const DETECTORS: { key: CoverKey; pattern: RegExp }[] = [
  { key: "rc", pattern: /responsabilidad civil/i },
  { key: "remolque", pattern: /remolque/i },
  { key: "roboParcial", pattern: /robo parcial/i },
  { key: "roboTotal", pattern: /robo total/i },
  { key: "incendioParcial", pattern: /incendio parcial/i },
  { key: "incendioTotal", pattern: /incendio total/i },
  { key: "danoParcial", pattern: /da[nñ]o parcial/i },
  { key: "danoTotal", pattern: /da[nñ]o total/i },
  { key: "granizo", pattern: /granizo/i },
  { key: "cristales", pattern: /cristales/i },
  { key: "cerraduras", pattern: /cerraduras/i },
];

function emptyCovers(): CoverMap {
  return Object.fromEntries(COVER_ROWS.map((row) => [row.key, "no"])) as CoverMap;
}

function noteAfter(text: string, index: number, length: number) {
  const rest = text.slice(index + length, index + length + 72);
  if (/sin l[ií]mites?/i.test(rest.slice(0, 28))) return "Sin límite";
  const capped = rest.match(/l[ií]mite\s*[^.)]{0,28}/i);
  if (capped && (capped.index ?? 99) < 40) return capped[0].replace(/\s+/g, " ").replace(/[.,]$/, "").trim();
  return "si";
}

export function parseSmgCovers(text: string): CoverMap | null {
  const source = text.replace(/\s+/g, " ").trim();
  if (!source) return null;
  const covers = emptyCovers();
  for (const detector of DETECTORS) {
    const match = detector.pattern.exec(source);
    if (!match) continue;
    covers[detector.key] = noteAfter(source, match.index, match[0].length);
  }
  return covers;
}

export function scCovers(key: string): CoverMap {
  const base = emptyCovers();
  if (key === "A") return { ...base, rc: "si" };
  const completo: CoverMap = {
    ...base,
    rc: "si",
    remolque: "si",
    roboTotal: "si",
    roboParcial: "Según póliza",
    incendioTotal: "si",
    incendioParcial: "Según póliza",
    danoTotal: "si",
    granizo: "si",
    cristales: "si",
    cerraduras: "si",
  };
  if (key === "D") return { ...completo, danoParcial: "Con franquicia" };
  return completo;
}
