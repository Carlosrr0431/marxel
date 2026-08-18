"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  BackButton,
  ChoiceList,
  ContactFields,
  FieldGroup,
  Label,
  PlansView,
  PostalFields,
  Required,
  StepForm,
  fetchJson,
  isPhone,
  notifyLead,
  openWhatsApp,
  runPostalLookup,
  submitQuote,
  type Location,
  type Plan,
} from "@/components/quote/QuoteUi";

type Step = "actividad" | "postal" | "detalle" | "contact" | "plans";

const ACTIVIDADES = [
  "Independiente / oficio",
  "Comercio",
  "Construcción",
  "Profesional",
  "Empleado",
];

const PERIODOS = [
  { id: "3", label: "3 meses" },
  { id: "6", label: "6 meses" },
  { id: "12", label: "12 meses" },
];

export function ApQuoteNative({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>("actividad");
  const [title, setTitle] = useState("Protegé tu día a día ante accidentes");
  const [subtitle, setSubtitle] = useState("Respaldo prestacional para independientes.");
  const [activityLabel, setActivityLabel] = useState("Rubro o actividad a cotizar");
  const [activityPlaceholder, setActivityPlaceholder] = useState("Actividad");
  const [landingId, setLandingId] = useState<number | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [actividad, setActividad] = useState("");
  const [workers, setWorkers] = useState("1");
  const [period, setPeriod] = useState("12");
  const [isMotorcycle, setIsMotorcycle] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const location = locations.find((l) => String(l.locationId) === locationId) || null;
  const workersQty = Math.max(1, Number(workers) || 1);

  useEffect(() => {
    let cancelled = false;
    fetchJson("/api/sc-quote?product=ap")
      .then((data) => {
        if (cancelled) return;
        setTitle(data.title || "Protegé tu día a día ante accidentes");
        if (data.subtitle) setSubtitle(data.subtitle);
        if (data.activityLabel) setActivityLabel(data.activityLabel);
        if (data.activityPlaceholder) setActivityPlaceholder(data.activityPlaceholder);
        if (data.landingId) setLandingId(Number(data.landingId));
        setPlans(data.plans || []);
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar el cotizador de accidentes personales.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function onActividad(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!actividad.trim()) return;
    setStep("postal");
    setTouched(false);
    setError("");
  }

  async function onPostal(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setLoading(true);
    setError("");
    try {
      const result = await runPostalLookup(postalCode, locationId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.locations) {
        setLocations(result.locations);
        setLocationId(result.locationId);
        if (result.needPick) {
          setTouched(false);
          return;
        }
      }
      setStep("detalle");
      setTouched(false);
    } catch {
      setError("No pudimos validar el código postal.");
    } finally {
      setLoading(false);
    }
  }

  function onDetalle(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!period || !isMotorcycle) return;
    setStep("contact");
    setTouched(false);
    setError("");
  }

  function onContact(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!nombre.trim() || !isPhone(celular)) return;
    if (plans.length === 0) {
      setError("No hay planes disponibles ahora.");
      return;
    }
    setStep("plans");
    setTouched(false);
    setError("");
  }

  async function onSelect(plan: Plan) {
    if (!location) return;
    setLoading(true);
    setError("");
    try {
      const saved = await submitQuote({
        product: "ap",
        landingId,
        nombre: nombre.trim(),
        celular: celular.trim(),
        location,
        plan,
        ap: {
          actividad: actividad.trim(),
          workers: workersQty,
          period: Number(period),
          isMotorcycle: isMotorcycle === "si",
        },
      });
      notifyLead(
        nombre.trim(),
        celular.trim(),
        "Seguro de accidentes personales",
        [
          `Cotización AP San Cristóbal ${saved.opportunityId ? `#${saved.opportunityId}` : ""}`,
          `Actividad: ${actividad.trim()}`,
          `Personas: ${workersQty}`,
          `Vigencia: ${period} meses`,
          `Usa moto: ${isMotorcycle === "si" ? "sí" : "no"}`,
          `Plan: ${plan.title}`,
          `CP: ${location.zipCode} ${location.description}`,
        ].join("\n")
      );
      openWhatsApp([
        `Hola MARXEN, soy ${nombre.trim()}.`,
        `Quiero cotizar Accidentes Personales.`,
        `Actividad: ${actividad.trim()}`,
        `Personas: ${workersQty} · vigencia ${period} meses · moto: ${isMotorcycle === "si" ? "sí" : "no"}`,
        `Plan: ${plan.title}`,
        `CP: ${location.zipCode} ${location.description}`,
        saved.opportunityId ? `Código: ${saved.opportunityId}` : "",
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar la cotización.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <BackButton onClick={onBack} />
      {step === "actividad" ? (
        <StepForm title={title} subtitle={activityLabel} loading={loading} error={error} onSubmit={onActividad}>
          <ChoiceList
            options={ACTIVIDADES.map((item) => ({ id: item, label: item }))}
            value={ACTIVIDADES.includes(actividad) ? actividad : ""}
            onChange={setActividad}
          />
          <Label title="O escribí tu actividad">
            <input
              className="field"
              placeholder={activityPlaceholder}
              value={actividad}
              onChange={(e) => setActividad(e.target.value)}
            />
          </Label>
          <Required show={touched && !actividad.trim()} />
        </StepForm>
      ) : null}

      {step === "postal" ? (
        <StepForm
          title="¿Dónde trabajás?"
          subtitle={actividad}
          loading={loading}
          error={error}
          onSubmit={onPostal}
        >
          <PostalFields
            postalCode={postalCode}
            locationId={locationId}
            locations={locations}
            onPostalChange={(value) => {
              setPostalCode(value);
              setLocationId("");
              setLocations([]);
            }}
            onLocationChange={setLocationId}
          />
          <Required show={touched && postalCode.length !== 4} />
        </StepForm>
      ) : null}

      {step === "detalle" ? (
        <StepForm
          title="Datos de la cobertura"
          subtitle="Así San Cristóbal arma una cotización a medida."
          loading={loading}
          error={error}
          onSubmit={onDetalle}
        >
          <Label title="¿Cuántas personas cubrís?">
            <input
              className="field"
              inputMode="numeric"
              min={1}
              max={50}
              value={workers}
              onChange={(e) => setWorkers(e.target.value.replace(/\D/g, "").slice(0, 2) || "1")}
            />
          </Label>
          <FieldGroup title="Vigencia">
            <ChoiceList options={PERIODOS} value={period} onChange={setPeriod} />
          </FieldGroup>
          <Required show={touched && !period} />
          <FieldGroup title="¿Usás moto para trabajar?">
            <ChoiceList
              options={[
                { id: "no", label: "No" },
                { id: "si", label: "Sí" },
              ]}
              value={isMotorcycle}
              onChange={setIsMotorcycle}
            />
          </FieldGroup>
          <Required show={touched && !isMotorcycle} />
        </StepForm>
      ) : null}

      {step === "contact" ? (
        <StepForm
          title="Tus datos para cotizar"
          subtitle={subtitle}
          loading={loading}
          error={error}
          submitLabel="Ver planes"
          onSubmit={onContact}
        >
          <ContactFields
            nombre={nombre}
            celular={celular}
            touched={touched}
            onNombre={setNombre}
            onCelular={setCelular}
          />
        </StepForm>
      ) : null}

      {step === "plans" ? (
        <>
          {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
          <PlansView
            busy={loading}
            subtitle="Elegí el plan y te armamos la cotización a medida."
            meta={[
              { label: "Actividad", value: actividad },
              { label: "Personas", value: String(workersQty) },
              { label: "Vigencia", value: `${period} meses` },
              { label: "Localidad", value: location ? `${location.description} (${location.zipCode})` : "" },
            ]}
            plans={plans}
            onSelect={onSelect}
          />
        </>
      ) : null}
    </div>
  );
}
