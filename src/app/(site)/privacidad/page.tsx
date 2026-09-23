import type { Metadata } from "next";
import { PageHero } from "@/components/SectionHeading";
import { site } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

const TITLE = "Política de privacidad";
const DESCRIPTION =
  "Cómo MARXEN trata los datos de cotizaciones, WhatsApp y Google Calendar.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/privacidad",
});

export default function PrivacidadPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Política de privacidad"
        description="MARXEN usa tus datos para cotizar y dar seguimiento. No los vendemos."
        crumbs={[
          { href: "/", label: "Inicio" },
          { href: "/privacidad", label: "Privacidad" },
        ]}
      />
      <section className="bg-cloud">
        <div className="container-mx max-w-3xl space-y-8 py-14 text-sm leading-relaxed text-navy sm:py-16">
          <p>
            MARXEN es un productor asesor de seguros en Salta Capital, Argentina. Esta política
            cubre el sitio marxen.com.ar, el cotizador, el chat de WhatsApp y la conexión opcional
            de Google Calendar en el CRM interno.
          </p>
          <div>
            <h2 className="font-display text-xl font-semibold">Qué datos pedimos</h2>
            <p className="mt-2 text-muted">
              Nombre, celular, email, localidad, datos del vehículo o del viaje, y el contenido que
              nos escribas por el formulario, el chatbot o WhatsApp. Si un asesor conecta su Gmail,
              también accedemos al calendario de esa cuenta de Google.
            </p>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">Para qué los usamos</h2>
            <p className="mt-2 text-muted">
              Para cotizar seguros, prepagas y asistencia al viajero, responder consultas, agendar
              seguimientos y emitir la propuesta con la compañía que corresponda. El acceso a Google
              Calendar sirve para mostrar los eventos del asesor dentro del CRM y crear o mover
              turnos de seguimiento. No usamos los datos de Google para publicidad ni los vendemos.
            </p>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">Con quién se comparten</h2>
            <p className="mt-2 text-muted">
              Con la aseguradora o prepaga necesaria para cotizar (por ejemplo San Cristóbal Seguros),
              con WhatsApp para los mensajes, con Google si conectás el calendario, y con los
              proveedores que alojan el sitio y la base de datos. El uso de datos de las APIs de
              Google cumple la Política de datos de usuario de los servicios de API de Google,
              incluido el requisito de uso limitado.
            </p>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">Conservación y derechos</h2>
            <p className="mt-2 text-muted">
              Guardamos la ficha mientras haga falta para el asesoramiento o una obligación legal.
              Podés pedir acceso, corrección o eliminación escribiendo a {site.email} o por WhatsApp
              al {site.phoneLocal}. También podés desconectar Gmail desde el calendario del CRM.
            </p>
          </div>
          <p className="text-muted">Vigente desde el 22 de septiembre de 2026.</p>
        </div>
      </section>
    </>
  );
}
