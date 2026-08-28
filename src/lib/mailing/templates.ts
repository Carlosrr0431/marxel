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

const HERO: Record<string, { src: string; alt: string }> = {
  institucional: { src: `${ASSET}/hero-institucional.jpg`, alt: "Familia con respaldo MARXEN" },
  salud: { src: `${ASSET}/hero-salud.jpg`, alt: "Asesoramiento en prepagas" },
  seguros: { src: `${ASSET}/hero-seguros.jpg`, alt: "Seguro de auto" },
  viajero: { src: `${ASSET}/hero-viajero.jpg`, alt: "Asistencia al viajero" },
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
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#3d3a4a;">${inner}</p>`;
    })
    .join("");
}

function pillarCell(href: string, img: string, label: string, hint: string) {
  return `<td width="186" valign="top" style="width:186px;padding:0 6px;">
  <a href="${escapeHtml(href)}" style="text-decoration:none;color:#1a1038;">
    <img src="${img}" width="174" alt="${escapeHtml(label)}" style="display:block;width:174px;height:110px;object-fit:cover;border:0;border-radius:12px;"/>
    <p style="margin:10px 0 0;font-size:15px;font-weight:700;color:#1a1038;">${escapeHtml(label)}</p>
    <p style="margin:4px 0 0;font-size:13px;line-height:1.4;color:#6b6578;">${escapeHtml(hint)}</p>
  </a>
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
  const ctaBg = isWhatsapp ? "#1f9d55" : "#352872";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#ece8f4;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ece8f4;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e4dfee;">
          <tr>
            <td style="background:#1a1038;padding:18px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="width:44px;">
                    <img src="${ASSET}/mark-light.png" width="36" height="36" alt="MARXEN" style="display:block;border:0;width:36px;height:36px;"/>
                  </td>
                  <td valign="middle" style="padding-left:10px;">
                    <p style="margin:0;font-size:20px;line-height:1;font-weight:700;letter-spacing:0.04em;color:#ffffff;">marxen</p>
                    <p style="margin:5px 0 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5fc4e5;">Protección Integral</p>
                  </td>
                  <td valign="middle" align="right">
                    <p style="margin:0;font-size:12px;color:rgba(255,255,255,.7);">Salta, Argentina</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="font-size:0;line-height:0;">
              <img src="${hero.src}" width="600" alt="${escapeHtml(hero.alt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;"/>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:#3ab4d9;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;">
              <p style="margin:0 0 10px;font-size:15px;color:#352872;">{{params.greeting}}</p>
              <h1 style="margin:0 0 16px;font-size:28px;line-height:1.25;color:#1a1038;">${title}</h1>
              ${bodyHtml}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 8px;">
                <tr>
                  <td style="border-radius:14px;background:${ctaBg};">
                    <a href="${ctaUrl}" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 26px 28px;">
              <p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#8a8496;">También podemos ayudarte con</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  ${pillarCell("https://www.marxen.com.ar/seguros", `${ASSET}/hero-seguros.jpg`, "Seguros", "Auto, moto, hogar y más.")}
                  ${pillarCell("https://www.marxen.com.ar/salud", `${ASSET}/hero-salud.jpg`, "Salud", "Prepagas y cartilla en Salta.")}
                  ${pillarCell("https://www.marxen.com.ar/viajero", `${ASSET}/hero-viajero.jpg`, "Viajero", "Cobertura médica para tu viaje.")}
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 24px;background:#1a1038;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#ffffff;">MARXEN · Productores asesores</p>
              <p style="margin:0;font-size:13px;line-height:1.55;color:rgba(255,255,255,.72);">WhatsApp 387 634-8199 · comercial@marxen.com.ar<br/>Salta, Argentina</p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 32px 20px;background:#f7f5fb;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8496;">Recibís este mail porque te contactaste con MARXEN o formás parte de nuestra base de asesoramiento. Si no querés más novedades, respondé este correo y lo damos de baja.</p>
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
