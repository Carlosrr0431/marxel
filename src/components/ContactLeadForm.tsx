import Link from "next/link";

export function ContactLeadForm({ sent, invalid }: { sent: boolean; invalid: boolean }) {
  if (sent) {
    return (
      <div className="surface p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">Listo</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-navy">Te contactamos en breve</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Recibimos tu teléfono. Un asesor de MARXEN te va a escribir o llamar.
        </p>
      </div>
    );
  }

  return (
    <form id="formulario-contacto" method="post" action="/api/contacto" className="surface space-y-4 p-6 sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">Contacto</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-navy">Dejanos tu teléfono</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Te llamamos o te escribimos por WhatsApp. Sin mail ni datos de más.
        </p>
      </div>

      <label className="block text-sm" htmlFor="phone_number">
        <span className="mb-1.5 block font-medium text-navy">Número de teléfono</span>
        <input
          id="phone_number"
          name="phone_number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="387 000 0000"
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-navy outline-none focus:border-teal"
        />
      </label>

      <label className="block text-sm" htmlFor="message">
        <span className="mb-1.5 block font-medium text-navy">Mensaje (opcional)</span>
        <textarea
          id="message"
          name="message"
          rows={3}
          maxLength={500}
          placeholder="Contanos en qué te ayudamos"
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-navy outline-none focus:border-teal"
        />
      </label>

      {invalid ? <p className="text-sm text-rose-700">Ingresá un teléfono válido.</p> : null}

      <button type="submit" className="btn btn-primary w-full sm:w-auto">
        Quiero que me contacten
      </button>
      <p className="text-xs leading-relaxed text-muted">
        Al enviar aceptás que te contactemos por teléfono o WhatsApp.{" "}
        <Link href="/privacidad" className="font-medium text-navy underline-offset-2 hover:underline">
          Privacidad
        </Link>
      </p>
    </form>
  );
}
