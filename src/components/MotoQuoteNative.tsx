"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  BackButton,
  ChoiceList,
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

type Range = { id: string; label: string; plans: Plan[] };
type Step = "cc" | "vehicle" | "postal" | "contact" | "plans";

export function MotoQuoteNative({
  onBack,
  initialPlate = "",
}: {
  onBack: () => void;
  initialPlate?: string;
}) {
  const [step, setStep] = useState<Step>("cc");
  const [title, setTitle] = useState("Asegurá tu moto");
  const [subtitle, setSubtitle] = useState("Protegete a vos y a tu moto en todo momento.");
  const [formTitle, setFormTitle] = useState("¿Cuál es la cilindrada de tu moto?");
  const [vehicleLabel, setVehicleLabel] = useState("Marca, modelo y año");
  const [vehiclePlaceholder, setVehiclePlaceholder] = useState("ej: Honda XR 150, 2019");
  const [landingId, setLandingId] = useState<number | null>(null);
  const [ranges, setRanges] = useState<Range[]>([]);
  const [ccId, setCcId] = useState("");
  const [vehicle, setVehicle] = useState(initialPlate ? `Patente ${initialPlate}` : "");
  const [postalCode, setPostalCode] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cc = ranges.find((r) => r.id === ccId) || null;
  const location = locations.find((l) => String(l.locationId) === locationId) || null;

  useEffect(() => {
    let cancelled = false;
    fetchJson("/api/sc-quote?product=moto")
      .then((data) => {
        if (cancelled) return;
        setTitle(data.title || "Asegurá tu moto");
        if (data.subtitle) setSubtitle(data.subtitle);
        if (data.formTitle) setFormTitle(data.formTitle);
        if (data.vehicleLabel) setVehicleLabel(data.vehicleLabel);
        if (data.vehiclePlaceholder) setVehiclePlaceholder(data.vehiclePlaceholder);
        if (data.landingId) setLandingId(Number(data.landingId));
        setRanges(data.ranges || []);
        if (!(data.ranges || []).length) {
          setError("No pudimos cargar las cilindradas. Probá de nuevo.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar el cotizador de moto.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function onCc(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!cc) return;
    setStep("vehicle");
    setTouched(false);
    setError("");
  }

  function onVehicle(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!vehicle.trim()) return;
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
    setStep("plans");
    setTouched(false);
    setError("");
  }

  async function onSelect(plan: Plan) {
    if (!location || !cc) return;
    setLoading(true);
    setError("");
    try {
      const saved = await submitQuote({
        product: "moto",
        landingId,
        nombre: nombre.trim(),
        celular: celular.trim(),
        location,
        plan,
        moto: { cc: cc.label, vehicle: vehicle.trim() },
      });
      notifyLead(
        nombre.trim(),
        celular.trim(),
        "Seguro de moto",
        [
          `Cotización moto San Cristóbal ${saved.opportunityId ? `#${saved.opportunityId}` : ""}`,
          `Cilindrada: ${cc.label}`,
          `Moto: ${vehicle.trim()}`,
          `Plan: ${plan.title}`,
          `CP: ${location.zipCode} ${location.description}`,
        ].join("\n")
      );
      openWhatsApp([
        `Hola MARXEN, soy ${nombre.trim()}.`,
        `Quiero cotizar moto ${cc.label}: ${vehicle.trim()}.`,
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
      {step === "cc" ? (
        <StepForm
          title={title}
          subtitle={initialPlate ? `Patente ${initialPlate}. ${formTitle}` : formTitle}
          loading={loading}
          error={error}
          onSubmit={onCc}
        >
          <ChoiceList
            options={ranges.map((range) => ({ id: range.id, label: range.label }))}
            value={ccId}
            onChange={setCcId}
          />
          <Required show={touched && !cc} />
        </StepForm>
      ) : null}

      {step === "vehicle" ? (
        <StepForm title="Datos de tu moto" subtitle={cc?.label} loading={loading} error={error} onSubmit={onVehicle}>
          <Label title={vehicleLabel}>
            <input
              className="field"
              placeholder={vehiclePlaceholder}
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
            />
          </Label>
          <Required show={touched && !vehicle.trim()} />
        </StepForm>
      ) : null}

      {step === "postal" ? (
        <StepForm title="¿Dónde circulás?" loading={loading} error={error} onSubmit={onPostal}>
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

      {step === "plans" && cc ? (
        <>
          {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
          <PlansView
            busy={loading}
            subtitle="San Cristóbal arma el precio según tu moto. Elegí el plan y te lo cotizamos ahora."
            meta={[
              { label: "Moto", value: vehicle },
              { label: "Cilindrada", value: cc.label },
              { label: "Localidad", value: location ? `${location.description} (${location.zipCode})` : "" },
            ]}
            plans={cc.plans}
            onSelect={onSelect}
          />
        </>
      ) : null}
    </div>
  );
}
