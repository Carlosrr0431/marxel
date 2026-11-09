import { NextResponse } from "next/server";
import { saveQuoteLeadSafe } from "@/lib/crm/quote-lead";
import { saveCotizacion } from "@/lib/crm/saved-quotes";
import { AutoQuoteError, formatScPlanDetail, quoteAutoVehicle, registerAutoQuoteWithProducer, type AutoLocation, type AutoQuoteResult, type AutoVersion } from "@/lib/sc-auto";
import { scCovers } from "@/lib/plan-covers";
import { coverageCertificatePdf, policyCouponsPdf, quoteAndIssueCa7, quoteCa7, ScB2bError } from "@/lib/sc-b2b";
import { emitSmgPublic, quoteSmgPublic } from "@/lib/smg/public-auto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function fail(err: unknown) {
  const status = err instanceof AutoQuoteError || err instanceof ScB2bError ? err.status : 502;
  const message = err instanceof Error ? err.message : "No se pudo cotizar";
  return NextResponse.json({ error: message }, { status });
}

function reasonOf(result: PromiseSettledResult<unknown>) {
  const message = result.status === "rejected" && result.reason instanceof Error ? result.reason.message : "Sin precio";
  if (/interno en el servidor/i.test(message)) {
    return "Swiss Medical no respondió. Reintentá en un minuto. Si San Cristóbal cotizó, ese plan se puede emitir.";
  }
  if (/no tiene permiso/i.test(message)) {
    return "Swiss Medical no habilitó la cotización para este productor en el entorno de pruebas.";
  }
  if (/unexpected token|is not valid json|an error occurred/i.test(message)) {
    return "La compañía no respondió bien. Reintentá en un minuto.";
  }
  return message;
}

function splitInsuredName(nombre: string) {
  const parts = nombre.split(/\s+/).filter(Boolean);
  if (parts.length >= 3) return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
  return { first: parts[0] || nombre, last: parts.slice(1).join(" ") || parts[0] || nombre };
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

const SC_COMPARE = ["CA7_A", "CA7_CM", "CA7_D"];

function scAmount(item: Record<string, unknown>) {
  const monthly = Number(item.MonthlyCost ?? item.monthlyCost ?? item.InstallmentAmount);
  if (Number.isFinite(monthly) && monthly > 0) return monthly;
  const cost = Number(asRecord(item.TotalCost).Amount);
  if (Number.isFinite(cost) && cost > 0) return cost;
  return Number(asRecord(item.TotalPremium).Amount);
}

function scPlansFromB2b(data: unknown) {
  const summaries = asRecord(data).Summaries;
  const rows = Array.isArray(summaries) ? summaries : [];
  const plans = rows
    .map((row) => {
      const item = asRecord(row);
      const code = String(item.ProductCode || "").trim();
      const amount = scAmount(item);
      if (!code || !Number.isFinite(amount) || amount <= 0) return null;
      const key = code.replace(/^CA7_/, "");
      return {
        id: code,
        title: String(item.ProductOffering || formatScPlanDetail({ productCode: code })),
        monthly: Math.round(amount),
        description: String(item.DeductibleTypeFullDescription || formatScPlanDetail({ productCode: code })),
        covers: scCovers(key === "A" || key === "D" || key === "CM" ? key : "CM"),
      };
    })
    .filter((plan): plan is NonNullable<typeof plan> => Boolean(plan));
  const compared = SC_COMPARE.map((code) => plans.find((plan) => plan.id === code)).filter(
    (plan): plan is (typeof plans)[number] => Boolean(plan),
  );
  return compared.length ? compared : plans.slice(0, 3);
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
  const dni = String(body.dni || body.taxId || "").replace(/\D/g, "");
  const infoauto = String(version.infoAutoCode || "").replace(/\D/g, "");
  const stateKey = /^AR_\d+$/.test(String(location.stateKey || "")) ? String(location.stateKey) : "AR_01";

  const [sc, smg, sitio] = await Promise.allSettled([
    (async () => {
      if (dni.length < 7) throw new AutoQuoteError("Falta el DNI para cotizar en San Cristóbal", 400);
      if (!infoauto) throw new AutoQuoteError("Esa versión no tiene código InfoAuto", 400);
      const quoted = await quoteCa7({
        taxId: dni,
        officialIdType: "Ext_DNI96",
        gender: String(body.gender || "M").toLowerCase().startsWith("f") ? "F" : "M",
        age: Number(body.age) || undefined,
        postalCode: Number(body.postalCode) || Number(location.zipCode),
        locationState: stateKey,
        infoautoCode: infoauto,
        year,
        is0Km: Boolean(body.is0km),
        hasGnc: Boolean(body.hasGnc),
        hasGps: Boolean(body.hasTracker),
        statedAmount: Number(version.statedAmount) || undefined,
        fuelType: version.fuelCode ? String(version.fuelCode) : undefined,
        category: version.category ? String(version.category) : undefined,
        isNational: typeof version.isImported === "boolean" ? !version.isImported : undefined,
      });
      const plans = scPlansFromB2b(quoted);
      if (!plans.length) throw new AutoQuoteError("San Cristóbal no devolvió planes para este auto", 422);
      return {
        carDescription: `${year} ${brand.description || ""} ${model.description || ""} ${version.description || ""}`.replace(/\s+/g, " ").trim(),
        statedAmount: Number(version.statedAmount) || 0,
        plans,
      };
    })(),
    quoteSmgPublic({
      year,
      brand: String(brand.description || ""),
      model: String(model.description || ""),
      version: String(version.fullCarDescripcion || version.description || ""),
      postalCode: Number(body.postalCode) || Number(location.zipCode),
      plate,
    }),
    fromCrm(body)
      ? quoteAutoVehicle({
          year,
          is0km: Boolean(body.is0km),
          brand: { id: Number(brand.id) || 0, description: String(brand.description || "") },
          model: { id: Number(model.id) || 0, description: String(model.description || "") },
          version,
          location,
          nombre,
          celular,
          age: Number(body.age) || undefined,
          hasGnc: Boolean(body.hasGnc),
          hasTracker: Boolean(body.hasTracker),
          licensePlate: plate,
          source: "web",
        })
      : Promise.resolve(null),
  ]);

  const sitioOk = sitio.status === "fulfilled" && Boolean(sitio.value);
  if (sc.status === "rejected" && smg.status === "rejected" && !sitioOk) {
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
      dni: dni || null,
      edad: Number(body.age) || null,
      localidad: location.description || null,
      interes: "Seguro de auto",
      pagePath: String(body.page_path || "/"),
      notas: lines.join("\n"),
    });
  }

  const payload = {
    carDescription: scResult?.carDescription || lines[1],
    statedAmount: scResult?.statedAmount || 0,
    sancristobal: scResult
      ? {
          opportunityId: 0,
          plans: scResult.plans,
        }
      : { opportunityId: 0, plans: [], error: reasonOf(sc) },
    smg: smgResult
      ? { plans: smgResult.plans.slice(0, 4) }
      : { plans: [], error: reasonOf(smg) },
    ...(fromCrm(body) ? { sitio: sitioQuote(sitio) } : {}),
  };
  let savedId = "";
  if (fromCrm(body)) {
    savedId = await saveCotizacion({
      nombre,
      celular,
      dni,
      age: Number(body.age) || null,
      plate,
      year,
      is0km: Boolean(body.is0km),
      brand: String(brand.description || ""),
      model: String(model.description || ""),
      version: String(version.fullCarDescripcion || version.description || ""),
      localidad: String(location.description || ""),
      postal: String(body.postalCode || location.zipCode || ""),
      gnc: Boolean(body.hasGnc),
      vehiculo: String(payload.carDescription || ""),
      pedido: {
        year,
        is0km: Boolean(body.is0km),
        brand: { id: Number(brand.id) || 0, description: String(brand.description || "") },
        model: { id: Number(model.id) || 0, description: String(model.description || "") },
        version,
        location,
        postalCode: Number(body.postalCode) || Number(location.zipCode) || 0,
        nombre,
        celular,
        dni,
        gender: String(body.gender || "M"),
        age: Number(body.age) || 0,
        hasGnc: Boolean(body.hasGnc),
        licensePlate: plate,
      },
      resultado: payload,
    }).catch(() => "");
  }
  return NextResponse.json(savedId ? { ...payload, savedId } : payload);
}

function sitioQuote(result: PromiseSettledResult<AutoQuoteResult | null>) {
  if (result.status === "fulfilled" && result.value) {
    return {
      discount: result.value.appliedDiscount,
      opportunityId: result.value.opportunityId || 0,
      plans: result.value.plans.map((plan) => ({
        id: plan.productCode || plan.key,
        title: plan.title,
        monthly: plan.monthly,
        description: plan.description,
        covers: plan.covers,
        quoteId: plan.quoteId,
      })),
    };
  }
  return { plans: [], error: reasonOf(result) };
}

async function emit(body: Record<string, unknown>) {
  const company = String(body.company || "");
  const location = asRecord(body.location);
  const version = asRecord(body.version);
  const brand = asRecord(body.brand);
  const model = asRecord(body.model);
  const nombre = String(body.nombre || "").trim();
  const lookedUp = splitInsuredName(nombre);
  const first = String(body.firstName || "").trim() || lookedUp.first;
  const last = String(body.lastName || "").trim() || lookedUp.last;
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
  let certificatePdf = "";
  let couponPdf = "";
  const calm = (message: string, fallback: string) => {
    const text = message.replace(/\s+/g, " ").trim();
    if (/interno en el servidor/i.test(text)) {
      return company === "smg"
        ? "Swiss Medical no respondió. Reintentá en un minuto. Si San Cristóbal cotizó, ese plan se puede emitir."
        : "San Cristóbal no pudo emitir la póliza. El pedido quedó para Marcos.";
    }
    if (/catálogo de autos|Object reference not set|soporteb2b|unavailable|an error occurred|is not valid json/i.test(text)) {
      return "San Cristóbal no pudo emitir la póliza en este momento. El pedido quedó para Marcos.";
    }
    if (!text || text.startsWith("{") || text.startsWith("[") || text.length > 220) return fallback;
    return text;
  };
  try {
  if (company === "smg") {
    const photos = inspectionPhotos(body.photos);
    if (!hasCarPhotos(photos)) {
      throw new AutoQuoteError("Faltan las fotos del auto: frente, trasera y los dos laterales.", 400);
    }
    const issued = await emitSmgPublic({
      year: Number(body.year),
      brand: String(brand.description || ""),
      model: String(model.description || ""),
      version: String(version.fullCarDescripcion || version.description || ""),
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
      photos,
    });
    policyNumber = issued.policyNumber;
    certificatePdf = issued.certificatePdf;
    note = issued.isPolicy
      ? `Póliza Swiss Medical ${policyNumber}. Las fotos de la inspección quedaron cargadas.`
      : `Certificado Swiss Medical ${policyNumber}. Las fotos quedaron cargadas. La póliza sale cuando Swiss Medical autoriza la solicitud.`;
  } else if (String(body.channel) === "sitio") {
    const registered = await registerAutoQuoteWithProducer({
      opportunityId: Number(body.opportunityId) || 0,
      quoteId: Number(body.quoteId) || 0,
      dni,
      nombre: `${first} ${last}`.trim(),
      email,
      celular: phone,
      age: Number(body.age) || 0,
      gender: String(body.gender || "M"),
      location: {
        locationId: Number(location.locationId) || 0,
        description: String(location.description || ""),
        stateKey: String(location.stateKey || ""),
        zipCode: Number(location.zipCode) || 0,
        synonymous: String(location.synonymous || ""),
      },
      is0km: Boolean(body.is0km),
      licensePlate: plate,
      vin,
      engineNumber: engine,
    });
    policyNumber = registered.registeredWithSc ? String(registered.opportunityId || "") : "";
    note = registered.registeredWithSc
      ? `Sitio Seguro cargó la cotización en San Cristóbal. Oportunidad ${registered.opportunityId}.`
      : "Sitio Seguro cotizó, pero no devolvió el id para cargar el alta. El pedido quedó para el productor.";
  } else {
    const photos = inspectionPhotos(body.photos);
    if (!hasCarPhotos(photos)) {
      throw new ScB2bError("Faltan las fotos del auto: frente, trasera y los dos laterales.", 400);
    }
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
        hasGps: Boolean(body.hasTracker),
        statedAmount: Number(version.statedAmount) || undefined,
        fuelType: version.fuelCode ? String(version.fuelCode) : undefined,
        category: version.category ? String(version.category) : undefined,
        isNational: typeof version.isImported === "boolean" ? !version.isImported : undefined,
        productCode: String(body.planId || "CA7_CM"),
        email,
        phone,
        licensePlate: plate,
        vin,
        engineNumber: engine,
        street,
        streetNumber,
        city,
        photos,
      })
    );
    const bound = String(issued.BoundPolicyNumber || "");
    policyNumber = bound || String(issued.PolicyNumber || "");
    const messages = Array.isArray(issued.Messages) ? issued.Messages : [];
    const issueText = messages
      .map((item) => {
        const row = asRecord(item);
        return String(row.MessageBeautiful || row.Description || "");
      })
      .join(" ");
    const inspectionError = String(issued.InspectionError || "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (bound) {
      note = `Póliza San Cristóbal ${bound}.`;
      try {
        couponPdf = await policyCouponsPdf(bound);
        note = `Póliza San Cristóbal ${bound}. Los cupones de pago están listos para descargar.`;
      } catch {
        couponPdf = "";
      }
    } else if (policyNumber && !/^\d{2}-\d{2}-\d{2}-3\d+$/.test(policyNumber)) {
      note = inspectionError
        ? `Certificado San Cristóbal ${policyNumber}. Las fotos se enviaron con el alta, pero la inspección respondió: ${inspectionError}.`.slice(0, 220)
        : Number(issued.PhotosSent) > 0
          ? `Certificado San Cristóbal ${policyNumber}. Las fotos quedaron cargadas. La póliza y los cupones salen cuando San Cristóbal autoriza la inspección.`
          : `Certificado San Cristóbal ${policyNumber}. Quedó cargado en San Cristóbal, sujeto a inspección. La póliza y los cupones de pago salen cuando aprueban la inspección.`;
      try {
        certificatePdf = await coverageCertificatePdf(policyNumber);
      } catch {
        certificatePdf = "";
      }
    } else {
      note = policyNumber
        ? `Póliza San Cristóbal ${policyNumber}`
        : "San Cristóbal no devolvió número de póliza. El pedido quedó para el productor.";
    }
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

  return NextResponse.json({ policyNumber, note, certificatePdf, couponPdf });
}

const CAR_PHOTOS = ["frente", "trasera", "lateral-izquierdo", "lateral-derecho"];

function hasCarPhotos(photos: { name: string }[]) {
  const names = new Set(photos.map((photo) => photo.name));
  return CAR_PHOTOS.every((name) => names.has(name));
}

function inspectionPhotos(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = asRecord(item);
    const name = String(row.name || "").trim();
    const content = String(row.content || "").trim();
    return name && content ? [{ name, content }] : [];
  });
}
