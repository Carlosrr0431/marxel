import type { FaqItem } from "@/lib/content";

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="surface divide-y divide-line/80 overflow-hidden !shadow-none">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex w-full cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-mist/50 sm:px-6 [&::-webkit-details-marker]:hidden">
            <span className="text-[0.95rem] font-semibold leading-snug text-navy">
              {item.q}
            </span>
            <span
              className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-teal transition group-open:rotate-45 group-open:bg-aqua"
              aria-hidden
            >
              +
            </span>
          </summary>
          <p className="max-w-3xl px-5 pb-5 text-sm leading-relaxed text-muted sm:px-6">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}
