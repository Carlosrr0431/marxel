import Link from "next/link";
import { loginCrm } from "@/lib/crm/actions";

export default async function CrmLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasError = params.error === "1";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0b3d6b_0%,_#071f35_45%,_#041525_100%)]" />
      <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-teal/30 blur-3xl" />
      <div className="absolute -right-10 bottom-10 h-80 w-80 rounded-full bg-sky/25 blur-3xl" />

      <form
        action={loginCrm}
        className="relative w-full max-w-md rounded-[1.75rem] border border-white/15 bg-white/95 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur"
      >
        <p className="font-display text-3xl font-bold tracking-tight text-navy">
          Mar<span className="text-teal">X</span>el
        </p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.28em] text-teal">
          CRM Studio
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Accedé al panel de leads, afiliados y seguimientos.
        </p>

        {hasError ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Clave incorrecta. Probá de nuevo.
          </p>
        ) : null}

        <label className="mt-6 block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Contraseña</span>
          <input
            type="password"
            name="password"
            required
            autoFocus
            className="crm-input"
            placeholder="••••••••"
          />
        </label>

        <button type="submit" className="crm-btn crm-btn-primary mt-5 w-full py-3.5">
          Entrar al CRM
        </button>

        <Link
          href="/"
          className="mt-4 block text-center text-xs text-muted hover:text-navy"
        >
          Volver al sitio
        </Link>
      </form>
    </div>
  );
}
