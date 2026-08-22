export type ArPlateKind = "auto" | "moto" | "invalid" | "empty";

export function normalizeArPlate(value: string) {
  return String(value || "")
    .replace(/[\s-]/g, "")
    .toUpperCase()
    .slice(0, 7);
}

export function classifyArPlate(value: string): ArPlateKind {
  const plate = normalizeArPlate(value);
  if (!plate) return "empty";
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(plate) || /^[A-Z]{3}\d{3}$/.test(plate)) return "auto";
  if (/^[A-Z]\d{3}[A-Z]{3}$/.test(plate) || /^\d{3}[A-Z]{3}$/.test(plate)) return "moto";
  return "invalid";
}
