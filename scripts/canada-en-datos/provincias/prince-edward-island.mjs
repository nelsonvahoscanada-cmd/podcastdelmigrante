/*
  provincias/prince-edward-island.mjs — Directorio de localidades de Isla del Príncipe Eduardo
  ===========================================================================================
  Criterio de inclusión (documentado en el repositorio interno):
  - Una página por cada subdivisión censal (CSD) de la provincia en el Censo
    2021 de Statistics Canada: 98 en total, que cubren toda la isla y tienen
    un código estable de 7 dígitos:
      · 59 municipios (2 ciudades, 10 pueblos, 46 municipios rurales y
        1 municipio turístico);
      · 35 distritos de bomberos (Fire District, tipo «FD» del censo): las
        subdivisiones del territorio no incorporado desde la reorganización
        municipal de 2017, que disolvió los lotes (LOT) como subdivisiones;
      · 4 reservas indígenas.
  - Sin página propia, dentro del directorio y de la página de su CSD: los
    lugares poblados y las divisiones históricas con nombre oficial de la
    Base de datos de nombres geográficos de Canadá (CGNDB, Recursos
    Naturales Canadá), ubicados en su CSD por sus coordenadas oficiales.
    PEI no tiene lugares designados (DPL) en el Censo 2021.
  - Los condados (Kings, Queens y Prince) son las divisiones censales: son
    el filtro «Condado» y el área geográfica de cada página. Toda la
    provincia es una sola región económica de Statistics Canada.
  No se promete cobertura de asentamientos sin nombre oficial registrado.

  Datos (scripts/canada-en-datos/):
    pei-localidades.json   obtener-pei-localidades.py + compactar-pei.py

  Regla: no se rellena ningún dato. Lo que no tiene fuente oficial
  verificada se muestra como «Dato no disponible».
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { slug, miles, nombreRegion, fechaEs, NO_DISPONIBLE, fila, enlaces, fuente, empleoRegional, viviendaCmhc } from "../localidades.mjs";

const PROV = "Isla del Príncipe Eduardo";

/* ---------- Clasificación oficial ----------
   Tipos de subdivisión censal de Statistics Canada (código en `censo`) y
   tipos de nombre geográfico de la CGNDB (en `gn`). Los nombres oficiales
   se dejan en inglés junto al equivalente en español. */
export const TIPOS = {
  city: { es: "Ciudad", en: "City", grupo: "municipio", plural: "ciudades", censo: "CY" },
  town: { es: "Pueblo", en: "Town", grupo: "municipio", plural: "pueblos (towns)", censo: "T" },
  rural: { es: "Municipio rural", en: "Rural Municipality", grupo: "municipio", plural: "municipios rurales (rural municipalities)", censo: "RM" },
  resort: { es: "Municipio turístico", en: "Resort Municipality", grupo: "municipio", plural: "municipios turísticos (resort municipalities)", censo: "RMU" },
  "no-incorporado": { es: "Distrito de bomberos", en: "Fire District", grupo: "rural", plural: "distritos de bomberos (fire districts) del territorio no incorporado", censo: "FD" },
  reserve: { es: "Reserva indígena", en: "Indian Reserve", grupo: "indigena", plural: "reservas indígenas (Indian reserves)", censo: "IRI" },
  comunidad: { es: "Comunidad", en: "Community", grupo: "comunidad", plural: "comunidades (communities)", gn: "Community" },
  localidad: { es: "Localidad", en: "Locality", grupo: "comunidad", plural: "localidades (localities)", gn: "Locality" },
  asentamiento: { es: "Asentamiento", en: "Settlement", grupo: "comunidad", plural: "asentamientos (settlements)", gn: "Settlement" },
  "nombre-pueblo": { es: "Pueblo (nombre geográfico)", en: "Town", grupo: "comunidad", plural: "nombres geográficos de pueblos", gn: "Town" },
  "oficina-correos": { es: "Lugar con oficina de correos (nombre histórico)", en: "Post Office", grupo: "comunidad", plural: "lugares con nombre de oficina de correos", gn: "Post Office" },
  "antigua-estacion": { es: "Antigua parada de ferrocarril", en: "Former Railway Point", grupo: "comunidad", plural: "antiguas paradas de ferrocarril", gn: "Former Railway Point" },
  lot: { es: "Lote (división histórica)", en: "Lot (township)", grupo: "comunidad", plural: "lotes (divisiones históricas)", gn: "Lot" },
  royalty: { es: "Royalty (división histórica)", en: "Royalty", grupo: "comunidad", plural: "royalties (divisiones históricas)", gn: "Royalty" },
  "reserva-nombre": { es: "Reserva indígena (nombre geográfico)", en: "Indian Reserve", grupo: "comunidad", plural: "reservas registradas como nombre geográfico", gn: "Indian Reserve" },
};
export const GRUPOS = {
  municipio: "Municipios incorporados",
  rural: "Territorio no incorporado (distritos de bomberos del censo)",
  indigena: "Reservas indígenas (clasificación del censo)",
  comunidad: "Comunidades, localidades y nombres históricos",
};
const ES_PAGINA = (t) => TIPOS[t].grupo !== "comunidad";
const POR_CENSO = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.censo).map(([k, v]) => [v.censo, k]));
const POR_GN = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.gn).map(([k, v]) => [v.gn, k]));

/* Condados (divisiones censales 2021) */
export const CONDADOS = { 1101: "Kings", 1102: "Queens", 1103: "Prince" };

/* ---------- Fichas completas ----------
   Las dos ciudades y los pueblos con encuesta de alquileres de CMHC (zonas
   de la aglomeración de Charlottetown). Enlaces comprobados antes de publicar. */
const T3 = { label: "T3 Transit — Autobuses de Charlottetown, Stratford, Cornwall y Summerside", href: "https://www.t3transit.ca/" };
export const FICHAS = {
  charlottetown: { nombre: "Charlottetown", web: "https://www.charlottetown.ca/", cmhc: ["charlottetown", "Zone 1 - Downtown", "Charlottetown CA", "la zona 1 de CMHC (centro de Charlottetown)"], transporte: [T3] },
  summerside: { nombre: "Summerside", web: "https://www.summerside.ca/", cmhc: ["prince-edward-island", "Summerside CA", "Summerside CA", "la aglomeración de Summerside"], transporte: [T3] },
  stratford: { nombre: "Stratford", web: "https://www.townofstratford.ca/", cmhc: ["charlottetown", "Zone 3 - Stratford", "Charlottetown CA", "la zona 3 de CMHC (Stratford)"], transporte: [T3] },
  cornwall: { nombre: "Cornwall", web: "https://cornwallpe.ca/", cmhc: ["charlottetown", "Zone 2 - Cornwall", "Charlottetown CA", "la zona 2 de CMHC (Cornwall)"], transporte: [T3] },
};

/* Hospitales (Statistics Canada, ODHF 2020): nombre de la base → nombre oficial. Se omiten las entradas que no son un
   hospital aparte (corporaciones, clínicas satélite y el centro de tratamiento del cáncer, que funciona en el Queen Elizabeth). */
const HOSPITALES = {
  "queen elizabeth hospital": "Queen Elizabeth Hospital",
  "hillsborough hospital & special care centre": "Hillsborough Hospital (salud mental)",
  "prince county hospital": "Prince County Hospital",
  "kings county memorial hospital": "Kings County Memorial Hospital",
  "western hospital": "Western Hospital",
  "souris hospital inc.": "Souris Hospital",
  "community hospital o'leary": "Community Hospital O'Leary",
};

/* ---------- Fuentes ---------- */
export const FUENTES = {
  csd: { org: "Statistics Canada", title: "Límites cartográficos del Censo 2021 — subdivisiones censales, condados y región económica", url: "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21" },
  censo: { org: "Statistics Canada", title: "Tabla 98-10-0002-01 — Población y viviendas, Censo 2021", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000201" },
  nombres: { org: "Recursos Naturales Canadá", title: "Base de datos de nombres geográficos de Canadá (CGNDB) — Isla del Príncipe Eduardo", url: "https://natural-resources.canada.ca/earth-sciences/geography/download-geographical-names-data/9245" },
  epa: { org: "Statistics Canada", title: "Tabla 14-10-0393-01 — Características de la población activa por región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410039301" },
  industrias: { org: "Statistics Canada", title: "Tabla 14-10-0392-01 — Empleo por industria y región económica, anual", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1410039201" },
  cmhc: { org: "CMHC", title: "Rental Market Survey 2025 — tablas de datos", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables" },
  escuelas: { org: "Statistics Canada", title: "Open Database of Educational Facilities (ODEF), versión 2.1 (2022)", url: "https://www.statcan.gc.ca/en/lode/databases/odef" },
  hospitales: { org: "Statistics Canada", title: "Open Database of Healthcare Facilities (ODHF), versión 1.1 (2020)", url: "https://www.statcan.gc.ca/en/lode/databases/odhf" },
  hora: { org: "IANA", title: "Base de datos de zonas horarias (America/Halifax): hora del Atlántico con horario de verano", url: "https://www.iana.org/time-zones" },
};
const RECURSOS = {
  empleo: [
    { label: "Job Bank — Buscar empleo en Isla del Príncipe Eduardo", href: "https://www.jobbank.gc.ca/jobsearch/jobsearch?locationstring=Prince+Edward+Island" },
    { label: "WorkPEI — Empleos y apoyo para buscar trabajo en PEI", href: "https://www.workpei.ca/" },
  ],
  escuelas: [
    { label: "Public Schools Branch — Escuelas públicas en inglés", href: "https://psb.edu.pe.ca/schools" },
  ],
  salud: [
    { label: "Gobierno de PEI — Tarjeta de salud (PEI Health Card) para nuevos residentes", href: "https://www.princeedwardisland.ca/en/service/apply-pei-health-card-new-residents" },
    { label: "Gobierno de PEI — Registro de pacientes para conseguir médico de familia", href: "https://www.princeedwardisland.ca/en/service/find-a-family-doctor-or-nurse-practitioner" },
    { label: "Health PEI", href: "https://www.princeedwardisland.ca/en/topic/health-pei" },
  ],
  recienLlegados: [
    { label: "IRCC — Servicios gratuitos para recién llegados cerca de ti", href: "https://ircc.canada.ca/english/newcomers/services/index.asp" },
  ],
  familias: [
    { label: "CRA — Cómo solicitar la Canada Child Benefit", href: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit/how-apply.html" },
  ],
  vivienda: [
    { label: "IRAC — Oficina de Alquileres (Rental Office)", href: "https://irac.pe.ca/" },
  ],
};

/* ---------- Utilidades ---------- */
/* Variantes de escritura para el buscador: sin apóstrofo (O'Leary → OLeary, O Leary), sin punto (St. Peters → St Peters)
   y con «Saint» (St. Peters → Saint Peters). No son nombres oficiales: solo ayudan a encontrar el oficial. */
const variantes = (n) => [...new Set([n.replace(/['’]/g, ""), n.replace(/['’]/g, " "), n.replace(/\./g, ""), n.replace(/\bSt\.\s*/g, "Saint ")])].filter((v) => v !== n);
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const objeto = (campos, fila_) => Object.fromEntries(campos.map((c, i) => [c, fila_[i]]));
const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
function km(a, b) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/* Mapa: GeoJSON en metros (EPSG:3347) → trazo SVG simplificado (Douglas-Peucker, tolerancia en píxeles).
   Igual que en los módulos de Ontario y BC; se copia para no modificar módulos ya publicados. */
function simplifica(pts, tol) {
  if (pts.length < 4) return pts;
  const dist = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = dx * dx + dy * dy;
    const t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  const marca = new Uint8Array(pts.length);
  marca[0] = marca[pts.length - 1] = 1;
  const pila = [[0, pts.length - 1]];
  while (pila.length) {
    const [i, j] = pila.pop();
    let max = 0, k = -1;
    for (let x = i + 1; x < j; x++) {
      const d = dist(pts[x], pts[i], pts[j]);
      if (d > max) (max = d), (k = x);
    }
    if (max > tol) (marca[k] = 1), pila.push([i, k], [k, j]);
  }
  return pts.filter((_, i) => marca[i]);
}
function trazo(geo, a, tol = 0.6) {
  const polis = geo.type === "Polygon" ? [geo.coordinates] : geo.type === "MultiPolygon" ? geo.coordinates : [];
  return polis
    .flatMap((p) =>
      p.map((anillo) => {
        const pts = simplifica(anillo.map(([x, y]) => a(x, y)), tol);
        const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
        if (pts.length < 4 || Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys) < 3) return "";
        return "M" + pts.map((q) => q.join(",")).join("L") + "Z";
      }),
    )
    .join("");
}

/* ---------- Carga y preparación de datos ---------- */
export function cargar(root) {
  const base = join(root, "scripts/canada-en-datos");
  const J = JSON.parse(readFileSync(join(base, "pei-localidades.json"), "utf8"));
  const censo = (v) => Object.fromEntries(J.censo_campos.map((k, i) => [k, num(v[i])]));
  const csd = J.csd.map((f) => objeto(J.csd_campos, f));
  const er = Object.keys(J.er)[0];

  /* Encuadre del mapa (metros, EPSG:3347): la isla es alargada, así que el mapa es ancho y bajo */
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const recorre = (geo, fn) => (geo.type === "Polygon" ? [geo.coordinates] : geo.coordinates).forEach((p) => p.forEach((q) => q.forEach(([x, y]) => fn(x, y))));
  for (const g of Object.values(J.cd_geo)) recorre(g, (x, y) => ((x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y))));
  const ANCHO = 600, MARGEN = 6;
  const escala = (ANCHO - 2 * MARGEN) / (x1 - x0);
  const alto = Math.ceil((y1 - y0) * escala + 2 * MARGEN);
  const a = (x, y) => [Math.round(((x - x0) * escala + MARGEN) * 10) / 10, Math.round(((y1 - y) * escala + MARGEN) * 10) / 10];
  const mapa = { ancho: ANCHO, alto, regiones: J.condados.map(([id, n]) => ({ r: er, n, d: trazo(J.cd_geo[id], a) })) };

  /* --- Subdivisiones censales: una página cada una --- */
  const items = [];
  for (const c of csd) {
    const t = POR_CENSO[c.tipo];
    if (!t) throw new Error(`Tipo de subdivisión censal sin clasificar: ${c.tipo} (${c.nombre})`);
    if (!CONDADOS[c.cd]) throw new Error(`División censal sin condado: ${c.cd}`);
    const d = censo(c.censo);
    const [xx, yy] = a(c.x, c.y);
    items.push({
      c: c.id,
      n: c.nombre,
      censoNombre: c.nombre,
      alias: variantes(c.nombre),
      t,
      r: c.er,
      cd: c.cd,
      sup: CONDADOS[c.cd],
      condado: CONDADOS[c.cd],
      cma: c.ca || null,
      x: xx,
      y: yy,
      lat: c.lat,
      lon: c.lon,
      p: d.p,
      p16: d.p16,
      cambio: d.cambio,
      viviendas: d.viviendas,
      superficie: d.superficie,
      densidad: d.densidad,
    });
  }

  /* Nombres de URL: el nombre; si se repite (p. ej., el pueblo de Souris y la subdivisión no incorporada que lo
     rodea), el municipio conserva el corto (si son dos municipios, el más poblado) y el otro lleva el tipo en inglés */
  const PRIORIDAD = { municipio: 0, indigena: 1, rural: 2 };
  const porSlug = new Map();
  for (const r of items) (porSlug.get(slug(r.n)) || porSlug.set(slug(r.n), []).get(slug(r.n))).push(r);
  for (const grupo of porSlug.values()) {
    grupo.sort((m, n) => PRIORIDAD[TIPOS[m.t].grupo] - PRIORIDAD[TIPOS[n.t].grupo] || (n.p || 0) - (m.p || 0));
    grupo.forEach((r, i) => (r.s = i === 0 ? slug(r.n) : `${slug(r.n)}-${slug(TIPOS[r.t].en.replace(/ \(.*\)$/, ""))}`));
  }
  if (new Set(items.map((r) => r.s)).size !== items.length) throw new Error("Nombres de URL repetidos en Isla del Príncipe Eduardo");
  const porCodigo = new Map(items.map((r) => [r.c, r]));
  for (const k of Object.keys(FICHAS)) {
    const r = items.find((x) => x.s === k);
    if (!r || TIPOS[r.t].grupo !== "municipio") throw new Error(`Ficha completa sin municipio: ${k}`);
    r.ficha = true;
  }

  /* --- Comunidades, localidades y nombres históricos (sin página propia) --- */
  const nombresCsd = new Set(csd.map((c) => norm(c.nombre)));
  const comunidades = [];
  const vistos = new Set();
  /* Un mismo nombre puede estar registrado con varios tipos en la misma subdivisión (p. ej., Cardigan como
     comunidad y como localidad): se muestra una sola vez, con el tipo de mayor prioridad de esta lista. */
  const PRIORIDAD_GN = ["comunidad", "localidad", "asentamiento", "nombre-pueblo", "royalty", "lot", "reserva-nombre", "oficina-correos", "antigua-estacion"];
  const candidatos = J.cgn.map((f) => {
    const g = objeto(J.cgn_campos, f);
    let t = POR_GN[g.tipo];
    if (!t && (g.tipo === "City" || g.tipo === "Resort Municipality")) t = "nombre-pueblo";
    if (!t) throw new Error(`Tipo de nombre geográfico sin clasificar: ${g.tipo}`);
    return { g, t };
  });
  candidatos.sort((x, y) => PRIORIDAD_GN.indexOf(x.t) - PRIORIDAD_GN.indexOf(y.t));
  for (const { g, t } of candidatos) {
    /* Un nombre que ya es una subdivisión censal (ciudades, pueblos, reservas) no se repite */
    if ((t === "nombre-pueblo" || t === "reserva-nombre") && nombresCsd.has(norm(g.nombre))) continue;
    const padre = porCodigo.get(g.csd);
    const k = `${norm(g.nombre)}|${g.csd}`;
    if (!padre || vistos.has(k) || norm(g.nombre) === norm(padre.n)) continue;
    vistos.add(k);
    const [xx, yy] = a(g.x, g.y);
    comunidades.push({ n: g.nombre, alias: variantes(g.nombre), t, m: g.csd, r: padre.r, sup: padre.sup, x: xx, y: yy, lat: g.lat, lon: g.lon, p: null, p16: null, id: `cgn-${g.id}` });
  }
  /* Ancla estable de cada lugar dentro de la página de su subdivisión (/<subdivisión>#lugar-<nombre>) */
  for (const o of comunidades) {
    const hermanos = (porCodigo.get(o.m).comunidades ||= []);
    const b = `lugar-${slug(o.n) || String(o.id).toLowerCase()}`;
    let ancla = b;
    for (let k = 2; hermanos.some((h) => h.ancla === ancla); k++) ancla = `${b}-${k}`;
    o.ancla = ancla;
    hermanos.push(o);
  }

  const hospitales = [];
  for (const f of J.hospitales) {
    const h = objeto(J.hospitales_campos, f);
    if (HOSPITALES[h.nombre] && !hospitales.some((x) => x.nombre === HOSPITALES[h.nombre])) hospitales.push({ ...h, nombre: HOSPITALES[h.nombre] });
  }
  if (hospitales.length !== Object.keys(HOSPITALES).length) throw new Error("Faltan hospitales de la lista en la base ODHF");

  return {
    meta: { consultado: J.consultado },
    regiones: Object.fromEntries(Object.entries(J.er).map(([k, v]) => [k, v.split(" / ")[0]])),
    mapa,
    items: [...items, ...comunidades],
    porCodigo,
    epa: J.epa,
    cmhc: J.cmhc,
    provincia: censo(J.provincia),
    condados: J.condados.map(([id, n, v]) => ({ id, n, ...censo(v) })),
    escuelas: J.escuelas.map((f) => objeto(J.escuelas_campos, f)),
    hospitales,
  };
}

/* ---------- Textos del directorio en la ficha provincial ---------- */
const directorio = {
  origen: "Statistics Canada: Censo 2021 (subdivisiones censales y condados); Recursos Naturales Canadá: Base de datos de nombres geográficos de Canadá",
  poblacion: "Censo 2021",
  regiones: "1 región económica",
  regionEtiqueta: "Región económica",
  subregion: "Condado",
  tipoEtiqueta: "Tipo de localidad",
  ejemplo: "Montague",
  extendido: true,
  notaFichas: "Las demás localidades tienen, por ahora, una página con información básica: clasificación oficial, condado, población del Censo 2021, empleo de la provincia, escuelas, hospital más cercano y enlaces oficiales. Iremos completándolas.",
  intro: (L) => {
    const n = (g) => L.items.filter((r) => TIPOS[r.t].grupo === g).length;
    return `<p>Investiga las localidades de Isla del Príncipe Eduardo antes de decidir dónde vivir, trabajar o estudiar. El directorio reúne <strong>${miles(n("municipio") + n("rural") + n("indigena"))} subdivisiones censales</strong> del Censo 2021, que cubren toda la provincia, y <strong>${miles(n("comunidad"))} comunidades, localidades y nombres históricos</strong> registrados oficialmente que forman parte de ellas.</p>
      <ul class="cd-list-items">
        <li><strong>Municipios</strong> (ciudades, pueblos, municipios rurales y un municipio turístico): tienen su propio gobierno local.</li>
        <li><strong>Territorio no incorporado</strong>: las zonas que no pertenecen a ningún municipio. Desde el Censo 2021, Statistics Canada las divide en 35 distritos de bomberos (Fire District, tipo «FD»). La reorganización municipal que comenzó en 2017 disolvió los antiguos lotes (lots) como subdivisiones censales.</li>
        <li><strong>Reservas indígenas</strong>: las cuatro reservas con su clasificación oficial en el censo. Se respetan sus nombres oficiales.</li>
        <li><strong>Comunidades, localidades y nombres históricos</strong>: no son municipios; aparecen dentro de la subdivisión censal en la que están. Incluyen los 67 lotes (lots), la antigua división de la isla, que siguen registrados como nombres geográficos.</li>
      </ul>`;
  },
  nota: () => "Statistics Canada considera toda Isla del Príncipe Eduardo como una sola región económica: por eso la Encuesta de Población Activa da cifras para toda la provincia, no por zona. Para filtrar por zona, usa el condado (Kings, Queens o Prince), que es la división censal. PEI no tiene lugares designados en el Censo 2021; las comunidades y localidades provienen de la Base de datos de nombres geográficos de Canadá y no tienen cifras de población propias. No hay un inventario oficial completo de asentamientos sin nombre registrado.",
  fuentes: (L, esc) => `Fuentes: ${fuente(FUENTES.csd, esc)}; ${fuente(FUENTES.censo, esc)}; ${fuente(FUENTES.nombres, esc)}. Consultado el ${esc(fechaEs(L.meta.consultado))}.`,
};

/* ---------- Contenido de cada ficha ---------- */
function filaCmhc(L, archivo, centro, hoja_) {
  const t = (L.cmhc[archivo] && L.cmhc[archivo].hojas[hoja_]) || [];
  return t.find((f) => f[0] === centro) || null;
}
const DIST = (n) => (n < 1.5 ? "1 km" : `${miles(Math.round(n))} km`);
const decimal = (v) => { const [e, d] = String(v).split("."); return miles(e) + (d ? `.${d}` : ""); };
const ZONA = "Hora del Atlántico: UTC−4 en invierno (AST) y UTC−3 con el horario de verano (ADT), de marzo a noviembre";

function pagina(r, L, { esc }) {
  const tipo = TIPOS[r.t];
  const grupo = tipo.grupo;
  const region = nombreRegion(L.regiones[r.r]);
  const epa = L.epa["Prince Edward Island"];
  const consultado = fechaEs(L.meta.consultado);
  const f = r.ficha ? FICHAS[r.s] : null;
  const denom = `${tipo.es} (${tipo.en})`;
  const nombre = r.n;

  const titulo = r.ficha ? `${nombre}, Isla del Príncipe Eduardo: guía para inmigrantes y recién llegados` : `${nombre}, Isla del Príncipe Eduardo: información básica`;
  const que = grupo === "municipio" ? "un municipio" : grupo === "rural" ? "una subdivisión censal del territorio no incorporado" : "una reserva indígena";
  const descripcion = r.ficha
    ? `${nombre} (Isla del Príncipe Eduardo) en datos: población, empleo, alquileres, escuelas, hospitales, transporte y servicios para recién llegados, con fuentes oficiales.`
    : `${nombre} es ${que} del condado de ${r.condado}, Isla del Príncipe Eduardo (${tipo.es}). Clasificación oficial, población del Censo 2021 y enlaces oficiales.`;

  /* --- Datos rápidos --- */
  const pob = typeof r.p === "number"
    ? `${miles(r.p)} <small class="cd-fact__period">Censo 2021${r.p16 != null ? `; Censo 2016: ${miles(r.p16)}${r.cambio != null ? ` (${r.cambio >= 0 ? "+" : ""}${r.cambio}%)` : ""}` : ""}</small>`
    : `${NO_DISPONIBLE} <small class="cd-fact__period">Statistics Canada no publica la población de esta subdivisión en el Censo 2021.</small>`;
  const datos = [
    fila("Clasificación oficial", `${esc(denom)} <small class="cd-fact__period">Tipo de subdivisión censal: ${esc(tipo.censo)}</small>`),
    fila("Condado", esc(r.condado)),
    fila("Región económica", `${esc(region)} <small class="cd-fact__period">Toda la provincia es una sola región económica de Statistics Canada</small>`),
    r.cma ? fila("Aglomeración censal", `${esc(r.cma)} <small class="cd-fact__period">Censo 2021</small>`) : "",
    fila("Población", pob),
    r.superficie != null ? fila("Superficie terrestre", `${decimal(r.superficie)} km²${r.densidad != null ? ` <small class="cd-fact__period">Densidad: ${decimal(r.densidad)} hab./km² (Censo 2021)</small>` : ""}`) : "",
    r.viviendas != null ? fila("Viviendas privadas", `${miles(r.viviendas)} <small class="cd-fact__period">Censo 2021</small>`) : "",
    fila("Coordenadas", `${r.lat.toFixed(4)}, ${r.lon.toFixed(4)} <small class="cd-fact__period">Punto de referencia dentro de la subdivisión censal</small>`),
    fila("Zona horaria", ZONA),
  ].filter(Boolean).join("\n          ");

  /* --- Comunidades y lugares dentro de la subdivisión --- */
  const lista = (r.comunidades || []).slice().sort((x, y) => x.n.localeCompare(y.n, "es", { numeric: true }));
  const porTipo = {};
  for (const x of lista) (porTipo[x.t] ||= []).push(x);
  const comunidades = lista.length
    ? `<p>Dentro de ${esc(nombre)} hay ${miles(lista.length)} ${lista.length === 1 ? "lugar con nombre oficial" : "lugares con nombre oficial"} (comunidades, localidades o divisiones históricas). No son municipios: forman parte de ${esc(nombre)}.</p>
      ${Object.entries(porTipo)
        .map(([t, xs]) => `<h3>${esc(TIPOS[t].plural.replace(/^./, (m) => m.toUpperCase()))} (${xs.length})</h3>
      <p class="cd-loc-comunidades">${xs.map((x) => `<span class="cd-loc-lugar" id="${x.ancla}">${esc(x.n)}</span>`).join(" · ")}</p>`)
        .join("\n      ")}
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.nombres, esc)}. Cada lugar se ubicó en la subdivisión censal que contiene sus coordenadas oficiales; un lote histórico puede extenderse por varias subdivisiones.</p>`
    : "";

  /* --- Empleo (toda la provincia es una región económica) --- */
  const empleo = empleoRegional({ epa, nombre, nombreEpa: "Isla del Príncipe Eduardo", nota: " (toda la provincia es una sola región económica)", esc, consultado, fuentes: FUENTES });
  const busqueda = RECURSOS.empleo;

  /* --- Vivienda --- */
  let vivienda = "";
  if (f) {
    const [archivo, centro, , etiqueta] = f.cmhc;
    const alquiler = filaCmhc(L, archivo, centro, "Table 1.1.2");
    const vacancia = filaCmhc(L, archivo, centro, "Table 1.1.1");
    if (alquiler && vacancia) vivienda = viviendaCmhc({ cmhc: { alquiler, vacancia }, centro: etiqueta, esc, fuenteCmhc: FUENTES.cmhc });
  }
  if (!vivienda) vivienda = `<p>${NO_DISPONIBLE}: CMHC no publica alquileres para esta localidad en su encuesta anual. Consulta Charlottetown y Summerside en la <a href="/canada-en-datos/prince-edward-island#vivienda">guía de Isla del Príncipe Eduardo</a>.</p>`;
  if (RECURSOS.vivienda.length) vivienda += `\n      <p>Antes de alquilar, conoce tus derechos:</p>\n      ${enlaces(RECURSOS.vivienda, esc)}`;

  /* --- Escuelas (ODEF 2022) --- */
  const escs = L.escuelas.filter((e) => e.csd === r.c);
  const consultadoEscuelas = "Base ODEF v2.1 de Statistics Canada (2022)";
  let escuelas;
  if (escs.length) {
    const pub = escs.filter((e) => e.tipo === "Public");
    const fr = pub.filter((e) => /langue fran/i.test(e.autoridad || "") || /^École/i.test(e.nombre || ""));
    const post = escs.filter((e) => ["University", "Junior College", "Technical and Vocational", "Nursing Schools"].includes(e.tipo));
    const priv = escs.filter((e) => e.tipo === "Private Institution");
    escuelas = `<p>La ${consultadoEscuelas} ubica en ${esc(nombre)} ${[
      pub.length ? `${miles(pub.length)} ${pub.length === 1 ? "escuela pública" : "escuelas públicas"}${fr.length ? ` (${miles(fr.length)} en francés)` : ""}` : "",
      priv.length ? `${miles(priv.length)} ${priv.length === 1 ? "institución privada" : "instituciones privadas"}` : "",
      post.length ? `${miles(post.length)} ${post.length === 1 ? "centro de educación postsecundaria" : "centros de educación postsecundaria"}` : "",
    ].filter(Boolean).join(", ")}.</p>
      <ul class="cd-list-items">
        ${escs.slice().sort((x, y) => x.nombre.localeCompare(y.nombre, "es")).map((e) => `<li>${esc(e.nombre)}</li>`).join("\n        ")}
      </ul>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}. Es una base de 2022: confirma la escuela y la zona de inscripción con el Public Schools Branch (inglés) o la Commission scolaire de langue française (francés).</p>`;
  } else {
    escuelas = `<p>La ${consultadoEscuelas} no ubica escuelas dentro de ${esc(nombre)}; las más cercanas pueden estar en una localidad vecina. Para inscribir a tus hijos, consulta la zona escolar que corresponde a tu dirección.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.escuelas, esc)}.</p>`;
  }

  /* --- Salud --- */
  const hs = L.hospitales.filter((h) => h.csd === r.c);
  let salud;
  if (hs.length) {
    salud = `<p>Hospitales en ${esc(nombre)} según la base de centros de salud de Statistics Canada. En una emergencia, llama al 911. Para consejos de salud de enfermería las 24 horas, llama gratis al 8-1-1.</p>
      <ul class="cd-list-items">
        ${hs.map((h) => `<li>${esc(h.nombre)}</li>`).join("\n        ")}
      </ul>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Confirma servicios y horarios con Health PEI antes de ir.</p>`;
  } else {
    const cerca = L.hospitales.map((h) => ({ h, d: km({ lat: r.lat, lon: r.lon }, { lat: h.lat, lon: h.lon }) })).sort((x, y) => x.d - y.d)[0];
    salud = `<p>No hay un hospital dentro de ${esc(nombre)}. El más cercano a su punto de referencia es <strong>${esc(cerca.h.nombre)}</strong>, a unos ${DIST(cerca.d)} en línea recta (la distancia por carretera puede ser mayor). En una emergencia, llama al 911. Para consejos de salud de enfermería las 24 horas, llama gratis al 8-1-1.</p>
      <p class="cd-indicator__src">Fuente: ${fuente(FUENTES.hospitales, esc)}. Distancia calculada con las coordenadas oficiales.</p>`;
  }

  /* --- Transporte --- */
  const transporte = f && f.transporte && f.transporte.length
    ? `<p>Información oficial de transporte público:</p>${enlaces(f.transporte, esc)}`
    : `<p>Las rutas urbanas de T3 Transit solo circulan en Charlottetown, Stratford, Cornwall y Summerside. Transit PEI, el transporte rural de la isla, funciona de lunes a viernes por las carreteras provinciales y conecta, según su operador, Georgetown, Montague, Souris, St. Peter's, Rustico, Summerside, Borden, O'Leary, Alberton, Tignish y Charlottetown. Su sitio explica cómo reservar, los horarios y los puntos de recogida:</p>
      ${enlaces([{ label: "T3 Transit y Transit PEI — Horarios y reservas", href: "https://www.t3transit.ca/" }], esc)}`;

  const recien = `<p>Los servicios para recién llegados financiados por el Gobierno de Canadá son gratuitos para quienes cumplen sus requisitos; cada organización indica a quién puede atender. Busca los más cercanos:</p>
      ${enlaces(RECURSOS.recienLlegados, esc)}
      <p>Consulta también la <a href="/canada-en-datos/prince-edward-island#recien-llegado">guía de primeros pasos en Isla del Príncipe Eduardo</a>.</p>`;
  const familias = `<p>Estos son recursos provinciales y federales: se aplican en toda la provincia, no solo en ${esc(nombre)}. La elegibilidad depende de tu estatus migratorio, tus ingresos y tu residencia.</p>
      ${enlaces(RECURSOS.familias, esc)}
      <p>Más información en la sección de <a href="/canada-en-datos/prince-edward-island#beneficios">beneficios de la guía de Isla del Príncipe Eduardo</a>.</p>`;

  const perfilCenso = `https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist=2021A0005${r.c}`;
  const oficiales = [
    ...(f ? [{ label: `Sitio oficial de ${f.nombre}`, href: f.web }] : []),
    { label: `Statistics Canada — Perfil del Censo 2021 de ${r.censoNombre} (en inglés)`, href: perfilCenso },
  ];
  const fuentes = [FUENTES.csd, FUENTES.censo, ...(lista.length ? [FUENTES.nombres] : []), ...(epa ? [FUENTES.epa, FUENTES.industrias] : []), ...(f ? [FUENTES.cmhc] : []), FUENTES.escuelas, FUENTES.hospitales, FUENTES.hora];

  const intro = {
    municipio: `${nombre} es ${tipo.es === "Ciudad" ? "una ciudad" : `un municipio clasificado como ${tipo.es.toLowerCase()}`} (${tipo.en}) del condado de ${r.condado}, en Isla del Príncipe Eduardo.${typeof r.p === "number" ? ` Según el Censo 2021 de Statistics Canada, tenía ${miles(r.p)} habitantes.` : ""}`,
    rural: `${nombre} es una subdivisión censal del territorio no incorporado del condado de ${r.condado}: una zona que no pertenece a ningún municipio. Statistics Canada la clasifica como distrito de bomberos (Fire District, tipo «FD»).${typeof r.p === "number" ? ` En el Censo 2021 tenía ${miles(r.p)} habitantes.` : ""}`,
    indigena: `${nombre} figura en el Censo 2021 de Statistics Canada como reserva indígena (Indian Reserve), en el condado de ${r.condado}. No es un municipio. Para información sobre la comunidad, consulta directamente a la Primera Nación correspondiente.`,
  }[grupo];
  const cierre = r.ficha
    ? " Aquí encontrarás datos oficiales y enlaces útiles para investigar la localidad antes de mudarte, trabajar o estudiar."
    : " Esta página reúne, por ahora, la información básica disponible; la iremos completando con datos oficiales verificados.";

  return {
    titulo,
    descripcion,
    kicker: `Isla del Príncipe Eduardo · ${tipo.es}${r.ficha ? "" : " · Información básica"}`,
    intro: intro + cierre,
    datos,
    ubicacion: `Ubicación aproximada en el condado de ${esc(r.condado)}. Mapa elaborado con los límites de las divisiones censales del Censo 2021 de Statistics Canada.`,
    comunidades,
    empleo,
    busqueda,
    vivienda,
    escuelas,
    escuelasEnlaces: RECURSOS.escuelas,
    salud,
    saludEnlaces: RECURSOS.salud,
    transporte,
    recien,
    familias,
    oficiales,
    fuentes,
    indexar: !!r.ficha,
    ciudad: tipo.grupo === "municipio",
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
  slug: "prince-edward-island",
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
