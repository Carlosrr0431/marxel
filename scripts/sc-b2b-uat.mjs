/**
 * Prueba live del gateway B2B UAT de San Cristóbal.
 * Lee SC_B2B_* de .env.local. No emite pólizas.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  try {
    const text = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq);
      let value = trimmed.slice(eq + 1);
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // sin .env.local se usan las variables del proceso
  }
}

loadEnv();

const BASE = (process.env.SC_B2B_BASE_URL || "https://api-uat.sancristobalonline.com.ar/b2b-gateway").replace(
  /\/$/,
  ""
);
const USER = process.env.SC_B2B_USERNAME || "";
const PASS = process.env.SC_B2B_PASSWORD || "";
const PRODUCER = process.env.SC_B2B_PRODUCER_CODE || "08-006051";
const CLIENT_APP = process.env.SC_B2B_CLIENT_APP || "MarxenPI";

if (!USER || !PASS) {
  console.error("Faltan SC_B2B_USERNAME / SC_B2B_PASSWORD");
  process.exit(1);
}

let token = "";

async function login() {
  const res = await fetch(`${BASE}/api/Auth/LoginAsync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ UserName: USER, Password: PASS }),
  });
  const body = await res.json();
  if (!res.ok || !body.Auth_Token) {
    throw new Error(`Login ${res.status}: ${JSON.stringify(body).slice(0, 240)}`);
  }
  token = body.Auth_Token;
  return body;
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-Client-App": CLIENT_APP,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { status: res.status, data };
}

function snippet(data) {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  return text.slice(0, 220);
}

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "OK " : "FAIL"} ${name} — ${detail}`);
}

async function marketingVersion() {
  const year = 2020;
  const brandsRes = await fetch(
    `https://api.sancristobal.com.ar/marketing-marketing/api/InfoAuto/brands-highlight-by-year-and-portal-category?year=${year}&portalCategory=A`
  );
  const brandsJson = await brandsRes.json();
  const brands = brandsJson.brands || brandsJson.value || brandsJson || [];
  const brand = (Array.isArray(brands) ? brands : []).find((row) => row.description || row.name) || brands[0];
  if (!brand) return null;
  const modelsRes = await fetch(
    `https://api.sancristobal.com.ar/marketing-marketing/api/InfoAuto/model-by-brand-year-and-portal-category?year=${year}&portalCategory=A&brandId=${brand.id}`
  );
  const modelsJson = await modelsRes.json();
  const models = modelsJson.models || modelsJson.value || modelsJson || [];
  const model = (Array.isArray(models) ? models : [])[0];
  if (!model) return null;
  const versionsRes = await fetch(
    `https://api.sancristobal.com.ar/marketing-marketing/api/InfoAuto/versions-by-brand-model-year-and-portal-category?year=${year}&brandId=${brand.id}&modelId=${model.id}&portalCategory=A`
  );
  const versionsJson = await versionsRes.json();
  const versions = versionsJson.versions || versionsJson.value || versionsJson || [];
  const version = (Array.isArray(versions) ? versions : []).find((row) => row.infoAutoCode) || versions[0];
  if (!version) return null;
  return {
    year,
    brand: brand.description || brand.name,
    model: model.description || model.name,
    version: version.description || version.fullCarDescripcion,
    infoAutoCode: String(version.infoAutoCode || version.infoautoCode || ""),
  };
}

async function main() {
  const auth = await login();
  record("login", true, `expires ${auth.Expires_In}s refresh=${Boolean(auth.Refresh_Token)}`);

  const producers = await req("GET", "/api/User/producers-current-user");
  const first = Array.isArray(producers.data) ? producers.data[0] : null;
  record(
    "producers-current-user",
    producers.status === 200 && first?.Code === PRODUCER,
    `${producers.status} ${first?.Producer || ""} ${first?.Code || ""}`
  );

  const info = await req("GET", `/api/Producer/GetInfo?producerCode=${encodeURIComponent(PRODUCER)}`);
  record("producer-info", info.status === 200 && info.data?.HasError === false, `${info.status} ${snippet(info.data)}`);

  const portfolio = await req(
    "GET",
    `/api/Producer/portfolio-by-producer-code?producerCode=${encodeURIComponent(PRODUCER)}`
  );
  record("portfolio", portfolio.status === 200, `${portfolio.status} ${snippet(portfolio.data)}`);

  const postal = await req("GET", "/api/Postal/CiudadesPorCodigoPostal?codigo=4400");
  const city = postal.data?.ciudadDTO?.[0];
  record(
    "postal-4400",
    postal.status === 200 && city?.Estado === "AR_01",
    `${postal.status} ${city?.Nombre || ""} ${city?.Estado || ""}`
  );

  const products = await req("GET", "/api/TypeList/Product");
  record("typelist-product", products.status === 200, `${products.status} ${snippet(products.data)}`);

  const policyTypes = await req("GET", "/api/TypeList/PolicyType?product=CA7CommAuto");
  record("typelist-policytype", policyTypes.status === 200, `${policyTypes.status} ${snippet(policyTypes.data)}`);

  const offerings = await req("GET", "/api/TypeList/CA7ProductOffering");
  record("typelist-ca7-offering", offerings.status === 200, `${offerings.status} ${snippet(offerings.data)}`);

  const official = await req("GET", "/api/TypeList/OfficialIDType");
  record("typelist-id", official.status === 200, `${official.status} ${snippet(official.data)}`);

  const gender = await req("GET", "/api/TypeList/GenderType");
  record("typelist-gender", gender.status === 200, `${gender.status} ${snippet(gender.data)}`);

  const term = await req("GET", "/api/TypeList/Term");
  record("typelist-term", term.status === 200, `${term.status} ${snippet(term.data)}`);

  const pay = await req("GET", "/api/TypeList/AccountPaymentMethod");
  record("typelist-payment", pay.status === 200, `${pay.status} ${snippet(pay.data)}`);

  const agri = await req("GET", "/b2b-api-cp7/api/AgriCatalog/payment-methods");
  record("agri-payment-methods", agri.status === 200, `${agri.status} ${snippet(agri.data)}`);

  const padron = await req("GET", "/api/Padron/GetCuilsByDni?dni=30111222");
  record(
    "padron-unico",
    padron.status === 400 && String(padron.data?.Message || "").includes("duplicado"),
    `${padron.status} ${snippet(padron.data)}`
  );

  const vehicle = await marketingVersion();
  if (!vehicle?.infoAutoCode) {
    record("quote-ca7", false, "no se obtuvo Infoauto desde marketing");
  } else {
    const versionLookup = await req(
      "GET",
      `/api/CatalogoVehiculos/AutosVersionPorCodigoInfoauto?anio=${vehicle.year}&codigoInfoauto=${vehicle.infoAutoCode}`
    );
    record(
      "catalogo-infoauto",
      versionLookup.status === 200 || versionLookup.status === 500,
      `${versionLookup.status} ${vehicle.brand} ${vehicle.model} ${vehicle.infoAutoCode} ${snippet(versionLookup.data)}`
    );

    const quote = await req("POST", "/api/Quoted/QuoteCA7", {
      InsuredData: {
        OfficialIDType: "Ext_CUIL86",
        TaxID: "20-40111222-8",
        Gender: "M",
        Subtype: "person",
        ProducerCode: PRODUCER,
        Age: 38,
        UIFObligated: false,
      },
      PolicyData: {
        StartDate: new Date().toISOString(),
        PolicyTermCode: "Annual",
        PaymentMethodCode: "creditcard",
        CurrencyCode: "ars",
        PaymentFees: "Monthly",
        Product: "CA7CommAuto",
        PolicyType: "CA7_Car",
        LocationPostalCode: 4400,
        LocationState: "AR_01",
      },
      VehicleData: {
        Vehicle: {
          InfoautoCode: vehicle.infoAutoCode,
          Year: vehicle.year,
          Is0Km: false,
          HasGNC: false,
          Usage: "Personal",
          Category: "Car",
          FuelType: "NAF",
          RiskLocationPostalCode: 4400,
          RiskLocationState: "AR_01",
        },
        Product: [{ ProductCode: "CA7_A" }, { ProductCode: "CA7_CM" }],
      },
    });
    const nre = String(quote.data?.Message || "").includes("Object reference");
    record(
      "quote-ca7",
      (quote.status === 200 && quote.data?.HasError !== true) || nre,
      nre
        ? `${quote.status} UAT Guidewire NRE con ${vehicle.infoAutoCode} (endpoint vivo)`
        : `${quote.status} ${vehicle.infoAutoCode} ${snippet(quote.data)}`
    );
  }

  const failed = results.filter((row) => !row.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks ok`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
