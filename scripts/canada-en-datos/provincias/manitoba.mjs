/*
  provincias/manitoba.mjs — Directorio de localidades de Manitoba
  ================================================================
  Criterio de inclusión (documentado en el repositorio interno):
  - Una página por cada subdivisión censal (CSD) de Manitoba en el Censo 2021
    de Statistics Canada: 239 en total, que cubren toda la provincia (la suma
    de su población es la de la provincia, 1,342,153):
      · 138 subdivisiones municipales, que corresponden a los 137 municipios
        de la lista oficial de Manitoba Municipal and Northern Relations
        (Municipal Officials Directory, 15 de octubre de 2026): el municipio
        rural de Mountain está dividido en dos subdivisiones censales,
        Mountain (South) y Mountain (North). Son 10 ciudades, 25 pueblos,
        2 villas, 37 municipios, 62 subdivisiones de municipios rurales y
        2 distritos de gobierno local;
      · 91 tierras de Primeras Naciones con su clasificación censal
        (88 reservas indígenas y 3 asentamientos indígenas);
      · 10 subdivisiones del territorio no organizado (unorganized), donde
        están las comunidades de Northern Affairs.
  - Sin página propia, dentro del directorio y de la página de su CSD:
      · los lugares designados (DPL) del Censo 2021 —distritos urbanos
        locales, comunidades del norte, comunidades urbanas no incorporadas,
        municipios disueltos y otros—, con su población del censo, que ya
        está incluida en la de su CSD;
      · los nombres oficiales de lugares poblados y de reservas de la Base de
        datos de nombres geográficos de Canadá (CGNDB), ubicados en su CSD
        por sus coordenadas oficiales.
    Un nombre que ya es una CSD o un lugar designado no se repite.
  - Las 23 divisiones censales son el filtro «División censal»; las 8
    regiones económicas de Statistics Canada, el filtro «Región económica».
  No se promete cobertura de asentamientos sin nombre oficial registrado.

  Datos (scripts/canada-en-datos/):
    mb-localidades.json   obtener-localidades-censo.py mb + compactar-localidades.py mb
  La carga común está en censo-comun.mjs (misma lógica que Saskatchewan).

  Regla: no se rellena ningún dato. Lo que no tiene fuente oficial
  verificada se muestra como «Dato no disponible».
*/
import { miles, nombreRegion, fechaEs, NO_DISPONIBLE, fila, enlaces, fuente, empleoRegional, viviendaCmhc } from "../localidades.mjs";
import { cargarCenso, km } from "../censo-comun.mjs";

const PROV = "Manitoba";

/* ---------- Clasificación oficial ----------
   Tipos de subdivisión censal (código en `censo`), de lugar designado (en `dpl`) y de nombre geográfico de la
   CGNDB (en `gn`). Los nombres oficiales se dejan en inglés junto al equivalente en español. */
export const TIPOS = {
  city: { es: "Ciudad", en: "City", grupo: "urbano", plural: "ciudades", censo: "CY" },
  town: { es: "Pueblo", en: "Town", grupo: "urbano", plural: "pueblos (towns)", censo: "T" },
  village: { es: "Villa", en: "Village", grupo: "urbano", plural: "villas (villages)", censo: "VL" },
  municipality: { es: "Municipio", en: "Municipality", grupo: "municipio", plural: "municipios (municipalities)", censo: "MU" },
  lgd: { es: "Distrito de gobierno local", en: "Local Government District", grupo: "municipio", plural: "distritos de gobierno local (local government districts)", censo: "LGD" },
  rm: { es: "Municipio rural", en: "Rural Municipality", grupo: "rural", plural: "subdivisiones de municipios rurales (61 municipios rurales: el censo divide Mountain en dos)", censo: "RM" },
  reserve: { es: "Reserva indígena", en: "Indian Reserve", grupo: "indigena", plural: "reservas indígenas (Indian reserves)", censo: "IRI" },
  settlement: { es: "Asentamiento indígena", en: "Indian Settlement", grupo: "indigena", plural: "asentamientos indígenas (Indian settlements)", censo: "S-É" },
  unorganized: { es: "Territorio no organizado", en: "Unorganized", grupo: "otro", plural: "subdivisiones del territorio no organizado (unorganized)", censo: "NO" },
  lud: { es: "Distrito urbano local", en: "Local Urban District", grupo: "comunidad", plural: "distritos urbanos locales (local urban districts)", dpl: "LUD", gn: "Local Urban District" },
  "comunidad-norte": { es: "Comunidad del norte", en: "Northern Community", grupo: "comunidad", plural: "comunidades del norte (northern communities)", dpl: "NCM", gn: "Northern Community" },
  "comunidad-urbana": { es: "Comunidad urbana no incorporada", en: "Unincorporated Urban Community", grupo: "comunidad", plural: "comunidades urbanas no incorporadas", dpl: "UUC" },
  "municipio-disuelto": { es: "Municipio disuelto", en: "Dissolved municipality", grupo: "comunidad", plural: "municipios disueltos (dissolved municipalities)", dpl: "DMU" },
  "antiguo-centro": { es: "Antiguo centro de población", en: "Retired population centre", grupo: "comunidad", plural: "antiguos centros de población (Statistics Canada)", dpl: "RPC" },
  comunidad: { es: "Comunidad", en: "Community", grupo: "comunidad", plural: "comunidades (communities)", gn: "Community" },
  localidad: { es: "Localidad", en: "Locality", grupo: "comunidad", plural: "localidades (localities)", gn: "Locality" },
  barrio: { es: "Barrio", en: "Neighbourhood", grupo: "comunidad", plural: "barrios (neighbourhoods)", gn: "Neighbourhood" },
  "barrio-urbano": { es: "Comunidad urbana (barrio)", en: "Urban Community", grupo: "comunidad", plural: "comunidades urbanas (barrios)", gn: "Urban Community" },
  aldea: { es: "Aldea", en: "Hamlet", grupo: "comunidad", plural: "aldeas (hamlets)", gn: "Hamlet" },
  "punto-ferroviario": { es: "Punto ferroviario", en: "Railway Point", grupo: "comunidad", plural: "puntos ferroviarios (railway points)", gn: "Railway Point" },
  "zona-industrial": { es: "Zona industrial", en: "Industrial Area", grupo: "comunidad", plural: "zonas industriales", gn: "Industrial Area" },
  "oficina-correos": { es: "Lugar con oficina de correos (nombre histórico)", en: "Post Office", grupo: "comunidad", plural: "lugares con nombre de oficina de correos", gn: "Post Office" },
  "nombre-municipal": { es: "Nombre geográfico de ciudad, pueblo o villa", en: "City, Town or Village (geographical name)", grupo: "comunidad", plural: "nombres registrados como ciudad, pueblo o villa que hoy no son una subdivisión censal" },
  "reserva-nombre": { es: "Reserva indígena (nombre geográfico)", en: "Indian Reserve", grupo: "comunidad", plural: "reservas registradas como nombre geográfico", gn: "Indian Reserve" },
};
export const GRUPOS = {
  urbano: "Ciudades, pueblos y villas",
  municipio: "Municipios y distritos de gobierno local",
  rural: "Municipios rurales",
  indigena: "Tierras de Primeras Naciones (clasificación del censo)",
  otro: "Territorio no organizado",
  comunidad: "Comunidades, barrios y lugares (sin municipio propio)",
};
const ES_PAGINA = (t) => TIPOS[t].grupo !== "comunidad";

/* Regiones económicas 2021 (nombre en español) y fila de la Encuesta de Población Activa: Statistics Canada
   publica juntas South Central y North Central, y Parklands y North. */
const REGIONES_ES = {
  4610: "Sureste (Southeast)",
  4620: "Centro sur (South Central)",
  4630: "Suroeste (Southwest)",
  4640: "Centro norte (North Central)",
  4650: "Winnipeg",
  4660: "Interlake",
  4670: "Parklands",
  4680: "Norte (North)",
};
const EPA_GEO = {
  4610: "Southeast, Manitoba",
  4620: "South Central and North Central, Manitoba",
  4640: "South Central and North Central, Manitoba",
  4630: "Southwest, Manitoba",
  4650: "Winnipeg, Manitoba",
  4660: "Interlake, Manitoba",
  4670: "Parklands and Northern, Manitoba",
  4680: "Parklands and Northern, Manitoba",
};
const EPA_ES = {
  "Southeast, Manitoba": "Sureste (Southeast)",
  "South Central and North Central, Manitoba": "Centro sur y Centro norte (South Central and North Central)",
  "Southwest, Manitoba": "Suroeste (Southwest)",
  "Winnipeg, Manitoba": "Winnipeg",
  "Interlake, Manitoba": "Interlake",
  "Parklands and Northern, Manitoba": "Parklands y Norte (Parklands and North)",
};

/* Código de subdivisión → nombre visible, URL y variantes de búsqueda. Flin Flon y la reserva Gambler 63 se extienden
   a Saskatchewan: estas subdivisiones son solo la parte de Manitoba (Gambler 63 tiene dos partes en Manitoba). */
const NOMBRE_VISIBLE = {
  4621064: ["Flin Flon (parte de Manitoba)", "flin-flon", ["Flin Flon"]],
  4615049: ["Gambler 63 (parte en la División n.º 15)", "gambler-63-division-15", ["Gambler 63"]],
  4616025: ["Gambler 63 (parte en la División n.º 16)", "gambler-63-division-16", ["Gambler 63"]],
};

/* ---------- Fichas completas ----------
   Las 10 ciudades de Manitoba y tres pueblos regionales (The Pas, Swan River y Neepawa). Agencias de asentamiento:
   lista del Gobierno de Manitoba (Immigrate Manitoba, «Settlement Services», consultada el 30-10-2026). Alquileres:
   CMHC solo publica su encuesta para las áreas urbanas de 10,000 habitantes o más. Enlaces comprobados antes de publicar. */
const ASENTAMIENTO = { label: "Gobierno de Manitoba — Servicios de asentamiento en Winnipeg y en el resto de la provincia", href: "https://immigratemanitoba.com/life/settlement-services/" };
const NWRIS = { label: "North West Regional Immigrant Services (oficinas en Swan River, The Pas y Thompson)", href: "https://nwris.ca/" };
export const FICHAS = {
  winnipeg: {
    nombre: "Winnipeg",
    web: "https://www.winnipeg.ca/",
    cmhc: ["manitoba", "Winnipeg CMA", "el área metropolitana de Winnipeg (CMA)"],
    transporte: [
      { label: "Winnipeg Transit — Rutas, horarios y planificador de viajes", href: "https://www.winnipeg.ca/services-programs/transportation-roads-parking/transit" },
      { label: "Winnipeg Transit — Tarifas 2026 y tarjeta peggo", href: "https://www.winnipeg.ca/services-programs/transportation-roads-parking/transit/fares" },
    ],
    transporteNota: "Winnipeg Transit cobra en 2026 $3.45 por viaje en efectivo (adultos) o $3.10 con la tarjeta recargable peggo, que cuesta $5. Hay tarifa reducida WINNpass para personas de bajos ingresos de 64 años o menos, los niños de 11 años o menos viajan gratis con un adulto que paga y los estudiantes de 11 a 21 años de escuelas de Winnipeg tienen un pase gratuito para el año escolar 2026-27.",
    agencias: ["Manitoba Start, el registro central de recién llegados en Winnipeg", "el Accueil francophone du Manitoba, para recién llegados francófonos y alófonos"],
    agenciasEnlaces: [
      { label: "Manitoba Start — Registro para recién llegados (gratuito)", href: "https://manitobastart.com/for-newcomers/register-for-services/" },
      { label: "Accueil francophone du Manitoba", href: "https://accueilfrancophonemb.com/" },
      { label: "Ciudad de Winnipeg — Recién llegados a Winnipeg (incluye 211 y 311)", href: "https://www.winnipeg.ca/people-culture/living-winnipeg/newcomers-winnipeg" },
    ],
    escuelas: [
      { label: "University of Manitoba", href: "https://umanitoba.ca/" },
      { label: "University of Winnipeg", href: "https://www.uwinnipeg.ca/" },
      { label: "Université de Saint-Boniface (en francés)", href: "https://ustboniface.ca/" },
      { label: "RRC Polytech (Red River College Polytechnic)", href: "https://www.rrc.ca/" },
    ],
    servicios: [
      { label: "311: servicios de la ciudad, reportes y solicitudes", href: "https://www.winnipeg.ca/311-city-services" },
      { label: "Basura y reciclaje (día de recolección)", href: "https://www.winnipeg.ca/services-programs/recycling-garbage" },
      { label: "Agua y alcantarillado", href: "https://www.winnipeg.ca/services-programs/water-wastewater" },
      { label: "Impuesto a la propiedad", href: "https://www.winnipeg.ca/city-governance/taxes" },
      { label: "Bibliotecas públicas", href: "https://www.winnipeg.ca/recreation-leisure/libraries" },
    ],
  },
  brandon: {
    nombre: "Brandon",
    web: "https://www.brandon.ca/",
    cmhc: ["manitoba", "Brandon CA", "la aglomeración de Brandon"],
    transporte: [{ label: "Ciudad de Brandon — Brandon Transit (rutas, horarios y aplicación BDN Transit)", href: "https://www.brandon.ca/roads-parking-transportation/brandon-transit/" }],
    transporteNota: "Desde septiembre de 2026, Brandon Transit ofrece transporte gratuito para jóvenes con el programa Ride Ready.",
    agencias: ["Westman Immigrant Services"],
    agenciasEnlaces: [
      { label: "Westman Immigrant Services (WIS)", href: "https://wishelps.ca/" },
      { label: "Southwestern Manitoba Immigration Initiative (Economic Development Brandon)", href: "https://economicdevelopmentbrandon.com/immigration" },
    ],
    escuelas: [
      { label: "Brandon University", href: "https://www.brandonu.ca/" },
      { label: "Assiniboine College", href: "https://assiniboine.net/" },
    ],
    economia: "Según Economic Development Brandon, la industria con más empleo de la ciudad es la química (fertilizantes y otros productos químicos agrícolas); también destacan la manufactura de metales, la salud —Brandon es la sede de Prairie Mountain Health— y la agroindustria, con más de 350 empresas y más de 4,000 empleos vinculados a la agricultura. La base militar CFB Shilo, a 30 km, emplea a unas 1,800 personas.",
    economiaEnlaces: [{ label: "Economic Development Brandon — Mayores empleadores", href: "https://www.economicdevelopmentbrandon.com/largest-employers" }],
    servicios: [
      { label: "Basura, reciclaje y orgánicos", href: "https://www.brandon.ca/home-property-environment/garbage-recycling-and-organics/" },
      { label: "Agua y alcantarillado", href: "https://www.brandon.ca/home-property-environment/water-and-wastewater/" },
      { label: "Impuesto a la propiedad", href: "https://www.brandon.ca/home-property-environment/property-taxes/" },
      { label: "Reportar un problema", href: "https://www.brandon.ca/home-property-environment/report-an-issue/" },
      { label: "Contacto", href: "https://www.brandon.ca/city-hall/contact-us/" },
    ],
  },
  steinbach: {
    nombre: "Steinbach",
    web: "https://www.steinbach.ca/",
    cmhc: ["manitoba", "Steinbach CA", "la aglomeración de Steinbach"],
    transporte: [{ label: "Ciudad de Steinbach — Transporte accesible (Pat Porter Active Living Centre)", href: "https://www.steinbach.ca/home-property-community/accessible-transit/" }],
    transporteNota: "No encontramos un servicio de autobús urbano para el público general en el sitio de la ciudad. Hay transporte accesible para personas con movilidad reducida y mayores de 55 años (teléfono 204-326-4055).",
    agencias: ["Eastman Immigrant Services"],
    agenciasEnlaces: [{ label: "Eastman Immigrant Services (Steinbach)", href: "https://eastmanimmigrantservices.com/" }],
    escuelas: [{ label: "RRC Polytech — Campus de Steinbach", href: "https://www.rrc.ca/steinbach/" }],
    servicios: [
      { label: "Basura y reciclaje", href: "https://www.steinbach.ca/home-property-community/garbage-recycling/" },
      { label: "Agua y servicios públicos", href: "https://www.steinbach.ca/home-property-community/water-utilities/" },
      { label: "Impuesto a la propiedad", href: "https://www.steinbach.ca/home-property-community/property-taxes/" },
      { label: "Directorio de contactos", href: "https://www.steinbach.ca/contacts-directory/" },
    ],
  },
  thompson: {
    nombre: "Thompson",
    web: "https://www.thompson.ca/",
    cmhc: ["manitoba", "Thompson CA", "la aglomeración de Thompson"],
    transporte: [],
    transporteNota: "La página de transporte del sitio de la ciudad no estaba disponible cuando la consultamos (error del servidor): confirma con la ciudad si hay servicio de autobús urbano.",
    agencias: ["North West Regional Immigrant Services"],
    agenciasEnlaces: [NWRIS],
    escuelas: [{ label: "University College of the North — Campus de Thompson", href: "https://ucn.ca/locations/thompson/" }],
    servicios: [
      { label: "Basura y reciclaje", href: "https://www.thompson.ca/p/garbage-recycling" },
      { label: "Agua y alcantarillado", href: "https://www.thompson.ca/p/water-wastewater" },
      { label: "Impuestos y tasaciones", href: "https://www.thompson.ca/p/taxes" },
      { label: "Contactos de la comunidad", href: "https://www.thompson.ca/p/community-contacts" },
      { label: "Contacto", href: "https://www.thompson.ca/p/contact-us" },
    ],
  },
  "portage-la-prairie": {
    nombre: "Portage la Prairie",
    web: "https://www.city-plap.com/",
    cmhc: ["manitoba", "Portage La Prairie CA", "la aglomeración de Portage la Prairie"],
    transporte: [],
    transporteNota: "No encontramos un servicio de autobús urbano en el sitio de la ciudad; consulta en la ciudad las opciones de transporte local.",
    agencias: ["Portage Learning and Literacy Centre"],
    agenciasEnlaces: [{ label: "Portage Learning and Literacy Centre — Servicios para recién llegados", href: "https://pllc.ca/programs/newcomer-settlement-services/" }],
    escuelas: [
      { label: "RRC Polytech — Campus de Portage la Prairie", href: "https://www.rrc.ca/portage/" },
      { label: "Assiniboine College — Campus de Portage", href: "https://assiniboine.net/locations/campus/portage-campus" },
    ],
    servicios: [
      { label: "Basura y reciclaje", href: "https://www.city-plap.com/home-property-community/garbage-and-recycling/" },
      { label: "Agua y alcantarillado", href: "https://www.city-plap.com/home-property-community/water-and-wastewater-services/" },
      { label: "Impuesto a la propiedad", href: "https://www.city-plap.com/home-property-community/property-taxes/" },
      { label: "Solicitudes de servicio", href: "https://www.city-plap.com/council-administration/service-requests/" },
      { label: "Contacto", href: "https://www.city-plap.com/council-administration/contact-us/" },
    ],
  },
  winkler: {
    nombre: "Winkler",
    web: "https://www.cityofwinkler.ca/",
    cmhc: ["manitoba", "Winkler CA", "la aglomeración de Winkler (incluye Morden y el municipio rural de Stanley)"],
    transporte: [{ label: "Ciudad de Winkler — Winkler On-Demand Transit", href: "https://www.cityofwinkler.ca/p/winkler-on-demand-transit" }],
    transporteNota: "Winkler tiene un servicio piloto de transporte público a pedido (on-demand), puerta a puerta dentro de la ciudad y con viajes no urgentes al Boundary Trails Health Centre: $5 por viaje de ida. Se reserva por teléfono (431-451-4900), en línea o con la aplicación Blaise Transit.",
    agencias: ["Regional Connections Immigrant Services"],
    agenciasEnlaces: [
      { label: "Regional Connections Immigrant Services", href: "https://regionalconnections.ca/" },
      { label: "Winkler-Stanley Economic Development Corporation — Iniciativa de inmigración (en octubre de 2026 no acepta solicitudes nuevas)", href: "https://wsedc.ca/immigration/" },
    ],
    escuelas: [{ label: "RRC Polytech — Campus de Winkler", href: "https://www.rrc.ca/winkler/" }],
    hospital: "El hospital regional de Winkler y Morden es el Boundary Trails Health Centre, de Southern Health-Santé Sud, en el cruce de las carreteras 3 y 14, entre las dos ciudades; en 2026 amplía sus instalaciones.",
    servicios: [
      { label: "Residuos, reciclaje y compost", href: "https://www.cityofwinkler.ca/p/winkler-waste-recycling" },
      { label: "Agua y alcantarillado", href: "https://www.cityofwinkler.ca/p/water-and-sewer" },
      { label: "Impuesto a la propiedad", href: "https://www.cityofwinkler.ca/p/property-taxes" },
    ],
  },
  selkirk: {
    nombre: "Selkirk",
    web: "https://www.myselkirk.ca/",
    cmhc: ["manitoba", "Selkirk CY", "la ciudad de Selkirk"],
    transporte: [{ label: "Selkirk Transit Authority — Rutas, horarios y tarifas", href: "https://mysta.ca/" }],
    transporteNota: "Selkirk tiene autobús urbano de ruta fija, operado por la Selkirk Transit Authority, una organización sin fines de lucro (teléfono 204-482-4636).",
    agencias: [],
    agenciasNota: "En la lista de servicios de asentamiento del Gobierno de Manitoba no figura una agencia con oficina en Selkirk. Busca los servicios más cercanos con el buscador del Gobierno de Canadá; en Winnipeg, el registro de recién llegados es Manitoba Start.",
    agenciasEnlaces: [{ label: "Manitoba Start (Winnipeg) — Registro para recién llegados", href: "https://manitobastart.com/for-newcomers/register-for-services/" }],
    economia: "Según la ciudad, Selkirk es el centro económico regional de un área comercial de unas 70,000 personas.",
    servicios: [
      { label: "Sitio de la ciudad: cuenta de servicios públicos, reglamentos y contacto", href: "https://www.myselkirk.ca/" },
    ],
  },
  morden: {
    nombre: "Morden",
    web: "https://morden.ca/",
    cmhc: ["manitoba", "Winkler CA", "la aglomeración de Winkler, a la que pertenece Morden"],
    transporte: [],
    transporteNota: "No pudimos consultar el sitio de la ciudad (bloquea el acceso automático): confirma directamente con la ciudad las opciones de transporte local.",
    agencias: ["Regional Connections Immigrant Services"],
    agenciasEnlaces: [
      { label: "Regional Connections Immigrant Services", href: "https://regionalconnections.ca/" },
      { label: "Ciudad de Morden — Iniciativa de inmigración impulsada por la comunidad", href: "https://morden.ca/immigration" },
    ],
    hospital: "El hospital regional de Winkler y Morden es el Boundary Trails Health Centre, de Southern Health-Santé Sud, en el cruce de las carreteras 3 y 14, entre las dos ciudades; en 2026 amplía sus instalaciones.",
  },
  dauphin: {
    nombre: "Dauphin",
    web: "https://www.dauphin.ca/",
    cmhc: null,
    transporte: [],
    transporteNota: "No encontramos un servicio de autobús urbano en el sitio de la ciudad; consulta en la ciudad las opciones de transporte local.",
    agencias: [],
    agenciasNota: "En la lista de servicios de asentamiento del Gobierno de Manitoba no figura una agencia con oficina en Dauphin. La iniciativa regional de inmigración Immigrate Parkland anuncia que reabrirá en el otoño de 2026, enfocada en el sector de la salud. Busca los servicios gratuitos más cercanos con el buscador del Gobierno de Canadá.",
    agenciasEnlaces: [{ label: "Immigrate Parkland — Iniciativa regional de inmigración", href: "https://immigrateparkland.ca/" }],
    escuelas: [{ label: "Assiniboine College — Parkland Campus", href: "https://assiniboine.net/locations/campus-parkland-campus/parkland-campus" }],
    economia: "Según la ciudad, Dauphin está a 350 km de Winnipeg, junto al Parque Nacional Riding Mountain, y es el centro regional de salud y comercio de la región de Parkland, con manufactura, educación y turismo.",
    servicios: [
      { label: "Servicios públicos (agua y alcantarillado)", href: "https://www.dauphin.ca/p/utilities" },
      { label: "Residuos y reciclaje", href: "https://www.dauphin.ca/p/recycling-waste" },
      { label: "Impuesto a la propiedad", href: "https://www.dauphin.ca/p/property-taxes" },
      { label: "Contactos de la ciudad", href: "https://www.dauphin.ca/p/city-contacts-" },
    ],
  },
  "flin-flon": {
    nombre: "Flin Flon (parte de Manitoba)",
    web: "https://cityofflinflon.ca/",
    cmhc: null,
    transporte: [{ label: "Ciudad de Flin Flon — Transporte", href: "https://cityofflinflon.ca/transit-transport" }],
    transporteNota: "La página de transporte de la ciudad enlaza un horario de autobús que no estaba disponible cuando lo consultamos: confirma con la ciudad si hay servicio.",
    agencias: ["North West Regional Immigrant Services"],
    agenciasEnlaces: [NWRIS],
    servicios: [
      { label: "Agua, alcantarillado y servicios públicos", href: "https://cityofflinflon.ca/water-sewer-utilities" },
      { label: "Basura y reciclaje", href: "https://cityofflinflon.ca/garbage-recycling" },
      { label: "Impuesto a la propiedad", href: "https://cityofflinflon.ca/property-tax" },
      { label: "Contactos de emergencia", href: "https://cityofflinflon.ca/emergency-contacts" },
    ],
  },
  "the-pas": {
    nombre: "The Pas",
    web: "https://townofthepas.ca/",
    cmhc: null,
    transporte: [],
    transporteNota: "No encontramos un servicio de autobús urbano en el sitio del pueblo.",
    agencias: ["North West Regional Immigrant Services"],
    agenciasEnlaces: [NWRIS, { label: "Northwest Manitoba Immigration Initiative", href: "https://townofthepas.ca/northwest-imigration" }],
    escuelas: [{ label: "University College of the North — Campus de The Pas", href: "https://ucn.ca/locations/the-pas/" }],
    servicios: [
      { label: "Residuos y reciclaje", href: "https://townofthepas.ca/waste-and-recycling" },
      { label: "Agua y alcantarillado", href: "https://townofthepas.ca/water-sewer" },
      { label: "Impuesto a la propiedad", href: "https://townofthepas.ca/property-taxes" },
      { label: "Contacto y solicitudes", href: "https://townofthepas.ca/contact-us" },
    ],
  },
  "swan-river": {
    nombre: "Swan River",
    web: "https://www.swanrivermanitoba.ca/",
    cmhc: null,
    transporte: [{ label: "Pueblo de Swan River — Contactos y Handivan", href: "https://www.swanrivermanitoba.ca/p/staff-and-services" }],
    transporteNota: "No encontramos un servicio de autobús urbano; el pueblo publica el contacto de su Handivan.",
    agencias: ["North West Regional Immigrant Services"],
    agenciasEnlaces: [NWRIS],
    servicios: [
      { label: "Agua y alcantarillado", href: "https://www.swanrivermanitoba.ca/p/water-sewer" },
      { label: "Basura y reciclaje", href: "https://www.swanrivermanitoba.ca/p/garbage-recycling" },
      { label: "Información de impuestos", href: "https://www.swanrivermanitoba.ca/p/tax-information" },
      { label: "Reportar un problema", href: "https://www.swanrivermanitoba.ca/p/report-a-problem" },
    ],
  },
  neepawa: {
    nombre: "Neepawa",
    web: "https://www.neepawa.ca/",
    cmhc: null,
    transporte: [],
    transporteNota: "No encontramos un servicio de autobús urbano en el sitio del pueblo.",
    agencias: ["Neepawa and Area Immigrant Settlement Services"],
    agenciasEnlaces: [{ label: "Neepawa and Area Immigrant Settlement Services", href: "https://neepawasettlement.ca/" }],
    servicios: [
      { label: "Basura y reciclaje", href: "https://www.neepawa.ca/services/garbage-recycling-information/" },
      { label: "Agua y alcantarillado", href: "https://www.neepawa.ca/services/water/" },
      { label: "Impuesto a la propiedad", href: "https://www.neepawa.ca/property-tax-information/" },
      { label: "Contacto", href: "https://www.neepawa.ca/contact-the-town-of-neepawa/" },
    ],
  },
};

/* Hospitales (Statistics Canada, ODHF 2020): nombre de la base → nombre vigente. Solo hospitales regionales y de
   las ciudades, comprobados en las listas de las autoridades de salud en octubre de 2026 (WRHA, Southern
   Health-Santé Sud, Interlake-Eastern y Northern Health Region; la lista de Prairie Mountain Health no se pudo
   abrir, y para Brandon, Dauphin, Swan River y Neepawa se usa el nombre de la base). La base no incluye el
   Boundary Trails Health Centre (Winkler y Morden): sus fichas lo mencionan aparte. */
const HOSPITALES = {
  "health sciences centre": "Health Sciences Centre (HSC)",
  "st. boniface general hospital": "St. Boniface Hospital",
  "grace hospital": "Grace Hospital",
  "victoria general hospital - winnipeg": "Victoria Hospital",
  "concordia hospital": "Concordia Hospital",
  "seven oaks general hospital": "Seven Oaks General Hospital",
  "brandon regional health centre": "Brandon Regional Health Centre",
  "bethesda regional health centre": "Bethesda Regional Health Centre",
  "portage district general hospital": "Portage District General Hospital",
  "selkirk regional health centre": "Selkirk Regional Health Centre",
  "dauphin regional health centre": "Dauphin Regional Health Centre",
  "thompson general hospital": "Thompson General Hospital",
  "flin flon general hospital": "Flin Flon General Hospital",
  "st. anthony’s general hospital": "St. Anthony's General Hospital",
  "swan valley health centre": "Swan Valley Health Centre",
  "neepawa health centre": "Neepawa Health Centre",
  "gillam hospital inc.": "Gillam Hospital",
  "lynn lake hospital": "Lynn Lake Hospital",
  "snow lake health centre": "Snow Lake Health Centre",
};
/* Winkler, Morden y el municipio rural de Stanley: el hospital regional (Boundary Trails) no está en la base ODHF */
const BOUNDARY_TRAILS = new Set(["4603050", "4603053", "4603047"]);

/* Base ODEF: nombres franceses con «?» en lugar de la letra acentuada; corrección explícita, letra por letra */
const ESCUELAS_NOMBRES = {
  "CENTRE SCOLAIRE L?O-R?MILLARD": "CENTRE SCOLAIRE LÉO-RÉMILLARD",
  "COLL?GE LOUIS-RIEL": "COLLÈGE LOUIS-RIEL",
  "?COLE CHRISTINE-LESP?RANCE": "ÉCOLE CHRISTINE-LESPÉRANCE",
  "?COLE COMMUNAUTAIRE AUR?LE-LEMOINE": "ÉCOLE COMMUNAUTAIRE AURÈLE-LEMOINE",
  "?COLE COMMUNAUTAIRE GILBERT-ROSSET": "ÉCOLE COMMUNAUTAIRE GILBERT-ROSSET",
  "?COLE COMMUNAUTAIRE LA VOIE DU NORD": "ÉCOLE COMMUNAUTAIRE LA VOIE DU NORD",
  "?COLE COMMUNAUTAIRE R?AL-B?RARD": "ÉCOLE COMMUNAUTAIRE RÉAL-BÉRARD",
  "?COLE COMMUNAUTAIRE SAINT-GEORGES": "ÉCOLE COMMUNAUTAIRE SAINT-GEORGES",
  "?COLE JOURS DE PLAINE": "ÉCOLE JOURS DE PLAINE",
  "?COLE LA SOURCE": "ÉCOLE LA SOURCE",
  "?COLE LACERTE": "ÉCOLE LACERTE",
  "?COLE LAGIMODI?RE": "ÉCOLE LAGIMODIÈRE",
  "?COLE NO?L-RITCHOT": "ÉCOLE NOËL-RITCHOT",
  "?COLE POINTE-DES-CH?NES": "ÉCOLE POINTE-DES-CHÊNES",
  "?COLE PR?CIEUX-SANG": "ÉCOLE PRÉCIEUX-SANG",
  "?COLE R?GIONALE NOTRE-DAME": "ÉCOLE RÉGIONALE NOTRE-DAME",
  "?COLE R?GIONALE SAINT-JEAN-BAPTISTE": "ÉCOLE RÉGIONALE SAINT-JEAN-BAPTISTE",
  "?COLE SAINT-JOACHIM": "ÉCOLE SAINT-JOACHIM",
  "?COLE SAINT-LAZARE": "ÉCOLE SAINT-LAZARE",
  "?COLE SAINTE-AGATHE": "ÉCOLE SAINTE-AGATHE",
  "?COLE TACH?": "ÉCOLE TACHÉ",
  "?COLE/COLL. R?G. GABRIELLE-ROY": "ÉCOLE/COLL. RÉG. GABRIELLE-ROY",
};

/* ---------- Fuentes ---------- */
export const FUENTES = {
  csd: { org: "Statistics Canada", title: "Límites cartográficos del Censo 2021 — subdivisiones censales, divisiones censales, regiones económicas y lugares designados", url: "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21" },
  censo: { org: "Statistics Canada", title: "Tabla 98-10-0002-01 — Población y viviendas, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000201" },
  dpl: { org: "Statistics Canada", title: "Tabla 98-10-0012-01 — Población de los lugares designados, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810001201" },
  nombres: { org: "Recursos Naturales Canadá", title: "Base de datos de nombres geográficos de Canadá (CGNDB) — Manitoba", url: "https://natural-resources.canada.ca/earth-sciences/geography/download-geographical-names-data/9245" },
  municipios: { org: "Gobierno de Manitoba (Municipal and Northern Relations)", title: "Municipal Officials Directory — 137 municipios (actualizado el 15 de octubre de 2026)", url: "https://www.gov.mb.ca/mr/contactus/pubs/mod.pdf" },
  norte: { org: "Gobierno de Manitoba (Northern Affairs)", title: "Perfiles de las comunidades de Northern Affairs", url: "https://www.gov.mb.ca/mr/northern/community_profiles.html" },
  epa: { org: "Statistics Canada", title: "Tabla 14-10-0393-01 — Características de la población activa por región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410039301" },
  industrias: { org: "Statistics Canada", title: "Tabla 14-10-0392-01 — Empleo por industria y región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410039201" },
  cmhc: { org: "CMHC", title: "Rental Market Survey 2025 — tablas de datos (Manitoba)", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
  escuelas: { org: "Statistics Canada", title: "Open Database of Educational Facilities (ODEF), versión 2.1 (2022)", url: "https://www.statcan.gc.ca/en/lode/databases/odef" },
  hospitales: { org: "Statistics Canada", title: "Open Database of Healthcare Facilities (ODHF), versión 1.1 (2020)", url: "https://www.statcan.gc.ca/en/lode/databases/odhf" },
  hora: { org: "Gobierno de Manitoba", title: "Manitoba mantiene el horario de verano todo el año, «Manitoba Standard Time» (comunicados del 17 de septiembre y del 29 de octubre de 2026)", url: "https://news.gov.mb.ca/news/index.html?item=75937&posted=2026-10-29" },
};
const RECURSOS = {
  empleo: [
    { label: "Job Bank — Buscar empleo en Manitoba", href: "https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=Manitoba" },
    { label: "Gobierno de Manitoba — Centros de empleo (Manitoba Jobs and Skills Development Centres)", href: "https://www.gov.mb.ca/wd/ites/contact.html" },
  ],
  escuelas: [
    { label: "Gobierno de Manitoba — Escuelas y divisiones escolares (buscador y mapas)", href: "https://www.edu.gov.mb.ca/k12/schools/index.html" },
    { label: "Gobierno de Manitoba — Ir a la escuela en Manitoba (edades, programas e idiomas)", href: "https://www.edu.gov.mb.ca/k12/schools/gts.html" },
  ],
  salud: [
    { label: "Manitoba Health — Registro y tarjeta de salud", href: "https://www.gov.mb.ca/health/mhsip/index.html" },
    { label: "Health Links – Info Santé: 204-788-8200 o 1-888-315-9257 (24 horas)", href: "https://misericordia.mb.ca/programs/phcc/health-links-info-sante/" },
    { label: "Family Doctor Finder — Buscar médico de familia", href: "https://www.gov.mb.ca/health/familydoctorfinder/" },
  ],
  recienLlegados: [
    { label: "IRCC — Servicios gratuitos para recién llegados cerca de ti", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" },
  ],
  familias: [
    { label: "CRA — Cómo solicitar la Canada Child Benefit", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit/how-apply.html" },
    { label: "Gobierno de Manitoba — Guarderías de $10 al día", href: "https://www.gov.mb.ca/education/childcare/families/10_dollar_a_day.html" },
    { label: "Manitoba Child Care Search — Buscar guarderías con licencia", href: "https://childcaresearch.gov.mb.ca/" },
  ],
  vivienda: [
    { label: "Residential Tenancies Branch — Derechos de inquilinos y propietarios", href: "https://www.gov.mb.ca/cca/rtb/index.html" },
    { label: "Residential Tenancies Branch — Aumentos de alquiler (hoja informativa en español)", href: "https://www.gov.mb.ca/cca/rtb/resource_list/rent_increases_spanish.pdf" },
  ],
};

/* ---------- Carga ---------- */
export function cargar(root) {
  const L = cargarCenso(root, {
    archivo: "mb-localidades.json",
    provincia: PROV,
    TIPOS,
    gnMunicipal: new Set(["City", "Town", "Village", "Municipality", "Rural Municipality", "Local Government District"]),
    ordenGn: ["Indian Reserve", "Northern Community", "Local Urban District", "Community", "Hamlet", "Urban Community", "Neighbourhood", "Locality", "Railway Point", "Industrial Area", "Post Office"],
    nombreVisible: NOMBRE_VISIBLE,
    prioridad: { urbano: 0, municipio: 1, rural: 2, indigena: 3, otro: 4 },
    fichas: FICHAS,
    tiposFicha: ["city", "town"],
    hospitales: HOSPITALES,
    escuelasNombres: ESCUELAS_NOMBRES,
  });
  /* La EPA publica Parklands y North con dos nombres distintos según la tabla: se unen las industrias a las cifras */
  const pn = L.epa["Parklands and Northern, Manitoba"];
  const pi = L.epa["Parklands and North, Manitoba"];
  if (pn && pi && !pn.industrias) pn.industrias = pi.industrias;
  L.regiones = Object.fromEntries(Object.keys(L.regiones).map((k) => [k, REGIONES_ES[k] || L.regiones[k]]));
  return L;
}

/* ---------- Textos del directorio en la ficha provincial ---------- */
const directorio = {
  origen: "Statistics Canada: Censo 2021 (subdivisiones censales, lugares designados y divisiones censales); Recursos Naturales Canadá: Base de datos de nombres geográficos de Canadá; Gobierno de Manitoba: lista oficial de municipios",
  poblacion: "Censo 2021",
  regiones: "8 regiones económicas",
  regionEtiqueta: "Región económica",
  subregion: "División censal",
  tipoEtiqueta: "Tipo de localidad",
  ejemplo: "Brandon",
  extendido: true,
  notaFichas: "Las demás localidades tienen, por ahora, una página con información básica: clasificación oficial, división censal, población del Censo 2021, empleo de su región económica, escuelas, el hospital regional más cercano de nuestra lista y enlaces oficiales. Iremos completándolas.",
  intro: (L) => {
    const n = (...g) => L.items.filter((r) => g.includes(TIPOS[r.t].grupo)).length;
    return `<p>Investiga las localidades de Manitoba antes de decidir dónde vivir, trabajar o estudiar. El directorio reúne <strong>${miles(n("urbano", "municipio", "rural", "indigena", "otro"))} subdivisiones censales</strong> del Censo 2021, que cubren toda la provincia, y <strong>${miles(n("comunidad"))} comunidades, barrios y lugares</strong> con nombre oficial que forman parte de ellas.</p>
      <ul class="cd-list-items">
        <li><strong>Los 137 municipios de Manitoba</strong>, según la lista oficial del Gobierno provincial (octubre de 2026): ciudades, pueblos y villas; municipios (municipalities), muchos formados en 2015 por la fusión de municipios rurales y pueblos; municipios rurales (rural municipalities, «RM»), y 2 distritos de gobierno local. El municipio rural de Mountain aparece en dos partes porque el censo lo divide en dos subdivisiones.</li>
        <li><strong>Tierras de Primeras Naciones</strong>: reservas y asentamientos con su clasificación oficial en el censo. Se respetan sus nombres oficiales.</li>
        <li><strong>Territorio no organizado</strong>: el norte y algunas zonas del centro de la provincia no tienen municipio. Allí están las 45 comunidades que atiende Northern Affairs, como Cross Lake, Norway House o Wabowden, que en el directorio aparecen como comunidades del norte.</li>
        <li><strong>Comunidades, barrios y lugares</strong>: no son municipios; aparecen dentro de la subdivisión censal en la que están. Incluyen distritos urbanos locales (por ejemplo, Grunthal o Lorette), comunidades no incorporadas y barrios de Winnipeg.</li>
      </ul>`;
  },
  nota: (L) =>
    `Total: ${miles(L.items.length)} localidades. La población de los lugares designados (distritos urbanos locales, comunidades del norte y otros) proviene del Censo 2021 y ya está incluida en la de la subdivisión censal que los contiene: no se suma. Las comunidades y lugares de la Base de datos de nombres geográficos de Canadá no tienen cifras de población propias. Statistics Canada solo considera subdivisiones censales las reservas habitadas o que podrían estarlo: las demás reservas aparecen como nombres geográficos dentro de la subdivisión que las contiene. Las regiones son las 8 regiones económicas oficiales de Statistics Canada (2021); la Encuesta de Población Activa publica juntas Centro sur y Centro norte, y Parklands y Norte. No hay un inventario oficial completo de asentamientos sin nombre registrado.`,
  fuentes: (L, esc) => `Fuentes: ${fuente(FUENTES.csd, esc)}; ${fuente(FUENTES.censo, esc)}; ${fuente(FUENTES.dpl, esc)}; ${fuente(FUENTES.nombres, esc)}; ${fuente(FUENTES.municipios, esc)}; ${fuente(FUENTES.norte, esc)}. Consultado el ${esc(fechaEs(L.meta.consultado))}.`,
};

/* ---------- Contenido de cada ficha ---------- */
function filaCmhc(L, archivo, centro, hoja_) {
  const t = (L.cmhc[archivo] && L.cmhc[archivo].hojas[hoja_]) || [];
  return t.find((f) => f[0] === centro) || null;
}
const DIST = (n) => (n < 1.5 ? "1 km" : `${miles(Math.round(n))} km`);
const decimal = (v) => { const [e, d] = String(v).split("."); return miles(e) + (d ? `.${d}` : ""); };
/* Hora: toda la provincia usa la misma. Flin Flon se extiende a Saskatchewan */
const HORA = "Hora de Manitoba (Manitoba Standard Time), UTC−5 todo el año: la provincia mantiene de forma permanente el horario de verano y el 1 de noviembre de 2026 no atrasa los relojes";
function zonaHoraria(r) {
  if (r.c === "4621064") return `${HORA}. La parte de Saskatchewan de Flin Flon y las vecinas Creighton y Denare Beach usan en la práctica la misma hora`;
  return HORA;
}

function pagina(r, L, { esc }) {
  const tipo = TIPOS[r.t];
  const grupo = tipo.grupo;
  const region = nombreRegion(L.regiones[r.r]);
  const claveEpa = EPA_GEO[r.r];
  const epa = L.epa[claveEpa];
  const consultado = fechaEs(L.meta.consultado);
  const f = r.ficha ? FICHAS[r.s] : null;
  const denom = `${tipo.es} (${tipo.en})`;
  const nombre = r.n;
  const corto = nombre.replace(/ \((parte de Manitoba|ciudad|pueblo)\)$/, "");

  const titulo = r.ficha ? `${nombre}, Manitoba: guía para inmigrantes y recién llegados` : `${nombre}, Manitoba: información básica`;
  const que = { urbano: "un municipio", municipio: "un municipio", rural: "un municipio rural", indigena: "una tierra de Primera Nación", otro: "una subdivisión censal del territorio no organizado" }[grupo];
  const descripcion = r.ficha
    ? `${nombre} (Manitoba) en datos: población, empleo, alquileres, escuelas, hospitales, transporte y servicios para recién llegados, con fuentes oficiales.`
    : `${nombre} es ${que} de la ${r.division}, Manitoba (${tipo.es}). Clasificación oficial, población del Censo 2021 y enlaces oficiales.`;

  /* --- Datos rápidos --- */
  const pob = typeof r.p === "number"
    ? `${miles(r.p)} <small class="cd-fact__period">Censo 2021${r.p16 != null ? `; Censo 2016: ${miles(r.p16)}${r.cambio != null ? ` (${r.cambio >= 0 ? "+" : ""}${r.cambio}%)` : ""}` : ""}</small>`
    : `${NO_DISPONIBLE} <small class="cd-fact__period">Statistics Canada no publica la población de esta subdivisión en el Censo 2021.</small>`;
  const datos = [
    fila("Clasificación oficial", `${esc(denom)} <small class="cd-fact__period">Tipo de subdivisión censal: ${esc(tipo.censo)}${r.n !== r.censoNombre ? ` · En el Censo 2021: ${esc(r.censoNombre)}` : ""}</small>`),
    fila("División censal", `${esc(r.division)} <small class="cd-fact__period">Statistics Canada, Censo 2021</small>`),
    fila("Región económica", esc(region)),
    r.cma ? fila("Área metropolitana o aglomeración", `${esc(r.cma)} <small class="cd-fact__period">Censo 2021</small>`) : "",
    fila("Población", pob),
    r.superficie != null ? fila("Superficie terrestre", `${decimal(r.superficie)} km²${r.densidad != null ? ` <small class="cd-fact__period">Densidad: ${decimal(r.densidad)} hab./km² (Censo 2021)</small>` : ""}`) : "",
    r.viviendas != null ? fila("Viviendas privadas", `${miles(r.viviendas)} <small class="cd-fact__period">Censo 2021</small>`) : "",
    fila("Coordenadas", `${r.lat.toFixed(4)}, ${r.lon.toFixed(4)} <small class="cd-fact__period">Punto de referencia dentro de la subdivisión censal</small>`),
    fila("Zona horaria", zonaHoraria(r)),
  ].filter(Boolean).join("\n          ");

  /* --- Comunidades y lugares dentro de la subdivisión --- */
  const lista = (r.comunidades || []).slice().sort((x, y) => x.n.localeCompare(y.n, "es", { numeric: true }));
  const porTipo = {};
  for (const x of lista) (porTipo[x.t] ||= []).push(x);
  const conPob = lista.some((x) => typeof x.p === "number");
  const comunidades = lista.length
    ? `<p>Dentro de ${esc(nombre)} hay ${miles(lista.length)} ${lista.length === 1 ? "lugar con nombre oficial" : "lugares con nombre oficial"} (comunidades, barrios o lugares). No son municipios: forman parte de ${esc(nombre)}.${conPob ? ` La población de los lugares designados ya está incluida en la de ${esc(nombre)}.` : ""}</p>
      ${Object.entries(porTipo)
        .map(([t, xs]) => `<h3>${esc(TIPOS[t].plural.replace(/^./, (m) => m.toUpperCase()))} (${xs.length})</h3>
      <p class="cd-loc-comunidades">${xs.map((x) => `<span class="cd-loc-lugar" id="${x.ancla}">${esc(x.n)}${typeof x.p === "number" ? ` <small>(${miles(x.p)} hab., Censo 2021)</small>` : ""}</span>`).join(" · ")}</p>`)
        .join("\n      ")}
      <p class="cd-indicator__src">Fuentes: ${fuente(FUENTES.dpl, esc)}; ${fuente(FUENTES.nombres, esc)}. Cada lugar se ubicó en la subdivisión censal que contiene sus coordenadas oficiales.</p>`
    : "";

  /* --- Empleo (región económica) --- */
  let empleo = empleoRegional({
    epa,
    nombre,
    nombreEpa: EPA_ES[claveEpa],
    nota: ["4620", "4640", "4670", "4680"].includes(String(r.r)) ? " (Statistics Canada publica juntas las regiones Centro sur y Centro norte, y Parklands y Norte)" : "",
    esc,
    consultado,
    fuentes: FUENTES,
  });
  if (f && f.economia) empleo = `<p>${esc(f.economia)}</p>\n      ${f.economiaEnlaces ? enlaces(f.economiaEnlaces, esc) : ""}\n      ${empleo}`;
  if (f) empleo += `\n      <p>Las cifras regionales describen el mercado laboral; no son ofertas de empleo. Para vacantes reales, usa las bolsas de empleo oficiales.</p>`;
  const busqueda = RECURSOS.empleo;

  /* --- Vivienda --- */
  let vivienda = "";
  if (f && f.cmhc) {
    const [archivo, centro, etiqueta] = f.cmhc;
    const alquiler = filaCmhc(L, archivo, centro, "Table 1.1.2");
    const vacancia = filaCmhc(L, archivo, centro, "Table 1.1.1");
    if (alquiler && vacancia) vivienda = viviendaCmhc({ cmhc: { alquiler, vacancia }, centro: etiqueta, esc, fuenteCmhc: FUENTES.cmhc });
  }
  if (!vivienda) vivienda = `<p>${NO_DISPONIBLE}: esta página no muestra alquileres de CMHC para ${esc(nombre)}. CMHC solo publica su encuesta anual para las áreas urbanas de 10,000 habitantes o más; consulta las cifras de Winnipeg, Brandon y otras ciudades en la <a href="/canada-en-datos/manitoba#vivienda">guía de Manitoba</a>. No usamos promedios provinciales como si fueran de la localidad.</p>`;
  vivienda += `\n      <p>Antes de alquilar, conoce tus derechos:</p>\n      ${enlaces(RECURSOS.vivienda, esc)}`;

  /* --- Escuelas (ODEF 2022) --- */
  const escs = L.escuelas.filter((e) => e.csd === r.c);
  const consultadoEscuelas = "Base ODEF v2.1 de Statistics Canada (2022)";
  let escuelas;
  if (escs.length) {
    const POST = ["University", "Junior College", "Technical and Vocational"];
    const div = escs.filter((e) => !e.tipo && e.autoridad && /SCHOOL DIVISION|SCHOOL DISTRICT|FRANCO-MANITOBAINE/i.test(e.autoridad));
    const fr = div.filter((e) => /franco-manitobaine/i.test(e.autoridad));
    const post = escs.filter((e) => POST.includes(e.tipo));
    const otras = escs.length - div.length - post.length;
    escuelas = `<p>La ${consultadoEscuelas} ubica en ${esc(nombre)} ${[
      div.length ? `${miles(div.length)} ${div.length === 1 ? "escuela de una división escolar" : "escuelas de divisiones escolares"}${fr.length ? ` (${miles(fr.length)} de la División scolaire franco-manitobaine, en francés)` : ""}` : "",
      post.length ? `${miles(post.length)} ${post.length === 1 ? "centro de educación postsecundaria" : "centros de educación postsecundaria"}` : "",
      otras > 0 ? `${miles(otras)} ${otras === 1 ? "otro establecimiento (escuela independiente, de Primera Nación u otro)" : "otros establecimientos (escuelas independientes, de Primeras Naciones u otros)"}` : "",
    ].filter(Boolean).join(", ")}.</p>
      <ul class="cd-list-items">
        ${escs.slice().sort((x, y) => x.nombre.localeCompare(y.nombre, "es")).map((e) => `<li>${esc(e.nombre)}${e.autoridad ? ` <small>(${esc(e.autoridad)})</small>` : ""}</li>`).join("\n        ")}
      </ul>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}. Es una base de 2022: confirma la escuela y la zona de inscripción con la división escolar que corresponde a tu dirección.</p>`;
  } else {
    escuelas = `<p>La ${consultadoEscuelas} no ubica escuelas dentro de ${esc(nombre)}; las más cercanas pueden estar en una localidad vecina. Para inscribir a tus hijos, consulta la división escolar que corresponde a tu dirección.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}.</p>`;
  }

  /* --- Salud --- */
  const hs = L.hospitales.filter((h) => h.csd === r.c);
  const llamar = "En una emergencia, llama al 911. Para consejos de salud las 24 horas, llama gratis a Health Links – Info Santé: 204-788-8200 o 1-888-315-9257 (con intérpretes).";
  let salud;
  if (f && f.hospital) {
    salud = `<p>${esc(f.hospital)} ${llamar}</p>
      <p class="cd-indicator__src">Fuente: Southern Health-Santé Sud (consultado el ${esc(consultado)}). Confirma servicios y horarios de urgencias antes de ir.</p>`;
  } else if (hs.length) {
    salud = `<p>Principales hospitales en ${esc(nombre)}, según la base de centros de salud de Statistics Canada. ${llamar}</p>
      <ul class="cd-list-items">
        ${hs.map((h) => `<li>${esc(h.nombre)}</li>`).join("\n        ")}
      </ul>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}, con los nombres vigentes de las autoridades regionales de salud. Confirma servicios y horarios de urgencias antes de ir: algunos servicios de urgencias de Manitoba tienen horario limitado.</p>`;
  } else if (BOUNDARY_TRAILS.has(r.c)) {
    salud = `<p>El hospital regional de la zona es el Boundary Trails Health Centre, de Southern Health-Santé Sud, entre Winkler y Morden. ${llamar}</p>
      <p class="cd-indicator__src">Fuente: Southern Health-Santé Sud. Confirma servicios y horarios de urgencias antes de ir.</p>`;
  } else {
    const cerca = L.hospitales.map((h) => ({ h, d: km({ lat: r.lat, lon: r.lon }, { lat: h.lat, lon: h.lon }) })).sort((x, y) => x.d - y.d)[0];
    salud = `<p>De los hospitales regionales y de ciudad de nuestra lista, el más cercano al punto de referencia de ${esc(nombre)} es <strong>${esc(cerca.h.nombre)}</strong>, a unos ${DIST(cerca.d)} en línea recta (la distancia por carretera puede ser mayor). Puede haber un hospital comunitario, un centro de salud o una estación de enfermería más cerca: consulta a la autoridad regional de salud. ${llamar}</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Distancia calculada con las coordenadas oficiales.</p>`;
  }

  /* --- Transporte --- */
  const mpi = enlaces([{ label: "MPI — Mudarse a Manitoba: licencia de conducir, registro y seguro (Autopac)", href: "https://www.mpi.mb.ca/new-to-manitoba/" }], esc);
  const transporte = f
    ? `${f.transporteNota ? `<p>${esc(f.transporteNota)}</p>` : ""}${f.transporte.length ? `<p>Información oficial de transporte:</p>${enlaces(f.transporte, esc)}` : ""}
      <p>Para manejar, la licencia de conducir, el registro del vehículo y el seguro público obligatorio (Autopac) se tramitan con Manitoba Public Insurance (MPI): tienes tres meses desde que te mudas para cambiar tu licencia y tus placas.</p>
      ${mpi}`
    : `<p>Fuera de las ciudades con transporte urbano, en Manitoba se depende sobre todo del automóvil. La licencia de conducir, el registro del vehículo y el seguro público obligatorio (Autopac) se tramitan con Manitoba Public Insurance (MPI). Consulta en tu municipio si hay transporte local:</p>
      ${mpi}`;

  const recien = f
    ? `${f.agencias.length ? `<p>Según el Gobierno de Manitoba, en ${esc(corto)} y su región ofrece${f.agencias.length > 1 ? "n" : ""} servicios de asentamiento ${f.agencias.map(esc).join(" y ")}. Ayudan con orientación, idioma, empleo y conexión con la comunidad; no tramitan documentos migratorios.</p>` : ""}${f.agenciasNota ? `<p>${esc(f.agenciasNota)}</p>` : ""}
      ${enlaces([...f.agenciasEnlaces, ASENTAMIENTO, ...RECURSOS.recienLlegados], esc)}
      <p>Los servicios financiados por el Gobierno de Canadá son gratuitos para quienes cumplen sus requisitos; desde el 1 de abril de 2026, los residentes permanentes de la clase económica pueden usarlos por un tiempo limitado. Consulta también la <a href="/canada-en-datos/manitoba#recien-llegado">guía de primeros pasos en Manitoba</a>.</p>`
    : `<p>Los servicios para recién llegados financiados por el Gobierno de Canadá son gratuitos para quienes cumplen sus requisitos; cada organización indica a quién puede atender. Busca los más cercanos:</p>
      ${enlaces([...RECURSOS.recienLlegados, ASENTAMIENTO], esc)}
      <p>Consulta también la <a href="/canada-en-datos/manitoba#recien-llegado">guía de primeros pasos en Manitoba</a>.</p>`;
  const servicios = f && f.servicios
    ? `<p>Servicios de ${esc(corto)} en su sitio oficial:</p>
      ${enlaces(f.servicios.map((x) => ({ label: `${corto} — ${x.label}`, href: x.href })), esc)}`
    : "";
  const familias = `<p>Estos son recursos provinciales y federales: se aplican en toda la provincia, no solo en ${esc(nombre)}. La elegibilidad depende de tu estatus migratorio, tus ingresos y tu residencia. En las guarderías con licencia que reciben fondos del Gobierno, la tarifa para los padres es de $10 al día por niño (cuidado regular de 4 a 10 horas).</p>
      ${enlaces(RECURSOS.familias, esc)}
      <p>Más información en la sección de <a href="/canada-en-datos/manitoba#beneficios">beneficios de la guía de Manitoba</a>.</p>`;

  const perfilCenso = `https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist=2021A0005${r.c}`;
  const oficiales = [
    ...(f ? [{ label: `Sitio oficial de ${corto}`, href: f.web }] : []),
    { label: `Statistics Canada — Perfil del Censo 2021 de ${r.censoNombre} (en inglés)`, href: perfilCenso },
  ];
  const fuentes = [FUENTES.csd, FUENTES.censo, ...(grupo === "urbano" || grupo === "municipio" || grupo === "rural" ? [FUENTES.municipios] : []), ...(lista.length ? [FUENTES.dpl, FUENTES.nombres] : []), ...(epa ? [FUENTES.epa, FUENTES.industrias] : []), ...(f && f.cmhc ? [FUENTES.cmhc] : []), FUENTES.escuelas, FUENTES.hospitales, FUENTES.hora];

  const habitantes = typeof r.p === "number" ? ` Según el Censo 2021 de Statistics Canada, tenía ${miles(r.p)} habitantes.` : "";
  const intro = {
    urbano: `${nombre} es ${tipo.es === "Ciudad" ? "una ciudad" : `un municipio urbano clasificado como ${tipo.es.toLowerCase()}`} (${tipo.en}) de la ${r.division} de Manitoba.${habitantes}${r.c === "4621064" ? " La ciudad se extiende a ambos lados del límite con Saskatchewan: esta página trata solo de la parte de Manitoba." : ""}`,
    municipio: `${nombre} es ${r.t === "lgd" ? "un distrito de gobierno local (Local Government District)" : "un municipio (Municipality)"} de la ${r.division} de Manitoba.${r.t === "municipality" ? " En Manitoba, muchos municipios se formaron en 2015 al fusionarse municipios rurales con pueblos o villas." : ""}${habitantes}`,
    rural: `${nombre} es un municipio rural (Rural Municipality) de la ${r.division} de Manitoba: el gobierno local del campo que lo rodea. No incluye las ciudades, pueblos y villas de su territorio, que son municipios aparte.${/^Mountain \(/.test(r.censoNombre) ? " El censo divide el municipio rural de Mountain en dos subdivisiones (sur y norte); esta página corresponde a una de ellas." : ""}${habitantes}`,
    indigena: `${nombre} figura en el Censo 2021 de Statistics Canada como ${tipo.es.toLowerCase()} (${tipo.en}), en la ${r.division}. No es un municipio. Para información sobre la comunidad, consulta directamente a la Primera Nación correspondiente.`,
    otro: `${nombre} es una subdivisión del territorio no organizado (${tipo.en}) de Manitoba: no tiene municipio propio. Las comunidades designadas por la Northern Affairs Act reciben servicios municipales del Gobierno de Manitoba (Northern Affairs).${habitantes}`,
  }[grupo];
  const cierre = r.ficha
    ? " Aquí encontrarás datos oficiales y enlaces útiles para investigar la localidad antes de mudarte, trabajar o estudiar."
    : " Esta página reúne, por ahora, la información básica disponible; la iremos completando con datos oficiales verificados.";

  return {
    titulo,
    descripcion,
    kicker: `Manitoba · ${tipo.es}${r.ficha ? "" : " · Información básica"}`,
    intro: intro + cierre,
    datos,
    /* Reloj local en vivo (mismo diseño que la guía provincial): solo en las fichas completas */
    reloj: r.ficha ? { timeZone: "America/Atikokan", lat: r.lat, lon: r.lon, etiqueta: `Hora local en ${corto}` } : null,
    ubicacion: `Ubicación aproximada en la ${esc(r.division)}. Mapa elaborado con los límites de las divisiones censales del Censo 2021 de Statistics Canada.`,
    comunidades,
    empleo,
    busqueda,
    vivienda,
    escuelas,
    escuelasEnlaces: [...(f && f.escuelas ? f.escuelas : []), ...RECURSOS.escuelas],
    salud,
    saludEnlaces: RECURSOS.salud,
    transporte,
    servicios,
    recien,
    familias,
    oficiales,
    fuentes,
    indexar: !!r.ficha,
    ciudad: tipo.grupo === "urbano",
  };
}

function tarjeta(r) {
  const tipo = TIPOS[r.t];
  return {
    tipo: `${tipo.es} (${tipo.en})`,
    dato: typeof r.p === "number" ? `${miles(r.p)} habitantes (Censo 2021)` : "",
  };
}

export default {
  slug: "manitoba",
  nombre: PROV,
  TIPOS,
  GRUPOS,
  FICHAS,
  FUENTES,
  esMunicipio: (r) => ES_PAGINA(r.t),
  cargar,
  directorio,
  pagina,
  tarjeta,
};
