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
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3d3a4a;">${inner}</p>`;
    })
    .join("");
}

export function buildMailHtml(input: {
  preheader: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}) {
  const preheader = escapeHtml(input.preheader);
  const title = escapeHtml(input.title);
  const bodyHtml = textToHtml(input.body);
  const ctaLabel = escapeHtml(input.ctaLabel || "Escribinos");
  const ctaUrl = escapeHtml(input.ctaUrl || "https://wa.me/5493876348199");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f1f8;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1f8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e6e1f0;">
          <tr>
            <td style="background:#1a1038;background:linear-gradient(135deg,#1a1038 0%,#352872 58%,#2a6f8a 100%);padding:28px 32px;">
              <p style="margin:0;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#5fc4e5;font-weight:700;">MARXEN</p>
              <p style="margin:8px 0 0;font-size:22px;line-height:1.25;color:#ffffff;font-weight:700;">Protección Integral</p>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,.72);">Seguros · Salud · Viajero · Salta</p>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:#3ab4d9;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 12px;font-size:15px;color:#352872;">{{params.greeting}}</p>
              <h1 style="margin:0 0 18px;font-size:26px;line-height:1.25;color:#1a1038;">${title}</h1>
              ${bodyHtml}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
                <tr>
                  <td style="border-radius:12px;background:#352872;">
                    <a href="${ctaUrl}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;line-height:1.55;color:#6b6578;">WhatsApp 387 634-8199 · comercial@marxen.com.ar<br/>Salta, Argentina</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;background:#f7f5fb;border-top:1px solid #eee8f5;">
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
