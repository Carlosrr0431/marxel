"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/content";

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="surface divide-y divide-line/80 overflow-hidden !shadow-none">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-mist/50 sm:px-6"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span className="text-[0.95rem] font-semibold leading-snug text-navy">
                {item.q}
              </span>
              <span
                className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-teal transition ${
                  isOpen ? "rotate-45 bg-aqua" : ""
                }`}
                aria-hidden
              >
                +
              </span>
            </button>
            {isOpen ? (
              <div className="px-5 pb-5 sm:px-6">
                <p className="max-w-3xl text-sm leading-relaxed text-muted">
                  {item.a}
                </p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
