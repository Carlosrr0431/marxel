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
    <div className="flex min-h-screen items-center justify-center bg-atmosphere px-4">
      <form
        action={loginCrm}
        className="w-full max-w-sm rounded-2xl border border-line bg-white p-7 shadow-[0_20px_50px_rgba(10,61,107,0.08)]"
      >
        <p className="font-display text-2xl font-bold text-navy">
          Mar<span className="text-teal">X</span>el CRM
        </p>
        <p className="mt-2 text-sm text-muted">
          Ingresá la clave de acceso del panel.
        </p>

        {hasError ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Clave incorrecta. Probá de nuevo.
          </p>
        ) : null}

        <label className="mt-6 block">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Contraseña
          </span>
          <input
            type="password"
            name="password"
            required
            autoFocus
            className="w-full rounded-xl border border-line bg-cloud px-3.5 py-3 text-sm outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
          />
        </label>

        <button
          type="submit"
          className="mt-5 w-full rounded-xl bg-navy py-3 text-sm font-semibold text-white hover:bg-navy-deep"
        >
          Entrar
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
