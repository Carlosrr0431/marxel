"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SearchItem = {
  id: string;
  label: string;
  sub?: string;
  href: string;
  kind: "lead" | "afiliado";
};

export function CrmSearch({ items }: { items: SearchItem[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return items
      .filter(
        (i) =>
          i.label.toLowerCase().includes(term) ||
          (i.sub || "").toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [items, q]);

  return (
    <div className="relative w-full max-w-md">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar lead o afiliado…"
        className="crm-input bg-white/90 pl-10"
        aria-label="Buscar en CRM"
      />
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
        ⌕
      </span>
      {open && results.length > 0 ? (
        <ul className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_50px_rgba(7,31,53,0.12)]">
          {results.map((r) => (
            <li key={`${r.kind}-${r.id}`}>
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-mist"
                onMouseDown={() => {
                  router.push(r.href);
                  setOpen(false);
                  setQ("");
                }}
              >
                <span className="mt-0.5 rounded-md bg-mist px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal">
                  {r.kind === "lead" ? "Lead" : "Afil."}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-navy">{r.label}</span>
                  {r.sub ? <span className="text-xs text-muted">{r.sub}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
