/**
 * Ficha San Cristóbal Seguros para el chatbot (WhatsApp + web).
 * Fuente: sancristobal.com.ar y manuales oficiales (Automotor mayo 2025, Comercio dic 2025).
 * Las sumas, franquicias y precios se confirman en cotización y póliza (Res. SSN 38.708).
 */
export const SOURCE = {
  id: "sancristobal",
  title: "San Cristóbal Seguros — Ficha de productos (personas, profesionales y empresas)",
  file: "web:sancristobal.com.ar + manuales oficiales PAS",
  pages: 18,
};

export const CHUNKS = [
  {
    id: "sancristobal-0001",
    sourceTitle: "San Cristóbal Seguros — Quiénes somos y cómo trabaja MARXEN",
    content: `SAN CRISTÓBAL SEGUROS (Grupo San Cristóbal)
Compañía argentina fundada en 1939. En diciembre de 2025 cumplió 86 años. Es una de las aseguradoras con mayor patrimonio neto del país. Sitio: https://www.sancristobal.com.ar

MARXEN Protección Integral (Salta) es PRODUCTOR ASESOR, no la aseguradora. Cotiza, compara y gestiona el alta de pólizas San Cristóbal. El cliente se contacta con MARXEN, no con la compañía, para cotizar o contratar.

REGLA: la web de San Cristóbal es orientativa. Alcance, límites, exclusiones y suscripción rigen por la póliza (Resolución SSN 38.708 y modificatorias). No inventar precios, franquicias ni sumas. Un asesor de MARXEN confirma la cotización.

WhatsApp MARXEN: 387 634-8199 · https://www.marxen.com.ar/seguros`,
  },
  {
    id: "sancristobal-0002",
    sourceTitle: "San Cristóbal — Catálogo para personas y profesionales",
    content: `PRODUCTOS SAN CRISTÓBAL PARA PERSONAS Y PROFESIONALES (oficial):
- Automotor: Terceros Básico, Terceros Completo y Todo Riesgo con Franquicia.
- Moto: Moto Base, Moto Premium y Moto Platinum (solo uso particular).
- Embarcaciones (lancha, velero, crucero).
- Hogar: Base/Standard, Plus, Premium y Hogar Personalizado.
- Incendio (edificio y contenido).
- Alquiler Garantizado (caución de locación de vivienda).
- Accidentes Personales (AP 24 Base, AP 24 Más y AP Prestacional).
- Vida (líneas Vida 01, Vida Plus y Vida Premium).
- Sepelio.
- Robo (objetos de valor).
- Mala praxis / responsabilidad civil profesional (profesionales de la salud).
- Caución (garantías de cumplimiento).

ART (riesgos del trabajo) NO es un producto de San Cristóbal Seguros. MARXEN puede asesorar ART con otras compañías. No atribuir ART a San Cristóbal.

Para cotizar desde Salta: MARXEN WhatsApp 387 634-8199 o https://www.marxen.com.ar/seguros`,
  },
  {
    id: "sancristobal-0003",
    sourceTitle: "San Cristóbal — Catálogo para empresas",
    content: `PRODUCTOS SAN CRISTÓBAL PARA EMPRESAS (oficial):
- Flota automotor
- Vida colectivo
- Accidentes personales (laboral/profesional)
- Riesgos agropecuarios (cultivos, maquinarias, insumos)
- Integral de comercio
- Todo riesgo operativo
- Seguro técnico (equipos electrónicos, rotura de maquinaria, obras y montajes)
- Transporte de carga
- Responsabilidad civil
- Consorcio
- Caución
- Incendio (si no hay integral de comercio)
- Sepelio colectivo

El seguro de comercio no es obligatorio por ley, pero muchas habilitaciones municipales exigen incendio y/o responsabilidad civil.

Cotización y armado a medida: productor MARXEN, WhatsApp 387 634-8199.`,
  },
  {
    id: "sancristobal-0004",
    sourceTitle: "San Cristóbal Automotor — Comparativa Terceros Básico, Completo y Todo Riesgo",
    content: `SEGURO AUTOMOTOR SAN CRISTÓBAL — tres familias comerciales (sancristobal.com.ar):

1) TERCEROS BÁSICO (cobertura A / Auto Base)
Obligatoria para circular. Protege al titular/conductor por daños que el vehículo o su carga ocasionen a TERCEROS (Responsabilidad Civil). Incluye protección al conductor y monto asegurado actualizado. Protección a familiares: optativa. NO cubre robo, incendio ni daños del propio auto.

2) TERCEROS COMPLETO (coberturas C / Auto Plus, Plus Más, Mega, etc.)
RC + daños al propio vehículo por incendio y robo (total y/o parcial) + destrucción total por accidente. En la ficha pública: cristales y cerraduras sin límite, cubiertas y llantas por robo (1 por vigencia en la ficha web; el límite exacto depende del código de producto y si la póliza es mensual o tradicional), granizo sin límite, auxilio y remolque, protección a familiares, monto actualizado.

3) TODO RIESGO CON FRANQUICIA (cobertura D / Auto Extra)
Lo de Terceros Completo + DESTRUCCIÓN / DAÑOS PARCIALES por accidente. Cubiertas y llantas por robo sin límite en la ficha pública. Es el producto más completo. La franquicia (lo que paga el asegurado en daños parciales) figura en la póliza.

Diferencia clave: Terceros Completo no cubre el arreglo del auto si el accidente fue culpa del asegurado (salvo totales, robo, incendio, granizo según plan). Todo Riesgo sí cubre daños parciales propios, con franquicia.

Es obligatorio por Art. 68 Ley de Tránsito 24.449 tener RC. Está incluida en todos los productos automotor.

Cotizar en MARXEN (año, marca, modelo, versión): WhatsApp 387 634-8199 o https://www.marxen.com.ar/seguros`,
  },
  {
    id: "sancristobal-0005",
    sourceTitle: "San Cristóbal Automotor — Terceros Básico en detalle",
    content: `TERCEROS BÁSICO SAN CRISTÓBAL (Auto Base / cobertura A)

Qué cubre:
- Responsabilidad Civil: daños a otras personas o sus bienes. Es el “seguro contra terceros” obligatorio.
- Protección al conductor (muerte del conductor; hay cobertura Mercosur cuando corresponde).
- Protección a familiares ante fallecimiento o invalidez total y permanente por accidente automovilístico, con límite de póliza (optativa en la ficha pública).
- Monto asegurado actualizado.

Qué NO cubre:
- Robo ni hurto del vehículo.
- Incendio del vehículo.
- Granizo, cristales, cubiertas.
- Daños parciales o totales del propio auto por accidente (salvo lo que indique expresamente la póliza).
- Asistencia 24 en ruta: el manual indica que la asistencia de casco no aplica a pólizas solo de RC.

Sirve para circular legalmente al menor costo. Si se quiere ampliar: Terceros Completo o Todo Riesgo.

Cotizar con MARXEN: 387 634-8199.`,
  },
  {
    id: "sancristobal-0006",
    sourceTitle: "San Cristóbal Automotor — Terceros Completo en detalle",
    content: `TERCEROS COMPLETO SAN CRISTÓBAL

Ficha pública (sancristobal.com.ar/automotor):
- Responsabilidad Civil (ley 24.449)
- Robo total y parcial (partes de fábrica; según condiciones de póliza)
- Destrucción total (cuando reparar supera el 80% del valor asegurado, según ficha Auto Mega)
- Incendio total y parcial
- Cristales y cerraduras sin límite (daños a cerraduras y cristales laterales por accidente, incendio y robo; parabrisas/luneta según producto)
- Cubiertas y llantas por robo: en la ficha comercial, 1 por vigencia. En productos con facturación mensual (ej. Auto Mega / CM) el manual admite hasta 4 ruedas por año. Se confirma en la póliza.
- Granizo sin límite (daños parciales por granizo)
- Servicio de auxilio y remolque
- Protección a familiares
- Monto asegurado actualizado

No cubre (a diferencia de Todo Riesgo): el daño PARCIAL del propio auto por accidente de tránsito (choque culpa propia, vandalismo de carrocería, etc.), salvo adicionales de la póliza.

Ideal para quien quiere alta protección a costo moderado.

Cotizar: MARXEN 387 634-8199.`,
  },
  {
    id: "sancristobal-0007",
    sourceTitle: "San Cristóbal Automotor — Todo Riesgo, franquicia, CLEAS y Solución Express",
    content: `TODO RIESGO CON FRANQUICIA SAN CRISTÓBAL (cobertura D)

Incluye lo de Terceros Completo y suma:
- Destrucción / daños PARCIALES por accidente (el propio vehículo).
- Cubiertas y llantas por robo sin límite (ficha pública).
- Granizo sin límite, cristales y cerraduras sin límite, auxilio, protección a familiares.

FRANQUICIA: es el importe (fijo o porcentaje sobre la suma asegurada) que paga el asegurado en siniestros de DAÑOS PARCIALES. No se aplica a la RC. El porcentaje o monto, y los mínimos, constan en la póliza. No citar un número de franquicia si no está en la cotización.

SOLUCIÓN EXPRESS: con póliza Todo Riesgo, reparación con trámites mínimos, peritaje inmediato y talleres homologados.

CLEAS: convenio entre aseguradoras adheridas para agilizar denuncias de siniestros entre compañías.

ATENCIÓN 24H: asistencia ante emergencias (mecánica/remolque según plan, antigüedad del vehículo y si hay cobertura de casco). Pedir al 0810 222 8887. Desde el exterior: +54 9 341 420-2097.

Club GSC: descuentos para clientes del Grupo San Cristóbal.

Cotizar Todo Riesgo con MARXEN: 387 634-8199.`,
  },
  {
    id: "sancristobal-0008",
    sourceTitle: "San Cristóbal Automotor — Vehículos, documentación, vigencia y exclusiones",
    content: `AUTOMOTOR SAN CRISTÓBAL — reglas prácticas

VEHÍCULOS ASEGURABLES: automóviles, pickups, utilitarios, trailers y batanes. También (vía productor) camiones, acoplados, maquinaria. El cotizador online de MARXEN pide año, marca, modelo y versión.

ANTIGÜEDAD: el cotizador MARXEN/San Cristóbal no cotiza online vehículos con más de 30 años. Límites de suscripción/renovación varían por tipo de cobertura (más completas = menos antigüedad). Se confirma al cotizar.

NO SE ASEGURAN: taxis, remises ni transporte público de pasajeros. Tampoco vehículos de carreras/rally ni transporte de explosivos de alto poder / sustancias radioactivas (salvo usos especiales declarados).

DOCUMENTACIÓN PARA CIRCULAR: DNI, licencia, cédula verde o azul, tarjeta de circulación (troquel/póliza). El comprobante de seguro se descarga en App o Sitio de Autogestión. Para Mercosur: carta verde / extensión internacional (si la póliza tiene cobertura en países limítrofes), también descargable en la App.

VIGENCIA: desde las 00:00 del día de inicio hasta las 23:59 del día de fin en el frente de póliza. Renovación automática actualizando valor de mercado.

INSPECCIÓN: puede pedirse (fotos online o diferida) si no hay aprobación directa.

SUMA ASEGURADA: valor de mercado según modelo y antigüedad. En póliza anual con refacturación mensual se actualiza en cada refacturación.

Cotizar: MARXEN 387 634-8199.`,
  },
  {
    id: "sancristobal-0009",
    sourceTitle: "San Cristóbal Automotor — Qué hacer en un siniestro y asistencia en ruta",
    content: `SINIESTRO AUTOMOTOR SAN CRISTÓBAL

DENUNCIA: dentro de los plazos de la póliza, por App San Cristóbal, Sitio del Asegurado, WhatsApp Santi, o con el productor MARXEN (387 634-8199). Central 0810 222 8887 (lunes a viernes 9 a 16.30). Urgencias/asistencia 24 h: 0810 222 8887 (ficha de inicio) y 0810 444 0100 (línea de siniestros del manual de comercio; también usada para denuncias). Exterior: +54 9 341 420-2097.

ASISTENCIA EN RUTA: mecánica ligera y remolque según cobertura de casco y antigüedad. Remolque por accidente: típicamente 300 km lineales, sin límite de eventos en varios planes. Remolque por avería: límites mensuales/anuales según plan. Pólizas solo RC no tienen este servicio. Ámbito: Argentina en caminos habilitados; países limítrofes (Uruguay, Brasil, Paraguay, Bolivia y Chile, con excepciones en Chile austral/insular).

ACCIDENTE SIN LESIONADOS: datos de la otra parte, fotos, denuncia. Si hay otra aseguradora adherida a CLEAS, el trámite puede ser más ágil.

ACCIDENTE CON LESIONADOS: prioridad médica, policía, no firmar descargos sin asesoramiento.

ROBO: denuncia policial y denuncia a la compañía.

INCENDIO: denuncia y constancia de bomberos cuando corresponda.

No adelantar arreglos sin autorización si se espera cobertura.`,
  },
  {
    id: "sancristobal-0010",
    sourceTitle: "San Cristóbal — Seguro de moto Base, Premium y Platinum",
    content: `SEGURO DE MOTO SAN CRISTÓBAL

Uso: SOLO motos de uso PARTICULAR. No se admiten motos comerciales (repartidores, comisionistas, cafetería y afines).

Obligatorio: RC (Art. 68 Ley 24.449), incluida en todos los planes. Cobertura Mercosur según póliza.

MOTO BASE:
- Responsabilidad Civil
- Gastos sanatoriales
- Gastos de sepelio
- Asistencia y remolque básica
- Cobertura Mercosur
Protege titular y acompañante ante accidentes de tránsito. No suma daños de casco (robo/incendio/accidente total).

MOTO PREMIUM (daños totales):
- Todo lo de Base (asistencia estándar)
- Robo total, incendio total, accidente total
- Gastos por baja del vehículo

MOTO PLATINUM (superior, viajes largos):
- Asistencia y remolque superior
- Robo total y PARCIAL
- Incendio total y PARCIAL
- Accidente total
- Gastos por baja del vehículo

Platinum, además de RC, contempla incendio o robo total y/o parcial y destrucción total por accidente.

Cotizar moto con MARXEN: 387 634-8199.`,
  },
  {
    id: "sancristobal-0011",
    sourceTitle: "San Cristóbal Hogar — Planes Base, Plus, Premium y Personalizado",
    content: `SEGURO DE HOGAR SAN CRISTÓBAL
Sirve para propietario o inquilino. Todos los planes incluyen incendio del edificio; se puede asegurar también el contenido.

Planes sugeridos (ficha pública) + Hogar Personalizado a medida.

HOGAR BASE / STANDARD — protección esencial:
Incendio edificio y contenido, RC hechos privados, RC linderos, cristales/vidrios/espejos, robo, gastos extras, seguro técnico de equipos electrónicos y línea blanca.

HOGAR PLUS — suma:
Daños por acción del agua y pérdida de alimentos refrigerados (corte de luz: heladera/freezer). Sumas de contenido, robo y técnicos más altas que Base.

HOGAR PREMIUM — la más completa de las sugeridas:
Todo lo anterior con sumas más altas, más mascotas, todo riesgo en domicilio y dinero en efectivo (hasta las sumas de póliza).

Destacados:
- Atención 24 h: plomería, cerrajería, electricidad y otras urgencias domésticas.
- App: póliza y denuncia de siniestro.
- Club GSC.

Las sumas en pesos de la web son ilustrativas y cambian. MARXEN cotiza el plan y las sumas reales. No citar un precio por mes.

Cotizar hogar: MARXEN 387 634-8199.`,
  },
  {
    id: "sancristobal-0012",
    sourceTitle: "San Cristóbal Hogar — Qué cubre cada adicional y cómo denunciar",
    content: `HOGAR SAN CRISTÓBAL — coberturas (según plan contratado):

RC HECHOS PRIVADOS: daños físicos o materiales a terceros (ej. invitado accidentado en la casa; mascota que daña a un tercero).
RC LINDEROS: daños a vecinos (ej. incendio que afecta la propiedad lindera). El incendio solo, sin este adicional, no cubre a vecinos.
ROBO DE CONTENIDO: reposición hasta la suma asegurada. Hay medidas mínimas de seguridad en póliza; hace falta denuncia policial.
EQUIPOS ELECTRÓNICOS: robo, incendio, daños parciales, alta/baja de tensión (notebooks, TV, audio, etc.). Reposición a nuevo si antigüedad menor a 3 años, cuando el adicional lo incluye.
LÍNEA BLANCA: electrodomésticos, mismas lógicas según póliza.
CRISTALES: vidrios y espejos.
AGUA: pérdidas/daños por acción del agua (Plus y Premium).
ALIMENTOS REFRIGERADOS: corte de luz (Plus y Premium).
MASCOTAS (Premium): robo, muerte o sacrificio por accidente; asistencia veterinaria por lesiones en accidente. No cubre hurto/extravío; sí gastos de recuperación si se extravía, según ficha.
TODO RIESGO EN DOMICILIO (Premium): pérdidas o daños a bienes dentro de la vivienda por incendio, rayo, explosión, accidente, robo o tentativa.

SINIESTRO HOGAR: denunciar enseguida (plazo habitual 3 días hábiles). DNI; incendio: bomberos; robo: policía. App o 0810 222 8887 / 0810 444 0100. Productor MARXEN: 387 634-8199.`,
  },
  {
    id: "sancristobal-0013",
    sourceTitle: "San Cristóbal — Seguro de incendio",
    content: `SEGURO DE INCENDIO SAN CRISTÓBAL
Protege edificios/construcciones y contenido (mercadería, mobiliario, bienes de uso), instalaciones, maquinarias y suministros.

Puede contratarlo inquilino, propietario o inmobiliaria (inmueble en alquiler).

COBERTURA BÁSICA:
- Daños directos por fuego, rayo o explosión
- Impacto de aeronaves o vehículos terrestres, partes y/o carga
- Humo de incendio/explosión
- Vandalismo, malevolencia, tumulto, huelga o lock-out

ADICIONALES (se contratan aparte):
- Huracán, vendaval, ciclón o tornado
- Terremoto
- Granizo
- Falta de frío
- Contenido general
- RC linderos (daños a vecinos por incendio)
- Remoción de escombros

La cobertura de incendio por sí sola NO cubre daños a vecinos; hace falta RC linderos.

Para vivienda familiar suele convenir el Seguro de Hogar (más completo). Incendio “suelto” se usa cuando no hay integral de hogar/comercio.

Cotizar: MARXEN 387 634-8199.`,
  },
  {
    id: "sancristobal-0014",
    sourceTitle: "San Cristóbal — Integral de comercio",
    content: `SEGURO INTEGRAL DE COMERCIO SAN CRISTÓBAL
Ampara el local donde hay actividad comercial. El integral se arma con al menos 4 coberturas; incendio de edificio y contenido es la cobertura obligatoria del producto.

Dirigido a: titular o encargado; inquilinos o propietarios. Locales, Pymes, oficinas, industrias, servicios, cooperativas, bancos. El local debe tener habilitación municipal vigente al contratar.

NO es obligatorio por ley, pero habilitaciones suelen pedir incendio y RC.

Formas de contratar:
- Personalizado: valores de cada riesgo por separado.
- Combo Plus: armado más ágil.

Coberturas típicas del integral (según actividad y póliza): incendio; robo; RC comprensiva (daños/lesiones a terceros por empleados o instalaciones); cristales; equipos electrónicos; daños por agua; accidentes personales; todo riesgo de joyas/objetos (si aplica).

Beneficios: asistencia 24 h en el comercio; denuncia 0810 222 8887 / 0810 444 0100; App y sitio web.

Prorrata vs primer riesgo absoluto: si la suma es menor al valor real, en prorrata se indemniza en proporción. En primer riesgo absoluto se paga hasta la suma de póliza. MARXEN ayuda a no dejar el comercio infraseguro.

Cotizar comercio: MARXEN 387 634-8199.`,
  },
  {
    id: "sancristobal-0015",
    sourceTitle: "San Cristóbal — Seguro de vida",
    content: `SEGURO DE VIDA SAN CRISTÓBAL
Líneas comerciales: Vida 01, Vida Plus y Vida Premium. Protege a la familia ante imprevistos económicos.

COBERTURAS (ficha oficial de vida):
- Muerte por cualquier causa (enfermedad o accidente), las 24 horas.
- Incapacidad total y permanente por enfermedad o accidente, que afecte la capacidad laboral, hasta los 65 años.
- Adelanto del capital ante diagnóstico de enfermedad terminal, dentro de los 65 años.
- Trasplantes: corazón, pulmón, hígado, páncreas, riñón, médula ósea o córnea, antes de los 65 años.
- Indemnización adicional por muerte accidental e indemnizaciones parciales por accidente (fallecimiento por hecho externo independiente de la voluntad, dentro de los 65 años).

BENEFICIARIOS: familiares o cualquier persona física o jurídica, designados por escrito.

ÁMBITO: cobertura en cualquier parte del mundo; sin exclusión por residencia o viajes (dentro o fuera del país), según ficha.

BENEFICIO FISCAL: deducible del Impuesto a las Ganancias (según normativa vigente).

Se puede complementar con productos de San Cristóbal Retiro (ahorros). Los capitales se adaptan; MARXEN arma la suma.

Cotizar vida: MARXEN 387 634-8199.`,
  },
  {
    id: "sancristobal-0016",
    sourceTitle: "San Cristóbal — Accidentes personales",
    content: `SEGURO DE ACCIDENTES PERSONALES (AP) SAN CRISTÓBAL
Cubre lesiones corporales repentinas en el ejercicio de la profesión o la rutina, certificadas por un médico.

Coberturas: muerte accidental; invalidez total y permanente por accidente; asistencia médica o farmacéutica derivada del accidente.

Planes 24 BASE y 24 MÁS: cobertura las 24 horas, en vida particular o profesional, en cualquier lugar del mundo.

AP PRESTACIONAL: red de prestadores. Si el asegurado tiene AP Prestacional y hubo un accidente, llamar al 0810 888 8889.

No reemplaza a una ART ni a una prepaga: es un seguro de accidentes (indemnizatorio / asistencia por accidente).

Empresas: hay AP laboral/profesional y AP escolar en el universo comercio/empresas.

Cotizar AP: MARXEN 387 634-8199.`,
  },
  {
    id: "sancristobal-0017",
    sourceTitle: "San Cristóbal — Mala praxis y responsabilidad civil profesional",
    content: `MALA PRAXIS SAN CRISTÓBAL (RC profesional de la salud)
Protege el patrimonio ante demandas civiles por el ejercicio profesional.

Quién puede contratar: profesionales de la salud habilitados, con matrícula y/o título (médicos, odontólogos, nutricionistas, psicólogos, fonoaudiólogos, enfermeros, kinesiólogos, entre otros).

Jefe de equipo o de guardia: sí cubre si se declara en el formulario.

Al jubilarse o dar de baja la matrícula: se puede pedir Período Extendido de Reclamo (reclamos posteriores a la vigencia por actos ocurridos durante la vigencia).

CATEGORÍAS (resumen oficial):
- Cobertura 1: consultas/diagnóstico clínico. Sin cirugía, guardia ni invasivos, salvo incisiones superficiales o suturas de piel/fascia. Amplio listado de especialidades clínicas.
- Cobertura 2: cirugías menores (listado de especialidades en la ficha).
- Cobertura 3: invasivos menores (colonoscopía, CPRE, dilatación esofágica, laparoscopía, biopsia-punción —incluye pulmón y próstata, no hígado/riñón/médula—, endoscopía).
- Cobertura 4: odontología con cirugía maxilofacial.
- Cobertura 5: otros profesionales habilitados (enfermería, kinesiología, psicología, bioquímica, odontología SIN cirugía maxilofacial ni implantes, etc.).

La categoría correcta la define MARXEN según la práctica real. No improvisar si el acto es quirúrgico o de guardia.

Cotizar: MARXEN 387 634-8199.`,
  },
  {
    id: "sancristobal-0018",
    sourceTitle: "San Cristóbal — Alquiler garantizado",
    content: `ALQUILER GARANTIZADO SAN CRISTÓBAL
Seguro de caución para alquiler de VIVIENDAS PARTICULARES. Sirve al inquilino que no tiene la garantía que pide la inmobiliaria, y al propietario que quiere respaldo del contrato.

Cubre (ficha oficial):
- Alquileres impagos durante la vigencia del contrato de locación y multas por mora.
- Sustitución del depósito de garantía pactado en el contrato (no se usa para cobrar alquileres o multas).
- Expensas ordinarias, impuestos y tasas inmobiliarias, luz, gas y agua, incluida rehabilitación/reinstalación si corresponde.

Requisitos de análisis (ficha): DNI del inquilino, DNI de un garante y el contrato. El alquiler mensual no debe superar el 30% de los ingresos.

Pago (ficha): efectivo en 1 cuota, o hasta 6 cuotas con tarjeta de crédito o débito en cuenta.

No es un seguro de hogar: no cubre incendio ni robo de la vivienda. Se puede combinar con Hogar.

Cotizar: MARXEN 387 634-8199.`,
  },
  {
    id: "sancristobal-0019",
    sourceTitle: "San Cristóbal — Otros ramos: sepelio, robo, embarcaciones, caución, agro",
    content: `OTROS PRODUCTOS SAN CRISTÓBAL (orientativos; se arman con MARXEN):

SEPELIO: respaldo económico en fallecimiento. Hay sepelio individual y sepelio colectivo (empresas).

ROBO: combinaciones para objetos de alto valor económico (aparte del robo de contenido del hogar).

EMBARCACIONES: lancha, velero o crucero, con coberturas amplias de casco/RC según póliza.

CAUCIÓN: garantiza al ente público o privado el cumplimiento de un contrato (multas, obligaciones). Distinto de Alquiler Garantizado, que es caución de locación de vivienda.

RIESGOS AGROPECUARIOS: cultivos, maquinarias e insumos para productores y arrendatarios.

TODO RIESGO OPERATIVO / TÉCNICO / TRANSPORTE / CONSORCIO: ramos de empresa e industria. MARXEN deriva a cotización a medida.

No hay precios públicos únicos. Siempre cotización.

WhatsApp MARXEN: 387 634-8199.`,
  },
  {
    id: "sancristobal-0020",
    sourceTitle: "San Cristóbal — App, Santi, teléfonos y cómo cotizar con MARXEN",
    content: `GESTIÓN SAN CRISTÓBAL + MARXEN

PRODUCTOR EN SALTA: MARXEN Protección Integral. WhatsApp 387 634-8199. Mail comercial@marxen.com.ar. Cotizador auto/moto/hogar/AP/comercio: https://www.marxen.com.ar/seguros

AUTOGESTIÓN DEL ASEGURADO (una vez emitida la póliza):
- App San Cristóbal (iOS y Android): póliza, tarjeta para circular, certificado para viajar, denuncia de siniestro, pagos.
- Sitio del Asegurado / autogestión en sancristobal.com.ar
- Santi: asistente de San Cristóbal por WhatsApp para trámites de póliza vigente.

TELÉFONOS SAN CRISTÓBAL:
- Central / autogestión comercial: 0810 222 8887 — lunes a viernes 9 a 16.30
- Asistencia mecánica y hogar 24 h: 0810 222 8887
- Denuncia de siniestros (manuales): 0810 222 8887 y 0810 444 0100
- AP Prestacional (accidente, red de prestadores): 0810 888 8889
- Desde el exterior: +54 9 341 420-2097

Para COTIZAR o CONTRATAR una póliza nueva, el camino es MARXEN (productor), no la central de siniestros.

Medios de pago habituales (pólizas): tarjeta, CBU/débito, efectivo según producto. Puede haber descuento por pago en 1 o más cuotas; se ve en la propuesta.

Toda cotización concreta (premio, franquicia, suma) la confirma MARXEN. No inventar números.`,
  },
];
