/*
  provincias/quebec.mjs — Directorio de localidades de Quebec
  ============================================================
  Criterio de inclusión (documentado en el repositorio interno):
  - Una página por cada subdivisión censal (CSD) de Quebec en el Censo 2021 de
    Statistics Canada: 1,282 en total, que cubren toda la provincia (la suma de
    su población es la de la provincia, 8,501,833). Comprenden:
      · los municipios locales con su designación oficial: ciudades (villes),
        municipios (municipalités), parroquias (paroisses), cantones (cantons),
        cantones unidos y villas (villages);
      · las comunidades del norte con estatuto municipal: villas nordiques
        (inuit), villas cris y la villa naskapi, y el gobierno regional
        Eeyou Istchee Baie-James;
      · las tierras de Primeras Naciones e inuit con su clasificación censal:
        reservas indígenas, establecimientos indígenas, tierras reservadas
        cris, inuit y naskapi;
      · los territorios no organizados (TNO).
    Las municipalidades regionales de condado (MRC) y los territorios
    equivalentes son las 98 divisiones censales: se usan como filtro y no se
    cuentan como localidades, porque agrupan municipios.
  - Sin página propia, dentro del directorio y de la página de su CSD:
      · los lugares designados (DPL) del Censo 2021 (municipios disueltos,
        localidades no constituidas y antiguos centros de población), con su
        población, que ya está incluida en la de su CSD;
      · los nombres oficiales de lugares poblados de la Base de datos de
        nombres geográficos de Canadá (CGNDB): lieux-dits, hameaux, secteurs,
        quartiers, arrondissements, zonas de veraneo y otros, ubicados en su CSD
        por sus coordenadas oficiales. No se incluyen estaciones de metro, de
        tren o del REM, pistas de esquí, parques industriales ni otros nombres
        que no designan un lugar habitado.
    Un nombre que ya es una CSD o un lugar designado no se repite.
  - El estado municipal actual (nombre, designación, región administrativa,
    MRC, sitio web y población oficial) viene del Répertoire des
    municipalités du Québec (MAMH, Données Québec, 30-10-2026). Las fusiones
    posteriores al Censo 2021 se indican en la página de cada subdivisión
    afectada, sin mezclar las cifras del censo con las del répertoire.
  No se promete cobertura de asentamientos sin nombre oficial registrado.

  Datos (scripts/canada-en-datos/):
    qc-localidades.json   obtener-localidades-censo.py qc + obtener-qc-municipios.py
                          + compactar-localidades.py qc
  La carga común está en censo-comun.mjs (misma lógica que Manitoba).

  Regla: no se rellena ningún dato. Lo que no tiene fuente oficial
  verificada se muestra como «Dato no disponible».
*/
import { miles, nombreRegion, fechaEs, NO_DISPONIBLE, fila, enlaces, fuente, empleoRegional, viviendaCmhc } from "../localidades.mjs";
import { cargarCenso } from "../censo-comun.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROV = "Quebec";

/* ---------- Clasificación oficial ----------
   Designaciones del Censo 2021 (código en `censo`), tipos de lugar designado (`dpl`) y de nombre geográfico de la
   CGNDB (`gn`). Se conservan los nombres oficiales en francés junto al equivalente en español. */
export const TIPOS = {
  ville: { es: "Ciudad", en: "Ville", grupo: "urbano", plural: "ciudades (villes)", censo: "V" },
  municipalite: { es: "Municipio", en: "Municipalité", grupo: "municipio", plural: "municipios (municipalités)", censo: "MÉ" },
  paroisse: { es: "Parroquia (municipio)", en: "Paroisse", grupo: "municipio", plural: "parroquias (paroisses), municipios con esa designación", censo: "PE" },
  canton: { es: "Cantón (municipio)", en: "Canton", grupo: "municipio", plural: "cantones (cantons), municipios con esa designación", censo: "CT" },
  "cantons-unis": { es: "Cantones unidos (municipio)", en: "Cantons unis", grupo: "municipio", plural: "cantones unidos (cantons unis)", censo: "CU" },
  village: { es: "Villa (municipio)", en: "Village", grupo: "municipio", plural: "villas (villages), municipios con esa designación", censo: "VL" },
  "village-nordique": { es: "Villa nórdica (inuit)", en: "Village nordique", grupo: "norte", plural: "villas nórdicas (villages nordiques) de Nunavik", censo: "VN" },
  "village-cri": { es: "Villa cri", en: "Village cri", grupo: "norte", plural: "villas cris (villages cris)", censo: "VC" },
  "village-naskapi": { es: "Villa naskapi", en: "Village naskapi", grupo: "norte", plural: "villa naskapi", censo: "VK" },
  "gouvernement-regional": { es: "Gobierno regional", en: "Gouvernement régional", grupo: "norte", plural: "gobierno regional (Eeyou Istchee Baie-James)", censo: "GR" },
  reserve: { es: "Reserva indígena", en: "Réserve indienne", grupo: "indigena", plural: "reservas indígenas (réserves indiennes)", censo: "IRI" },
  etablissement: { es: "Establecimiento indígena", en: "Établissement indien", grupo: "indigena", plural: "establecimientos indígenas (établissements indiens)", censo: "S-É" },
  "terre-crie": { es: "Tierra reservada cri", en: "Terre réservée crie", grupo: "indigena", plural: "tierras reservadas cris (categoría I)", censo: "TC" },
  "terre-inuite": { es: "Tierra reservada inuit", en: "Terre réservée inuite", grupo: "indigena", plural: "tierras reservadas inuit (categoría I)", censo: "TI" },
  "terre-naskapie": { es: "Tierra reservada naskapi", en: "Terre réservée naskapie", grupo: "indigena", plural: "tierra reservada naskapi", censo: "TK" },
  tno: { es: "Territorio no organizado", en: "Territoire non organisé", grupo: "otro", plural: "territorios no organizados (TNO)", censo: "NO" },
  "municipio-disuelto": { es: "Municipio disuelto", en: "Municipalité dissoute", grupo: "comunidad", plural: "municipios disueltos (Statistics Canada)", dpl: "MDI" },
  "localidad-no-constituida": { es: "Localidad no constituida", en: "Localité non constituée", grupo: "comunidad", plural: "localidades no constituidas (Statistics Canada)", dpl: "LNC" },
  "antiguo-centro": { es: "Antiguo centro de población", en: "Retired population centre", grupo: "comunidad", plural: "antiguos centros de población (Statistics Canada)", dpl: "RPC" },
  "lieu-dit": { es: "Lugar con nombre (lieu-dit)", en: "Named Locality", grupo: "comunidad", plural: "lugares con nombre (lieux-dits)", gn: "Named Locality" },
  hameau: { es: "Aldea (hameau)", en: "Hamlet", grupo: "comunidad", plural: "aldeas (hameaux)", gn: "Hamlet" },
  "oficina-correos": { es: "Lugar con oficina de correos (nombre histórico)", en: "Post Office", grupo: "comunidad", plural: "lugares con nombre de oficina de correos", gn: "Post Office" },
  "zona-residencial": { es: "Zona residencial", en: "Residential Area", grupo: "comunidad", plural: "zonas residenciales", gn: "Residential Area" },
  sector: { es: "Sector (secteur)", en: "Administrative Sector", grupo: "comunidad", plural: "sectores (secteurs), a menudo antiguos municipios", gn: "Administrative Sector" },
  veraneo: { es: "Zona de veraneo (villégiature)", en: "Resort Area", grupo: "comunidad", plural: "zonas de veraneo (villégiature)", gn: "Resort Area" },
  "centro-veraneo": { es: "Centro de veraneo", en: "Resort", grupo: "comunidad", plural: "centros de veraneo", gn: "Resort" },
  barrio: { es: "Barrio (quartier)", en: "Neighbourhood", grupo: "comunidad", plural: "barrios (quartiers)", gn: "Neighbourhood" },
  arrondissement: { es: "Distrito municipal (arrondissement)", en: "Borough", grupo: "comunidad", plural: "distritos municipales (arrondissements)", gn: "Borough" },
  "parada-ferroviaria": { es: "Parada ferroviaria", en: "Railway Stop", grupo: "comunidad", plural: "paradas ferroviarias", gn: "Railway Stop" },
  localidad: { es: "Localidad", en: "Locality", grupo: "comunidad", plural: "localidades", gn: "Locality" },
  comunidad: { es: "Comunidad indígena (nombre geográfico)", en: "Cree, Naskapi or Amerindian settlement", grupo: "comunidad", plural: "comunidades indígenas registradas como nombre geográfico" },
  "pueblo-forestal": { es: "Pueblo forestal", en: "Forest Village", grupo: "comunidad", plural: "pueblos forestales", gn: "Forest Village" },
  fuerte: { es: "Fuerte", en: "Fort", grupo: "comunidad", plural: "fuertes", gn: "Fort" },
  "nombre-municipal": { es: "Nombre geográfico de municipio", en: "Municipality (geographical name)", grupo: "comunidad", plural: "nombres registrados como municipio que hoy no son una subdivisión censal" },
  "reserva-nombre": { es: "Reserva indígena (nombre geográfico)", en: "Indian Reserve", grupo: "comunidad", plural: "reservas registradas como nombre geográfico", gn: "Indian Reserve" },
};
export const GRUPOS = {
  urbano: "Ciudades (villes)",
  municipio: "Municipios, parroquias, cantones y villas",
  norte: "Comunidades del norte con estatuto municipal (inuit, cris y naskapi)",
  indigena: "Tierras de Primeras Naciones e inuit (clasificación del censo)",
  otro: "Territorios no organizados",
  comunidad: "Lugares, sectores y barrios (sin municipio propio)",
};
const ES_PAGINA = (t) => TIPOS[t].grupo !== "comunidad";

/* Nombres de la CGNDB que no designan un lugar habitado, o que son municipios o territorios ya cubiertos */
const GN_EXCLUIR = new Set(["Metro Station", "REM Station", "Railway Junction", "Railway Yard", "Station", "Ski Area", "Trailer Park", "Military Post Office", "Industrial Park", "Research Station", "Metropolitan Community Territory"]);
const GN_MUNICIPAL = new Set(["Municipality", "Town", "Village", "Parish Municipality", "Village Municipality", "Township Municipality", "United Townships Municipality", "Northern Village Municipality", "Cree Village Municipality", "Naskapi Village Municipality", "Regional Government"]);

/* Regiones económicas 2021 (coinciden con las regiones administrativas, salvo que la Encuesta de Población Activa
   publica juntas Côte-Nord y Nord-du-Québec) */
const REGIONES_ES = {
  2410: "Gaspésie–Îles-de-la-Madeleine",
  2415: "Bas-Saint-Laurent",
  2420: "Capitale-Nationale",
  2425: "Chaudière-Appalaches",
  2430: "Estrie",
  2433: "Centre-du-Québec",
  2435: "Montérégie",
  2440: "Montréal",
  2445: "Laval",
  2450: "Lanaudière",
  2455: "Laurentides",
  2460: "Outaouais",
  2465: "Abitibi-Témiscamingue",
  2470: "Mauricie",
  2475: "Saguenay–Lac-Saint-Jean",
  2480: "Côte-Nord",
  2490: "Nord-du-Québec",
};
const EPA_GEO = {
  2410: "Gaspésie-Îles-de-la-Madeleine, Quebec",
  2415: "Bas-Saint-Laurent, Quebec",
  2420: "Capitale-Nationale, Quebec",
  2425: "Chaudière-Appalaches, Quebec",
  2430: "Estrie, Quebec",
  2433: "Centre-du-Québec, Quebec",
  2435: "Montérégie, Quebec",
  2440: "Montréal, Quebec",
  2445: "Laval, Quebec",
  2450: "Lanaudière, Quebec",
  2455: "Laurentides, Quebec",
  2460: "Outaouais, Quebec",
  2465: "Abitibi-Témiscamingue, Quebec",
  2470: "Mauricie, Quebec",
  2475: "Saguenay-Lac-Saint-Jean, Quebec",
  2480: "Côte-Nord and Nord-du-Québec, Quebec",
  2490: "Côte-Nord and Nord-du-Québec, Quebec",
};
const EPA_ES = Object.fromEntries(Object.entries(EPA_GEO).map(([k, v]) => [v, k === "2480" || k === "2490" ? "Côte-Nord y Nord-du-Québec" : REGIONES_ES[k]]));

/* ---------- Estado municipal actual ----------
   Municipios con otro nombre en el Répertoire des municipalités (MAMH, 30-10-2026) que en el Censo 2021: se muestra
   el nombre actual y el del censo queda como variante de búsqueda. En las tierras indígenas se conserva el nombre del
   censo y el del répertoire se añade como variante. */
const RENOMBRADOS = new Set(["2478047", "2406035", "2409020", "2414045", "2456010", "2466142"]);

/* Fusiones posteriores al Censo 2021 (Répertoire des municipalités del MAMH, que da el nuevo código y la fecha de
   constitución, y comunicados del Gobierno de Quebec). La página sigue siendo la de la subdivisión del censo. */
const FUSIONES = {
  2414085: { nuevo: "14082", fuente: "avis" },
  2414090: { nuevo: "14082", fuente: "avis" },
  2414080: { nuevo: "14082", fuente: "avis" },
  2493020: { nuevo: "93022", fuente: "hebertville" },
  2493025: { nuevo: "93022", fuente: "hebertville" },
  2493030: { nuevo: "93022", fuente: "hebertville" },
  2413060: { nuevo: "13062", fuente: "lac-des-aigles" },
  2411020: { nuevo: "13062", fuente: "lac-des-aigles" },
  2430090: { nuevo: "29027" },
  2429025: { nuevo: "29027" },
  2488015: { nuevo: "88012" },
  2488010: { nuevo: "88012" },
  2432040: { nuevo: "32043" },
  2432045: { nuevo: "32043" },
  2488055: { nuevo: "88057" },
  2488060: { nuevo: "88057" },
  2482010: { nuevo: "80087", cambio: true },
};
const FUENTES_FUSION = {
  avis: { org: "Gobierno de Quebec", title: "Aviso de regroupement de la Ville de La Pocatière, de la Paroisse de Sainte-Anne-de-la-Pocatière y de Saint-Onésime-d'Ixworth (decreto 1046-2025)", url: "https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/justice/publications-adm/avis-publics/Avis_Regroupement_La_Pocatiere.pdf" },
  hebertville: { org: "Gobierno de Quebec", title: "Saint-Bruno, Hébertville y Hébertville-Station se reagrupan (comunicado)", url: "https://www.quebec.ca/nouvelles/actualites/details/saint-bruno-hebertville-et-hebertville-station-se-regroupent-et-consolident-leurs-services-67814" },
  "lac-des-aigles": { org: "Gobierno de Quebec", title: "Lac-des-Aigles y Saint-Guy forman la nueva Ville de Lac-des-Aigles el 31 de julio de 2024 (comunicado)", url: "https://www.quebec.ca/nouvelles/actualites/details/les-municipalites-de-lac-des-aigles-et-de-saint-guy-formeront-la-nouvelle-ville-de-lac-des-aigles-des-le-31-juillet-2024-57379" },
};

/* ---------- Hora ----------
   Loi sur le temps légal (RLRQ, c. T-5.1, vigente al 15-10-2026), artículos 1 y 2:
   - al oeste del meridiano 63° O y en toda la MRC de Minganie: hora del Este (UTC−5; UTC−4 de marzo a noviembre);
   - al este del meridiano 63° O: hora del Atlántico (UTC−4) todo el año;
   - Îles-de-la-Madeleine y la reserva de Listuguj: hora del Atlántico con horario de verano (UTC−4; UTC−3).
   El 28-10-2026 el Gobierno anunció que presentará un proyecto de ley para terminar con el cambio de hora; mientras la
   ley no cambie, el 1 de noviembre de 2026 se atrasan los relojes. */
const MINGANIE = new Set(["2498030", "2498035", "2498040", "2498020", "2498045", "2498025", "2498055", "2498050", "2498904"]);
export function zona(r) {
  if (r.cd === "2401" || r.c === "2406804") return { timeZone: "America/Halifax", texto: "Hora del Atlántico (UTC−4; UTC−3 con el horario de verano, de marzo a noviembre), según la Loi sur le temps légal de Quebec" };
  if (r.lon > -63 && !MINGANIE.has(r.c))
    return { timeZone: "America/Blanc-Sablon", texto: `Hora del Atlántico (UTC−4) todo el año, sin cambio de hora: la Loi sur le temps légal la fija para la parte de Quebec al este del meridiano 63° O${TIPOS[r.t].grupo === "indigena" ? ". Confirma la hora que usa la comunidad" : ""}` };
  return { timeZone: "America/Toronto", texto: `Hora del Este (UTC−5; UTC−4 con el horario de verano, del segundo domingo de marzo al primer domingo de noviembre)${r.cd === "2498" ? ": la Loi sur le temps légal la aplica a toda la MRC de Minganie" : ""}. El Gobierno de Quebec anunció el 28 de octubre de 2026 que quiere terminar con el cambio de hora; el 1 de noviembre de 2026 los relojes se atrasan` };
}

/* ---------- Fichas completas ----------
   Las 20 ciudades pedidas por la redacción y ocho centros regionales, para cubrir las 17 regiones administrativas.
   Organismos de integración: lista oficial del ministère de l'Immigration et de l'Intégration («Integration support
   services offered by partner community organizations», consultada el 30-10-2026), que indica las ciudades con
   oficina. Alquileres: CMHC (octubre de 2025), solo para las áreas urbanas de 10,000 habitantes o más. Hospitales:
   base ODHF de Statistics Canada (2020), con los nombres de instalación de esa base. Enlaces comprobados antes de
   publicar. */
const PARTNERS = { label: "Ministère de l'Immigration et de l'Intégration — Organismos asociados que ofrecen servicios de integración (filtrar por ciudad)", href: "https://www.quebec.ca/en/immigration/partners" };
const ACOMPANAMIENTO = { label: "Gobierno de Quebec — Accompagnement Québec, servicio gratuito de integración", href: "https://www.quebec.ca/en/immigration/integration-service-for-immigrants" };
const ARTM = { label: "ARTM — Tarifas del transporte público de la región de Montreal (zonas A, B, C y D)", href: "https://www.artm.quebec/en/fares/" };
const EXO = { label: "exo — Trenes y autobuses de la región metropolitana de Montreal", href: "https://exo.quebec/en" };
const SIN_TRANSPORTE = "No encontramos en el sitio de la ciudad una página de transporte urbano: consulta a la ciudad las opciones de transporte local.";
export const FICHAS = {
  montreal: {
    nombre: "Montréal",
    web: "https://montreal.ca/",
    cmhc: ["quebec", "Montréal CMA", "el área metropolitana de Montreal (CMA)"],
    transporte: [
      { label: "STM — Metro y autobuses de Montreal: tarifas", href: "https://www.stm.info/en/fares-pricing" },
      ARTM,
      { label: "REM — Réseau express métropolitain", href: "https://rem.info/en" },
    ],
    transporteNota: "La STM opera el metro y los autobuses de Montreal. En 2026, un viaje sencillo en la zona A cuesta $3.75 y el pase semanal, $33.25; los niños de 11 años o menos viajan gratis acompañados de una persona de 14 años o más. La ARTM fija las tarifas por zonas (A, B, C y D) en toda la región metropolitana.",
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, Montreal reúne los principales hospitales universitarios de la provincia, entre ellos el Centre hospitalier de l'Université de Montréal (CHUM), el Centre universitaire de santé McGill (CUSM), el Hôpital général juif, el Hôpital Maisonneuve-Rosemont, el Hôpital du Sacré-Cœur-de-Montréal y el CHU Sainte-Justine (pediatría).",
    servicios: [
      { label: "Location et logement (vivienda en alquiler)", href: "https://montreal.ca/location-et-logement" },
      { label: "Collectes et recyclage (recolección de residuos)", href: "https://montreal.ca/collectes-et-recyclage" },
      { label: "Taxes et évaluation foncière (impuestos municipales)", href: "https://montreal.ca/taxes-et-evaluation-fonciere" },
      { label: "Bibliothèques (bibliotecas)", href: "https://montreal.ca/bibliotheques" },
      { label: "Nous joindre (contacto y 311)", href: "https://montreal.ca/nous-joindre" },
    ],
  },
  quebec: {
    nombre: "Québec",
    web: "https://www.ville.quebec.qc.ca/",
    cmhc: ["quebec", "Québec CMA", "el área metropolitana de Quebec (CMA)"],
    transporte: [{ label: "Réseau de transport de la Capitale (RTC)", href: "https://www.rtcquebec.ca/en" }],
    agencias: true,
    ciudadInmigrantes: { label: "Ville de Québec — Immigrants (servicios para personas inmigrantes)", href: "https://www.ville.quebec.qc.ca/citoyens/immigrants/index.aspx" },
    hospital: "Según la base ODHF de Statistics Canada, en la ciudad están los hospitales del CHU de Québec – Université Laval (Hôpital de l'Enfant-Jésus, Hôpital Saint-François d'Assise, L'Hôtel-Dieu de Québec, CHUL y Hôpital du Saint-Sacrement) y el Institut universitaire de cardiologie et de pneumologie de Québec.",
    servicios: [
      { label: "Matières résiduelles (residuos)", href: "https://www.ville.quebec.qc.ca/citoyens/environnement/matieres-residuelles/index.aspx" },
      { label: "Taxes et évaluation (impuestos municipales)", href: "https://www.ville.quebec.qc.ca/citoyens/taxes_evaluation/index.aspx" },
      { label: "Loisirs et sports (recreación)", href: "https://www.ville.quebec.qc.ca/citoyens/loisirs_sports/index.aspx" },
      { label: "Bibliothèque de Québec", href: "https://www.bibliothequedequebec.qc.ca/" },
    ],
  },
  laval: {
    nombre: "Laval",
    web: "https://www.laval.ca/",
    cmhc: ["quebec", "Montréal CMA", "el área metropolitana de Montreal (CMA), de la que forma parte Laval"],
    transporte: [{ label: "Société de transport de Laval (STL) — Tarifas", href: "https://stlaval.ca/en/fares" }, ARTM],
    transporteNota: "Laval está conectada con Montreal por la línea naranja del metro (estaciones Cartier, De la Concorde y Montmorency) y por la red de autobuses de la STL. Las tarifas se fijan por zonas en toda la región metropolitana.",
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, el hospital general de Laval es el Hôpital de la Cité-de-la-Santé.",
    servicios: [],
    sitioBloqueado: true,
  },
  gatineau: {
    nombre: "Gatineau",
    web: "https://www.gatineau.ca/",
    cmhc: ["quebec", "Ottawa-Gatineau CMA (Qué. part)", "la parte quebequense del área metropolitana de Ottawa-Gatineau"],
    transporte: [{ label: "Société de transport de l'Outaouais (STO)", href: "https://www.sto.ca/en/" }],
    transporteNota: "Gatineau forma un área metropolitana con Ottawa (Ontario), al otro lado del río: mucha gente vive en una provincia y trabaja en la otra. Ten en cuenta que los servicios provinciales (salud, licencia, impuestos) dependen de la provincia donde resides.",
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, en Gatineau están el Hôpital de Gatineau y el Hôpital de Hull.",
    servicios: [{ label: "Pour nous joindre (contacto)", href: "https://www.gatineau.ca/portail/default.aspx?p=pour_nous_joindre" }],
  },
  longueuil: {
    nombre: "Longueuil",
    web: "https://longueuil.quebec/",
    cmhc: ["quebec", "Montréal CMA", "el área metropolitana de Montreal (CMA), de la que forma parte Longueuil"],
    transporte: [{ label: "Réseau de transport de Longueuil (RTL)", href: "https://www.rtl-longueuil.qc.ca/en" }, { label: "Longueuil — Transport collectif", href: "https://longueuil.quebec/fr/services/mobilite/transport-collectif" }, ARTM],
    transporteNota: "Longueuil está conectada con Montreal por la línea amarilla del metro (estación Longueuil–Université-de-Sherbrooke) y por los autobuses del RTL.",
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, en Longueuil están el Hôpital Charles-LeMoyne y el Hôpital Pierre-Boucher.",
    servicios: [
      { label: "Matières résiduelles et collectes (residuos)", href: "https://longueuil.quebec/fr/services/matieres-residuelles-et-collectes" },
      { label: "Taxes (impuestos municipales)", href: "https://longueuil.quebec/fr/services/taxes" },
      { label: "Bibliothèques (bibliotecas)", href: "https://longueuil.quebec/fr/bibliotheques" },
    ],
  },
  sherbrooke: {
    nombre: "Sherbrooke",
    web: "https://www.sherbrooke.ca/",
    cmhc: ["quebec", "Sherbrooke CMA", "el área metropolitana de Sherbrooke (CMA)"],
    transporte: [{ label: "Société de transport de Sherbrooke (STS)", href: "https://www.sts.qc.ca/" }],
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, en Sherbrooke están el Centre hospitalier universitaire de Sherbrooke (CHUS), con el Hôpital Fleurimont, y el Hôtel-Dieu de Sherbrooke.",
    servicios: [
      { label: "Calendrier des collectes (recolección)", href: "https://www.sherbrooke.ca/fr/services-a-la-population/collecte-des-matieres-residuelles/calendrier-des-collectes" },
      { label: "Bibliothèques (bibliotecas)", href: "https://bibliotheques.sherbrooke.ca/" },
      { label: "Nous joindre (contacto)", href: "https://www.sherbrooke.ca/fr/nous-joindre" },
    ],
  },
  saguenay: {
    nombre: "Saguenay",
    web: "https://ville.saguenay.ca/",
    cmhc: ["quebec", "Saguenay CMA", "el área metropolitana de Saguenay (CMA)"],
    transporte: [{ label: "Société de transport du Saguenay (STS)", href: "https://www.stsaguenay.ca/" }],
    agencias: true,
    agenciasNota: "En la lista oficial, la ciudad figura con los nombres de sus sectores: Ville Saguenay, Jonquière y La Baie.",
    hospital: "Según la base ODHF de Statistics Canada, en Saguenay están el Hôpital de Chicoutimi, el Hôpital de Jonquière y el Hôpital de La Baie.",
    servicios: [
      { label: "Activités et loisirs (recreación)", href: "https://ville.saguenay.ca/activites-et-loisirs" },
      { label: "Nous joindre (contacto)", href: "https://ville.saguenay.ca/nous-joindre" },
    ],
  },
  levis: {
    nombre: "Lévis",
    web: "https://levis.ca/",
    cmhc: ["quebec", "Québec CMA", "el área metropolitana de Quebec (CMA), de la que forma parte Lévis"],
    transporte: [{ label: "Société de transport de Lévis (STLévis)", href: "https://www.stlevis.ca/" }],
    transporteNota: "Lévis está frente a la ciudad de Quebec, al otro lado del río San Lorenzo; un transbordador (traversier Québec-Lévis) une las dos ciudades.",
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, el hospital de la ciudad es el Hôtel-Dieu de Lévis.",
    servicios: [
      { label: "Loisirs et communauté (recreación)", href: "https://levis.ca/fr/loisirs-et-communaute" },
      { label: "Bibliothèques (bibliotecas)", href: "https://levis.ca/fr/loisirs-et-communaute/bibliotheques" },
    ],
  },
  "trois-rivieres": {
    nombre: "Trois-Rivières",
    web: "https://www.v3r.net/",
    cmhc: ["quebec", "Trois-Rivières CMA", "el área metropolitana de Trois-Rivières (CMA)"],
    transporte: [{ label: "Société de transport de Trois-Rivières (STTR)", href: "https://sttr.qc.ca/" }],
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, el hospital regional es el Centre hospitalier régional de Trois-Rivières (CHAUR), con su pabellón Sainte-Marie.",
    servicios: [
      { label: "Portail citoyen d'évaluation et de taxation (impuestos)", href: "https://services.v3r.net/PortailEvaluationTaxation" },
      { label: "Bibliothèques (bibliotecas)", href: "https://www.v3r.net/activites-et-loisirs/bibliotheques" },
    ],
  },
  terrebonne: {
    nombre: "Terrebonne",
    web: "https://terrebonne.ca/",
    cmhc: ["quebec", "Montréal CMA", "el área metropolitana de Montreal (CMA), de la que forma parte Terrebonne"],
    transporte: [{ label: "Terrebonne — Transport", href: "https://terrebonne.ca/transport/" }, EXO, ARTM],
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, en Terrebonne está el Hôpital Pierre-Le Gardeur.",
    servicios: [
      { label: "Collectes (recolección)", href: "https://terrebonne.ca/collectes/" },
      { label: "Taxes et rôle foncier (impuestos)", href: "https://terrebonne.ca/info-taxes/" },
      { label: "Bibliothèques (bibliotecas)", href: "https://terrebonne.ca/bibliotheques/" },
      { label: "Nous joindre (contacto)", href: "https://terrebonne.ca/nous-joindre/" },
    ],
  },
  "saint-jean-sur-richelieu": {
    nombre: "Saint-Jean-sur-Richelieu",
    web: "https://sjsr.ca/",
    cmhc: null,
    transporte: [EXO],
    agencias: false,
    ciudadInmigrantes: { label: "Saint-Jean-sur-Richelieu — Immigrant ou issu de la diversité culturelle", href: "https://sjsr.ca/immigration/" },
    hospital: "Según la base ODHF de Statistics Canada, el hospital de la ciudad es el Hôpital du Haut-Richelieu.",
    servicios: [
      { label: "Collectes et matières résiduelles (residuos)", href: "https://sjsr.ca/environnement/matieres-residuelles/" },
      { label: "Taxes (impuestos municipales)", href: "https://sjsr.ca/finances-municipales/taxes/" },
      { label: "Bibliothèques (bibliotecas)", href: "https://sjsr.ca/bibliotheques/" },
    ],
  },
  repentigny: {
    nombre: "Repentigny",
    web: "https://repentigny.ca/",
    cmhc: ["quebec", "Montréal CMA", "el área metropolitana de Montreal (CMA), de la que forma parte Repentigny"],
    transporte: [EXO, ARTM],
    agencias: true,
    hospital: "La base ODHF de Statistics Canada no ubica un hospital general dentro de Repentigny; el más cercano de la base es el Hôpital Pierre-Le Gardeur, en Terrebonne.",
    servicios: [
      { label: "Culture et loisirs (recreación)", href: "https://repentigny.ca/culture-loisirs" },
      { label: "Bibliothèques (bibliotecas)", href: "https://repentigny.ca/culture-loisirs/culture/bibliotheques" },
    ],
  },
  brossard: {
    nombre: "Brossard",
    web: "https://brossard.ca/",
    cmhc: ["quebec", "Montréal CMA", "el área metropolitana de Montreal (CMA), de la que forma parte Brossard"],
    transporte: [{ label: "Réseau de transport de Longueuil (RTL)", href: "https://www.rtl-longueuil.qc.ca/en" }, { label: "REM — Réseau express métropolitain", href: "https://rem.info/en" }, ARTM],
    transporteNota: "Brossard tiene estaciones del REM, el tren ligero que la une con el centro de Montreal.",
    agencias: true,
    hospital: "La base ODHF de Statistics Canada no ubica un hospital general dentro de Brossard; los más cercanos de la base están en Longueuil (Hôpital Charles-LeMoyne).",
    servicios: [
      { label: "Logement et voisinage (vivienda)", href: "https://brossard.ca/logement-et-voisinage/" },
      { label: "Collectes et écocentres (residuos)", href: "https://brossard.ca/collecte-des-matieres-residuelles/" },
      { label: "Taxes, eau et évaluation (impuestos)", href: "https://brossard.ca/taxes-eau-et-evaluation/" },
      { label: "Bibliothèque de Brossard", href: "https://biblio.brossard.ca/" },
    ],
  },
  drummondville: {
    nombre: "Drummondville",
    web: "https://www.drummondville.ca/",
    cmhc: ["quebec", "Drummondville CMA", "el área metropolitana de Drummondville (CMA)"],
    transporte: [{ label: "Drummondville — Réseau de transport de Drummondville", href: "https://www.drummondville.ca/citoyens/projets-majeurs/reseau-de-transport-de-drummondville/" }],
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, el hospital de la ciudad es el Hôpital Sainte-Croix.",
    servicios: [
      { label: "Collectes et matières résiduelles (residuos)", href: "https://www.drummondville.ca/citoyens/environnement/collectes-bacs-rebuts/" },
      { label: "Taxation et évaluation (impuestos)", href: "https://www.drummondville.ca/citoyens/taxation-et-evaluation/" },
      { label: "Bibliothèque (biblioteca)", href: "https://www.drummondville.ca/culture-loisirs-et-sports/bibliotheque/" },
    ],
  },
  "saint-jerome": {
    nombre: "Saint-Jérôme",
    web: "https://www.vsj.ca/",
    cmhc: ["quebec", "Montréal CMA", "el área metropolitana de Montreal (CMA), de la que forma parte Saint-Jérôme"],
    transporte: [EXO, ARTM],
    transporteNota: "Saint-Jérôme es la terminal de la línea de tren de exo que va a Montreal.",
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, el hospital de la ciudad es el Hôpital régional de Saint-Jérôme.",
    servicios: [
      { label: "Collectes (recolección)", href: "https://www.vsj.ca/collectes/" },
      { label: "Bibliothèques (bibliotecas)", href: "https://www.vsj.ca/bibliotheques/" },
      { label: "Nous joindre (contacto)", href: "https://www.vsj.ca/nous-joindre/" },
    ],
  },
  granby: {
    nombre: "Granby",
    web: "https://www.granby.ca/",
    cmhc: ["quebec", "Granby CA", "la aglomeración de Granby"],
    transporte: [],
    transporteNota: SIN_TRANSPORTE,
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, el hospital de la ciudad es el Hôpital de Granby.",
    servicios: [
      { label: "Collectes des matières résiduelles (residuos)", href: "https://genedejeter.com" },
      { label: "Bibliothèque Paul-O.-Trépanier (biblioteca)", href: "https://www.granby.ca/fr/loisirs/bibliotheque-paul-o-trepanier" },
    ],
  },
  rimouski: {
    nombre: "Rimouski",
    web: "https://rimouski.ca/",
    cmhc: ["quebec", "Rimouski CA", "la aglomeración de Rimouski"],
    transporte: [],
    transporteNota: SIN_TRANSPORTE,
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, el hospital de la ciudad es el Hôpital régional de Rimouski.",
    servicios: [
      { label: "Activités et vie de quartier (recreación)", href: "https://rimouski.ca/loisirs-culture/activites" },
      { label: "Bibliothèques (bibliotecas)", href: "https://biblio.rimouski.ca" },
    ],
  },
  victoriaville: {
    nombre: "Victoriaville",
    web: "https://victoriaville.ca/",
    cmhc: ["quebec", "Victoriaville CA", "la aglomeración de Victoriaville"],
    transporte: [{ label: "Victoriaville — Transport collectif et mobilité", href: "https://victoriaville.ca/transport-collectif" }],
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, el hospital de la ciudad es el Hôtel-Dieu d'Arthabaska.",
    servicios: [
      { label: "Collectes et points de dépôt (residuos)", href: "https://victoriaville.ca/collectes-et-points-de-depot" },
      { label: "Taxes et évaluation foncière (impuestos)", href: "https://victoriaville.ca/taxes-et-evaluation-fonciere" },
      { label: "Nous joindre (contacto)", href: "https://victoriaville.ca/a-propos-de-la-ville/nous-joindre" },
    ],
  },
  "rouyn-noranda": {
    nombre: "Rouyn-Noranda",
    web: "https://www.rouyn-noranda.ca/",
    cmhc: ["quebec", "Rouyn-Noranda CA", "la aglomeración de Rouyn-Noranda"],
    transporte: [{ label: "Rouyn-Noranda — Autobús urbano", href: "https://www.rouyn-noranda.ca/citoyens/transports/autobus" }],
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, el hospital de la ciudad es el Hôpital de Rouyn-Noranda.",
    servicios: [
      { label: "Logement (vivienda)", href: "https://www.rouyn-noranda.ca/citoyens/services-aux-citoyens/logement" },
      { label: "Collectes et matières résiduelles (residuos)", href: "https://www.rouyn-noranda.ca/citoyens/environnement/collectes-et-matieres-residuelles" },
    ],
  },
  "val-d-or": {
    nombre: "Val-d'Or",
    web: "https://www.ville.valdor.qc.ca/",
    cmhc: ["quebec", "Val-d'Or CA", "la aglomeración de Val-d'Or"],
    transporte: [],
    transporteNota: SIN_TRANSPORTE,
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, el hospital de la ciudad es el Hôpital de Val-d'Or.",
    servicios: [
      { label: "Bibliothèques municipales (bibliotecas)", href: "https://www.ville.valdor.qc.ca/culture-sports-loisirs/bibliotheques-1" },
      { label: "Carte Accès (recreación)", href: "https://www.ville.valdor.qc.ca/culture-sports-loisirs/activites/carte-acces" },
    ],
  },
  "saint-hyacinthe": {
    nombre: "Saint-Hyacinthe",
    web: "https://www.st-hyacinthe.ca/",
    cmhc: ["quebec", "Saint-Hyacinthe CA", "la aglomeración de Saint-Hyacinthe"],
    transporte: [],
    transporteNota: SIN_TRANSPORTE,
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, el hospital de la ciudad es el Hôpital Honoré-Mercier.",
    servicios: [
      { label: "Activités (recreación)", href: "https://www.st-hyacinthe.ca/loisirs-et-culture/activites" },
      { label: "Contactez-nous (contacto)", href: "https://www.st-hyacinthe.ca/contactez-nous" },
    ],
  },
  shawinigan: {
    nombre: "Shawinigan",
    web: "https://www.shawinigan.ca/",
    cmhc: ["quebec", "Shawinigan CA", "la aglomeración de Shawinigan"],
    transporte: [],
    transporteNota: SIN_TRANSPORTE,
    agencias: true,
    ciudadInmigrantes: { label: "Shawinigan — Services aux nouveaux arrivants", href: "https://www.shawinigan.ca/affaires/nouveaux-arrivants/" },
    hospital: "Según la base ODHF de Statistics Canada, el hospital de la ciudad es el Hôpital du Centre-de-la-Mauricie.",
    servicios: [
      { label: "Bibliothèques (bibliotecas)", href: "https://biblio.shawinigan.ca" },
      { label: "Nous joindre (contacto)", href: "https://shawinigan.ca/nous-joindre/" },
    ],
  },
  "sept-iles": {
    nombre: "Sept-Îles",
    web: "https://www.septiles.ca/",
    cmhc: ["quebec", "Sept-Îles CA", "la aglomeración de Sept-Îles"],
    transporte: [{ label: "Sept-Îles — Transport", href: "https://www.septiles.ca/fr/transport_75/" }],
    agencias: true,
    ciudadInmigrantes: { label: "Sept-Îles — Nouveaux arrivants", href: "https://www.septiles.ca/fr/nouveaux-arrivants_59/" },
    hospital: "Según la base ODHF de Statistics Canada, el hospital de la ciudad es el Hôpital de Sept-Îles.",
    servicios: [
      { label: "Taxes et évaluation (impuestos)", href: "http://www.septiles.ca/fr/evaluation-et-taxes_283/" },
      { label: "Matières résiduelles (residuos)", href: "https://www.septiles.ca/fr/matieres-residuelles_194/" },
      { label: "Nous joindre (contacto)", href: "https://www.septiles.ca/fr/nous-joindre_102/" },
    ],
  },
  "riviere-du-loup": {
    nombre: "Rivière-du-Loup",
    web: "https://villerdl.ca/",
    cmhc: ["quebec", "Rivière-du-Loup CA", "la aglomeración de Rivière-du-Loup"],
    transporte: [],
    transporteNota: SIN_TRANSPORTE,
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, el hospital de la ciudad es el Centre hospitalier régional du Grand-Portage.",
    servicios: [{ label: "Mes loisirs en ligne (recreación)", href: "https://loisirs.villerdl.ca/" }],
  },
  gaspe: {
    nombre: "Gaspé",
    web: "https://ville.gaspe.qc.ca/",
    cmhc: ["quebec", "Gaspé V", "la ciudad de Gaspé"],
    transporte: [],
    transporteNota: SIN_TRANSPORTE,
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, el hospital de la ciudad es el Hôtel-Dieu de Gaspé.",
    servicios: [
      { label: "Loisirs, sports et culture (recreación)", href: "https://ville.gaspe.qc.ca/loisirs-sports-culture" },
      { label: "Répertoire des organismes (organismos comunitarios)", href: "https://ville.gaspe.qc.ca/loisirs-sports-culture/organismes/repertoire-des-organismes" },
    ],
  },
  alma: {
    nombre: "Alma",
    web: "https://www.ville.alma.qc.ca/",
    cmhc: ["quebec", "Alma CA", "la aglomeración de Alma"],
    transporte: [{ label: "Alma — Go Taxibus (transporte colectivo)", href: "https://www.ville.alma.qc.ca/transports-en-commun/" }],
    agencias: true,
    ciudadInmigrantes: { label: "Alma — Accueil et intégration des nouveaux arrivants", href: "https://www.ville.alma.qc.ca/nouveauxarrivants/" },
    hospital: "Según la base ODHF de Statistics Canada, el hospital de la ciudad es el Hôpital d'Alma.",
    servicios: [
      { label: "Taxes municipales (impuestos)", href: "https://www.ville.alma.qc.ca/taxes/" },
      { label: "Bibliothèques (bibliotecas)", href: "https://www.ville.alma.qc.ca/biblio/" },
      { label: "Nous joindre (contacto)", href: "https://www.ville.alma.qc.ca/nous-joindre/" },
    ],
  },
  joliette: {
    nombre: "Joliette",
    web: "https://www.joliette.ca/",
    cmhc: ["quebec", "Joliette CA", "la aglomeración de Joliette"],
    transporte: [],
    transporteNota: SIN_TRANSPORTE,
    agencias: true,
    hospital: "Según la base ODHF de Statistics Canada, el hospital regional es el Centre hospitalier régional de Lanaudière, en el vecino municipio de Saint-Charles-Borromée.",
    servicios: [
      { label: "Taxes et évaluation (impuestos)", href: "https://www.joliette.ca/la-ville/administration-et-finances/taxes-et-evaluation" },
      { label: "Bibliothèque Rina-Lasnier (biblioteca)", href: "https://www.joliette.ca/loisirs-et-culture/culture-et-patrimoine/bibliotheque-rina-lasnier" },
    ],
  },
  chibougamau: {
    nombre: "Chibougamau",
    web: "https://www.ville.chibougamau.qc.ca/",
    cmhc: null,
    transporte: [],
    transporteNota: SIN_TRANSPORTE,
    agencias: false,
    hospital: "Según la base ODHF de Statistics Canada, en Chibougamau está el centro de salud del Centre régional de santé et de services sociaux de la Baie-James, que atiende a la región.",
    servicios: [],
  },
};

/* Base ODEF: nombres con «?» en lugar de la letra acentuada; corrección explícita (null: irrecuperable, no se muestra) */
const ESCUELAS_NOMBRES = {
  "Polyvalente Monseigneur S?vigny": "Polyvalente Monseigneur Sévigny",
  "R?gionale H?ritage, secondaire": "Régionale Héritage, secondaire",
  "Acad?mie de Knowlton": "Académie de Knowlton",
  "Ch?teauguay Valley": "Châteauguay Valley",
  "Sainte-Ad?le Elementary School": "Sainte-Adèle Elementary School",
  "Rosem?re High School": "Rosemère High School",
  "G?rald McShane": "Gérald McShane",
  "?table": null,
  "R?gionale Centennial, secondaire": "Régionale Centennial, secondaire",
  "Phil?mon-Wright": "Philémon-Wright",
  "Gilbert Th?berge": "Gilbert Théberge",
  "Centre ?ducatif de Fermont": "Centre éducatif de Fermont",
  "Honor? Mercier": "Honoré Mercier",
  "Gasp? Elementary School": "Gaspé Elementary School",
  "Grosse-?le High School": "Grosse-Île High School",
  "Cit? ?tudiante de la Haute-Gatineau": "Cité étudiante de la Haute-Gatineau",
  "Nouvelle ?cole primaire Wakefield": "Nouvelle école primaire Wakefield",
};

/* ---------- Fuentes ---------- */
export const FUENTES = {
  csd: { org: "Statistics Canada", title: "Límites cartográficos del Censo 2021 — subdivisiones censales, divisiones censales, regiones económicas y lugares designados", url: "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21" },
  censo: { org: "Statistics Canada", title: "Tabla 98-10-0002-01 — Población y viviendas, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000201" },
  dpl: { org: "Statistics Canada", title: "Tabla 98-10-0012-01 — Población de los lugares designados, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810001201" },
  nombres: { org: "Recursos Naturales Canadá", title: "Base de datos de nombres geográficos de Canadá (CGNDB) — Quebec", url: "https://natural-resources.canada.ca/earth-sciences/geography/download-geographical-names-data/9245" },
  municipios: { org: "Gobierno de Quebec (ministère des Affaires municipales et de l'Habitation)", title: "Répertoire des municipalités du Québec (Données Québec, CC BY 4.0, actualizado el 30 de octubre de 2026)", url: "https://www.donneesquebec.ca/recherche/dataset/repertoire-des-municipalites-du-quebec" },
  epa: { org: "Statistics Canada", title: "Tabla 14-10-0393-01 — Características de la población activa por región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410039301" },
  industrias: { org: "Statistics Canada", title: "Tabla 14-10-0392-01 — Empleo por industria y región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410039201" },
  cmhc: { org: "CMHC", title: "Rental Market Survey 2025 — tablas de datos (Quebec)", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
  escuelas: { org: "Statistics Canada", title: "Open Database of Educational Facilities (ODEF), versión 2.1 (2022)", url: "https://www.statcan.gc.ca/en/lode/databases/odef" },
  hospitales: { org: "Statistics Canada", title: "Open Database of Healthcare Facilities (ODHF), versión 1.1 (2020)", url: "https://www.statcan.gc.ca/en/lode/databases/odhf" },
  hora: { org: "Gobierno de Quebec", title: "Loi sur le temps légal (RLRQ, c. T-5.1), vigente al 15 de octubre de 2026", url: "https://www.legisquebec.gouv.qc.ca/fr/document/lc/T-5.1" },
  horaAnuncio: { org: "Gobierno de Quebec", title: "Le gouvernement du Québec souhaite mettre fin au changement d'heure (comunicado del 28 de octubre de 2026)", url: "https://www.quebec.ca/nouvelles/actualites/details/le-gouvernement-du-quebec-souhaite-mettre-fin-au-changement-dheure-72823" },
  partners: { org: "Gobierno de Quebec (ministère de l'Immigration et de l'Intégration)", title: "Integration support services offered by partner community organizations", url: "https://www.quebec.ca/en/immigration/partners" },
};
const RECURSOS = {
  empleo: [
    { label: "Gobierno de Quebec — Ver ofertas de empleo en Québec emploi", href: "https://www.quebec.ca/en/employment/find-job-internship/view-job-offers" },
    { label: "Job Bank — Buscar empleo en Quebec", href: "https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=Quebec" },
    { label: "Services Québec — Buscar una oficina (ayuda para el empleo)", href: "https://www.localisateur.servicesquebec.gouv.qc.ca/" },
  ],
  escuelas: [
    { label: "Gobierno de Quebec — Escuelas preescolares, primarias y secundarias", href: "https://www.quebec.ca/en/education/preschool-elementary-and-secondary-schools" },
    { label: "Gobierno de Quebec — Inscribir a tus hijos en la escuela (hoja para padres inmigrantes, en francés)", href: "https://cdn-contenu.quebec.ca/cdn-contenu/education/integration-education-interculturelle/Feuillet-parents-immigrants-francais.pdf" },
  ],
  salud: [
    { label: "Info-Santé 811 — Consejos de salud las 24 horas", href: "https://www.quebec.ca/en/health/finding-a-resource/info-sante-811" },
    { label: "Gobierno de Quebec — Primary Care Access Point (GAP) si no tienes médico de familia", href: "https://www.quebec.ca/en/health/finding-a-resource/primary-care-access-point" },
    { label: "Gobierno de Quebec — Guichet d'accès à un médecin de famille (inscripción)", href: "https://www.quebec.ca/en/health/finding-a-resource/quebec-family-doctor-finder" },
    { label: "RAMQ — Obtener tu tarjeta del seguro de salud", href: "https://www.ramq.gouv.qc.ca/en/citizens/health-insurance/register" },
  ],
  recienLlegados: [
    { label: "IRCC — Servicios gratuitos para recién llegados cerca de ti", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" },
  ],
  familias: [
    { label: "Gobierno de Quebec — Portal de inscripción en guarderías (Portail d'inscription aux services de garde)", href: "https://www.quebec.ca/en/family-and-support-for-individuals/childhood/childcare-centres/registration-portal/" },
    { label: "Gobierno de Quebec — Tarifas de las guarderías (en francés)", href: "https://www.quebec.ca/famille-et-soutien-aux-personnes/enfance/garderies-et-services-de-garde/tarifs" },
    { label: "Gobierno de Quebec — Régime québécois d'assurance parentale (RQAP)", href: "https://www.rqap.gouv.qc.ca/en" },
    { label: "CRA — Cómo solicitar la Canada Child Benefit", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit/how-apply.html" },
  ],
  vivienda: [
    { label: "Tribunal administratif du logement (TAL) — Ser inquilino (en inglés)", href: "https://www.tal.gouv.qc.ca/en/being-a-lessee" },
    { label: "TAL — Aumento del alquiler al renovar el contrato", href: "https://www.tal.gouv.qc.ca/en/renewal-of-the-lease-and-fixing-of-rent/rent-increase" },
  ],
};

/* ---------- Carga ---------- */
export function cargar(root) {
  const L = cargarCenso(root, {
    archivo: "qc-localidades.json",
    provincia: PROV,
    TIPOS,
    gnExtra: { "Cree Village": "comunidad", "Naskapi Village": "comunidad", "Amerindian Settlement": "comunidad" },
    gnMunicipal: GN_MUNICIPAL,
    gnExcluir: GN_EXCLUIR,
    ordenGn: ["Indian Reserve", "Cree Village", "Naskapi Village", "Amerindian Settlement", "Borough", "Administrative Sector", "Hamlet", "Named Locality", "Locality", "Neighbourhood", "Residential Area", "Resort Area", "Resort", "Forest Village", "Fort", "Railway Stop", "Post Office"],
    nombreVisible: nombresActuales(root),
    prioridad: { urbano: 0, municipio: 1, norte: 2, indigena: 3, otro: 4 },
    fichas: FICHAS,
    tiposFicha: ["ville"],
    hospitales: {},
    escuelasNombres: ESCUELAS_NOMBRES,
  });
  L.regiones = Object.fromEntries(Object.keys(L.regiones).map((k) => [k, REGIONES_ES[k] || L.regiones[k]]));
  const filas = (L.mamh && L.mamh.filas) || {};
  for (const r of L.items) {
    if (!ES_PAGINA(r.t)) continue;
    const m = filas[r.c.slice(2)];
    r.mamh = m ? Object.fromEntries(L.mamh.campos.map((k, i) => [k, m[i]])) : null;
    if (m && TIPOS[r.t].grupo === "indigena" && m[0] !== r.n) r.alias = [...new Set([...r.alias, m[0]])];
    const fu = FUSIONES[r.c];
    if (fu) {
      const n = filas[fu.nuevo];
      if (!n) throw new Error(`Quebec: fusión sin el municipio resultante en el répertoire: ${r.n} → ${fu.nuevo}`);
      r.fusion = { ...fu, nombre: n[0], designacion: n[1], constitucion: n[6] };
    }
  }
  return L;
}

/* Nombre actual (répertoire del MAMH) de los municipios renombrados después del Censo 2021 */
let _nombres = null;
function nombresActuales(root) {
  if (_nombres) return _nombres;
  const J = JSON.parse(readFileSync(join(root, "scripts/canada-en-datos/qc-localidades.json"), "utf8"));
  const censo = Object.fromEntries(J.csd.map((c) => [c[0], c[1]]));
  _nombres = {};
  for (const c of RENOMBRADOS) {
    const m = J.mamh.filas[c.slice(2)];
    if (!m || !censo[c]) throw new Error(`Quebec: municipio renombrado inexistente: ${c}`);
    _nombres[c] = [m[0], null, [censo[c]]];
  }
  return _nombres;
}
/* ---------- Textos del directorio en la ficha provincial ---------- */
const directorio = {
  origen: "Statistics Canada: Censo 2021 (subdivisiones censales, lugares designados y divisiones censales); Recursos Naturales Canadá: Base de datos de nombres geográficos de Canadá; Gobierno de Quebec: Répertoire des municipalités",
  poblacion: "Censo 2021",
  regiones: "17 regiones",
  regionEtiqueta: "Región",
  subregion: "MRC o territorio equivalente (división censal)",
  tipoEtiqueta: "Tipo de localidad",
  ejemplo: "Sherbrooke",
  extendido: true,
  notaFichas: "Las demás localidades tienen, por ahora, una página con información básica: designación oficial, MRC o territorio equivalente, población del Censo 2021, estado municipal actual según el répertoire del Gobierno de Quebec, empleo de su región, escuelas, hora legal y enlaces oficiales. Iremos completándolas.",
  intro: (L) => {
    const n = (...g) => L.items.filter((r) => g.includes(TIPOS[r.t].grupo)).length;
    return `<p>Investiga las localidades de Quebec antes de decidir dónde vivir, trabajar o estudiar. El directorio reúne <strong>${miles(n("urbano", "municipio", "norte", "indigena", "otro"))} subdivisiones censales</strong> del Censo 2021, que cubren toda la provincia, y <strong>${miles(n("comunidad"))} lugares, sectores y barrios</strong> con nombre oficial que forman parte de ellas.</p>
      <ul class="cd-list-items">
        <li><strong>Municipios locales</strong>, con su designación oficial en francés: ciudades (villes), municipios (municipalités), parroquias (paroisses), cantones (cantons) y villas (villages). La designación es un nombre jurídico: una «paroisse» o un «village» es hoy un municipio como cualquier otro.</li>
        <li><strong>Comunidades del norte</strong>: las 14 villas nórdicas inuit de Nunavik, las villas cris y la villa naskapi, y el gobierno regional Eeyou Istchee Baie-James.</li>
        <li><strong>Tierras de Primeras Naciones e inuit</strong>, con su clasificación en el censo. Se respetan sus nombres oficiales.</li>
        <li><strong>Territorios no organizados (TNO)</strong>, zonas sin municipio propio.</li>
        <li><strong>Lugares, sectores y barrios</strong>: no son municipios; aparecen dentro de la subdivisión en la que están, por ejemplo los distritos municipales (arrondissements) de Montreal o los sectores de ciudades que se fusionaron.</li>
      </ul>
      <p>Las 98 municipalidades regionales de condado (MRC) y territorios equivalentes son el filtro de división censal: agrupan municipios y no se cuentan como localidades.</p>`;
  },
  nota: (L) =>
    `Total: ${miles(L.items.length)} localidades. Las páginas siguen la geografía del Censo 2021: cuando dos o más municipios se fusionaron después, cada página lo indica con el municipio actual según el Répertoire des municipalités del Gobierno de Quebec (por ejemplo, La Pocatière en 2025 y Hébertville en 2026). La población de los lugares designados ya está incluida en la de la subdivisión censal que los contiene: no se suma. Los nombres de la Base de datos de nombres geográficos de Canadá no tienen cifras de población propias. Las regiones son las 17 regiones económicas de Statistics Canada, que en Quebec coinciden con las regiones administrativas; la Encuesta de Población Activa publica juntas Côte-Nord y Nord-du-Québec. No hay un inventario oficial completo de asentamientos sin nombre registrado.`,
  fuentes: (L, esc) => `Fuentes: ${fuente(FUENTES.csd, esc)}; ${fuente(FUENTES.censo, esc)}; ${fuente(FUENTES.dpl, esc)}; ${fuente(FUENTES.nombres, esc)}; ${fuente(FUENTES.municipios, esc)}. Consultado el ${esc(fechaEs(L.meta.consultado))}.`,
};

/* ---------- Contenido de cada ficha ---------- */
function filaCmhc(L, archivo, centro, hoja_) {
  const t = (L.cmhc[archivo] && L.cmhc[archivo].hojas[hoja_]) || [];
  return t.find((f) => f[0] === centro) || null;
}
const decimal = (v) => { const [e, d] = String(v).split("."); return miles(e) + (d ? `.${d}` : ""); };
const fechaIso = (s) => (/^\d{4}-\d\d-\d\d$/.test(s || "") ? fechaEs(s) : s);
/* Sitio del répertoire: sin espacios, y con punto donde el répertoire tiene una coma (p. ej., «msvalere.qc,ca») */
const web = (u) => {
  const s = u.trim().replace(/,/g, ".");
  return /^https?:\/\//.test(s) ? s : `https://${s}`;
};

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
  const m = r.mamh;
  const z = zona(r);

  const titulo = r.ficha ? `${nombre}, Quebec: guía para inmigrantes y recién llegados` : `${nombre}, Quebec: información básica`;
  const que = { urbano: "una ciudad", municipio: "un municipio", norte: "una comunidad del norte con estatuto municipal", indigena: "una tierra de Primera Nación o inuit", otro: "un territorio no organizado" }[grupo];
  const descripcion = r.ficha
    ? `${nombre} (Quebec) en datos: población, empleo, alquileres, escuelas, hospitales, transporte, francés y servicios para recién llegados, con fuentes oficiales.`
    : `${nombre} es ${que} de Quebec (${r.division}). Clasificación oficial, población del Censo 2021, estado municipal actual y enlaces oficiales.`;

  /* --- Datos rápidos --- */
  const pob = typeof r.p === "number"
    ? `${miles(r.p)} <small class="cd-fact__period">Censo 2021${r.p16 != null ? `; Censo 2016: ${miles(r.p16)}${r.cambio != null ? ` (${r.cambio >= 0 ? "+" : ""}${r.cambio}%)` : ""}` : ""}</small>`
    : `${NO_DISPONIBLE} <small class="cd-fact__period">Statistics Canada no publica la población de esta subdivisión en el Censo 2021 (enumeración incompleta o subdivisión sin población).</small>`;
  const actual = r.fusion
    ? `Desde el ${esc(fechaIso(r.fusion.constitucion))}, forma parte de ${esc(r.fusion.nombre)} (${esc(r.fusion.designacion.toLowerCase())})${r.fusion.cambio ? "; el municipio cambió de código y de MRC" : ", nacida de una fusión"}. <small class="cd-fact__period">Répertoire des municipalités del Gobierno de Quebec${r.fusion.fuente ? ` y ${fuente(FUENTES_FUSION[r.fusion.fuente], esc)}` : ""}. Las cifras de esta página son las del Censo 2021, antes del cambio.</small>`
    : m
      ? `${esc(m.nombre)} — ${esc(m.designacion)}${m.mrc ? ` · ${esc(m.mrc)}` : ""} <small class="cd-fact__period">Répertoire des municipalités del Gobierno de Quebec (30 de octubre de 2026)</small>`
      : "";
  const datos = [
    fila("Clasificación oficial", `${esc(denom)} <small class="cd-fact__period">Designación en el Censo 2021: ${esc(tipo.censo)}${r.n !== r.censoNombre ? ` · Nombre en el Censo 2021: ${esc(r.censoNombre)}` : ""}</small>`),
    actual ? fila("Estado actual", actual) : "",
    fila("MRC o territorio equivalente", `${esc(r.division)} <small class="cd-fact__period">División censal, Censo 2021</small>`),
    fila("Región", `${esc(region)}${m && m.region ? ` <small class="cd-fact__period">Región administrativa: ${esc(m.region)}</small>` : ""}`),
    r.cma ? fila("Área metropolitana o aglomeración", `${esc(r.cma)} <small class="cd-fact__period">Censo 2021</small>`) : "",
    fila("Población", pob),
    m && m.poblacion && !r.fusion ? fila("Población oficial actual", `${miles(m.poblacion)} <small class="cd-fact__period">Répertoire des municipalités del Gobierno de Quebec (población que fija el decreto anual); no se compara directamente con la del censo</small>`) : "",
    r.superficie != null ? fila("Superficie terrestre", `${decimal(r.superficie)} km²${r.densidad != null ? ` <small class="cd-fact__period">Densidad: ${decimal(r.densidad)} hab./km² (Censo 2021)</small>` : ""}`) : "",
    r.viviendas != null ? fila("Viviendas privadas", `${miles(r.viviendas)} <small class="cd-fact__period">Censo 2021</small>`) : "",
    fila("Coordenadas", `${r.lat.toFixed(4)}, ${r.lon.toFixed(4)} <small class="cd-fact__period">Punto de referencia dentro de la subdivisión censal</small>`),
    fila("Hora legal", esc(z.texto)),
  ].filter(Boolean).join("\n          ");

  /* --- Lugares dentro de la subdivisión --- */
  const lista = (r.comunidades || []).slice().sort((x, y) => x.n.localeCompare(y.n, "fr", { numeric: true }));
  const porTipo = {};
  for (const x of lista) (porTipo[x.t] ||= []).push(x);
  const conPob = lista.some((x) => typeof x.p === "number");
  const comunidades = lista.length
    ? `<p>Dentro de ${esc(nombre)} hay ${miles(lista.length)} ${lista.length === 1 ? "lugar con nombre oficial" : "lugares con nombre oficial"} (sectores, barrios, aldeas u otros). No son municipios: forman parte de ${esc(nombre)}.${conPob ? ` La población de los lugares designados ya está incluida en la de ${esc(nombre)}.` : ""}</p>
      ${Object.entries(porTipo)
        .map(([t, xs]) => `<h3>${esc(TIPOS[t].plural.replace(/^./, (c) => c.toUpperCase()))} (${xs.length})</h3>
      <p class="cd-loc-comunidades">${xs.map((x) => `<span class="cd-loc-lugar" id="${x.ancla}">${esc(x.n)}${typeof x.p === "number" ? ` <small>(${miles(x.p)} hab., Censo 2021)</small>` : ""}</span>`).join(" · ")}</p>`)
        .join("\n      ")}
      <p class="cd-indicator__src">Fuentes: ${fuente(FUENTES.dpl, esc)}; ${fuente(FUENTES.nombres, esc)}. Cada lugar se ubicó en la subdivisión censal que contiene sus coordenadas oficiales.</p>`
    : "";

  /* --- Empleo (región económica) --- */
  let empleo = empleoRegional({
    epa,
    nombre,
    nombreEpa: EPA_ES[claveEpa],
    nota: ["2480", "2490"].includes(String(r.r)) ? " (Statistics Canada publica juntas Côte-Nord y Nord-du-Québec)" : "",
    esc,
    consultado,
    fuentes: FUENTES,
  });
  if (f) empleo += `\n      <p>Las cifras regionales describen el mercado laboral; no son ofertas de empleo. Para vacantes reales, usa las bolsas de empleo oficiales. En Quebec, el francés es la lengua normal del trabajo: la mayoría de los empleos lo piden.</p>`;
  const busqueda = RECURSOS.empleo;

  /* --- Vivienda --- */
  let vivienda = "";
  if (f && f.cmhc) {
    const [archivo, centro, etiqueta] = f.cmhc;
    const alquiler = filaCmhc(L, archivo, centro, "Table 1.1.2");
    const vacancia = filaCmhc(L, archivo, centro, "Table 1.1.1");
    if (alquiler && vacancia) vivienda = viviendaCmhc({ cmhc: { alquiler, vacancia }, centro: etiqueta, esc, fuenteCmhc: FUENTES.cmhc });
  }
  if (!vivienda) vivienda = `<p>${NO_DISPONIBLE}: esta página no muestra alquileres de CMHC para ${esc(nombre)}. CMHC solo publica su encuesta anual para las áreas urbanas de 10,000 habitantes o más; consulta las cifras de Montreal, Quebec y otras ciudades en la <a href="/canada-en-datos/quebec#vivienda">guía de Quebec</a>. No usamos promedios provinciales como si fueran de la localidad.</p>`;
  vivienda += `\n      <p>En Quebec, el contrato de alquiler (bail) se firma en el formulario obligatorio del Gobierno, y el Tribunal administratif du logement (TAL) resuelve los conflictos entre inquilinos y propietarios. Antes de alquilar, conoce tus derechos:</p>\n      ${enlaces(RECURSOS.vivienda, esc)}`;

  /* --- Escuelas (ODEF 2022) --- */
  const escs = L.escuelas.filter((e) => e.csd === r.c);
  const fuenteEsc = "Base ODEF v2.1 de Statistics Canada (2022)";
  let escuelas;
  if (escs.length) {
    const POST = ["Cégep", "University", "Université", "Junior College", "Collège privé", "Installation collège privé", "Technical and Vocational", "Campus collégial", "Constituante", "Collège constituant", "Collège régional", "Centre collégial de transfert de technologie"];
    const ingles = escs.filter((e) => e.autoridad && /School Board$/.test(e.autoridad));
    const post = escs.filter((e) => POST.includes(e.tipo));
    const otras = escs.length - ingles.length - post.length;
    escuelas = `<p>La ${fuenteEsc} ubica en ${esc(nombre)} ${[
      otras > 0 ? `${miles(otras)} ${otras === 1 ? "establecimiento escolar (en su mayoría, de un centro de servicios escolares en francés)" : "establecimientos escolares (en su mayoría, de centros de servicios escolares en francés)"}` : "",
      ingles.length ? `${miles(ingles.length)} ${ingles.length === 1 ? "escuela de una comisión escolar en inglés" : "escuelas de comisiones escolares en inglés"}` : "",
      post.length ? `${miles(post.length)} ${post.length === 1 ? "establecimiento de educación postsecundaria (cégep, colegio o universidad)" : "establecimientos de educación postsecundaria (cégeps, colegios o universidades)"}` : "",
    ].filter(Boolean).join(", ")}.</p>
      <ul class="cd-list-items">
        ${escs.slice().sort((x, y) => x.nombre.localeCompare(y.nombre, "fr")).map((e) => `<li>${esc(e.nombre)}${e.autoridad ? ` <small>(${esc(e.autoridad)})</small>` : ""}</li>`).join("\n        ")}
      </ul>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}. Es una base de 2022: confirma la escuela y la zona de inscripción con el centro de servicios escolares que corresponde a tu dirección. En Quebec, la mayoría de los niños inmigrantes estudian en francés: la escuela en inglés solo es posible en los casos que prevé la Carta de la lengua francesa.</p>`;
  } else {
    escuelas = `<p>La ${fuenteEsc} no ubica escuelas dentro de ${esc(nombre)}; las más cercanas pueden estar en una localidad vecina. Para inscribir a tus hijos, consulta el centro de servicios escolares que corresponde a tu dirección.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}.</p>`;
  }

  /* --- Salud --- */
  const llamar = "En una emergencia, llama al 911. Para consejos de salud las 24 horas, llama gratis a Info-Santé al 811 (en francés y en inglés).";
  const salud = f && f.hospital
    ? `<p>${esc(f.hospital)} ${llamar}</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Es una base de 2020: los servicios, los horarios de urgencias y algunos nombres pueden haber cambiado. Confirma con Santé Québec antes de ir.</p>`
    : `<p>Los servicios de salud de la zona dependen de la red pública de Santé Québec en la región ${esc(region)}. Si no tienes médico de familia, el Primary Care Access Point (GAP) te orienta hacia una consulta. ${llamar}</p>`;

  /* --- Transporte --- */
  const saaq = enlaces([{ label: "SAAQ — Licencia de conducir en Quebec", href: "https://saaq.gouv.qc.ca/en/drivers-licences/obtaining-licence" }, { label: "Gobierno de Quebec — Neumáticos de invierno obligatorios (del 1 de diciembre al 15 de marzo)", href: "https://www.quebec.ca/en/transports/traffic-road-safety/winter-road-safety/requirements-for-winter-tires" }], esc);
  const transporte = f
    ? `${f.transporteNota ? `<p>${esc(f.transporteNota)}</p>` : ""}${f.transporte.length ? `<p>Información oficial de transporte:</p>${enlaces(f.transporte, esc)}` : ""}
      <p>Para manejar, la licencia de conducir y el registro del vehículo se tramitan con la Société de l'assurance automobile du Québec (SAAQ). Del 1 de diciembre al 15 de marzo, los neumáticos de invierno son obligatorios.</p>
      ${saaq}`
    : `<p>Fuera de las ciudades con transporte urbano, en Quebec se depende sobre todo del automóvil. La licencia de conducir y el registro del vehículo se tramitan con la SAAQ. Consulta en tu municipio si hay transporte local:</p>
      ${saaq}`;

  const servicioIntegracion = `El servicio Accompagnement Québec, del ministère de l'Immigration et de l'Intégration, es gratuito para personas inmigrantes con estatus en Quebec y se solicita por la plataforma Arrima; los organismos asociados atienden también a trabajadores temporales y a estudiantes extranjeros.`;
  const recien = f
    ? `${f.agencias ? `<p>Según la lista oficial del ministère de l'Immigration et de l'Intégration, hay organismos asociados con oficina en ${esc(nombre)} que ofrecen servicios de acogida e integración: orientación, búsqueda de vivienda, francés, empleo y actividades de integración. No tramitan documentos migratorios.${f.agenciasNota ? ` ${esc(f.agenciasNota)}` : ""}</p>` : `<p>La lista oficial del ministère de l'Immigration et de l'Intégration no indica, en octubre de 2026, organismos asociados con oficina en ${esc(nombre)}; busca los de la región ${esc(region)} en la lista.</p>`}
      <p>${servicioIntegracion}</p>
      ${enlaces([PARTNERS, ACOMPANAMIENTO, ...(f.ciudadInmigrantes ? [f.ciudadInmigrantes] : []), ...RECURSOS.recienLlegados], esc)}
      <p>Consulta también la <a href="/canada-en-datos/quebec#recien-llegado">guía de primeros pasos en Quebec</a>.</p>`
    : `<p>${servicioIntegracion} Busca los organismos de tu región en la lista oficial:</p>
      ${enlaces([PARTNERS, ACOMPANAMIENTO, ...RECURSOS.recienLlegados], esc)}
      <p>Consulta también la <a href="/canada-en-datos/quebec#recien-llegado">guía de primeros pasos en Quebec</a>.</p>`;
  const servicios = f && f.servicios && f.servicios.length
    ? `<p>Servicios de ${esc(nombre)} en su sitio oficial (en francés):</p>
      ${enlaces(f.servicios.map((x) => ({ label: `${nombre} — ${x.label}`, href: x.href })), esc)}`
    : f && f.sitioBloqueado
      ? `<p>El sitio oficial de ${esc(nombre)} no permitió nuestra verificación automática; consulta allí los servicios municipales.</p>`
      : "";
  const familias = `<p>Estos son recursos provinciales y federales: se aplican en toda la provincia, no solo en ${esc(nombre)}. La elegibilidad depende de tu estatus migratorio, tus ingresos y tu residencia. En 2026, la contribución diaria en las guarderías subvencionadas (contribution réduite) es de $9.65 por niño; las plazas se piden en el portal oficial y suele haber lista de espera.</p>
      ${enlaces(RECURSOS.familias, esc)}
      <p>Más información en la sección de <a href="/canada-en-datos/quebec#beneficios">beneficios de la guía de Quebec</a>.</p>`;

  const perfilCenso = `https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist=2021A0005${r.c}`;
  const oficiales = [
    ...(f ? [{ label: `Sitio oficial de ${nombre}`, href: f.web }] : m && m.web && !r.fusion ? [{ label: `Sitio oficial de ${m.nombre} (según el répertoire del Gobierno de Quebec)`, href: web(m.web) }] : []),
    { label: `Statistics Canada — Perfil del Censo 2021 de ${r.censoNombre} (en inglés)`, href: perfilCenso },
  ];
  const fuentes = [FUENTES.csd, FUENTES.censo, ...(m || r.fusion ? [FUENTES.municipios] : []), ...(r.fusion && r.fusion.fuente ? [FUENTES_FUSION[r.fusion.fuente]] : []), ...(lista.length ? [FUENTES.dpl, FUENTES.nombres] : []), ...(epa ? [FUENTES.epa, FUENTES.industrias] : []), ...(f && f.cmhc ? [FUENTES.cmhc] : []), FUENTES.escuelas, ...(f ? [FUENTES.hospitales, FUENTES.partners] : []), FUENTES.hora, FUENTES.horaAnuncio];

  const habitantes = typeof r.p === "number" ? ` Según el Censo 2021 de Statistics Canada, tenía ${miles(r.p)} habitantes.` : "";
  const intro = {
    urbano: `${nombre} es una ciudad (ville) de Quebec, en ${r.division === nombre ? "el territorio equivalente a una MRC del mismo nombre" : `la MRC o territorio equivalente ${r.division}`}, región ${region}.${habitantes}`,
    municipio: `${nombre} es un municipio de Quebec con la designación oficial de ${tipo.en.toLowerCase()} (${tipo.es.toLowerCase()}), en ${r.division}, región ${region}. La designación es un nombre jurídico: todos los municipios locales tienen las mismas funciones básicas.${habitantes}`,
    norte: `${nombre} figura en el Censo 2021 como ${tipo.es.toLowerCase()} (${tipo.en}), en ${r.division}. ${r.t === "village-nordique" ? "Las villas nórdicas son los municipios de las comunidades inuit de Nunavik." : r.t === "gouvernement-regional" ? "El Gobierno Regional de Eeyou Istchee Baie-James administra el territorio de la región de Baie-James junto con la Nación cri." : "Es el municipio de la comunidad; sus tierras reservadas tienen una página aparte."}${habitantes} Para información sobre la comunidad, consulta directamente a sus autoridades.`,
    indigena: `${nombre} figura en el Censo 2021 de Statistics Canada como ${tipo.es.toLowerCase()} (${tipo.en}), en ${r.division}. No es un municipio. Para información sobre la comunidad, consulta directamente a la Primera Nación o a la comunidad inuit correspondiente.`,
    otro: `${nombre} es un territorio no organizado (${tipo.en}) de Quebec: no tiene municipio propio y lo administra la MRC o el organismo regional correspondiente.${habitantes}`,
  }[grupo];
  const cierre = r.ficha
    ? " Aquí encontrarás datos oficiales y enlaces útiles para investigar la ciudad antes de mudarte, trabajar o estudiar."
    : " Esta página reúne, por ahora, la información básica disponible; la iremos completando con datos oficiales verificados.";

  return {
    titulo,
    descripcion,
    kicker: `Quebec · ${tipo.es}${r.ficha ? "" : " · Información básica"}`,
    intro: intro + cierre,
    datos,
    /* Reloj local en vivo (mismo diseño que la guía provincial): solo en las fichas completas */
    reloj: r.ficha ? { timeZone: z.timeZone, lat: r.lat, lon: r.lon, etiqueta: `Hora local en ${nombre}` } : null,
    ubicacion: `Ubicación aproximada en ${esc(r.division)}. Mapa elaborado con los límites de las divisiones censales del Censo 2021 de Statistics Canada.`,
    comunidades,
    empleo,
    busqueda,
    vivienda,
    escuelas,
    escuelasEnlaces: RECURSOS.escuelas,
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
  slug: "quebec",
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
