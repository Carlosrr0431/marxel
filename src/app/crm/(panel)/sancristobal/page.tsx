"use client";

import { useState } from "react";
import { PageHeader } from "@/components/crm/ui";

type Tab = "conexion" | "cartera" | "poliza" | "auto" | "hogar" | "consultas" | "agro";

const TABS: { id: Tab; label: string }[] = [
  { id: "conexion", label: "Conexión" },
  { id: "cartera", label: "Cartera" },
  { id: "poliza", label: "Póliza" },
  { id: "auto", label: "Cotizar auto" },
  { id: "hogar", label: "Cotizar hogar" },
  { id: "consultas", label: "Consultas" },
  { id: "agro", label: "Agro" },
];

function pretty(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function downloadFile(file: { filename: string; contentType: string; base64: string }) {
  const a = document.createElement("a");
  a.href = `data:${file.contentType};base64,${file.base64}`;
  a.download = file.filename || "reporte.pdf";
  a.click();
}

async function b2bGet(action: string, extra: Record<string, string> = {}) {
  const query = new URLSearchParams({ action, ...extra });
  const res = await fetch(`/api/crm/sc-b2b?${query}`);
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Error B2B");
  return data;
}

async function b2bPost(body: Record<string, unknown>) {
  const res = await fetch("/api/crm/sc-b2b", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Error B2B");
  return data;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

export default function SanCristobalPage() {
  const [tab, setTab] = useState<Tab>("conexion");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<unknown>(null);

  const [policyNumber, setPolicyNumber] = useState("");
  const [postal, setPostal] = useState("4400");
  const [dni, setDni] = useState("");
  const [claimNumber, setClaimNumber] = useState("");
  const [taxId, setTaxId] = useState("");
  const [phone, setPhone] = useState("3876348199");
  const [infoauto, setInfoauto] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear() - 5));
  const [age, setAge] = useState("35");
  const [casa, setCasa] = useState("8");
  const [ramo, setRamo] = useState("");
  const [polizaNro, setPolizaNro] = useState("");
  const [inciso, setInciso] = useState("1");
  const [agriKind, setAgriKind] = useState("payment-methods");

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      const data = await fn();
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operaciones PAS"
        title="San Cristóbal B2B"
        description="Conexión UAT del productor 08-006051: cartera, pólizas, cotización CA7/CP7, padrón, siniestros y reportes. El cotizador público de la web sigue en la API de marketing."
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`crm-btn ${tab === item.id ? "crm-btn-primary" : "crm-btn-ghost"}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "conexion" ? (
        <section className="crm-card space-y-4 p-5">
          <p className="text-sm text-muted">
            Verifica login JWT, productor del usuario B2B y datos de GetInfo. El token UAT dura unos 2 minutos y se
            renueva solo.
          </p>
          <button type="button" className="crm-btn crm-btn-primary" disabled={busy} onClick={() => run(() => b2bGet("ping"))}>
            Probar conexión
          </button>
        </section>
      ) : null}

      {tab === "cartera" ? (
        <section className="crm-card grid gap-3 p-5 sm:grid-cols-2">
          <button type="button" className="crm-btn crm-btn-primary" disabled={busy} onClick={() => run(() => b2bGet("portfolio"))}>
            Ver cartera
          </button>
          <button type="button" className="crm-btn crm-btn-ghost" disabled={busy} onClick={() => run(() => b2bGet("affinity"))}>
            Grupos de afinidad
          </button>
          <button
            type="button"
            className="crm-btn crm-btn-ghost"
            disabled={busy}
            onClick={() => run(() => b2bGet("movements", { date: new Date().toISOString() }))}
          >
            Movimientos de hoy
          </button>
          <button
            type="button"
            className="crm-btn crm-btn-ghost"
            disabled={busy}
            onClick={() =>
              run(() =>
                b2bGet("claims", {
                  start: new Date(Date.now() - 30 * 86400000).toISOString(),
                  end: new Date().toISOString(),
                })
              )
            }
          >
            Siniestros (30 días)
          </button>
        </section>
      ) : null}

      {tab === "poliza" ? (
        <section className="crm-card space-y-4 p-5">
          <Field label="Número de póliza">
            <input className="crm-input" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="crm-btn crm-btn-primary"
              disabled={busy || !policyNumber}
              onClick={() => run(() => b2bGet("policy", { policyNumber, includePayments: "1" }))}
            >
              Detalle
            </button>
            <button
              type="button"
              className="crm-btn crm-btn-ghost"
              disabled={busy || !policyNumber}
              onClick={() => run(() => b2bGet("policy-search", { policyNumber }))}
            >
              Buscar
            </button>
            <button
              type="button"
              className="crm-btn crm-btn-ghost"
              disabled={busy || !policyNumber}
              onClick={() => run(() => b2bGet("payments", { policyNumber }))}
            >
              Pagos
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Casa">
              <input className="crm-input" value={casa} onChange={(e) => setCasa(e.target.value)} />
            </Field>
            <Field label="Ramo">
              <input className="crm-input" value={ramo} onChange={(e) => setRamo(e.target.value)} />
            </Field>
            <Field label="Póliza nro">
              <input className="crm-input" value={polizaNro} onChange={(e) => setPolizaNro(e.target.value)} />
            </Field>
            <Field label="Inciso">
              <input className="crm-input" value={inciso} onChange={(e) => setInciso(e.target.value)} />
            </Field>
          </div>
          <button
            type="button"
            className="crm-btn crm-btn-teal"
            disabled={busy || !ramo || !polizaNro}
            onClick={() =>
              run(async () => {
                const data = await b2bGet("report", {
                  kind: "frente-poliza",
                  casa,
                  ramo,
                  polizaNro,
                  inciso,
                });
                if (data.file) downloadFile(data.file);
                return data.file ? { descargado: data.file.filename } : data;
              })
            }
          >
            Descargar frente de póliza
          </button>
        </section>
      ) : null}

      {tab === "auto" ? (
        <section className="crm-card grid gap-3 p-5 sm:grid-cols-2">
          <Field label="CUIT / CUIL del asegurado">
            <input className="crm-input" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="20-40111222-8" />
          </Field>
          <Field label="Edad">
            <input className="crm-input" value={age} onChange={(e) => setAge(e.target.value)} />
          </Field>
          <Field label="Código Infoauto">
            <input className="crm-input" value={infoauto} onChange={(e) => setInfoauto(e.target.value)} />
          </Field>
          <Field label="Año">
            <input className="crm-input" value={year} onChange={(e) => setYear(e.target.value)} />
          </Field>
          <Field label="Código postal (Salta = 4400)">
            <input className="crm-input" value={postal} onChange={(e) => setPostal(e.target.value)} />
          </Field>
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              className="crm-btn crm-btn-ghost"
              disabled={busy || !infoauto || !year}
              onClick={() => run(() => b2bGet("vehicle-version", { codigoInfoauto: infoauto, anio: year }))}
            >
              Validar versión
            </button>
            <button
              type="button"
              className="crm-btn crm-btn-primary"
              disabled={busy || !taxId || !infoauto}
              onClick={() =>
                run(() =>
                  b2bPost({
                    action: "quote-ca7",
                    taxId,
                    officialIdType: "Ext_CUIL86",
                    age: Number(age),
                    postalCode: Number(postal),
                    locationState: "AR_01",
                    infoautoCode: infoauto,
                    year: Number(year),
                  })
                )
              }
            >
              Cotizar CA7
            </button>
          </div>
        </section>
      ) : null}

      {tab === "hogar" ? (
        <section className="crm-card grid gap-3 p-5 sm:grid-cols-2">
          <Field label="CUIL (persona física)">
            <input className="crm-input" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="20-40111222-8" />
          </Field>
          <Field label="Celular">
            <input className="crm-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Código postal">
            <input className="crm-input" value={postal} onChange={(e) => setPostal(e.target.value)} />
          </Field>
          <button
            type="button"
            className="crm-btn crm-btn-primary sm:col-span-2"
            disabled={busy || !taxId}
            onClick={() =>
              run(() =>
                b2bPost({
                  action: "quote-cp7",
                  taxId,
                  postalCode: postal,
                  state: "AR_01",
                  city: "SALTA",
                  phone,
                  policyTypeCode: "CP7_CombinedCombinedFamily",
                  officialIdType: "Ext_CUIL86",
                })
              )
            }
          >
            Cotizar hogar (CP7)
          </button>
        </section>
      ) : null}

      {tab === "consultas" ? (
        <section className="crm-card grid gap-3 p-5 sm:grid-cols-2">
          <Field label="Código postal">
            <input className="crm-input" value={postal} onChange={(e) => setPostal(e.target.value)} />
          </Field>
          <button type="button" className="crm-btn crm-btn-ghost self-end" disabled={busy} onClick={() => run(() => b2bGet("postal", { codigo: postal }))}>
            Ciudades
          </button>
          <Field label="DNI (padrón, solo duplicados)">
            <input className="crm-input" value={dni} onChange={(e) => setDni(e.target.value)} />
          </Field>
          <button type="button" className="crm-btn crm-btn-ghost self-end" disabled={busy || !dni} onClick={() => run(() => b2bGet("padron", { dni }))}>
            Buscar CUIL
          </button>
          <Field label="Nro. de siniestro">
            <input className="crm-input" value={claimNumber} onChange={(e) => setClaimNumber(e.target.value)} />
          </Field>
          <button
            type="button"
            className="crm-btn crm-btn-ghost self-end"
            disabled={busy || !claimNumber}
            onClick={() => run(() => b2bGet("claim", { claimNumber }))}
          >
            Ver siniestro
          </button>
          <button
            type="button"
            className="crm-btn crm-btn-ghost sm:col-span-2"
            disabled={busy}
            onClick={() => run(() => b2bGet("typelist", { name: "Product" }))}
          >
            Listar productos
          </button>
        </section>
      ) : null}

      {tab === "agro" ? (
        <section className="crm-card space-y-4 p-5">
          <Field label="Catálogo">
            <select className="crm-input" value={agriKind} onChange={(e) => setAgriKind(e.target.value)}>
              <option value="payment-methods">Métodos de pago</option>
              <option value="coverages">Coberturas</option>
              <option value="crop-risks">Cultivos</option>
              <option value="tillage-type">Labranza</option>
              <option value="exchange-type">Canje</option>
            </select>
          </Field>
          <button type="button" className="crm-btn crm-btn-primary" disabled={busy} onClick={() => run(() => b2bGet("agri-catalog", { kind: agriKind }))}>
            Consultar catálogo agro
          </button>
          <p className="text-xs text-muted">
            Cotizar y emitir agro (quote-and-issue-offcore) no está en esta pantalla a propósito: emite póliza en un
            solo paso.
          </p>
        </section>
      ) : null}

      {busy ? <p className="text-sm text-muted">Consultando San Cristóbal…</p> : null}
      {error ? <p className="crm-card border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      {result ? (
        <pre className="crm-card max-h-96 overflow-auto p-4 text-xs leading-relaxed text-navy">
          {pretty(result)}
        </pre>
      ) : null}
    </div>
  );
}
