export type MailPreset = {
  id: string;
  label: string;
  subject: string;
  preheader: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
};

export const MAIL_PRESETS: MailPreset[] = [
  {
    id: "institucional",
    label: "Institucional",
    subject: "MARXEN Protección Integral — estamos para ayudarte",
    preheader: "Seguros, salud y asistencia al viajero en Salta.",
    title: "Respaldo y tranquilidad, en cada etapa",
    body: "Somos productores asesores en Salta. Te acompañamos a cotizar y contratar seguros, prepagas y asistencia al viajero, con asesoramiento claro y seguimiento personal.\n\nSi querés una cotización o tenés una consulta, escribinos y te respondemos a la brevedad.",
    ctaLabel: "Hablar por WhatsApp",
    ctaUrl: "https://wa.me/5493876348199",
  },
  {
    id: "salud",
    label: "Salud",
    subject: "Compará prepagas en Salta con MARXEN",
    preheader: "Planes de Prevención Salud con cartilla local.",
    title: "Tu cobertura de salud, con asesoramiento local",
    body: "En MARXEN te ayudamos a elegir el plan de Prevención Salud que mejor se adapta a vos y a tu grupo familiar, con cartilla en Salta y acompañamiento en el alta.\n\nContanos qué cobertura estás buscando y armamos la cotización.",
    ctaLabel: "Cotizar salud",
    ctaUrl: "https://www.marxen.com.ar/salud",
  },
  {
    id: "seguros",
    label: "Seguros",
    subject: "Cotizá tu seguro de auto, moto u hogar",
    preheader: "San Cristóbal y más compañías, con productor en Salta.",
    title: "Tu seguro, comparado y gestionado por MARXEN",
    body: "Cotizamos auto, moto, hogar y más ramos con compañías de primer nivel. Te explicamos coberturas en criollo y te acompañamos hasta la emisión.\n\nEscribinos con el dato del bien a asegurar y te armamos la propuesta.",
    ctaLabel: "Cotizar seguros",
    ctaUrl: "https://www.marxen.com.ar/seguros",
  },
  {
    id: "viajero",
    label: "Viajero",
    subject: "Asistencia al viajero antes de salir",
    preheader: "GO Assistance: contratá cobertura médica para tu viaje.",
    title: "Viajá cubierto, contratá antes de salir",
    body: "La asistencia al viajero se contrata antes de dejar el país. Te armamos el plan según destino y duración, incluyendo opciones Schengen.\n\nPasanos fechas y destino y te enviamos la cotización.",
    ctaLabel: "Cotizar viajero",
    ctaUrl: "https://www.marxen.com.ar/viajero",
  },
];

const ASSET = "https://www.marxen.com.ar/mail";
const SITE = "https://www.marxen.com.ar";

const C = {
  navy: "#352872",
  navyDeep: "#1a1038",
  sky: "#5fc4e5",
  teal: "#3ab4d9",
  aqua: "#e7f6fb",
  mist: "#f1eef8",
  cloud: "#f7f8fc",
  ink: "#2c2a35",
  muted: "#5c5a68",
  line: "#dddce6",
  white: "#ffffff",
};

const HERO: Record<string, { src: string; alt: string; eyebrow: string }> = {
  institucional: {
    src: `${ASSET}/hero-institucional.jpg`,
    alt: "Familia con respaldo MARXEN",
    eyebrow: "Productores de seguros en Salta",
  },
  salud: {
    src: `${ASSET}/hero-salud.jpg`,
    alt: "Asesoramiento en prepagas",
    eyebrow: "Salud · Prevención Salud",
  },
  seguros: {
    src: `${ASSET}/hero-seguros.jpg`,
    alt: "Seguro de auto",
    eyebrow: "Seguros · San Cristóbal",
  },
  viajero: {
    src: `${ASSET}/hero-viajero.jpg`,
    alt: "Asistencia al viajero",
    eyebrow: "Viajero · GO Assistance",
  },
};

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function textToHtml(text: string) {
  const blocks = String(text || "")
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean);
  if (!blocks.length) return "";
  return blocks
    .map((block) => {
      const inner = escapeHtml(block).replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:${C.ink};">${inner}</p>`;
    })
    .join("");
}

function pillarRow(href: string, img: string, label: string, hint: string, accent: string) {
  return `<tr>
  <td style="padding:0 0 10px;">
    <a href="${escapeHtml(href)}" style="text-decoration:none;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cloud};border:1px solid ${C.line};border-radius:14px;">
        <tr>
          <td width="6" style="width:6px;background:${accent};border-radius:14px 0 0 14px;font-size:0;line-height:0;">&nbsp;</td>
          <td width="72" valign="middle" style="padding:12px 10px 12px 14px;">
            <img src="${img}" width="64" height="48" alt="${escapeHtml(label)}" style="display:block;width:64px;height:48px;border:0;border-radius:8px;"/>
          </td>
          <td valign="middle" style="padding:12px 16px 12px 0;">
            <p style="margin:0;font-size:15px;font-weight:700;color:${C.navyDeep};">${escapeHtml(label)}</p>
            <p style="margin:4px 0 0;font-size:13px;line-height:1.45;color:${C.muted};">${escapeHtml(hint)}</p>
          </td>
        </tr>
      </table>
    </a>
  </td>
</tr>`;
}

function statCell(value: string, label: string, last = false) {
  return `<td width="33%" align="center" style="width:33%;padding:4px 8px;${last ? "" : `border-right:1px solid ${C.line};`}">
  <p style="margin:0;font-size:20px;font-weight:700;color:${C.navyDeep};">${value}</p>
  <p style="margin:4px 0 0;font-size:11px;letter-spacing:0.04em;color:${C.muted};">${label}</p>
</td>`;
}

export function buildMailHtml(input: {
  preheader: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  theme?: string;
}) {
  const preheader = escapeHtml(input.preheader);
  const title = escapeHtml(input.title);
  const bodyHtml = textToHtml(input.body);
  const ctaLabel = escapeHtml(input.ctaLabel || "Escribinos");
  const ctaUrl = escapeHtml(input.ctaUrl || "https://wa.me/5493876348199");
  const theme = HERO[input.theme || ""] ? input.theme! : "institucional";
  const hero = HERO[theme];
  const isWhatsapp = /wa\.me|whatsapp/i.test(ctaUrl);
  const ctaBg = isWhatsapp ? "#128C7E" : C.navy;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${C.cloud};font-family:Arial,Helvetica,sans-serif;color:${C.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cloud};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.white};border-radius:18px;overflow:hidden;border:1px solid ${C.line};">
          <tr>
            <td style="background:${C.white};padding:18px 28px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle">
                    <a href="${SITE}" style="text-decoration:none;">
                      <img src="${ASSET}/logo.png" width="196" height="56" alt="marxen Protección Integral" style="display:block;border:0;width:196px;height:56px;"/>
                    </a>
                  </td>
                  <td valign="middle" align="right">
                    <p style="margin:0;font-size:12px;color:${C.muted};">Salta, Argentina</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="height:3px;background:${C.teal};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="font-size:0;line-height:0;">
              <img src="${hero.src}" width="600" alt="${escapeHtml(hero.alt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;"/>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 36px 12px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${C.teal};">${escapeHtml(hero.eyebrow)}</p>
              <p style="margin:0 0 10px;font-size:15px;color:${C.navy};">{{params.greeting}}</p>
              <h1 style="margin:0 0 18px;font-size:28px;line-height:1.28;font-weight:700;color:${C.navyDeep};">${title}</h1>
              ${bodyHtml}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 10px;">
                <tr>
                  <td style="border-radius:12px;background:${ctaBg};">
                    <a href="${ctaUrl}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:${C.white};text-decoration:none;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 36px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.aqua};border-radius:14px;">
                <tr>
                  ${statCell("+500", "Clientes activos")}
                  ${statCell("3", "Especialidades")}
                  ${statCell("24 hs", "Respuesta", true)}
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 36px 32px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${C.teal};">Qué hacemos</p>
              <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:${C.navyDeep};">Todo lo que necesitás, en un solo lugar</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${pillarRow(`${SITE}/seguros`, `${ASSET}/hero-seguros.jpg`, "Seguros", "Auto, moto, hogar y más ramos, comparados en criollo.", "#16a34a")}
                ${pillarRow(`${SITE}/salud`, `${ASSET}/hero-salud.jpg`, "Salud", "Prepagas A2 / A4 y cartilla local en Salta.", "#dc2626")}
                ${pillarRow(`${SITE}/viajero`, `${ASSET}/hero-viajero.jpg`, "Viajero", "Cobertura médica para tu viaje, incluso Schengen.", "#2563eb")}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 36px;background:${C.navyDeep};">
              <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:${C.white};">MARXEN · Productores asesores</p>
              <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:${C.sky};">Asesoramiento claro, humano y a tu medida en Salta.</p>
              <p style="margin:0;font-size:13px;line-height:1.7;color:rgba(255,255,255,.78);">
                WhatsApp <a href="https://wa.me/5493876348199" style="color:${C.sky};text-decoration:none;">387 634-8199</a><br/>
                <a href="mailto:comercial@marxen.com.ar" style="color:${C.sky};text-decoration:none;">comercial@marxen.com.ar</a><br/>
                Salta, Argentina
              </p>
              <p style="margin:16px 0 0;font-size:12px;">
                <a href="${SITE}/seguros" style="color:${C.white};text-decoration:none;">Seguros</a>
                <span style="color:rgba(255,255,255,.35);"> · </span>
                <a href="${SITE}/salud" style="color:${C.white};text-decoration:none;">Salud</a>
                <span style="color:rgba(255,255,255,.35);"> · </span>
                <a href="${SITE}/viajero" style="color:${C.white};text-decoration:none;">Viajero</a>
                <span style="color:rgba(255,255,255,.35);"> · </span>
                <a href="${SITE}/cotizar" style="color:${C.white};text-decoration:none;">Cotizar</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 36px 22px;background:${C.mist};">
              <p style="margin:0;font-size:12px;line-height:1.55;color:${C.muted};">Recibís este mail porque te contactaste con MARXEN o formás parte de nuestra base de asesoramiento. Si no querés más novedades, respondé este correo y lo damos de baja.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function greetingFor(name: string) {
  const clean = String(name || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "Hola,";
  const first = clean.split(" ")[0];
  return `Hola, ${first}`;
}
