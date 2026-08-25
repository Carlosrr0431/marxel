/**
 * Ficha GO! ASSISTANCE (asistencia al viajero) para el chatbot WhatsApp + web.
 * Fuentes: goassistance.com/ar (FAQ y guías Europa, consulta ago 2026),
 * tríptico comercial GO (cobertura en viaje, central propia, GO! PAY, deportes, mascotas)
 * y cotizador MARXEN (destinos).
 * Montos de planes son de referencia publicada; se confirman al cotizar. No inventar precios.
 */
export const SOURCE = {
  id: "goassistance",
  title: "GO! ASSISTANCE — Asistencia al viajero (internacional y local)",
  file: "web:goassistance.com/ar + tríptico GO + cotizador MARXEN",
  pages: 16,
};

export const CHUNKS = [
  {
    id: "goassistance-0001",
    sourceTitle: "GO! ASSISTANCE — Qué es y cómo la comercializa MARXEN",
    content: `GO! ASSISTANCE (también Go Assistance / GO!) es una empresa argentina de asistencia al viajero, con 25 años de trayectoria, presencia en 10 países y red médica en más de 100 destinos. Central operativa PROPIA, atención 24/7 en tu idioma. Sponsor oficial de Club Atlético Vélez Sarsfield. Sitio: https://www.goassistance.com/ar

MARXEN Protección Integral (Salta) comercializa GO! como productor/asesor. Para cotizar o contratar desde Salta: WhatsApp MARXEN 387 634-8199 o https://www.marxen.com.ar/viajero

DIFERENCIALES (ficha comercial GO):
- Cobertura en viaje
- Asistencia 24/7 en tu idioma
- Central operativa propia (no un call center tercerizado)
- GO! PAY: tarjeta VISA virtual para asistirse de forma directa
- Emisión online (voucher por mail)
- Cobertura para deportes (según plan, p. ej. GO! Adventure)
- Cobertura para mascotas (Pet Assistance en planes que la incluyen, p. ej. Adventure)

REGLA: las coberturas, topes y exclusiones rigen por el voucher/condiciones del plan cotizado. No inventar precios ni montos si no están en esta ficha. Un asesor de MARXEN confirma la cotización.`,
  },
  {
    id: "goassistance-0002",
    sourceTitle: "GO! ASSISTANCE — Asistencia al viajero vs seguro de viaje",
    content: `ASISTENCIA AL VIAJERO vs SEGURO DE VIAJE

Asistencia GO!: cuando hay un problema (enfermedad, accidente, valija, documentos) llamás a la central. GO! coordina el prestador, autoriza y PAGA DIRECTO en destino. No es “adelantá y después reclama”. El seguro clásico suele reembolsar después de que pagaste.

GO! combina ambos: cobertura DIRECTA médica/traslado en destino y reembolso para algunos adicionales (p. ej. cancelación de vuelo o gastos presentados).

Frase útil: el seguro te indemniza; la asistencia te resuelve.

GO! PAY: visa virtual para asistirse de forma directa cuando aplica.

En urgencia: contactar la central ANTES de pagar un médico. Pagar por cuenta propia sin autorización puede afectar el reembolso.

Cotizar con MARXEN: 387 634-8199.`,
  },
  {
    id: "goassistance-0003",
    sourceTitle: "GO! ASSISTANCE — Qué cubre (según plan)",
    content: `QUÉ CUBRE GO! ASSISTANCE (varía según el plan elegido)

La FAQ pública lista, a modo general: urgencias médicas, hospitalización, traslado sanitario, odontología de urgencia, pérdida y demora de equipaje, demora y cancelación de vuelos, embarazos hasta las 26 semanas, doctor online (telemedicina), repatriación sanitaria y funeraria, VIP GO! Experience. El tope médico de esa FAQ genérica (“hasta USD 40.000”) NO es el tope de todos los planes: el Monto Máximo Global (MMG) real está en cada producto (p. ej. GO! 365 USD 45.000, SMART 80.000, PRIORITY 300.000). Siempre se confirma al cotizar.

También (según plan): COVID-19, medicamentos, preexistencias en urgencia con tope, concierge y extras premium.

NO es una prepaga ni reemplaza OSDE/Prevención Salud en Argentina. Es cobertura de VIAJE.

Debe contratarse ANTES de salir del país de residencia. Una vez iniciado el viaje, no se activa.

Cotizar: MARXEN 387 634-8199 · https://www.marxen.com.ar/viajero`,
  },
  {
    id: "goassistance-0004",
    sourceTitle: "GO! ASSISTANCE — Planes de referencia (MMG y para quién)",
    content: `PLANES GO! — montos de referencia publicados para Europa (goassistance.com, 2026). Al cotizar pueden variar nombre/tope según destino. No citar precio en pesos.

- GO! 365 ECO — MMG USD 45.000. Preexistencias de urgencia aprox. USD 350. Viajes cortos, presupuesto ajustado.
- GO! 365 — MMG USD 45.000, sin deducible en la ficha Europa. Escapadas a una ciudad.
- GO! ADVENTURE — MMG USD 60.000. Deportes recreativos (esquí en pistas, trekking, etc.). COVID con tope elevado en ficha Europa (USD 50.000). Pet Assistance en recomendaciones España/Adventure. Los planes estándar NO siempre incluyen deportes: hay que pedir Adventure al cotizar.
- GO! SMART — MMG USD 80.000, sin deducible. Equilibrio para la mayoría de viajes a Europa (2-3 semanas, varios países). Odontología y equipaje con topes de plan; repatriación y traslados sanitarios según ficha.
- GO! NOMADS — MMG USD 150.000. Estadías largas, nómadas, intercambio, trabajo remoto. Preexistencias intermedias (aprox. USD 3.500).
- GO! PRIORITY — MMG USD 300.000. Premium: preexistencias hasta aprox. USD 5.000, embarazo y extras (concierge, seguridad privada, personal shopper, asistente personal según ficha).

A partir de 75 años, GO! aplica un incremento del 50% sobre la tarifa. Edad máxima 75/85 según plan.

Multitrip / anual: para quien viaja seguido; se arma en cotización.

Todos los planes INTERNACIONALES de GO! superan el mínimo Schengen de 30.000 euros.

Cotizar el plan exacto con MARXEN: 387 634-8199.`,
  },
  {
    id: "goassistance-0005",
    sourceTitle: "GO! ASSISTANCE — Schengen, Europa y ETIAS",
    content: `EUROPA / ESPACIO SCHENGEN

Es OBLIGATORIO contar con asistencia/seguro de viaje que cumpla:
- Cobertura médica mínima 30.000 euros (aprox. 32.000-33.000 USD) por enfermedad o accidente
- Repatriación sanitaria y funeraria, más hospitalización
- Validez en TODOS los países Schengen
- Vigencia por TODOS los días de la estadía (si viajás 20 días, 20 días cubiertos)
- Sin franquicia/deducible para el requisito típico de visa Schengen

GO! ASSISTANCE cumple el estándar Schengen en sus planes internacionales.

Argentinos en turismo corto (hasta 90 días) pueden no necesitar visa, pero igual conviene y a menudo se pide el comprobante. ETIAS (autorización electrónica de ingreso, implementación 2026) NO reemplaza la asistencia: son dos trámites distintos. Hace falta ambos cuando ETIAS esté vigente.

Reino Unido u otros destinos fuera de Schengen: no aplica la obligatoriedad Schengen, pero la necesidad médica es la misma.

Soporte migratorio: primera hoja del pasaporte (foto) + sello de salida o boarding pass (no la reserva). Argentinos: también constancia de último tránsito en Migraciones.

Para Europa, GO! recomienda en general SMART (mayoría), 365 para escapadas cortas, NOMADS para estadías largas, ADVENTURE si hay deportes, PRIORITY si se busca el tope más alto.

Cotizar Europa con MARXEN: 387 634-8199.`,
  },
  {
    id: "goassistance-0006",
    sourceTitle: "GO! ASSISTANCE — Destinos del cotizador MARXEN y recomendaciones",
    content: `DESTINOS QUE COTIZA MARXEN CON GO! (catálogo del sitio):
- Brasil
- América del Sur
- América del Norte (incluye EE.UU.: sistema de salud caro, conviene MMG alto)
- América Central
- Europa (Schengen)
- Resto del Mundo (Australia, Nueva Zelanda, Asia, etc.)
- Cobertura Local (asistencia nacional / dentro de Argentina)

Recomendaciones (FAQ GO!, sin precios):
- Europa o EE.UU.: plan con cobertura médica de al menos USD 30.000 y cancelación si se necesita. En Europa el mínimo legal Schengen es 30.000 EUR; GO! recomienda 50.000 USD o más para viajes largos.
- América Latina / Brasil: planes más accesibles; el cruce terrestre también conviene llevar asistencia.
- Working Holiday / estadías largas: planes específicos (Australia, Nueva Zelanda, Japón, Islandia, México, Polonia, Europa). NOMADS para nómadas/temporadas.

El precio depende de destino, días, edades y plan. Cotización real: MARXEN 387 634-8199 o https://www.marxen.com.ar/viajero`,
  },
  {
    id: "goassistance-0007",
    sourceTitle: "GO! ASSISTANCE — Cómo contratar y cuándo se puede emitir",
    content: `CÓMO CONTRATAR GO! (pasos oficiales):
1. Destino, fechas y edades de los viajeros
2. Elegir el plan (comparar MMG y adicionales)
3. Pago: online con tarjeta; GO! anuncia hasta 6 cuotas sin interés en productos seleccionados (no asumir que siempre aplica)
4. Voucher/póliza por email al instante, con instrucciones y teléfono de la central

En MARXEN: mismo armado por WhatsApp 387 634-8199 o el cotizador de https://www.marxen.com.ar/viajero

CUÁNDO CONTRATAR: ANTES de salir del país de residencia. Una vez iniciado el viaje, GO! NO activa la cobertura. Conviene contratarla con anticipación, válida desde el vuelo de ida hasta el regreso.

El tríptico habla de “emisión desde cualquier parte del mundo”: es la capacidad de emitir el voucher online/con productor, NO que se pueda comprar ya estando de viaje.

Llevar el voucher (PDF o celular) con el número de la central.`,
  },
  {
    id: "goassistance-0008",
    sourceTitle: "GO! ASSISTANCE — Qué hacer en una urgencia médica",
    content: `URGENCIA CON GO! ASSISTANCE

1. Comunicarse con la CENTRAL 24/7/365 ANTES de pagar un médico (teléfono del voucher o WhatsApp GO! +54 9 11 5218-7034).
2. Un operador atiende en tiempo real, en español, y coordina prestador de la red (más de 30.000 en el mundo) o ambulancia. Consultas simples: Dr. Online / telemedicina.
3. GO! autoriza y paga al prestador en la mayoría de los casos. No adelantar dinero sin autorización: puede afectar el reembolso.
4. La primera urgencia suele autorizarse en los primeros minutos.
5. Si hay internación, medicamentos, traslado de un familiar o repatriación, la central sigue el caso.

Central propia: te atiende GO!, no un call center ajeno.

Para armar o entender la póliza desde Salta: MARXEN 387 634-8199. En destino, el número operativo es el del voucher / WhatsApp GO!.`,
  },
  {
    id: "goassistance-0009",
    sourceTitle: "GO! ASSISTANCE — Preexistencias, embarazo, COVID y odontología",
    content: `PREEXISTENCIAS: algunos planes cubren enfermedades preexistentes CONTROLADAS (p. ej. hipertensión, diabetes tipo 2, cardiopatía estable) SOLO en urgencia/emergencia, con TOPE según plan (ficha Europa: desde aprox. USD 350 en 365/Adventure/Smart hasta USD 3.500 Nomads y USD 5.000 Priority). Hay que DECLARARLAS al contratar. El mito de que “nunca cubren preexistentes” es falso: cubren la emergencia, con límite.

EMBARAZO: la FAQ general menciona cobertura hasta las 26 semanas. Priority/Nomads publican topes de embarazo (p. ej. USD 7.500 / 5.000 en ficha Europa). Confirmar en el plan cotizado.

COVID-19: debe estar explícita. Los planes GO! la incluyen; Adventure/Nomads publican montos específicos altos en la guía Europa.

ODONTOLOGÍA: urgencia (dolor, rotura de pieza), con tope de plan (p. ej. SMART hasta USD 450 en ficha Europa). No es un tratamiento odontológico completo.

TELEMEDICINA: Dr. Online 24 h, en español.

Cotizar declarando edad y condiciones: MARXEN 387 634-8199.`,
  },
  {
    id: "goassistance-0010",
    sourceTitle: "GO! ASSISTANCE — Equipaje, demora y cancelación de vuelo",
    content: `EQUIPAJE
Si la aerolínea extravía la valija: denuncia en el aeropuerto (PIR) y conservarlo. GO! hace seguimiento. Durante la DEMORA: monto para artículos de primera necesidad. Si hay PÉRDIDA total o parcial determinada por la aerolínea: indemnización según el plan (p. ej. SMART hasta USD 1.000, PRIORITY hasta USD 2.000 en fichas Europa).

DEMORA O CANCELACIÓN DE VUELO
Es respaldo de GASTOS realizados en territorio INTERNACIONAL (estadía, comida, traslado) con comprobantes. NO es una compensación fija. NO aplica cuando todavía estás por salir del país de residencia.

Documentos robados: la asistencia orienta la reposición y ayuda legal según plan.

Siempre el tope es el del voucher. Cotizar: MARXEN 387 634-8199.`,
  },
  {
    id: "goassistance-0011",
    sourceTitle: "GO! ASSISTANCE — Deportes, mascotas y Working Holiday",
    content: `DEPORTES: GO! Adventure cubre deportes de aventura y recreativos (esquí recreativo en pistas reglamentarias, senderismo, etc.). Los planes estándar NO siempre lo incluyen: hay que elegir Adventure (o el adicional que figure en la cotización) y chequear la actividad en las condiciones.

MASCOTAS: el material comercial GO incluye cobertura para mascotas. En fichas de destino, Pet Assistance aparece asociado a planes como Adventure. Confirmar en la cotización si viaja con mascota.

WORKING HOLIDAY / estadías largas: GO! publica guías para Australia, Nueva Zelanda, Japón, Islandia, México, Polonia y Working Holiday Europa. NOMADS encaja en temporadas e intercambio.

Edad: incremento del 50% de tarifa desde los 75 años. Tope de edad según plan (75/85).

Cotizar el caso (deporte, mascota, visa Working Holiday) con MARXEN: 387 634-8199.`,
  },
  {
    id: "goassistance-0012",
    sourceTitle: "GO! ASSISTANCE — Contactos, reseñas y cómo cotizar en Salta",
    content: `CONTACTOS

MARXEN (cotizar/contratar desde Salta): WhatsApp 387 634-8199 · hola@marxel.com.ar · https://www.marxen.com.ar/viajero

GO! ASSISTANCE (central 24 h, una vez emitido el voucher): WhatsApp +54 9 11 5218-7034. El número de emergencias del voucher manda.

CONFIANZA (datos públicos GO!): 25 años; 10 países; red en más de 100 destinos; más de 30.000 prestadores; sponsor Vélez. Reseñas del sitio: Trustpilot ~4.6-4.7 y Google ~4.6 (la FAQ también citó 4.4 en Google; usar “reseñas altas en Trustpilot y Google” si hay duda).

Precio: depende de destino, días, edades y plan. América Latina suele ser más accesible; Europa y EE.UU. más altos. NUNCA inventar un premio en pesos.

Datos mínimos para cotizar: destino (o región), fechas de ida y vuelta, cantidad de viajeros y edades, si hay preexistencia, deporte o mascota.`,
  },
];
