"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EmptyState, PageHeader } from "@/components/crm/ui";
import {
  asDict,
  asList,
  catalogItems,
  dateOf,
  moneyOf,
  pickProducer,
  rowsFrom,
  textOf,
} from "@/lib/sc-b2b/display";

type Tab = "conexion" | "cartera" | "poliza" | "auto" | "hogar" | "consultas" | "agro";
type CarteraView = "policies" | "affinity" | "movements" | "claims";

const TABS: { id: Tab; label: string }[] = [
  { id: "conexion", label: "Conexión" },
  { id: "cartera", label: "Cartera" },
  { id: "poliza", label: "Póliza" },
  { id: "auto", label: "Cotizar auto" },
  { id: "hogar", label: "Cotizar hogar" },
  { id: "consultas", label: "Consultas" },
  { id: "agro", label: "Agro" },
];

const YEARS = Array.from({ length: 16 }, (_, i) => String(new Date().getFullYear() - i));

const REPORTS = [
  ["frente-poliza", "Frente de póliza"],
  ["frente-endoso", "Frente de endoso"],
  ["cupones", "Cupones"],
  ["constancia", "Constancia de cobertura"],
  ["certificado", "Certificado de cobertura"],
  ["denuncia", "Denuncia de siniestro"],
] as const;

const AGRI_OPTIONS = [
  ["payment-methods", "Métodos de pago"],
  ["coverages", "Coberturas"],
  ["crop-risks", "Cultivos"],
  ["tillage-type", "Labranza"],
  ["exchange-type", "Canje"],
] as const;

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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="crm-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold text-pretty text-navy">{value || "—"}</p>
    </div>
  );
}

function Table({
  columns,
  rows,
  empty,
  loading,
  onRow,
}: {
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
  empty: string;
  loading?: boolean;
  onRow?: (row: Record<string, string>) => void;
}) {
  if (loading) {
    return (
      <div className="crm-card px-5 py-12 text-center text-sm text-muted">
        Consultando San Cristóbal…
      </div>
    );
  }
  if (!rows.length) {
    return <EmptyState title="Sin resultados" description={empty} />;
  }
  return (
    <div className="crm-card overflow-x-auto">
      <table className="w-full min-w-160 text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-semibold">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id || `${row.Póliza || row.Nombre || index}`}
              className={
                onRow
                  ? "cursor-pointer border-b border-line last:border-0 hover:bg-mist"
                  : "border-b border-line last:border-0"
              }
              onClick={onRow ? () => onRow(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-navy">
                  {row[col.key] || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailGrid({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  if (!rows.length) return null;
  return (
    <section className="crm-card p-5">
      <h2 className="mb-4 font-display text-lg font-semibold text-navy">{title}</h2>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{row.label}</dt>
            <dd className="mt-1 text-sm text-navy">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function agriRowsFrom(kind: string, data: unknown): Record<string, string>[] {
  const root = asDict(data);
  if (kind === "payment-methods") {
    const rows: Record<string, string>[] = [];
    for (const group of asList(root.paymentCatalog || root)) {
      for (const method of asList(asDict(group).paymentMethods)) {
        rows.push({
          id: `${textOf(group.typeOfContractingCode)}-${textOf(method.paymentMethodCode)}`,
          Contratación: textOf(group.typeOfContractingDescription),
          Pago: textOf(method.paymentMethodDescription),
          Código: textOf(method.paymentMethodCode),
        });
      }
    }
    return rows;
  }
  const keyed =
    kind === "coverages"
      ? root.coverages
      : kind === "crop-risks"
        ? root.cropRisksCatalog
        : kind === "tillage-type"
          ? root.tillageTypes
          : root.exchangeTypes;
  return asList(keyed || root).map((row, index) => ({
    id: textOf(row.code) || String(index),
    Código: textOf(row.code),
    Nombre: textOf(row.description) || textOf(row.name),
  }));
}

export default function SanCristobalPage() {
  const [tab, setTab] = useState<Tab>("cartera");
  const [carteraView, setCarteraView] = useState<CarteraView>("policies");
  const [boot, setBoot] = useState<Record<string, unknown> | null>(null);
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");

  const [policies, setPolicies] = useState<Record<string, unknown>[]>([]);
  const [affinity, setAffinity] = useState<Record<string, unknown>[]>([]);
  const [movements, setMovements] = useState<Record<string, unknown>[]>([]);
  const [claims, setClaims] = useState<Record<string, unknown>[]>([]);
  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [cities, setCities] = useState<Record<string, unknown>[]>([]);
  const [policyDetail, setPolicyDetail] = useState<Record<string, unknown> | null>(null);
  const [payments, setPayments] = useState<Record<string, unknown>[]>([]);
  const [padron, setPadron] = useState<Record<string, unknown>[]>([]);
  const [commissions, setCommissions] = useState<Record<string, unknown>[]>([]);
  const [quotePlans, setQuotePlans] = useState<Record<string, unknown>[]>([]);
  const [hogarQuote, setHogarQuote] = useState<Record<string, unknown> | null>(null);
  const [agriRows, setAgriRows] = useState<Record<string, string>[]>([]);

  const [policyNumber, setPolicyNumber] = useState("");
  const [postal, setPostal] = useState("4400");
  const [dni, setDni] = useState("");
  const [claimNumber, setClaimNumber] = useState("");
  const [taxId, setTaxId] = useState("");
  const [phone, setPhone] = useState("3876348199");
  const [age, setAge] = useState("35");
  const [casa, setCasa] = useState("8");
  const [ramo, setRamo] = useState("");
  const [polizaNro, setPolizaNro] = useState("");
  const [inciso, setInciso] = useState("1");
  const [reportKind, setReportKind] = useState("frente-poliza");
  const [agriKind, setAgriKind] = useState("payment-methods");
  const [yearMonth, setYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [year, setYear] = useState(String(new Date().getFullYear() - 5));
  const [brands, setBrands] = useState<{ id: number; description: string }[]>([]);
  const [models, setModels] = useState<{ id: number; description: string }[]>([]);
  const [versions, setVersions] = useState<
    { id: number; description: string; infoAutoCode: string; statedAmount?: number }[]
  >([]);
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [is0Km, setIs0Km] = useState(false);
  const [hasGnc, setHasGnc] = useState(false);

  const producer = useMemo(() => pickProducer(boot), [boot]);
  const warnings = useMemo(
    () => (Array.isArray(boot?.warnings) ? boot.warnings.filter((item): item is string => Boolean(item)) : []),
    [boot]
  );
  const city = cities[0] || {};

  async function run<T>(fn: () => Promise<T>, after?: (data: T) => void) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await fn();
      after?.(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      return null;
    } finally {
      setBusy(false);
    }
  }

  function applyBoot(data: Record<string, unknown>) {
    setBoot(data);
    setPolicies(asList(data.portfolio));
    setAffinity(asList(data.affinity));
    setMovements(asList(data.movements));
    setClaims(asList(data.claims));
    setProducts(asList(data.products));
    setCities(asList(data.postal));
  }

  async function openPolicy(number: string) {
    if (!number) return;
    setPolicyNumber(number);
    setTab("poliza");
    await run(() => b2bGet("policy", { policyNumber: number, includePayments: "1" }), (data) => {
      const detail = asDict(asDict(data.data).PolicyDetail || data.data);
      setPolicyDetail(detail);
      setPayments(asList(detail.Payments || asDict(data.data).Payments || data.data));
    });
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      setBooting(true);
      setError("");
      try {
        const data = await b2bGet("bootstrap");
        if (!ignore) applyBoot(data);
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : "Error");
      } finally {
        if (!ignore) setBooting(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`/api/sc-auto?kind=brands&year=${encodeURIComponent(year)}`);
        const data = await res.json();
        if (!ignore) {
          setBrands(catalogItems(data, "brands"));
          setBrandId("");
          setModels([]);
          setVersions([]);
          setModelId("");
          setVersionId("");
        }
      } catch {
        if (!ignore) setBrands([]);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [year]);

  useEffect(() => {
    if (!brandId) return;
    let ignore = false;
    (async () => {
      const params = new URLSearchParams({ kind: "models", year, brandId });
      const res = await fetch(`/api/sc-auto?${params}`);
      const data = await res.json();
      if (!ignore) {
        setModels(catalogItems(data, "models"));
        setVersions([]);
        setModelId("");
        setVersionId("");
      }
    })();
    return () => {
      ignore = true;
    };
  }, [brandId, year]);

  useEffect(() => {
    if (!brandId || !modelId) return;
    let ignore = false;
    (async () => {
      const params = new URLSearchParams({ kind: "versions", year, brandId, modelId });
      const res = await fetch(`/api/sc-auto?${params}`);
      const data = await res.json();
      if (!ignore) {
        setVersions(catalogItems(data, "versions"));
        setVersionId("");
      }
    })();
    return () => {
      ignore = true;
    };
  }, [brandId, modelId, year]);

  useEffect(() => {
    if (tab !== "agro") return;
    void run(() => b2bGet("agri-catalog", { kind: agriKind }), (data) => {
      setAgriRows(agriRowsFrom(agriKind, data.data));
    });
  }, [tab, agriKind]);

  const selectedVersion = versions.find((item) => String(item.id) === versionId);
  const policyRows = policies
    .map((row, index) => ({
      id: textOf(row.PolicyNumber) || String(index),
      Póliza: textOf(row.PolicyNumber),
      Asegurado: textOf(row.InsuredName),
      Documento: textOf(row.InsuredDocument),
      Ramo: textOf(row.PolicyType),
      Estado: textOf(row.State),
    }))
    .filter((row) => {
      const hay = query.trim().toLowerCase();
      if (!hay) return true;
      return `${row.Póliza} ${row.Asegurado} ${row.Documento} ${row.Ramo}`.toLowerCase().includes(hay);
    });
  const affinityRows = affinity.map((row, index) => ({
    id: textOf(row.PublicId) || String(index),
    Nombre: textOf(row.DisplayName),
    Tipo: textOf(asDict(row.AffinityGroupType).Description) || textOf(asDict(row.AffinityGroupType).Code),
    Código: textOf(row.PublicId),
  }));
  const movementRows = movements.map((row, index) => ({
    id: textOf(row.PolicyNumber) || String(index),
    Póliza: textOf(row.PolicyNumber),
    Casa: textOf(row.Branch),
    Asegurado: textOf(row.InsuredName),
  }));
  const claimRows = claims.map((row, index) => ({
    id: textOf(row.ClaimNumber) || String(index),
    Siniestro: textOf(row.ClaimNumber),
    Póliza: textOf(row.PolicyNumber),
    Asegurado: textOf(asDict(row.Insured).Name || asDict(row.Insured).DisplayName),
    Hecho: dateOf(row.LossDate),
    Estado: textOf(asDict(row.State).Description) || textOf(asDict(row.State).Code),
  }));
  const paymentRows = payments.map((row, index) => ({
    id: textOf(row.InstallmentNumber) || String(index),
    Cuota: textOf(row.InstallmentNumber),
    Vence: dateOf(row.DueDate || row.PaymentDate),
    Importe: moneyOf(row.Amount || row.TotalAmount || row),
    Estado: textOf(row.Status || row.State),
  }));
  const padronRows = padron.map((row, index) => ({
    id: textOf(row.Cuil) || textOf(row.CUIT) || String(index),
    CUIL: textOf(row.Cuil) || textOf(row.CUIT) || textOf(row.TaxId),
    Nombre: textOf(row.Name) || textOf(row.DisplayName),
    Sexo: textOf(row.Gender) || textOf(row.Sexo),
  }));
  const commissionRows = commissions.map((row, index) => ({
    id: textOf(row.PolicyNumber) || String(index),
    Póliza: textOf(row.PolicyNumber),
    Comisión: moneyOf(row.CommissionAmount || row.Amount || row.EarnedCommission),
    Período: textOf(row.YearMonth) || yearMonth,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operaciones PAS"
        title="San Cristóbal B2B"
        description={`${producer.name} · ${producer.code} · ambiente ${producer.env}. El cotizador público de la web sigue en marketing.`}
        actions={
          <span className={`crm-badge ${boot ? "bg-emerald-100 text-emerald-800" : "bg-mist text-muted"}`}>
            {boot ? `${producer.env} conectado` : "Cargando…"}
          </span>
        }
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
        <div className="space-y-4">
          <section className="crm-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal">Productor asesor</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-navy">{producer.name}</h2>
            <p className="mt-1 text-sm text-muted">
              {producer.code} · CUIT {producer.taxId} · organizador {producer.organizer}
            </p>
          </section>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Canal" value={producer.channel} />
            <Stat label="Ambiente" value={producer.env} />
            <Stat label="Pólizas en cartera" value={String(policies.length)} />
            <Stat label="Campañas" value={String(affinity.length)} />
            <Stat label="Movimientos de ayer" value={String(movements.length)} />
            <Stat label="Siniestros (30 días)" value={String(claims.length)} />
            <Stat label="Productos" value={String(products.length)} />
            <Stat label="Localidad CP 4400" value={textOf(city.Nombre) || "Salta"} />
          </div>
        </div>
      ) : null}

      {tab === "cartera" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["policies", "Pólizas", policies.length],
                ["affinity", "Campañas", affinity.length],
                ["movements", "Movimientos", movements.length],
                ["claims", "Siniestros", claims.length],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                className={`crm-btn ${carteraView === id ? "crm-btn-teal" : "crm-btn-ghost"}`}
                onClick={() => setCarteraView(id)}
              >
                {label}
                <span className="crm-badge bg-white/70 text-navy">{count}</span>
              </button>
            ))}
            <button
              type="button"
              className="crm-btn crm-btn-ghost"
              disabled={busy || booting}
              onClick={() =>
                void run(() => b2bGet("bootstrap"), (data) => applyBoot(data))
              }
            >
              Actualizar
            </button>
          </div>
          {carteraView === "policies" ? (
            <>
              <input
                className="crm-input max-w-md"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar póliza, asegurado o documento"
              />
              <Table
                loading={booting}
                columns={[
                  { key: "Póliza", label: "Póliza" },
                  { key: "Asegurado", label: "Asegurado" },
                  { key: "Documento", label: "Documento" },
                  { key: "Ramo", label: "Ramo" },
                  { key: "Estado", label: "Estado" },
                ]}
                rows={policyRows}
                empty="La conexión anda, pero UAT todavía no tiene pólizas para este productor. Cuando existan, se listan acá y se puede abrir el detalle."
                onRow={(row) => void openPolicy(row.Póliza)}
              />
            </>
          ) : null}
          {carteraView === "affinity" ? (
            <Table
              loading={booting}
              columns={[
                { key: "Nombre", label: "Campaña" },
                { key: "Tipo", label: "Tipo" },
                { key: "Código", label: "ID" },
              ]}
              rows={affinityRows}
              empty="No hay grupos de afinidad para este productor."
            />
          ) : null}
          {carteraView === "movements" ? (
            <Table
              loading={booting}
              columns={[
                { key: "Póliza", label: "Póliza" },
                { key: "Asegurado", label: "Asegurado" },
                { key: "Casa", label: "Casa" },
              ]}
              rows={movementRows}
              empty="No hay movimientos de ayer. San Cristóbal no deja consultar el día en curso."
              onRow={(row) => void openPolicy(row.Póliza)}
            />
          ) : null}
          {carteraView === "claims" ? (
            <Table
              loading={booting}
              columns={[
                { key: "Siniestro", label: "Siniestro" },
                { key: "Póliza", label: "Póliza" },
                { key: "Asegurado", label: "Asegurado" },
                { key: "Hecho", label: "Hecho" },
                { key: "Estado", label: "Estado" },
              ]}
              rows={claimRows}
              empty="No hay siniestros en los últimos 30 días."
            />
          ) : null}
        </div>
      ) : null}

      {tab === "poliza" ? (
        <div className="space-y-4">
          <section className="crm-card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Número de póliza">
              <input className="crm-input" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
            </Field>
            <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
              <button
                type="button"
                className="crm-btn crm-btn-primary"
                disabled={busy || !policyNumber}
                onClick={() => void openPolicy(policyNumber)}
              >
                Ver detalle
              </button>
              <button
                type="button"
                className="crm-btn crm-btn-ghost"
                disabled={busy || !policyNumber}
                onClick={() =>
                  void run(() => b2bGet("payments", { policyNumber }), (data) => {
                    setPayments(asList(data.data));
                    setPolicyDetail(asDict(data.data));
                  })
                }
              >
                Ver pagos
              </button>
            </div>
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
            <Field label="Reporte">
              <select className="crm-input" value={reportKind} onChange={(e) => setReportKind(e.target.value)}>
                {REPORTS.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <button
              type="button"
              className="crm-btn crm-btn-teal sm:col-span-2 lg:col-span-3"
              disabled={busy || !ramo || !polizaNro}
              onClick={() =>
                void run(async () => {
                  const data = await b2bGet("report", { kind: reportKind, casa, ramo, polizaNro, inciso });
                  if (data.file) {
                    downloadFile(data.file);
                    setNotice(`Se descargó ${data.file.filename}`);
                  }
                  return data;
                })
              }
            >
              Descargar PDF
            </button>
          </section>
          <DetailGrid title="Detalle de póliza" rows={rowsFrom(policyDetail)} />
          {paymentRows.length ? (
            <Table
              columns={[
                { key: "Cuota", label: "Cuota" },
                { key: "Vence", label: "Vencimiento" },
                { key: "Importe", label: "Importe" },
                { key: "Estado", label: "Estado" },
              ]}
              rows={paymentRows}
              empty="Esta póliza no tiene pagos para mostrar."
            />
          ) : null}
          {!policyDetail && !busy ? (
            <EmptyState
              title="Todavía no hay una póliza abierta"
              description="Escribí el número o abrí una fila desde Cartera."
            />
          ) : null}
        </div>
      ) : null}

      {tab === "auto" ? (
        <div className="space-y-4">
          <section className="crm-card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="CUIL del asegurado">
              <input
                className="crm-input"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="20-40111222-8"
              />
            </Field>
            <Field label="Edad">
              <input className="crm-input" value={age} onChange={(e) => setAge(e.target.value)} />
            </Field>
            <Field label="Código postal">
              <input className="crm-input" value={postal} onChange={(e) => setPostal(e.target.value)} />
            </Field>
            <Field label="Año">
              <select className="crm-input" value={year} onChange={(e) => setYear(e.target.value)}>
                {YEARS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Marca">
              <select className="crm-input" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">Elegí marca</option>
                {brands.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.description}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Modelo">
              <select className="crm-input" value={modelId} onChange={(e) => setModelId(e.target.value)} disabled={!brandId}>
                <option value="">Elegí modelo</option>
                {models.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.description}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Versión">
              <select
                className="crm-input"
                value={versionId}
                onChange={(e) => setVersionId(e.target.value)}
                disabled={!modelId}
              >
                <option value="">Elegí versión</option>
                {versions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.description}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 self-end text-sm text-navy">
              <input type="checkbox" checked={is0Km} onChange={(e) => setIs0Km(e.target.checked)} />
              0 km
            </label>
            <label className="flex items-center gap-2 self-end text-sm text-navy">
              <input type="checkbox" checked={hasGnc} onChange={(e) => setHasGnc(e.target.checked)} />
              GNC
            </label>
            {selectedVersion?.statedAmount ? (
              <p className="self-end text-sm text-muted">Suma {moneyOf(selectedVersion.statedAmount)}</p>
            ) : null}
            <button
              type="button"
              className="crm-btn crm-btn-primary sm:col-span-2 lg:col-span-3"
              disabled={busy || !taxId || !selectedVersion?.infoAutoCode}
              onClick={() =>
                void run(
                  () =>
                    b2bPost({
                      action: "quote-ca7",
                      taxId,
                      officialIdType: "Ext_CUIL86",
                      age: Number(age),
                      postalCode: Number(postal),
                      locationState: textOf(city.Estado) || "AR_01",
                      infoautoCode: selectedVersion?.infoAutoCode,
                      year: Number(year),
                      statedAmount: selectedVersion?.statedAmount,
                      is0Km,
                      hasGnc,
                    }),
                  (data) => setQuotePlans(asList(asDict(data.data).Summaries))
                )
              }
            >
              Cotizar auto
            </button>
          </section>
          {quotePlans.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {quotePlans.map((plan) => (
                <article key={textOf(plan.QuoteId) || textOf(plan.ProductCode)} className="crm-card p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal">
                    {textOf(plan.ProductOffering) || textOf(plan.ProductCode)}
                  </p>
                  <p className="mt-2 font-display text-2xl font-semibold text-navy">{moneyOf(plan.TotalCost)}</p>
                  <p className="mt-1 text-sm text-muted">Prima {moneyOf(plan.TotalPremium)}</p>
                  {textOf(plan.DeductibleTypeFullDescription) ? (
                    <p className="mt-3 text-xs text-muted">{textOf(plan.DeductibleTypeFullDescription)}</p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Todavía no hay cotización"
              description="Elegí marca, modelo y versión. En UAT Guidewire a veces falla el motor CA7; si pasa, el aviso queda arriba."
            />
          )}
        </div>
      ) : null}

      {tab === "hogar" ? (
        <div className="space-y-4">
          <section className="crm-card grid gap-3 p-5 sm:grid-cols-2">
            <Field label="CUIL">
              <input
                className="crm-input"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="20-40111222-8"
              />
            </Field>
            <Field label="Celular">
              <input className="crm-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Código postal">
              <input className="crm-input" value={postal} onChange={(e) => setPostal(e.target.value)} />
            </Field>
            <p className="self-end text-sm text-muted">
              {textOf(city.Nombre) || "Salta"} · {textOf(city.Estado) || "AR_01"} · Plan Plus
            </p>
            <button
              type="button"
              className="crm-btn crm-btn-primary sm:col-span-2"
              disabled={busy || !taxId}
              onClick={() =>
                void run(
                  () =>
                    b2bPost({
                      action: "quote-cp7",
                      taxId,
                      postalCode: postal,
                      state: textOf(city.Estado) || "AR_01",
                      city: textOf(city.Nombre) || "SALTA",
                      phone,
                      policyTypeCode: "CP7_CombinedCombinedFamily",
                      basicPlanCode: "Plan Plus",
                      officialIdType: "Ext_CUIL86",
                    }),
                  (data) => setHogarQuote(asDict(data.data))
                )
              }
            >
              Cotizar hogar Plan Plus
            </button>
          </section>
          {hogarQuote ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Propuesta" value={textOf(hogarQuote.JobNumber) || "—"} />
              <Stat label="Costo total" value={moneyOf(hogarQuote.TotalCost)} />
              <Stat label="Prima" value={moneyOf(hogarQuote.TotalPremium)} />
            </div>
          ) : (
            <EmptyState
              title="Cotizá el hogar"
              description="Usa Plan Plus, el código que UAT acepta para combinado familiar."
            />
          )}
        </div>
      ) : null}

      {tab === "consultas" ? (
        <div className="space-y-4">
          <section className="crm-card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Código postal">
              <input className="crm-input" value={postal} onChange={(e) => setPostal(e.target.value)} />
            </Field>
            <button
              type="button"
              className="crm-btn crm-btn-ghost self-end"
              disabled={busy}
              onClick={() =>
                void run(() => b2bGet("postal", { codigo: postal }), (data) => setCities(asList(data.data)))
              }
            >
              Buscar ciudades
            </button>
            <Field label="DNI (padrón, solo duplicados)">
              <input className="crm-input" value={dni} onChange={(e) => setDni(e.target.value)} />
            </Field>
            <button
              type="button"
              className="crm-btn crm-btn-ghost self-end"
              disabled={busy || !dni}
              onClick={() =>
                void run(() => b2bGet("padron", { dni }), (data) => {
                  setPadron(asList(data.data));
                  setNotice(textOf(asDict(data.data).Message) || `${asList(data.data).length} CUIL encontrados`);
                })
              }
            >
              Buscar CUIL
            </button>
            <Field label="Nro. de siniestro">
              <input className="crm-input" value={claimNumber} onChange={(e) => setClaimNumber(e.target.value)} />
            </Field>
            <button
              type="button"
              className="crm-btn crm-btn-ghost self-end"
              disabled={busy || !claimNumber}
              onClick={() => {
                setTab("cartera");
                setCarteraView("claims");
                void run(() => b2bGet("claim", { claimNumber }), (data) => {
                  const list = asList(data.data);
                  setClaims(list.length ? list : [asDict(data.data)]);
                });
              }}
            >
              Ver siniestro
            </button>
            <Field label="CUIT comisiones">
              <input className="crm-input" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder={producer.taxId} />
            </Field>
            <Field label="Período AAAAMM">
              <input className="crm-input" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} />
            </Field>
            <button
              type="button"
              className="crm-btn crm-btn-ghost self-end"
              disabled={busy || !yearMonth}
              onClick={() =>
                void run(
                  () => b2bGet("commissions", { taxId: taxId || producer.taxId, yearMonth }),
                  (data) => setCommissions(asList(data.data))
                )
              }
            >
              Ver comisiones
            </button>
          </section>
          <Table
            columns={[
              { key: "Ciudad", label: "Ciudad" },
              { key: "Provincia", label: "Provincia" },
              { key: "Código", label: "Estado" },
            ]}
            rows={cities.map((row, index) => ({
              id: `${textOf(row.Nombre)}-${index}`,
              Ciudad: textOf(row.Nombre),
              Provincia: textOf(row.EstadoDescripcion),
              Código: textOf(row.Estado),
            }))}
            empty="Ingresá un código postal para ver localidades."
          />
          {padronRows.length ? (
            <Table
              columns={[
                { key: "CUIL", label: "CUIL" },
                { key: "Nombre", label: "Nombre" },
                { key: "Sexo", label: "Sexo" },
              ]}
              rows={padronRows}
              empty="Sin CUIL para ese DNI."
            />
          ) : null}
          {commissionRows.length ? (
            <Table
              columns={[
                { key: "Póliza", label: "Póliza" },
                { key: "Comisión", label: "Comisión" },
                { key: "Período", label: "Período" },
              ]}
              rows={commissionRows}
              empty="Sin comisiones en ese período."
            />
          ) : null}
          <section className="crm-card p-5">
            <h2 className="mb-3 font-display text-lg font-semibold text-navy">Productos</h2>
            <div className="flex flex-wrap gap-2">
              {products.map((row) => (
                <span key={textOf(row.Code)} className="crm-badge bg-mist text-navy">
                  {textOf(row.Description) || textOf(row.Code)}
                </span>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "agro" ? (
        <div className="space-y-4">
          <section className="crm-card flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
            <Field label="Catálogo">
              <select
                className="crm-input sm:w-72"
                value={agriKind}
                onChange={(e) => setAgriKind(e.target.value)}
              >
                {AGRI_OPTIONS.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <button
              type="button"
              className="crm-btn crm-btn-primary"
              disabled={busy}
              onClick={() =>
                void run(() => b2bGet("agri-catalog", { kind: agriKind }), (data) => {
                  setAgriRows(agriRowsFrom(agriKind, data.data));
                })
              }
            >
              Cargar catálogo
            </button>
          </section>
          <Table
            loading={busy && tab === "agro" && !agriRows.length}
            columns={
              agriKind === "payment-methods"
                ? [
                    { key: "Contratación", label: "Contratación" },
                    { key: "Pago", label: "Pago" },
                    { key: "Código", label: "Código" },
                  ]
                : [
                    { key: "Nombre", label: "Nombre" },
                    { key: "Código", label: "Código" },
                  ]
            }
            rows={agriRows}
            empty="Elegí un catálogo agro y cargalo. Cotizar y emitir agro no está acá: emite póliza en un paso."
          />
        </div>
      ) : null}

      {busy && !booting ? <p className="text-sm text-muted">Consultando San Cristóbal…</p> : null}
      {notice ? <p className="crm-card bg-mist p-4 text-sm text-navy">{notice}</p> : null}
      {error ? <p className="crm-card border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      {warnings.length ? (
        <p className="crm-card bg-amber-50 p-4 text-sm text-amber-900">{warnings.join(" · ")}</p>
      ) : null}
    </div>
  );
}
