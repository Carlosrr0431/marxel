"use client";

import { useState, type FormEvent } from "react";
import {
  BackButton,
  ContactFields,
  PlansView,
  PostalFields,
  Required,
  StepForm,
  fetchJson,
  isPhone,
  money,
  notifyLead,
  openWhatsApp,
  runPostalLookup,
  submitQuote,
  type Location,
  type Plan,
} from "@/components/quote/QuoteUi";

type Step = "postal" | "contact" | "plans";

export function HogarQuoteNative({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>("postal");
  const [postalCode, setPostalCode] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [opportunityId, setOpportunityId] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const location = locations.find((l) => String(l.locationId) === locationId) || null;

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

  async function onContact(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!nombre.trim() || !isPhone(celular) || !location) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchJson("/api/sc-quote?product=hogar");
      const next = (data.plans || []) as Plan[];
      if (next.length === 0) {
        setError("No hay planes de hogar disponibles ahora.");
        return;
      }
      setPlans(next);
      setStep("plans");
      setTouched(false);
    } catch {
      setError("No pudimos cargar los planes. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function onSelect(plan: Plan) {
    if (!location) return;
    setLoading(true);
    setError("");
    try {
      const saved = await submitQuote({
        product: "hogar",
        nombre: nombre.trim(),
        celular: celular.trim(),
        location,
        hogar: { planCode: plan.key, title: plan.title, monthly: plan.monthly },
      });
      setOpportunityId(saved.opportunityId || null);
      notifyLead(
        nombre.trim(),
        celular.trim(),
        "Seguro de hogar",
        [
          `Cotización hogar San Cristóbal ${saved.opportunityId ? `#${saved.opportunityId}` : ""}`,
          `Plan: ${plan.title}${plan.monthly ? ` · ${money(plan.monthly)} / mes` : ""}`,
          `CP: ${location.zipCode} ${location.description}`,
        ].join("\n")
      );
      openWhatsApp([
        `Hola MARXEN, soy ${nombre.trim()}.`,
        `Quiero el plan ${plan.title} de hogar.`,
        plan.monthly ? `Precio: ${money(plan.monthly)} / mes` : "",
        `CP: ${location.zipCode} ${location.description}`,
        saved.opportunityId ? `Código: ${saved.opportunityId}` : "",
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar la cotización.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <BackButton onClick={onBack} />
      {step === "postal" ? (
        <StepForm
          title="¡Asegurá tu hogar!"
          subtitle="Ingresá el código postal de la vivienda."
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

      {step === "contact" ? (
        <StepForm
          title="Tus datos para cotizar"
          subtitle={location ? `${location.zipCode} · ${location.description}` : ""}
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
            meta={[
              { label: "Vivienda", value: location ? `${location.description} (${location.zipCode})` : "" },
              ...(opportunityId ? [{ label: "Código", value: String(opportunityId) }] : []),
            ]}
            plans={plans}
            onSelect={onSelect}
          />
        </>
      ) : null}
    </div>
  );
}
