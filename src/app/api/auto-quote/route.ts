import { NextResponse } from "next/server";
import { saveQuoteLeadSafe } from "@/lib/crm/quote-lead";
import { AutoQuoteError, quoteAutoVehicle, type AutoLocation, type AutoVersion } from "@/lib/sc-auto";
import { quoteAndIssueCa7, ScB2bError } from "@/lib/sc-b2b";
import { emitSmgPublic, quoteSmgPublic } from "@/lib/smg/public-auto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(err: unknown) {
  const status = err instanceof AutoQuoteError || err instanceof ScB2bError ? err.status : 502;
  const message = err instanceof Error ? err.message : "No se pudo cotizar";
  return NextResponse.json({ error: message }, { status });
}

function reasonOf(result: PromiseSettledResult<unknown>) {
  return result.status === "rejected" && result.reason instanceof Error ? result.reason.message : "Sin precio";
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function fromCrm(body: Record<string, unknown>) {
  return String(body.page_path || "").startsWith("/crm");
}

export async function POST(req: Request) {
  try {
    const body = asRecord(await req.json());
    if (body.action === "emit") return await emit(body);
    return await quote(body);
  } catch (err) {
    return fail(err);
  }
}

async function quote(body: Record<string, unknown>) {
  const location = asRecord(body.location) as AutoLocation;
  const version = asRecord(body.version) as AutoVersion;
  const brand = asRecord(body.brand);
  const model = asRecord(body.model);
  const year = Number(body.year);
  const nombre = String(body.nombre || "").trim();
  const celular = String(body.celular || "").trim();
  const plate = String(body.licensePlate || "").trim();

  const [sc, smg] = await Promise.allSettled([
    quoteAutoVehicle({
      year,
      is0km: Boolean(body.is0km),
      brand: { id: Number(brand.id), description: String(brand.description || "") },
      model: { id: Number(model.id), description: String(model.description || "") },
      version,
      location,
      nombre,
      celular,
      email: String(body.email || ""),
      age: Number(body.age) || undefined,
      hasGnc: Boolean(body.hasGnc),
      hasTracker: Boolean(body.hasTracker),
      licensePlate: plate,
      source: "web",
    }),
    quoteSmgPublic({
      year,
      brand: String(brand.description || ""),
      model: String(model.description || ""),
      postalCode: Number(body.postalCode) || Number(location.zipCode),
      plate,
    }),
  ]);

  if (sc.status === "rejected" && smg.status === "rejected") {
    throw new Error(reasonOf(sc));
  }

  const scResult = sc.status === "fulfilled" ? sc.value : null;
  const smgResult = smg.status === "fulfilled" ? smg.value : null;
  const lines = [
    "Multicotización de auto",
    scResult?.carDescription || `${year} ${brand.description || ""} ${model.description || ""}`,
    plate ? `Patente: ${plate}` : "",
    scResult
      ? `San Cristóbal: ${scResult.plans.map((plan) => `${plan.title} $${plan.monthly}`).join(" · ")}`
      : `San Cristóbal: ${reasonOf(sc)}`,
    smgResult
      ? `SMG: ${smgResult.plans.slice(0, 4).map((plan) => `${plan.title} $${plan.monthly}`).join(" · ")}`
      : `SMG: ${reasonOf(smg)}`,
  ].filter(Boolean);

  if (!fromCrm(body)) {
    await saveQuoteLeadSafe({
      nombre,
      celular,
      email: String(body.email || ""),
      edad: Number(body.age) || null,
      localidad: location.description || null,
      interes: "Seguro de auto",
      pagePath: String(body.page_path || "/"),
      notas: lines.join("\n"),
    });
  }

  return NextResponse.json({
    carDescription: scResult?.carDescription || lines[1],
    statedAmount: scResult?.statedAmount || 0,
    sancristobal: scResult
      ? {
          opportunityId: scResult.opportunityId,
          plans: scResult.plans.map((plan) => ({
            id: plan.productCode || plan.key,
            title: plan.title,
            monthly: plan.monthly,
            description: plan.description,
            covers: plan.covers,
          })),
        }
      : { opportunityId: 0, plans: [], error: reasonOf(sc) },
    smg: smgResult
      ? { plans: smgResult.plans.slice(0, 4) }
      : { plans: [], error: reasonOf(smg) },
  });
}

async function emit(body: Record<string, unknown>) {
  const company = String(body.company || "");
  const location = asRecord(body.location);
  const version = asRecord(body.version);
  const brand = asRecord(body.brand);
  const model = asRecord(body.model);
  const nombre = String(body.nombre || "").trim();
  const parts = nombre.split(/\s+/);
  const first = parts[0] || nombre;
  const last = parts.slice(1).join(" ") || first;
  const plate = String(body.licensePlate || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.celular || "").trim();
  const dni = String(body.dni || "").replace(/\D/g, "");
  const vin = String(body.vin || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
  const engine = String(body.engineNumber || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
  const street = String(body.street || "").trim();
  const streetNumber = String(body.streetNumber || "").trim();
  const city = String(location.description || "SALTA");

  let policyNumber = "";
  let note = "";
  const calm = (message: string, fallback: string) => {
    const text = message.replace(/\s+/g, " ").trim();
    if (/catálogo de autos|Object reference not set|soporteb2b/i.test(text)) {
      return "San Cristóbal cotizó el plan, pero el ambiente de pruebas no puede emitir la póliza. El pedido quedó para Marcos.";
    }
    if (!text || text.startsWith("{") || text.startsWith("[") || text.length > 220) return fallback;
    return text;
  };
  try {
  if (company === "smg") {
    const issued = await emitSmgPublic({
      year: Number(body.year),
      brand: String(brand.description || ""),
      model: String(model.description || ""),
      postalCode: Number(location.zipCode),
      plate,
      planId: String(body.planId || ""),
      nombre: first,
      apellido: last,
      email,
      phone,
      dni,
      gender: String(body.gender || "M").toLowerCase().startsWith("f") ? "F" : "M",
      birthDate: String(body.birthDate || ""),
      street,
      streetNumber,
      vin,
      engineNumber: engine,
    });
    policyNumber = issued.policyNumber;
    note = policyNumber
      ? `Emisión SMG ${policyNumber}`
      : "SMG recibió el pedido y no devolvió número de póliza. Quedó para el productor.";
  } else {
    const issued = asRecord(
      await quoteAndIssueCa7({
        taxId: dni,
        gender: String(body.gender || "M").toLowerCase().startsWith("f") ? "F" : "M",
        age: Number(body.age) || undefined,
        postalCode: Number(location.zipCode),
        locationState: /^AR_\d+$/.test(String(location.stateKey || "")) ? String(location.stateKey) : "AR_01",
        infoautoCode: String(version.infoAutoCode || ""),
        year: Number(body.year),
        is0Km: Boolean(body.is0km),
        hasGnc: Boolean(body.hasGnc),
        statedAmount: Number(version.statedAmount) || undefined,
        productCode: String(body.planId || "CA7_CM"),
        email,
        phone,
        licensePlate: plate,
        vin,
        engineNumber: engine,
        street,
        streetNumber,
        city,
      })
    );
    policyNumber = String(issued.PolicyNumber || "");
    note = policyNumber
      ? `Póliza San Cristóbal ${policyNumber}`
      : "San Cristóbal no devolvió número de póliza. El pedido quedó para el productor.";
  }
  } catch (err) {
    const status = err instanceof AutoQuoteError || err instanceof ScB2bError ? err.status : 502;
    if (status === 400) throw err;
    note = calm(
      err instanceof Error ? err.message : "",
      company === "smg"
        ? "SMG no pudo emitir la póliza. El pedido quedó para Marcos."
        : "San Cristóbal no pudo emitir la póliza. El pedido quedó para Marcos."
    );
  }

  if (!fromCrm(body)) {
    await saveQuoteLeadSafe({
      nombre,
      celular: phone,
      email,
      dni,
      edad: Number(body.age) || null,
      localidad: city,
      interes: "Seguro de auto",
      pagePath: String(body.page_path || "/"),
      notas: [
        note,
        `Plan: ${String(body.planTitle || "")}`,
        plate ? `Patente: ${plate}` : "",
        `Domicilio: ${street} ${streetNumber}`,
        vin ? `Chasis: ${vin}` : "",
        engine ? `Motor: ${engine}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  return NextResponse.json({ policyNumber, note });
}
