"use client";

import { useState } from "react";

export function CopyTextButton({
  text,
  label = "Copiar ficha",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="crm-btn crm-btn-ghost text-xs"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
    >
      {copied ? "Copiado" : label}
    </button>
  );
}
