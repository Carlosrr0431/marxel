export type ClasificVehicle = {
  plate: string;
  make: string;
  model: string;
  year: number;
  vehicleType?: string;
  vehicleCategory?: string;
  city?: string;
  province?: string;
};

export async function fetchClasificVehicle(plate: string): Promise<ClasificVehicle | null> {
  const key = String(process.env.CLASIFICAR_API_KEY || "").trim();
  if (!key) {
    throw new Error("Falta CLASIFICAR_API_KEY");
  }

  const url = new URL("https://api.clasific.ar/v1/vehicles/basic");
  url.searchParams.set("plate", plate);
  url.searchParams.set("classification", "true");

  const res = await fetch(url, {
    headers: { Accept: "application/json", "x-api-key": key },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const message =
      (typeof data?.message === "string" && data.message) || `Clasificar ${res.status}`;
    throw new Error(message);
  }
  if (!data || data.found === false || data.success === false) return null;

  const row = (data.data && typeof data.data === "object" ? data.data : data) as Record<
    string,
    unknown
  >;
  const make = String(row.make || "").trim();
  const model = String(row.model || "").trim();
  const year = Number(row.year);
  if (!make || !model || !year) return null;

  const classification =
    row.classification && typeof row.classification === "object"
      ? (row.classification as Record<string, unknown>)
      : {};
  const location =
    row.currentLocation && typeof row.currentLocation === "object"
      ? (row.currentLocation as Record<string, unknown>)
      : {};

  return {
    plate: String(row.plate || plate).trim().toUpperCase(),
    make,
    model,
    year,
    vehicleType: classification.vehicleType ? String(classification.vehicleType) : undefined,
    vehicleCategory: classification.vehicleCategory
      ? String(classification.vehicleCategory)
      : undefined,
    city: location.city ? String(location.city) : undefined,
    province: location.province ? String(location.province) : undefined,
  };
}
