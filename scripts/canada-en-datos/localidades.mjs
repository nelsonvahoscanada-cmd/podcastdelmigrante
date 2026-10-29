/*
  localidades.mjs — Motor común de los directorios de localidades
  ======================================================================
  «Explora las ciudades y pueblos de <provincia>» y una página por
  localidad, para cualquier provincia o territorio de Canadá en Datos.
  Lo usa scripts/build-canada-datos.mjs.

  Cada provincia tiene su módulo en scripts/canada-en-datos/provincias/
  (alberta.mjs, ontario.mjs…) con sus datos oficiales, su clasificación
  y el contenido de cada ficha. Este motor pone lo común:

    - seccionDirectorio(): la sección del directorio dentro de la ficha
      provincial (buscador, filtros, mapa y listado; los datos se cargan
      solo cuando el lector llega a la sección: js/canada-directorio.js).
    - datosNavegador(): js/<provincia>-localidades.js (datos compactos).
    - mapaSvg(): assets/canada-en-datos/<provincia>-regiones.svg.
    - paginas(): una página por localidad en canada-en-datos/<provincia>/,
      con la misma estructura, navegación, bloque para compartir, imagen
      social propia, metadatos Open Graph y datos estructurados.
    - imagenes(): lo que necesita scripts/build-canada-datos-images.py
      para dibujar la imagen social de cada localidad.

  Regla: no se rellena ningún dato. Lo que no tiene fuente oficial
  verificada se muestra como «Dato no disponible».
*/
import { compartirHtml } from "./compartir.mjs";

const SITE = "https://podcastdelmigrante.com";

/* ---------- Utilidades ---------- */
export function slug(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
export const nombreRegion = (n) => n.replace(/--/g, "–");
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const fechaEs = (iso) => {
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
};

/* Industrias de la Encuesta de Población Activa (Statistics Canada, SCIAN) */
export const INDUSTRIAS_ES = {
  "Agriculture [111-112, 1100, 1151-1152]": "Agricultura",
  "Forestry, fishing, mining, quarrying, oil and gas [21, 113-114, 1153, 2100]": "Silvicultura, pesca, minería, petróleo y gas",
  "Utilities [22]": "Servicios públicos (electricidad, gas y agua)",
  "Construction [23]": "Construcción",
  "Manufacturing [31-33]": "Manufactura",
  "Wholesale and retail trade [41, 44-45]": "Comercio mayorista y minorista",
  "Transportation and warehousing [48-49]": "Transporte y almacenamiento",
  "Finance, insurance, real estate, rental and leasing [52-53]": "Finanzas, seguros e inmobiliarias",
  "Professional, scientific and technical services [54]": "Servicios profesionales, científicos y técnicos",
  "Business, building and other support services [55-56]": "Servicios de apoyo a empresas",
  "Educational services [61]": "Educación",
  "Health care and social assistance [62]": "Salud y asistencia social",
  "Information, culture and recreation [51, 71]": "Información, cultura y recreación",
  "Accommodation and food services [72]": "Alojamiento y servicios de comida",
  "Other services (except public administration) [81]": "Otros servicios",
  "Public administration [91]": "Administración pública",
};

/* Celdas de una fila de CMHC: valor + indicador de calidad (a–d); se ignoran las flechas. */
export function celdasCmhc(fila) {
  const out = [];
  for (const t of fila.slice(1)) {
    if (/^[a-d]$/.test(t) && out.length) out[out.length - 1].q = t;
    else if (/^[\d,.]+$/.test(t) || t === "**") out.push({ v: t === "**" ? null : Number(t.replace(/,/g, "")), q: null });
  }
  return out; /* estudio 24/25, 1 hab. 24/25, 2 hab. 24/25, 3+ hab. 24/25, total 24/25 */
}

/* ---------- Piezas de HTML ---------- */
export const NO_DISPONIBLE = '<span class="cd-pending">Dato no disponible</span>';
export const fila = (dt, dd) => `<div class="cd-fact"><dt>${dt}</dt><dd>${dd}</dd></div>`;
export const enlaces = (lista, esc) => `<div class="cd-links">
        ${lista.map((l) => `<a href="${esc(l.href)}"${/^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : ""}>${esc(l.label)}</a>`).join("\n        ")}
      </div>`;
export const fuente = (f, esc) => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.org)} — ${esc(f.title)}</a>`;

export function seccion(id, titulo, cuerpo) {
  return `<section class="cd-section" id="${id}" aria-labelledby="${id}-titulo">
      <h2 id="${id}-titulo">${titulo}</h2>
      ${cuerpo}
    </section>`;
}

export function datoBloque(etiqueta, valor, detalle) {
  return `<div class="cd-indicator">
          <p class="cd-indicator__label">${etiqueta}</p>
          <p class="cd-indicator__value${valor ? "" : " cd-pending"}">${valor || "Dato no disponible"}</p>
          ${detalle ? `<p class="cd-indicator__src">${detalle}</p>` : ""}
        </div>`;
}

/* Empleo de la región económica (Encuesta de Población Activa, anual) */
export function empleoRegional({ epa, nombre, nombreEpa, nota = "", esc, consultado, fuentes }) {
  if (!epa || !epa.lfs) return `<p>${NO_DISPONIBLE}</p>`;
  const ind = Object.entries(epa.industrias || {})
    .filter(([n]) => INDUSTRIAS_ES[n] && /^[\d.]+$/.test(epa.industrias[n].v))
    .sort((a, b) => Number(b[1].v) - Number(a[1].v))
    .slice(0, 4);
  return `<p>Las cifras de empleo de Statistics Canada se publican por región económica, no por localidad. ${esc(nombre)} está en la región ${esc(nombreEpa)}${nota}.</p>
      <div class="cd-indicators">
        ${datoBloque("Tasa de desempleo de la región", `${esc(epa.lfs["Unemployment rate"].v)}%`, `Promedio anual ${esc(epa.anio)}. Fuente: ${fuente(fuentes.epa, esc)}. Consultado el ${esc(consultado)}.`)}
        ${datoBloque("Tasa de empleo de la región", `${esc(epa.lfs["Employment rate"].v)}%`, `Promedio anual ${esc(epa.anio)}. Fuente: ${fuente(fuentes.epa, esc)}.`)}
      </div>
      ${ind.length ? `<h3>Industrias con más empleo en la región (${esc(epa.anio)})</h3>
      <ol class="cd-list-items">
        ${ind.map(([n, v]) => `<li>${esc(INDUSTRIAS_ES[n])}: unas ${miles(Math.round(Number(v.v) * 1000))} personas ocupadas</li>`).join("\n        ")}
      </ol>
      <p class="cd-indicator__src">Fuente: ${fuente(fuentes.industrias, esc)}. Cifras redondeadas de la Encuesta de Población Activa.</p>` : ""}`;
}

/* Alquileres de CMHC (Rental Market Survey, apartamentos privados) */
export function viviendaCmhc({ cmhc, centro, esc, fuenteCmhc, periodo = "octubre de 2025" }) {
  const a = celdasCmhc(cmhc.alquiler);
  const v = celdasCmhc(cmhc.vacancia);
  const calidad = (q) => (q === "d" ? " (calidad baja según CMHC: usar con precaución)" : "");
  const P = periodo.charAt(0).toUpperCase() + periodo.slice(1);
  return `<p>Encuesta de alquileres de CMHC, ${esc(periodo)}, para apartamentos privados en ${esc(centro)}.</p>
      <div class="cd-indicators">
        ${datoBloque("Alquiler promedio, 2 habitaciones", a[5] && a[5].v ? `$${miles(a[5].v)} al mes` : null, `${P}${calidad(a[5] && a[5].q)}. Fuente: ${fuente(fuenteCmhc, esc)}.`)}
        ${datoBloque("Alquiler promedio, todos los tamaños", a[9] && a[9].v ? `$${miles(a[9].v)} al mes` : null, `${P}${calidad(a[9] && a[9].q)}.`)}
        ${datoBloque("Tasa de desocupación", v[9] && v[9].v !== null ? `${v[9].v.toFixed(1)}%` : null, `${P}${calidad(v[9] && v[9].q)}. Porcentaje de apartamentos privados vacíos y disponibles.`)}
      </div>
      <p class="cd-indicator__src">Los promedios incluyen contratos antiguos y nuevos: un alquiler nuevo suele costar más que el promedio.</p>`;
}

/* ---------- Nombres que se pueden confundir ----------
   Si dos municipios con página comparten nombre (Hamilton, ciudad, y
   Hamilton, cantón, en Ontario), el nombre visible lleva el tipo entre
   paréntesis. La URL no cambia: sigue saliendo del nombre oficial. */
export function nombresVisibles(P, L) {
  const grupos = new Map();
  for (const r of L.items.filter((x) => x.s)) {
    const k = r.n.toLowerCase();
    grupos.set(k, [...(grupos.get(k) || []), r]);
  }
  const nv = new Map();
  for (const g of grupos.values()) {
    if (g.length < 2) continue;
    for (const r of g) nv.set(r, `${r.n} (${P.TIPOS[r.t].es.toLowerCase()})`);
    if (new Set(g.map((r) => nv.get(r))).size < g.length) throw new Error(`${P.nombre}: nombres repetidos sin distinguir: ${g[0].n}`);
  }
  return (r) => nv.get(r) || r.n;
}
/* Copia de la localidad con el nombre visible (n) y el oficial (nBase) */
const conNombre = (r, visible) => (visible(r) === r.n ? r : { ...r, n: visible(r), nBase: r.n });

/* ---------- Datos para el navegador (js/<provincia>-localidades.js) ---------- */
export function datosNavegador(P, L) {
  const indice = new Map(L.items.map((r, i) => [r, i]));
  const visible = nombresVisibles(P, L);
  /* Directorio extendido (opcional por provincia): variantes del nombre para la búsqueda y ancla del lugar en la página de su subdivisión */
  const ext = !!P.directorio.extendido;
  const filas = L.items.map((r) => [
    visible(r),
    r.t,
    String(r.r),
    r.x,
    r.y,
    P.esMunicipio(r) ? -1 : indice.get(L.porCodigo.get(r.m)),
    typeof r.p === "number" ? r.p : null,
    r.s || "",
    r.ficha ? 1 : 0,
    r.sup || "",
    ...(ext ? [(r.alias || []).join("|"), r.ancla || ""] : []),
  ]);
  const datos = {
    provincia: { slug: P.slug, nombre: P.nombre, poblacion: P.directorio.poblacion, regiones: P.directorio.regiones, subregion: P.directorio.subregion || null, ...(ext ? { extendido: true } : {}) },
    tipos: Object.fromEntries(Object.entries(P.TIPOS).map(([k, v]) => [k, [v.es, v.en, v.grupo]])),
    grupos: P.GRUPOS,
    regiones: Object.fromEntries(Object.entries(L.regiones).map(([k, v]) => [k, nombreRegion(v)])),
    mapa: L.mapa,
    campos: ["nombre", "tipo", "region", "x", "y", "municipio", "poblacion", "url", "ficha", "subregion", ...(ext ? ["alias", "ancla"] : [])],
    localidades: filas,
  };
  return `/* Generado por scripts/build-canada-datos.mjs a partir de fuentes oficiales (${P.directorio.origen}). No editar a mano. */
window.CD_LOCALIDADES = ${JSON.stringify(datos)};
`;
}

/* ---------- Mapa de regiones (SVG estático) ---------- */
export function mapaSvg(P, L) {
  const { ancho, alto, regiones } = L.mapa;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}">
<title>${P.nombre}: ${P.directorio.regiones.toLowerCase()}</title>
${regiones.map((r) => `<path d="${r.d}" fill="#f2f1ed" stroke="#9aa58a" stroke-width="1.2" stroke-linejoin="round"/>`).join("\n")}
</svg>
`;
}

/* ---------- Sección del directorio en la ficha provincial ---------- */
export function seccionDirectorio(P, L, esc) {
  const cuenta = (t) => L.items.filter((r) => r.t === t).length;
  const resumen = Object.entries(P.GRUPOS)
    .map(([g, titulo]) => {
      const tipos = Object.entries(P.TIPOS).filter(([k, v]) => v.grupo === g && cuenta(k));
      const total = tipos.reduce((a, [k]) => a + cuenta(k), 0);
      if (!total) return "";
      return `<li><strong>${esc(titulo)}: ${miles(total)}</strong> — ${tipos.map(([k, v]) => `${miles(cuenta(k))} ${esc(cuenta(k) === 1 ? (v.es === v.en ? v.es.toLowerCase() : `${v.es.toLowerCase()} (${v.en.toLowerCase()})`) : v.plural)}`).join(", ")}</li>`;
    })
    .filter(Boolean)
    .join("\n          ");
  const fichas = Object.keys(P.FICHAS)
    .map((k) => `<li><a href="/canada-en-datos/${P.slug}/${k}">${esc(P.FICHAS[k].nombre)}</a></li>`)
    .join("\n          ");
  const opcionesTipo = Object.entries(P.GRUPOS)
    .map(([g, titulo]) => {
      const tipos = Object.entries(P.TIPOS).filter(([k, v]) => v.grupo === g && cuenta(k));
      if (!tipos.length) return "";
      return `<optgroup label="${esc(titulo)}">
              <option value="grupo:${g}">Todos: ${esc(titulo.toLowerCase())}</option>
              ${tipos.map(([k, v]) => `<option value="${k}">${esc(v.es)}${v.es === v.en ? "" : ` (${esc(v.en)})`}</option>`).join("\n              ")}
            </optgroup>`;
    })
    .filter(Boolean)
    .join("\n            ");
  const opcionesRegion = Object.entries(L.regiones)
    .sort((a, b) => nombreRegion(a[1]).localeCompare(nombreRegion(b[1]), "es"))
    .map(([k, v]) => `<option value="${k}">${esc(nombreRegion(v))}</option>`)
    .join("\n            ");
  const D = P.directorio;
  /* Directorio extendido (opcional por provincia): distrito, tamaño de población, orden y restablecer */
  const subregiones = [...new Set(L.items.map((r) => r.sup).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const extra = D.extendido
    ? `
          <div class="cd-loc__campo">
            <label for="cdLocSub">${esc(D.subregion || "Subregión")}</label>
            <select id="cdLocSub" disabled>
              <option value="">Todos</option>
              ${subregiones.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("\n              ")}
            </select>
          </div>
          <div class="cd-loc__campo">
            <label for="cdLocPob">Población (${esc(D.poblacion)})</label>
            <select id="cdLocPob" disabled>
              <option value="">Cualquier tamaño</option>
              <option value="100000-">100,000 o más</option>
              <option value="10000-99999">10,000 a 99,999</option>
              <option value="1000-9999">1,000 a 9,999</option>
              <option value="1-999">1 a 999</option>
              <option value="0-0">0 habitantes</option>
              <option value="con">Con dato de población</option>
              <option value="sin">Sin dato de población</option>
            </select>
          </div>
          <div class="cd-loc__campo">
            <label for="cdLocOrden">Ordenar</label>
            <select id="cdLocOrden" disabled>
              <option value="">Recomendado</option>
              <option value="az">Nombre (A–Z)</option>
              <option value="za">Nombre (Z–A)</option>
              <option value="pob-">Mayor población</option>
              <option value="pob+">Menor población</option>
            </select>
          </div>
          <div class="cd-loc__campo cd-loc__campo--accion">
            <button type="button" class="btn cd-loc__restablecer" id="cdLocReset" disabled>Restablecer filtros</button>
          </div>`
    : "";
  return `<section class="cd-section cd-loc" id="localidades" aria-labelledby="localidades-titulo">
      <h2 id="localidades-titulo">Explora las ciudades y pueblos de ${esc(P.nombre)}</h2>
      ${D.intro(L, esc)}
      <div class="cd-loc__resumen">
        <h3>Qué incluye</h3>
        <ul>
          ${resumen}
        </ul>
        <p class="cd-loc__nota">${D.nota(L, esc)}</p>
      </div>
      <div class="cd-loc__fichas">
        <h3>Fichas completas</h3>
        <ul>
          ${fichas}
        </ul>
        <p class="cd-loc__nota">${esc(D.notaFichas)}</p>
      </div>

      <div class="cd-loc__app" id="cdLoc" data-src="/js/${P.slug}-localidades.js" data-prov="${P.slug}">
        <form class="cd-loc__filtros${D.extendido ? " cd-loc__filtros--extendido" : ""}" role="search" aria-label="Buscar localidades de ${esc(P.nombre)}" onsubmit="return false">
          <div class="cd-loc__campo cd-loc__campo--buscar">
            <label for="cdLocBuscar">Buscar por nombre</label>
            <input type="search" id="cdLocBuscar" autocomplete="off" placeholder="Por ejemplo: ${esc(D.ejemplo)}" disabled>
          </div>
          <div class="cd-loc__campo">
            <label for="cdLocTipo">${esc(D.tipoEtiqueta || "Tipo de localidad")}</label>
            <select id="cdLocTipo" disabled>
              <option value="">Todos los tipos</option>
            ${opcionesTipo}
            </select>
          </div>
          <div class="cd-loc__campo">
            <label for="cdLocRegion">${esc(D.regionEtiqueta)}</label>
            <select id="cdLocRegion" disabled>
              <option value="">Todas las regiones</option>
            ${opcionesRegion}
            </select>
          </div>${extra}
        </form>
        <p class="cd-loc__estado" id="cdLocEstado" role="status" aria-live="polite">Cargando el directorio…</p>
        <div class="cd-loc__cuerpo">
          <figure class="cd-loc__mapa" id="cdLocMapa" aria-label="Mapa de ${esc(P.nombre)} con las localidades del listado"></figure>
          <div class="cd-loc__lista-caja">
            <ul class="cd-loc__lista" id="cdLocLista"></ul>
            <button type="button" class="btn cd-loc__mas" id="cdLocMas" hidden>Mostrar más</button>
          </div>
        </div>
        <noscript><p>Para usar el buscador y el mapa, activa JavaScript. Puedes abrir directamente las fichas completas de arriba${D.indiceSinJs ? ` o el <a href="/canada-en-datos/${P.slug}/localidades">índice alfabético</a>` : ""}.</p></noscript>
      </div>
      <p class="cd-loc__fuente">${D.fuentes(L, esc)}</p>
    </section>`;
}

/* ---------- Páginas de cada localidad ---------- */
export function paginas(P, L, ctx) {
  const { esc, head, chrome, scriptsBase, meta } = ctx;
  const out = {};
  const visible = nombresVisibles(P, L);
  for (const original of L.items.filter((x) => x.s)) {
    const r = conNombre(original, visible);
    const k = r.s;
    const path = `/canada-en-datos/${P.slug}/${k}`;
    const url = SITE + path;
    const f = P.pagina(r, L, { esc });
    const imagen = `/assets/canada-en-datos/${P.slug}/${k}.jpg`;
    const toc = [
      ["resumen", "Resumen"],
      ["ubicacion", "Ubicación"],
      ...(f.comunidades ? [["comunidades", "Comunidades"]] : []),
      ["economia-empleo", "Economía y empleo"],
      ["vivienda", "Vivienda"],
      ["educacion", "Educación"],
      ["salud", "Salud"],
      ["transporte", "Transporte"],
      ...(f.servicios ? [["servicios", "Servicios municipales"]] : []),
      ["recien-llegados", "Recién llegados"],
      ...(f.familias ? [["familias", "Familias"]] : []),
      ["enlaces", "Enlaces y fuentes"],
    ];
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: f.titulo,
      description: f.descripcion,
      url,
      inLanguage: "es",
      dateModified: L.meta.consultado,
      about: { "@type": f.ciudad ? "City" : "AdministrativeArea", name: r.n, containedInPlace: { "@type": "AdministrativeArea", name: P.nombre } },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Canadá en Datos", item: `${SITE}/canada-en-datos/` },
          { "@type": "ListItem", position: 3, name: P.nombre, item: `${SITE}/canada-en-datos/${P.slug}` },
          { "@type": "ListItem", position: 4, name: r.n, item: url },
        ],
      },
    };
    const px = ((r.x / L.mapa.ancho) * 100).toFixed(2);
    const py = ((r.y / L.mapa.alto) * 100).toFixed(2);
    const mapa = `<figure class="cd-loc-mini">
        <div class="cd-loc-mini__lienzo" style="aspect-ratio:${L.mapa.ancho}/${L.mapa.alto}">
          <img src="/assets/canada-en-datos/${P.slug}-regiones.svg" alt="Mapa de ${esc(P.nombre)} con la ubicación de ${esc(r.n)}" width="${L.mapa.ancho}" height="${L.mapa.alto}" loading="lazy">
          <span class="cd-loc-mini__punto" style="left:${px}%;top:${py}%" aria-hidden="true"></span>
        </div>
        <figcaption>${f.ubicacion}</figcaption>
      </figure>${f.ubicacionExtra || ""}`;

    out[`${P.slug}/${k}.html`] = `${head({ meta, title: `${f.titulo} — El Podcast del Migrante`, description: f.descripcion, path, image: imagen, imageAlt: `Tarjeta de ${r.nBase ? `${r.n}, en ${P.nombre},` : `${r.n} (${P.nombre})`} con su ubicación en el mapa de la provincia, de Canadá en Datos de El Podcast del Migrante.`, jsonLd, noindex: !f.indexar })}
<body data-cd-localidad="${esc(k)}" data-cd-provincia="${P.slug}">
${chrome.cabecera}

<main id="main" class="cd">
  <div class="wrap">
    <div class="cd-region-hero">
      <div>
        <nav class="cd-breadcrumb" aria-label="Ruta de navegación"><a href="/index.html">Inicio</a> › <a href="/canada-en-datos/">Canadá en Datos</a> › <a href="/canada-en-datos/${P.slug}">${esc(P.nombre)}</a> › <span aria-current="page">${esc(r.n)}</span></nav>
        <p class="cd-kicker">${esc(f.kicker)}</p>
        <h1>${esc(r.n)}</h1>
        <p class="cd-lead">${esc(f.intro)}</p>
        <p class="cd-meta">Datos consultados el ${esc(fechaEs(L.meta.consultado))}. <a href="/canada-en-datos/${P.slug}#localidades">Volver al directorio de ${esc(P.nombre)}</a> · <a href="/canada-en-datos/${P.slug}">Guía de ${esc(P.nombre)}</a></p>
        ${compartirHtml({ url, titulo: f.titulo, texto: `${r.n}, ${P.nombre}: datos oficiales y recursos para migrantes, en Canadá en Datos de El Podcast del Migrante.`, lugar: r.n })}
      </div>
      <aside class="cd-panel" id="resumen" aria-label="Datos rápidos de ${esc(r.n)}">
        <dl class="cd-facts">
          ${f.datos}
        </dl>
      </aside>
    </div>

    <nav class="cd-toc" aria-label="Contenido de la página">
      ${toc.map(([id, t]) => `<a href="#${id}">${esc(t)}</a>`).join("\n      ")}
    </nav>

    ${seccion("ubicacion", "Ubicación y mapa", mapa)}

    ${f.comunidades ? seccion("comunidades", `Comunidades de ${esc(r.n)}`, f.comunidades) : ""}

    ${seccion("economia-empleo", "Economía, empleo y búsqueda de trabajo", `${f.empleo}
      <h3>Buscar trabajo</h3>
      ${enlaces(f.busqueda, esc)}`)}

    ${seccion("vivienda", "Vivienda y alquileres", f.vivienda)}

    ${seccion("educacion", "Escuelas y educación", `${f.escuelas}
      ${enlaces(f.escuelasEnlaces, esc)}`)}

    ${seccion("salud", "Hospitales y servicios de salud", `${f.salud}
      ${enlaces(f.saludEnlaces, esc)}`)}

    ${seccion("transporte", "Transporte", f.transporte)}
${f.servicios ? `
    ${seccion("servicios", "Servicios municipales", f.servicios)}
` : ""}
    ${seccion("recien-llegados", "Servicios para inmigrantes y recién llegados", f.recien)}${f.familias ? `

    ${seccion("familias", "Recursos para familias", f.familias)}` : ""}

    <section class="cd-method" id="enlaces" aria-labelledby="enlaces-titulo">
      <h2 id="enlaces-titulo">Enlaces oficiales y fuentes</h2>
      ${enlaces(f.oficiales, esc)}
      <p>Esta página reúne información general y enlaces a fuentes oficiales; no sustituye la información oficial vigente. Cuando un dato no tiene una fuente oficial verificada, se indica «Dato no disponible».</p>
      <ul>
        ${f.fuentes.map((x) => `<li>${fuente(x, esc)}</li>`).join("\n        ")}
      </ul>
    </section>
  </div>
</main>

${chrome.pie}

${scriptsBase(["/js/canada-compartir.js"])}`;
  }
  return out;
}

/* ---------- Datos de las imágenes sociales (build-canada-datos-images.py) ---------- */
export function imagenes(P, L) {
  const visible = nombresVisibles(P, L);
  return {
    provincia: P.slug,
    nombre: P.nombre,
    mapa: L.mapa,
    localidades: L.items
      .filter((r) => r.s)
      .map((original) => {
        const r = conNombre(original, visible);
        const f = P.tarjeta(r, L);
        return { s: r.s, n: r.n, x: r.x, y: r.y, tipo: f.tipo, dato: f.dato };
      }),
  };
}
