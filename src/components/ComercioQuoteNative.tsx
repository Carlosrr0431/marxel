"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  BackButton,
  ContactFields,
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

type Step = "postal" | "contact" | "plans";

export function ComercioQuoteNative({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>("postal");
  const [title, setTitle] = useState("Un seguro a la medida de tu negocio");
  const [subtitle, setSubtitle] = useState("Asegurá tu mercadería y tu lugar de trabajo.");
  const [landingId, setLandingId] = useState<number | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [rubro, setRubro] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const location = locations.find((l) => String(l.locationId) === locationId) || null;

  useEffect(() => {
    let cancelled = false;
    fetchJson("/api/sc-quote?product=comercio")
      .then((data) => {
        if (cancelled) return;
        setTitle(data.title || "Un seguro a la medida de tu negocio");
        if (data.subtitle) setSubtitle(data.subtitle);
        if (data.landingId) setLandingId(Number(data.landingId));
        setPlans(data.plans || []);
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar el cotizador de comercio.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      setStep("contact");
      setTouched(false);
    } catch {
      setError("No pudimos validar el código postal.");
    } finally {
      setLoading(false);
    }
  }

  function onContact(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!nombre.trim() || !isPhone(celular)) return;
    if (plans.length === 0) {
      setError("No hay cobertura disponible ahora.");
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
        product: "comercio",
        landingId,
        nombre: nombre.trim(),
        celular: celular.trim(),
        location,
        plan,
        comercio: { rubro: rubro.trim() },
      });
      notifyLead(
        nombre.trim(),
        celular.trim(),
        "Seguro integral de comercio",
        [
          `Cotización comercio San Cristóbal ${saved.opportunityId ? `#${saved.opportunityId}` : ""}`,
          rubro.trim() ? `Rubro: ${rubro.trim()}` : "",
          `Plan: ${plan.title}`,
          `CP: ${location.zipCode} ${location.description}`,
        ]
          .filter(Boolean)
          .join("\n")
      );
      openWhatsApp([
        `Hola MARXEN, soy ${nombre.trim()}.`,
        `Quiero cotizar Integral de Comercio.`,
        rubro.trim() ? `Rubro: ${rubro.trim()}` : "",
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
      {step === "postal" ? (
        <StepForm title={title} subtitle="Ingresá el código postal del local." loading={loading} error={error} onSubmit={onPostal}>
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

      {step === "contact" ? (
        <StepForm
          title="Tus datos para cotizar"
          subtitle={subtitle}
          loading={loading}
          error={error}
          submitLabel="Ver cobertura"
          onSubmit={onContact}
        >
          <ContactFields
            nombre={nombre}
            celular={celular}
            touched={touched}
            onNombre={setNombre}
            onCelular={setCelular}
          />
          <Label title="Rubro del comercio (opcional)">
            <input
              className="field"
              placeholder="ej: almacén, kiosco, taller"
              value={rubro}
              onChange={(e) => setRubro(e.target.value)}
            />
          </Label>
        </StepForm>
      ) : null}

      {step === "plans" ? (
        <>
          {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
          <PlansView
            busy={loading}
            subtitle="San Cristóbal cotiza el comercio a medida. Dejanos el pedido y te armamos la propuesta."
            meta={[
              { label: "Localidad", value: location ? `${location.description} (${location.zipCode})` : "" },
              ...(rubro.trim() ? [{ label: "Rubro", value: rubro.trim() }] : []),
            ]}
            plans={plans}
            onSelect={onSelect}
          />
        </>
      ) : null}
    </div>
  );
}
