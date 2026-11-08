"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { classifyArPlate, normalizeArPlate } from "@/lib/ar-plate";
import { CHOICE_COOKIE, VISITOR_COOKIE, readCookie } from "@/lib/cookies/visitor";
import { QuoteCompare, type ComparePlan } from "@/components/QuoteCompare";
import { site } from "@/lib/content";

type Option = { id: string; label: string };
type Version = {
  id: number;
  description: string;
  fullCarDescripcion?: string;
  statedAmount?: number;
  infoAutoCode?: number;
  category?: string;
  fuelCode?: string;
  isImported?: boolean;
};
type Location = {
  locationId: number;
  description: string;
  state?: string;
  stateKey: string;
  zipCode: number;
  synonymous: string;
};
type Offer = { id: string; title: string; monthly: number; description?: string; covers?: Record<string, string> | null };
type CompanyQuote = { plans: Offer[]; error?: string; opportunityId?: number };
type QuotePayload = { carDescription: string; statedAmount: number; sancristobal: CompanyQuote; smg: CompanyQuote };
type Choice = { company: "sancristobal" | "smg"; id: string; title: string; monthly: number };

const moneyFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

function money(value: number) {
  return `$ ${moneyFmt.format(value)}`;
}

function niceName(value: string) {
  return value
    .toLocaleLowerCase("es-AR")
    .replace(/(^|\s)(\p{L})/gu, (_match, space: string, letter: string) => `${space}${letter.toLocaleUpperCase("es-AR")}`);
}

function years() {
  const current = new Date().getFullYear();
  const list = [{ id: `${current}-0km`, label: `${current} 0km` }];
  for (let year = current; year >= current - 30; year -= 1) list.push({ id: String(year), label: String(year) });
  return list;
}

const INSPECTION_SHOTS = [
  { id: "frente", label: "Frente", required: true },
  { id: "trasera", label: "Trasera", required: true },
  { id: "lateral-izquierdo", label: "Lateral izquierdo", required: true },
  { id: "lateral-derecho", label: "Lateral derecho", required: true },
  { id: "kilometraje", label: "Kilometraje", required: false },
  { id: "chasis", label: "Número de chasis", required: false },
] as const;

type ShotId = (typeof INSPECTION_SHOTS)[number]["id"];

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: { error?: string } | null = null;
  try {
    data = text ? (JSON.parse(text) as { error?: string }) : null;
  } catch {
    throw new Error("La compañía no respondió bien. Reintentá en un minuto.");
  }
  if (!data) throw new Error("La compañía no respondió bien. Reintentá en un minuto.");
  if (!res.ok) throw new Error(data.error || "No se pudo completar el pedido.");
  return data as Record<string, any>;
}

function downloadPdf(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function compressPhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const max = 1024;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo leer la foto"));
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve((canvas.toDataURL("image/jpeg", 0.62).split(",")[1] || ""));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la foto. Usá JPG o PNG."));
    };
    image.src = url;
  });
}

export function HomeAutoQuote({
  variant = "hero",
  preset,
}: {
  variant?: "hero" | "crm";
  preset?: { nombre?: string; celular?: string };
}) {
  const yearList = useMemo(years, []);
  const [plate, setPlate] = useState("");
  const [yearId, setYearId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [brands, setBrands] = useState<Option[]>([]);
  const [models, setModels] = useState<Option[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [postal, setPostal] = useState("4400");
  const [location, setLocation] = useState<Location | null>(null);
  const [hasGnc, setHasGnc] = useState("no");
  const [nombre, setNombre] = useState(preset?.nombre || "");
  const [celular, setCelular] = useState(preset?.celular || "");
  const [age, setAge] = useState("");
  const [hint, setHint] = useState("");
  const [looking, setLooking] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<QuotePayload | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [dni, setDni] = useState("");
  const [insured, setInsured] = useState<{ dni: string; firstName: string; lastName: string } | null>(null);
  const [personHint, setPersonHint] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [vin, setVin] = useState("");
  const [engine, setEngine] = useState("");
  const [emitting, setEmitting] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfPick, setPdfPick] = useState<{ ticket: string; keys: string[] } | null>(null);
  const [issued, setIssued] = useState("");
  const [certificatePdf, setCertificatePdf] = useState("");
  const [couponPdf, setCouponPdf] = useState("");
  const [photos, setPhotos] = useState<Partial<Record<ShotId, string>>>({});
  const [openField, setOpenField] = useState<"" | "year" | "brand" | "model" | "version">("");
  const quotedTicket = useRef("");
  const ageRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const wizard = variant !== "crm";

  const normalized = normalizeArPlate(plate);
  const plateKind = classifyArPlate(normalized);
  const is0km = yearId.endsWith("-0km");
  const year = yearId.replace(/-0km$/, "");
  const brand = brands.find((item) => item.id === brandId) || null;
  const model = models.find((item) => item.id === modelId) || null;
  const version = versions.find((item) => String(item.id) === versionId) || null;

  useEffect(() => {
    if (dni.length < 7) {
      setInsured(null);
      setPersonHint("");
      return;
    }
    let cancelled = false;
    fetchJson(`/api/sc-auto?${new URLSearchParams({ kind: "dni", dni })}`)
      .then((data) => {
        if (cancelled) return;
        const person = data.person as { firstName?: string; lastName?: string; gender?: string; dateOfBirth?: string } | null;
        if (!person?.firstName && !person?.lastName) {
          setInsured(null);
          setPersonHint("");
          return;
        }
        const firstName = String(person.firstName || "").trim();
        const lastName = String(person.lastName || "").trim();
        setInsured({ dni, firstName, lastName });
        if (person.gender === "M" || person.gender === "F") {
          setGender((current) => current || person.gender || "");
        }
        if (person.dateOfBirth) setBirthDate((current) => current || person.dateOfBirth || "");
        const label = niceName([firstName, lastName].filter(Boolean).join(" "));
        setPersonHint(
          label
            ? `Encontramos a ${label} en el padrón. El email y el domicilio quedaron cargados para seguir.`
            : ""
        );
      })
      .catch(() => {
        if (!cancelled) {
          setInsured(null);
          setPersonHint("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dni]);

  useEffect(() => {
    const plateKey = normalizeArPlate(plate);
    if (plateKey !== "GYY467" && dni !== "33233495") return;
    setEmail((current) => current || site.email);
    setStreet((current) => current || "España");
    setStreetNumber((current) => current || "1000");
    if (plateKey === "GYY467") {
      setDni((current) => current || "33233495");
      setVin((current) => current || "8A1BA1V158L008111");
      setEngine((current) => current || "K4MJ706Q109499");
    }
  }, [plate, dni]);

  useEffect(() => {
    if (variant === "crm") return;
    function send() {
      if (readCookie(CHOICE_COOKIE) !== "1") return;
      const visitorId = readCookie(VISITOR_COOKIE);
      const phone = celular.replace(/\D/g, "");
      if (!visitorId || nombre.trim().length < 2 || phone.length < 8) return;
      void fetch("/api/cookies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choice: "aceptado",
          visitorId,
          nombre: nombre.trim(),
          celular: celular.trim(),
          edad: Number(age) || null,
          patente: plate,
          interes: "auto",
          page: window.location.pathname,
        }),
      }).catch(() => undefined);
    }
    const timer = window.setTimeout(send, 700);
    window.addEventListener("mx-cookies-accepted", send);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mx-cookies-accepted", send);
    };
  }, [variant, nombre, celular, age, plate]);

  useEffect(() => {
    if (postal.length !== 4) {
      setLocation(null);
      return;
    }
    let cancelled = false;
    fetchJson(`/api/sc-auto?${new URLSearchParams({ kind: "location", postalCode: postal })}`)
      .then((data) => {
        if (cancelled) return;
        const list = (data.locations || []) as Location[];
        setLocation(list.find((item) => item.description.toUpperCase() === "SALTA") || list[0] || null);
      })
      .catch(() => {
        if (!cancelled) setLocation(null);
      });
    return () => {
      cancelled = true;
    };
  }, [postal]);

  useEffect(() => {
    if (plateKind !== "auto") return;
    let cancelled = false;
    setLooking(true);
    const timer = window.setTimeout(() => {
      fetchJson(`/api/sc-auto?${new URLSearchParams({ kind: "plate", plate: normalized })}`)
        .then((data) => {
          if (cancelled) return;
          setHint(data.message || data.description || "");
          if (data.kind === "moto" || !data.found) return;
          const nextBrands = ((data.brands || []) as { id: number; description: string }[]).map((item) => ({
            id: String(item.id),
            label: item.description,
          }));
          const nextModels = ((data.models || []) as { id: number; description: string }[]).map((item) => ({
            id: String(item.id),
            label: item.description,
          }));
          setYearId(data.year ? String(data.year) : "");
          setBrands(nextBrands);
          setModels(nextModels);
          setVersions((data.versions || []) as Version[]);
          if (data.brand) setBrandId(String(data.brand.id));
          if (data.model) setModelId(String(data.model.id));
          if (data.version) setVersionId(String(data.version.id));
          if (data.version) {
            setOpenField("");
            window.setTimeout(() => ageRef.current?.focus(), 60);
          } else if (data.model) setOpenField("version");
          else if (data.brand) setOpenField("model");
          else if (data.year) setOpenField("brand");
        })
        .catch((err) => {
          if (!cancelled) setHint(err instanceof Error ? err.message : "No pudimos leer la patente.");
        })
        .finally(() => {
          if (!cancelled) setLooking(false);
        });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalized, plateKind]);

  useEffect(() => {
    if (!yearId || brands.length) return;
    let cancelled = false;
    fetchJson(`/api/sc-auto?${new URLSearchParams({ kind: "brands", year })}`)
      .then((data) => {
        if (cancelled) return;
        setBrands(
          ((data.brands || []) as { id: number; description: string }[]).map((item) => ({
            id: String(item.id),
            label: item.description,
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [year, yearId, brands.length]);

  useEffect(() => {
    if (!yearId || !brandId) return;
    let cancelled = false;
    fetchJson(`/api/sc-auto?${new URLSearchParams({ kind: "models", year, brandId })}`)
      .then((data) => {
        if (cancelled) return;
        setModels(
          ((data.models || []) as { id: number; description: string }[]).map((item) => ({
            id: String(item.id),
            label: item.description,
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [year, yearId, brandId]);

  useEffect(() => {
    if (!yearId || !brandId || !modelId) return;
    let cancelled = false;
    fetchJson(`/api/sc-auto?${new URLSearchParams({ kind: "versions", year, brandId, modelId })}`)
      .then((data) => {
        if (cancelled) return;
        setVersions((data.versions || []) as Version[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [year, yearId, brandId, modelId]);

  async function quoteNow() {
    setError("");
    if (!is0km && plateKind === "moto") {
      setError("Esta patente es de moto.");
      return;
    }
    if (!is0km && plateKind !== "auto") {
      setError("Ingresá una patente de auto válida.");
      return;
    }
    if (!yearId || !brand || !model || !version || !location) {
      setError("Elegí año, marca, modelo y versión.");
      return;
    }
    if (!nombre.trim() || celular.replace(/\D/g, "").length < 8 || Number(age) < 18) {
      setError("Completá nombre, WhatsApp y una edad mayor de 18.");
      return;
    }
    if (dni.length < 7) {
      setError("Ingresá el DNI para cotizar en San Cristóbal.");
      return;
    }
    const ticket = `${normalized}|${version.id}|${postal}|${age}|${hasGnc}|${nombre.trim()}|${celular.trim()}|${dni}|${gender}`;
    quotedTicket.current = ticket;
    setQuoting(true);
    setIssued("");
    try {
      const data = await fetchJson("/api/auto-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: Number(year),
          is0km,
          brand: { id: Number(brand.id), description: brand.label },
          model: { id: Number(model.id), description: model.label },
          version,
          location,
          postalCode: Number(postal),
          nombre: nombre.trim(),
          celular: celular.trim(),
          dni,
          gender: gender === "F" ? "F" : "M",
          age: Number(age),
          hasGnc: hasGnc === "si",
          licensePlate: normalized,
          page_path: window.location.pathname,
          ticket,
        }),
      });
      setError("");
      setQuote(data as QuotePayload);
    } catch (err) {
      quotedTicket.current = "";
      setError(err instanceof Error ? err.message : "No pudimos cotizar.");
    } finally {
      setQuoting(false);
    }
  }

  async function emitPolicy() {
    if (!choice || !brand || !model || !version || !location) return;
    if (dni.length < 7 || !email.includes("@") || !gender || !street || !streetNumber || vin.length < 10 || engine.length < 6) {
      setError("Completá DNI, email, domicilio, chasis y motor para emitir.");
      return;
    }
    if (choice.company === "sancristobal" && plateKind !== "auto") {
      setError("San Cristóbal pide la patente también en un 0 km.");
      return;
    }
    if (
      (choice.company === "sancristobal" || choice.company === "smg") &&
      INSPECTION_SHOTS.some((shot) => shot.required && !photos[shot.id])
    ) {
      setError(
        choice.company === "smg"
          ? "Adjuntá frente, trasera y los dos laterales para que Swiss Medical emita la póliza."
          : "Adjuntá frente, trasera y los dos laterales para que San Cristóbal emita la póliza.",
      );
      return;
    }
    if (choice.company === "smg" && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      setError("Para emitir en SMG falta la fecha de nacimiento.");
      return;
    }
    setEmitting(true);
    setError("");
    try {
      const data = await fetchJson("/api/auto-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "emit",
          company: choice.company,
          planId: choice.id,
          planTitle: choice.title,
          year: Number(year),
          is0km,
          brand: { id: Number(brand.id), description: brand.label },
          model: { id: Number(model.id), description: model.label },
          version,
          location,
          nombre: nombre.trim(),
          firstName: insured?.dni === dni ? insured.firstName : "",
          lastName: insured?.dni === dni ? insured.lastName : "",
          celular: celular.trim(),
          age: Number(age),
          hasGnc: hasGnc === "si",
          licensePlate: normalized,
          dni,
          gender,
          email: email.trim(),
          birthDate,
          street: street.trim(),
          streetNumber: streetNumber.trim(),
          vin,
          engineNumber: engine,
          photos: INSPECTION_SHOTS.flatMap((shot) =>
            photos[shot.id] ? [{ name: shot.id, content: photos[shot.id] || "" }] : [],
          ),
          page_path: window.location.pathname,
        }),
      });
      const note = String(data.note || "");
      const readable = note.startsWith("{") || note.startsWith("[") || note.length > 220
        ? "No se pudo emitir. El pedido quedó para el productor."
        : note;
      setCertificatePdf(typeof data.certificatePdf === "string" ? data.certificatePdf : "");
      setCouponPdf(typeof data.couponPdf === "string" ? data.couponPdf : "");
      setIssued(
        readable.startsWith("Certificado") || readable.startsWith("Póliza")
          ? readable
          : data.policyNumber
            ? `Póliza ${data.policyNumber}`
            : readable
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo emitir.");
    } finally {
      setEmitting(false);
    }
  }

  const view = issued ? "done" : choice ? "emit" : quote ? "plans" : "form";
  const plans = quote ? comparePlans(quote) : [];
  const planTicket = plans.map((plan) => plan.key).join("|");
  const pdfKeys = pdfPick?.ticket === planTicket ? pdfPick.keys : plans.map((plan) => plan.key);
  function togglePdfPlan(key: string) {
    const next = pdfKeys.includes(key) ? pdfKeys.filter((item) => item !== key) : [...pdfKeys, key];
    setPdfPick({ ticket: planTicket, keys: next });
  }
  function continueOnWhatsapp(plan: ComparePlan) {
    const text = [
      "Hola Marcos, quiero continuar con esta cotización.",
      nombre.trim() ? `Soy ${nombre.trim()}.` : "",
      celular.trim() ? `Mi WhatsApp: ${celular.trim()}.` : "",
      dni ? `DNI: ${dni}.` : "",
      plate ? `Patente: ${plate}.` : "",
      quote?.carDescription || hint || "",
      `Plan: ${plan.company} · ${plan.title} · $${plan.monthly} por mes.`,
      `CP ${postal}. Edad ${age || "—"}. GNC: ${hasGnc === "si" ? "sí" : "no"}.`,
    ]
      .filter(Boolean)
      .join("\n");
    window.open(`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  function pickPlan(plan: ComparePlan) {
    if (wizard) {
      continueOnWhatsapp(plan);
      return;
    }
    setError("");
    const company = plan.key.startsWith("smg:") ? "smg" : "sancristobal";
    setChoice({
      company,
      id: plan.key.slice(company.length + 1),
      title: plan.title,
      monthly: plan.monthly,
    });
  }

  return (
    <div className={variant === "crm" ? "home-quote home-quote--crm" : `home-quote home-quote--wizard${view === "plans" && plans.length > 0 ? " is-comparing" : ""}`}>
      <form
        className="quote-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (view === "emit") void emitPolicy();
          else void quoteNow();
        }}
      >
        {view === "form" ? (
          <>
        <p className="home-quote__kicker">San Cristóbal y SMG</p>
        <h2>Cotizá tu auto en un minuto</h2>
        <p className="home-quote__lede">La patente completa el auto y cotiza en las dos.</p>

        {wizard ? null : (
          <label className="home-quote__plate">
            <span>Patente</span>
            <input
              className="field quote-plate"
              placeholder="AB123CD"
              autoComplete="off"
              spellCheck={false}
              value={plate}
              onChange={(event) => {
                setPlate(normalizeArPlate(event.target.value));
                setVersionId("");
                setQuote(null);
                setChoice(null);
                setIssued("");
                setHint("");
              }}
            />
          </label>
        )}
        {wizard ? null : looking ? <p className="quote-lookup">Buscando el auto…</p> : null}
        {wizard ? null : hint ? <p className={plateKind === "moto" ? "quote-alert" : "quote-found"}>{hint}</p> : null}

        {wizard ? (
          <>
            <div className="home-quote__grid">
              <label>
                <span>Patente</span>
                <input
                  className="field quote-plate"
                  placeholder="AB123CD"
                  autoComplete="off"
                  spellCheck={false}
                  value={plate}
                  onChange={(event) => {
                    setPlate(normalizeArPlate(event.target.value));
                    setVersionId("");
                    setQuote(null);
                    setChoice(null);
                    setIssued("");
                    setHint("");
                  }}
                />
              </label>
              <AutoSelect
                label="Año"
                value={yearId}
                open={openField === "year"}
                onOpen={() => setOpenField("year")}
                onChange={(value) => {
                  setYearId(value);
                  setBrandId("");
                  setModelId("");
                  setVersionId("");
                  setBrands([]);
                  setModels([]);
                  setVersions([]);
                  setOpenField("brand");
                }}
                placeholder="Elegí el año"
                options={yearList}
                empty="No hay años"
              />
              <AutoSelect
                label="Marca"
                value={brandId}
                open={openField === "brand"}
                onOpen={() => setOpenField("brand")}
                onChange={(value) => {
                  setBrandId(value);
                  setModelId("");
                  setVersionId("");
                  setModels([]);
                  setVersions([]);
                  setOpenField("model");
                }}
                placeholder="Elegí la marca"
                options={brands}
                empty={yearId ? "Buscando marcas…" : "Primero elegí el año"}
              />
              <AutoSelect
                label="Modelo"
                value={modelId}
                open={openField === "model"}
                onOpen={() => setOpenField("model")}
                onChange={(value) => {
                  setModelId(value);
                  setVersionId("");
                  setVersions([]);
                  setOpenField("version");
                }}
                placeholder="Elegí el modelo"
                options={models}
                empty={brandId ? "Buscando modelos…" : "Primero elegí la marca"}
              />
            </div>
            {looking ? <p className="quote-lookup">Buscando el auto…</p> : null}
            {hint ? <p className={plateKind === "moto" ? "quote-alert" : "quote-found"}>{hint}</p> : null}
            {modelId ? (
            <div className="home-quote__grid wizard-pair">
              <AutoSelect
                label="Versión"
                value={versionId}
                open={openField === "version"}
                onOpen={() => setOpenField("version")}
                onChange={(value) => {
                  setVersionId(value);
                  setOpenField("");
                  window.setTimeout(() => ageRef.current?.focus(), 40);
                }}
                placeholder="Elegí la versión"
                options={versions.map((item) => ({ id: String(item.id), label: item.fullCarDescripcion || item.description }))}
                empty={modelId ? "Buscando versiones…" : "Primero elegí el modelo"}
              />
              <Pill label="GNC" value={hasGnc} onChange={setHasGnc} />
            </div>
            ) : null}
            {versionId ? (
            <div className="home-quote__row wizard-pair">
              <label>
                <span>CP</span>
                <input className="field" inputMode="numeric" maxLength={4} value={postal} onChange={(event) => setPostal(event.target.value.replace(/\D/g, "").slice(0, 4))} />
              </label>
              <label>
                <span>Edad</span>
                <input
                  ref={ageRef}
                  className="field"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="34"
                  value={age}
                  onChange={(event) => {
                    const next = event.target.value.replace(/\D/g, "").slice(0, 2);
                    setAge(next);
                    if (next.length === 2) nameRef.current?.focus();
                  }}
                />
              </label>
            </div>
            ) : null}
            {age.replace(/\D/g, "").length >= 2 ? (
            <div className="home-quote__grid wizard-pair">
              <label>
                <span>Nombre</span>
                <input
                  ref={nameRef}
                  className="field"
                  value={nombre}
                  placeholder="Tu nombre"
                  onChange={(event) => setNombre(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      phoneRef.current?.focus();
                    }
                  }}
                />
              </label>
              <label>
                <span>DNI</span>
                <input
                  className="field"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="DNI"
                  value={dni}
                  onChange={(event) => setDni(event.target.value.replace(/\D/g, "").slice(0, 8))}
                />
              </label>
              <label className="home-quote__wide">
                <span>WhatsApp</span>
                <input ref={phoneRef} className="field" inputMode="tel" placeholder="387…" value={celular} onChange={(event) => setCelular(event.target.value)} />
              </label>
            </div>
            ) : null}
          </>
        ) : (
          <>
        <div className="home-quote__grid">
          <Select
            label="Año"
            value={yearId}
            onChange={(value) => {
              setYearId(value);
              setBrandId("");
              setModelId("");
              setVersionId("");
              setBrands([]);
              setModels([]);
              setVersions([]);
            }}
            placeholder="Elegí el año"
            options={yearList}
          />
          <Select
            label="Marca"
            value={brandId}
            onChange={(value) => {
              setBrandId(value);
              setModelId("");
              setVersionId("");
              setModels([]);
              setVersions([]);
            }}
            placeholder="Elegí la marca"
            options={brands}
          />
          <Select
            label="Modelo"
            value={modelId}
            onChange={(value) => {
              setModelId(value);
              setVersionId("");
              setVersions([]);
            }}
            placeholder="Elegí el modelo"
            options={models}
          />
          <Select
            label="Versión"
            value={versionId}
            onChange={setVersionId}
            placeholder="Elegí la versión"
            options={versions.map((item) => ({ id: String(item.id), label: item.fullCarDescripcion || item.description }))}
          />
        </div>

        <div className="home-quote__row home-quote__trio">
          <Pill label="GNC" value={hasGnc} onChange={setHasGnc} />
          <label>
            <span>CP</span>
            <input className="field" inputMode="numeric" maxLength={4} value={postal} onChange={(event) => setPostal(event.target.value.replace(/\D/g, "").slice(0, 4))} />
          </label>
          <label>
            <span>Edad</span>
            <input className="field" inputMode="numeric" maxLength={2} placeholder="34" value={age} onChange={(event) => setAge(event.target.value.replace(/\D/g, "").slice(0, 2))} />
          </label>
        </div>
        <div className="home-quote__row home-quote__contact">
          <label>
            <span>Nombre</span>
            <input className="field" value={nombre} placeholder="Tu nombre" onChange={(event) => setNombre(event.target.value)} />
          </label>
          <label>
            <span>DNI</span>
            <input className="field" inputMode="numeric" maxLength={8} placeholder="DNI" value={dni} onChange={(event) => setDni(event.target.value.replace(/\D/g, "").slice(0, 8))} />
          </label>
          <label>
            <span>WhatsApp</span>
            <input className="field" inputMode="tel" placeholder="387…" value={celular} onChange={(event) => setCelular(event.target.value)} />
          </label>
        </div>
          </>
        )}
        {!wizard || age.replace(/\D/g, "").length >= 2 ? (
          <button type="submit" className="btn btn-primary home-quote__submit" disabled={quoting}>
            {quoting ? "Cotizando…" : "Cotizar en San Cristóbal y SMG"}
          </button>
        ) : null}
        {quoting ? <p className="quote-info">Cotizando en San Cristóbal y SMG…</p> : null}
          </>
        ) : null}

        {view === "plans" && quote && variant === "crm" ? (
          <div className="crm-quote-result">
            <div className="crm-quote-result__bar">
              <button type="button" className="home-quote__back" onClick={() => setQuote(null)}>
                Editar datos
              </button>
              <h2>{quote.carDescription || hint || plate}</h2>
              <p>Marcá las cotizaciones del PDF y elegí un plan para emitir.</p>
              {plans.length > 0 ? (
                <button
                  type="button"
                  className="home-quote__back quote-pdf"
                  disabled={pdfBusy || pdfKeys.length === 0}
                  onClick={() => {
                    const chosen = plans.filter((plan) => pdfKeys.includes(plan.key));
                    if (!chosen.length) return;
                    setPdfBusy(true);
                    void import("@/lib/quote-pdf")
                      .then(({ downloadQuotePdf }) =>
                        downloadQuotePdf({
                          car: quote.carDescription || hint || plate,
                          plate,
                          customer: nombre.trim(),
                          postal,
                          statedAmount: quote.statedAmount,
                          hasGnc: hasGnc === "si",
                          plans: chosen,
                        })
                      )
                      .catch(() => setError("No se pudo armar el PDF."))
                      .finally(() => setPdfBusy(false));
                  }}
                >
                  {pdfBusy ? "Armando PDF…" : pdfKeys.length === 0 ? "Elegí un plan para el PDF" : `Descargar PDF (${pdfKeys.length})`}
                </button>
              ) : null}
            </div>
            {quote.sancristobal.error ? <p className="quote-alert">{quote.sancristobal.error}</p> : null}
            {quote.smg.error ? <p className="quote-alert">{quote.smg.error}</p> : null}
            {plans.length > 0 ? (
              <QuoteCompare
                embedded
                focusKey=""
                plans={plans}
                pickedKeys={pdfKeys}
                onTogglePdf={togglePdfPlan}
                onClose={() => setQuote(null)}
                onPick={pickPlan}
              />
            ) : (
              <p className="quote-alert">No hubo planes para comparar.</p>
            )}
          </div>
        ) : null}

        {view === "emit" && choice ? (
          <>
            <button type="button" className="home-quote__back" onClick={() => setChoice(null)}>
              Volver a los planes
            </button>
            <h2>Emitir {choice.title}</h2>
            <p className="home-quote__lede">
              {choice.company === "smg" ? "SMG" : "San Cristóbal"} · {money(choice.monthly)} / mes
            </p>
            {personHint ? <p className="quote-found">{personHint}</p> : null}
          <div className="home-quote__grid">
            <label>
              <span>DNI</span>
              <input className="field" inputMode="numeric" maxLength={8} value={dni} onChange={(event) => setDni(event.target.value.replace(/\D/g, "").slice(0, 8))} />
            </label>
            <label>
              <span>Género</span>
              <select className="field field-select" value={gender} onChange={(event) => setGender(event.target.value)}>
                <option value="">Seleccioná</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </label>
            <label className="sm:col-span-2">
              <span>Email</span>
              <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              <span>Nacimiento</span>
              <input className="field" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
            </label>
            <label>
              <span>Calle</span>
              <input className="field" value={street} onChange={(event) => setStreet(event.target.value)} />
            </label>
            <label>
              <span>Altura</span>
              <input className="field" value={streetNumber} onChange={(event) => setStreetNumber(event.target.value)} />
            </label>
            <label>
              <span>Patente</span>
              <input className="field" maxLength={7} value={plate} onChange={(event) => setPlate(normalizeArPlate(event.target.value))} />
            </label>
            <label>
              <span>Chasis</span>
              <input className="field" maxLength={20} value={vin} onChange={(event) => setVin(event.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20).toUpperCase())} />
            </label>
            <label className="sm:col-span-2">
              <span>Motor</span>
              <input className="field" maxLength={20} value={engine} onChange={(event) => setEngine(event.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20).toUpperCase())} />
            </label>
          </div>
          {choice.company === "sancristobal" || choice.company === "smg" ? (
            <div className="home-quote__grid">
              <p className="sm:col-span-2">
                {choice.company === "smg"
                  ? "Swiss Medical pide frente, trasera y los dos laterales. Kilometraje y chasis son opcionales."
                  : "San Cristóbal pide frente, trasera y los dos laterales. Kilometraje y chasis son opcionales."}
              </p>
              {INSPECTION_SHOTS.map((shot) => (
                <label key={shot.id}>
                  <span>
                    {shot.label}
                    {shot.required ? "" : " (opcional)"}
                    {photos[shot.id] ? " · lista" : ""}
                  </span>
                  <input
                    className="field"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void compressPhoto(file)
                        .then((content) => {
                          if (!content) throw new Error("No se pudo leer la foto");
                          setPhotos((current) => ({ ...current, [shot.id]: content }));
                          setError("");
                        })
                        .catch((err: unknown) => {
                          setError(err instanceof Error ? err.message : "No se pudo leer la foto.");
                        });
                    }}
                  />
                </label>
              ))}
            </div>
          ) : null}
          <button type="submit" className="btn btn-primary home-quote__submit" disabled={emitting}>
            {emitting ? "Emitiendo…" : "Emitir póliza"}
          </button>
          </>
        ) : null}

        {view === "done" ? (
          <>
            <button
              type="button"
              className="home-quote__back"
              onClick={() => {
                setIssued("");
                setCertificatePdf("");
                setCouponPdf("");
                setChoice(null);
                setQuote(null);
              }}
            >
              Nueva cotización
            </button>
            <h2>
              {issued.startsWith("Póliza")
                ? "Póliza emitida"
                : issued.startsWith("Certificado")
                  ? "Certificado generado"
                  : "No se pudo emitir"}
            </h2>
            <p className={issued.startsWith("Póliza") || issued.startsWith("Certificado") ? "quote-found" : "quote-alert"}>
              {issued}
            </p>
            {certificatePdf ? (
              <button
                type="button"
                className="btn btn-primary home-quote__submit"
                onClick={() =>
                  downloadPdf(
                    certificatePdf,
                    choice?.company === "smg" ? "certificado-swiss-medical.pdf" : "certificado-san-cristobal.pdf",
                  )
                }
              >
                Descargar certificado
              </button>
            ) : null}
            {couponPdf ? (
              <button
                type="button"
                className="btn btn-primary home-quote__submit"
                onClick={() => downloadPdf(couponPdf, "cupones-san-cristobal.pdf")}
              >
                Descargar cupones
              </button>
            ) : null}
          </>
        ) : null}

        {error && view !== "plans" ? <p className="quote-alert">{error}</p> : null}
      </form>
      {view === "plans" && quote && wizard ? (
        <div className="home-plans">
          <div className="home-plans__bar">
            <button type="button" className="home-quote__back" onClick={() => setQuote(null)}>
              Editar datos
            </button>
            <h2>{quote.carDescription || hint || plate}</h2>
            <p>Elegí un plan y seguimos por WhatsApp con Marcos.</p>
          </div>
          {quote.sancristobal.error ? <p className="quote-alert">{quote.sancristobal.error}</p> : null}
          {quote.smg.error ? <p className="quote-alert">{quote.smg.error}</p> : null}
          {plans.length > 0 ? (
            <QuoteCompare
              embedded
              focusKey=""
              plans={plans}
              pickLabel="Continuar"
              onClose={() => setQuote(null)}
              onPick={pickPlan}
            />
          ) : (
            <p className="quote-alert">No hubo planes para comparar.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function comparePlans(quote: QuotePayload): ComparePlan[] {
  const columns = [
    { company: "sancristobal" as const, name: "San Cristóbal", logo: "/companias/sancristobal.svg", data: quote.sancristobal },
    { company: "smg" as const, name: "Swiss Medical", logo: "/companias/smg.svg", data: quote.smg },
  ];
  return columns.flatMap((column) =>
    column.data.plans.slice(0, 3).map((plan) => ({
      key: `${column.company}:${plan.id}`,
      company: column.name,
      logo: column.logo,
      title: plan.title,
      monthly: plan.monthly,
      covers: plan.covers,
    }))
  );
}

function AutoSelect({
  label,
  value,
  open,
  onOpen,
  onChange,
  placeholder,
  options,
  empty,
}: {
  label: string;
  value: string;
  open: boolean;
  onOpen: () => void;
  onChange: (value: string) => void;
  placeholder: string;
  options: Option[];
  empty: string;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.id === value);
  const text = query.trim().toLowerCase();
  const shown = text ? options.filter((option) => option.label.toLowerCase().includes(text)) : options;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const timer = window.setTimeout(() => searchRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div className={`wizard-field${open ? " is-open" : ""}`}>
      <span>{label}</span>
      <button type="button" className="field wizard-trigger" aria-expanded={open} onClick={onOpen}>
        {selected?.label || placeholder}
      </button>
      {open ? (
        <div className="wizard-list">
          <input
            ref={searchRef}
            className="field wizard-search"
            value={query}
            placeholder="Buscar"
            onChange={(event) => setQuery(event.target.value)}
          />
          {shown.length === 0 ? <p>{options.length === 0 ? empty : "Sin resultados"}</p> : null}
          <ul role="listbox">
            {shown.map((option) => (
              <li key={option.id}>
                <button type="button" role="option" aria-selected={option.id === value} onClick={() => onChange(option.id)}>
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  placeholder,
  options,
  wide,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Option[];
  wide?: boolean;
}) {
  return (
    <label className={wide ? "home-quote__wide" : undefined}>
      <span>{label}</span>
      <select className="field field-select" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Pill({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <span>{label}</span>
      <div className="quote-pills">
        <button type="button" className={`quote-pill${value === "no" ? " is-on" : ""}`} onClick={() => onChange("no")}>
          No
        </button>
        <button type="button" className={`quote-pill${value === "si" ? " is-on" : ""}`} onClick={() => onChange("si")}>
          Sí
        </button>
      </div>
    </div>
  );
}

