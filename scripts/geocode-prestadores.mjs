/**
 * Geocodifica las direcciones de prestadores usando Nominatim (OSM).
 * Ejecutar: node scripts/geocode-prestadores.mjs
 */

const PRESTADORES = [
  { id: "hospital-santa-clara",         addr: "Urquiza 964, Salta, Argentina" },
  { id: "hospital-tres-cerritos",       addr: "Avenida Juan Bautista Justo 93, Salta, Argentina" },
  { id: "sanatorio-el-carmen",          addr: "Salta Capital, Salta, Argentina" },
  { id: "sanatorio-san-roque",          addr: "Av Reyes Católicos 1518, Salta, Argentina" },
  { id: "clinica-berg",                 addr: "Alberdi 359, Salta, Argentina" },
  { id: "vitae-medical",                addr: "Zabala 432, Salta, Argentina" },
  { id: "clinica-luis-guemes",          addr: "Adolfo Güemes 287, Salta, Argentina" },
  { id: "imac-centro",                  addr: "Alvarado 858, Salta, Argentina" },
  { id: "imagen-clara",                 addr: "General Urquiza 968, Salta, Argentina" },
  { id: "diagnostico-salta",            addr: "Dr Mariano Boedo 62, Salta, Argentina" },
  { id: "imagenes-medicas",             addr: "Mariano Boedo 62, Salta, Argentina" },
  { id: "imagenes-jaraba",              addr: "Mitre 486, Salta, Argentina" },
  { id: "cordis-sa",                    addr: "España 1067, Salta, Argentina" },
  { id: "tomografia-estado",            addr: "Mariano Boedo 151, Salta, Argentina" },
  { id: "laboratorios-katz",            addr: "Adolfo Güemes 82, Salta, Argentina" },
  { id: "maternidad-privada",           addr: "Urquiza 150, Salta, Argentina" },
  { id: "servicio-nino-jesus",          addr: "Urquiza 964, Salta, Argentina" },
  { id: "medicina-ambulatoria",         addr: "Buenos Aires 196, Salta, Argentina" },
  { id: "cigno",                        addr: "20 de Febrero 659, Salta, Argentina" },
  { id: "arcadia-salud",                addr: "Urquiza 181, Salta, Argentina" },
  { id: "cedit-srl",                    addr: "Santiago del Estero 1415, Salta, Argentina" },
  { id: "centro-solar",                 addr: "Caseros 1418, Salta, Argentina" },
  { id: "clinica-virgen-huachana",      addr: "Av General Güemes 218, Salta, Argentina" },
  { id: "corema-srl",                   addr: "Urquiza 150, Salta, Argentina" },
  { id: "fundacion-urkupina",           addr: "Ameghino 1064, Salta, Argentina" },
  { id: "hospital-materno",             addr: "Av Sarmiento 1301, Salta, Argentina" },
  { id: "senyp-srl",                    addr: "Urquiza 150, Salta, Argentina" },
  { id: "profilaxis-srl",               addr: "Sarmiento 371, Salta, Argentina" },
  { id: "instituto-saravia",            addr: "Av General Manuel Belgrano 544, Salta, Argentina" },
  { id: "lic-olcese",                   addr: "Dr Facundo de Zuviria 920, Salta, Argentina" },
];

async function geocode(addr) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1&countrycodes=ar`;
  const res = await fetch(url, {
    headers: { "User-Agent": "marxen-cartilla-medica/1.0" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

console.log("Geocodificando prestadores con Nominatim...\n");
const results = [];

for (const p of PRESTADORES) {
  const coords = await geocode(p.addr);
  if (coords) {
    results.push({ id: p.id, ...coords });
    console.log(`✓ ${p.id}: ${coords.lat}, ${coords.lng}`);
  } else {
    console.log(`✗ ${p.id}: no encontrado`);
  }
  // Respetar rate limit de Nominatim: 1 req/seg
  await sleep(1100);
}

console.log("\n--- RESULTADO FINAL ---");
console.log(JSON.stringify(results, null, 2));
