export type CompanyProfile = {
  slug: string;
  name: string;
  searches: string[];
  text: string;
  href?: string;
  hrefLabel?: string;
};

/** Compañías con las que MARXEN trabaja en Salta. No son MARXEN: emiten ellas. */
export const companyProfiles: CompanyProfile[] = [
  {
    slug: "sancristobal",
    name: "San Cristóbal",
    searches: ["San Cristóbal Seguros Salta", "productor San Cristóbal Salta", "cotizar San Cristóbal"],
    text: "Si buscás San Cristóbal en Salta, MARXEN es productor asesor (código 08-006051). Con San Cristóbal cotizamos auto, moto y hogar. La póliza la emite San Cristóbal.",
    href: "/seguro-de-auto",
    hrefLabel: "Cotizar auto",
  },
  {
    slug: "smg",
    name: "SMG Vida",
    searches: ["SMG Seguros Salta", "SMG Vida Salta", "Swiss Medical productor Salta"],
    text: "MARXEN trabaja con SMG Vida en Salta. En el inicio, el cotizador de autos compara SMG junto con San Cristóbal. SMG emite; MARXEN asesora.",
    href: "/#cotizar-auto",
    hrefLabel: "Cotizar auto",
  },
  {
    slug: "sancor",
    name: "Sancor Seguros",
    searches: ["Sancor Seguros Salta", "productor Sancor Salta", "cotizar Sancor"],
    text: "Para Sancor Seguros en Salta, el contacto local es MARXEN. No somos Sancor: te representamos frente a la compañía y armamos la propuesta.",
    href: "/seguros",
    hrefLabel: "Ver seguros",
  },
  {
    slug: "cnp",
    name: "CNP",
    searches: ["CNP Seguros Salta", "productor CNP Salta", "cotizar CNP"],
    text: "CNP en Salta se consulta con MARXEN, productor asesor. La póliza la emite CNP. Escribinos y te decimos si el ramo que buscás está disponible.",
    href: "/contacto",
    hrefLabel: "Pedir asesoramiento",
  },
  {
    slug: "nivel",
    name: "Nivel Seguros",
    searches: ["Nivel Seguros Salta", "productor Nivel Seguros"],
    text: "Nivel Seguros en Salta se gestiona con MARXEN. Somos el productor, no la compañía. La cotización se confirma con un asesor en Salta Capital.",
    href: "/contacto",
    hrefLabel: "Escribir a MARXEN",
  },
  {
    slug: "mista",
    name: "Mista Seguros",
    searches: ["Mista Seguros Salta", "productor Mista"],
    text: "Si estás buscando Mista Seguros en Salta, MARXEN toma el pedido como productor asesor. Mista emite la póliza.",
    href: "/seguros",
    hrefLabel: "Ver coberturas",
  },
  {
    slug: "caruso",
    name: "Caruso",
    searches: ["Caruso Seguros Salta", "productor Caruso Salta"],
    text: "Caruso en Salta se asesora con MARXEN. No somos Caruso: intermediamos y te explicamos la propuesta antes de contratar.",
    href: "/contacto",
    hrefLabel: "Contactar",
  },
  {
    slug: "alba",
    name: "Alba Caución",
    searches: ["Alba Caución Salta", "seguro de caución Salta", "productor Alba Caución"],
    text: "Alba Caución en Salta se consulta con MARXEN. Es la compañía de caución con la que trabajamos. El pedido lo toma el productor y la póliza la emite Alba.",
    href: "/seguros",
    hrefLabel: "Ver seguros",
  },
  {
    slug: "prevencion",
    name: "Prevención Retiro",
    searches: ["Prevención Retiro Salta", "productor Prevención Retiro"],
    text: "Prevención Retiro en Salta se asesora con MARXEN. Es un producto de retiro, distinto de la prepaga Prevención Salud.",
    href: "/quienes-somos",
    hrefLabel: "El productor",
  },
  {
    slug: "prevencion-salud",
    name: "Prevención Salud",
    searches: ["Prevención Salud Salta", "prepaga Prevención Salud", "cartilla Prevención Salud Salta"],
    text: "Prevención Salud en Salta se elige con MARXEN: planes de prepaga, cartilla y, cuando corresponde, derivación de aportes de obra social. MARXEN no es la prepaga.",
    href: "/salud",
    hrefLabel: "Ver planes de salud",
  },
  {
    slug: "go",
    name: "Go Assistance",
    searches: ["Go Assistance Salta", "GO Assistance seguro de viaje", "asistencia al viajero Go"],
    text: "Go Assistance se contrata desde Salta con MARXEN. Es asistencia al viajero, no una prepaga. Se emite antes de salir del país.",
    href: "/viajero",
    hrefLabel: "Cotizar viaje",
  },
  {
    slug: "new-travel",
    name: "New Travel",
    searches: ["New Travel Salta", "asistencia New Travel", "seguro de viaje New Travel"],
    text: "New Travel es otra asistencia al viajero que asesoramos en Salta. MARXEN arma el plan; la asistencia la presta New Travel.",
    href: "/viajero",
    hrefLabel: "Ver viajero",
  },
];
