import Link from "next/link";
import { site } from "@/lib/content";

export function WhatsAppButton() {
  const href = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
    "Hola Marxel, quiero asesoramiento."
  )}`;

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribir por WhatsApp"
      className="safe-bottom fixed right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-[0_10px_28px_rgba(37,211,102,0.35)] transition hover:scale-[1.03] sm:right-6 sm:h-14 sm:w-14"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M20.5 3.5A11 11 0 0 0 2.4 17.1L1.5 22l5-1.3A11 11 0 0 0 12 23a11 11 0 0 0 8.5-19.5ZM12 21a9 9 0 0 1-4.6-1.3l-.3-.2-3 .8.8-2.9-.2-.3A9 9 0 1 1 12 21Zm5-6.6c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5c.1-.2.1-.3 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.4s-1 1-1 2.4 1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 1.8.8 2.3.7 3.1.6.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.1-1.3s-.3-.2-.6-.3Z" />
      </svg>
    </Link>
  );
}
