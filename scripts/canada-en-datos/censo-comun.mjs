/*
  censo-comun.mjs — Carga común del directorio de localidades a partir del Censo 2021
  ===================================================================================
  Para las provincias que usan los datos de obtener-localidades-censo.py +
  compactar-localidades.py (Manitoba y las siguientes): una página por cada
  subdivisión censal (CSD), y dentro de cada una, sin página propia, los
  lugares designados (DPL) del Censo 2021 y los nombres oficiales de lugares
  poblados de la CGNDB. Es la misma lógica que provincias/saskatchewan.mjs
  (que se conserva tal como se publicó), parametrizada por provincia.

  Regla: no se rellena ningún dato. Lo que no tiene fuente oficial queda en
  null y la página lo muestra como «Dato no disponible».
*/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { slug } from "./localidades.mjs";

/* Variantes de escritura para el buscador: sin apóstrofo, sin punto, sin guiones, con «Saint»,
   con «and» en lugar de «&» y sin «No.». No son nombres oficiales. */
export const variantes = (n) =>
  [...new Set([n.replace(/['’]/g, ""), n.replace(/['’]/g, " "), n.replace(/\./g, ""), n.replace(/-/g, " "), n.replace(/\bSt\.\s*/g, "Saint "), n.replace(/\bSte\.\s*/g, "Sainte "), n.replace(/&/g, "and"), n.replace(/\bNo\.\s*/g, "")])].filter((v) => v !== n);
export const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
/* Números de una reserva («96 & 97-A» → «96,97a»): reconocen la misma reserva escrita de otra forma */
export const numeros = (s) => (s.toLowerCase().replace(/(\d+)\s*-\s*([a-z])\b/g, "$1$2").match(/\d+[a-z]?\b/g) || []).sort().join(",");
export const objeto = (campos, fila_) => Object.fromEntries(campos.map((c, i) => [c, fila_[i]]));
export const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
export function km(a, b) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
/* «Division No.  1» → «División n.º 1» (y «Division No. 19, Unorganized» → «División n.º 19, Unorganized») */
export const division = (n) => n.replace(/^Division No\.\s+(\d+)/, "División n.º $1");

/* Mapa: GeoJSON en metros (EPSG:3347) → trazo SVG simplificado (Douglas-Peucker, tolerancia en píxeles) */
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

/*
  cargarCenso(root, cfg) — prepara el directorio de una provincia.
  cfg:
    archivo        nombre del JSON compacto (p. ej., «mb-localidades.json»)
    provincia      nombre (para los mensajes de error)
    TIPOS          tipos de localidad: { clave: { es, en, grupo, plural, censo?, dpl?, gn? } }
    gnExtra        nombres de tipo de la CGNDB que se asignan a otro tipo: { "Industrial Area": "zona-industrial" }
    gnMunicipal    tipos de la CGNDB que son municipios: si ya son una CSD no se repiten
    ordenGn        orden de prioridad de los tipos de la CGNDB
    nombreVisible  { código CSD: [nombre visible, URL fija o null, variantes de búsqueda] }
    prioridad      { grupo: n } para decidir quién conserva la URL corta si dos CSD comparten nombre
    fichas         { url: { nombre } } — localidades con ficha completa
    tiposFicha     tipos que pueden tener ficha completa
    hospitales     { nombre en la base ODHF (minúsculas): nombre oficial }
    escuelasNombres{ nombre dañado en la base ODEF: nombre correcto } — correcciones explícitas de acentos
*/
export function cargarCenso(root, cfg) {
  const { TIPOS } = cfg;
  const base = join(root, "scripts/canada-en-datos");
  const J = JSON.parse(readFileSync(join(base, cfg.archivo), "utf8"));
  const censo = (v) => Object.fromEntries(J.censo_campos.map((k, i) => [k, num(v[i])]));
  const csd = J.csd.map((f) => objeto(J.csd_campos, f));
  const divisiones = Object.fromEntries(J.divisiones.map(([id, n, er, v]) => [id, { id, n: division(n), er, ...censo(v) }]));
  const POR_CENSO = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.censo).map(([k, v]) => [v.censo, k]));
  const POR_DPL = Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.dpl).map(([k, v]) => [v.dpl, k]));
  const POR_GN = { ...Object.fromEntries(Object.entries(TIPOS).filter(([, v]) => v.gn).map(([k, v]) => [v.gn, k])), ...(cfg.gnExtra || {}) };

  /* Encuadre del mapa (metros, EPSG:3347) */
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const recorre = (geo, fn) => (geo.type === "Polygon" ? [geo.coordinates] : geo.coordinates).forEach((p) => p.forEach((q) => q.forEach(([x, y]) => fn(x, y))));
  for (const g of Object.values(J.cd_geo)) recorre(g, (x, y) => ((x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y))));
  const ANCHO = 600, MARGEN = 6;
  const escala = (ANCHO - 2 * MARGEN) / (x1 - x0);
  const alto = Math.ceil((y1 - y0) * escala + 2 * MARGEN);
  const a = (x, y) => [Math.round(((x - x0) * escala + MARGEN) * 10) / 10, Math.round(((y1 - y) * escala + MARGEN) * 10) / 10];
  const mapa = { ancho: ANCHO, alto, regiones: J.divisiones.map(([id, n, er]) => ({ r: er, n: division(n), d: trazo(J.cd_geo[id], a) })) };

  /* --- Subdivisiones censales: una página cada una --- */
  const items = [];
  for (const c of csd) {
    const t = POR_CENSO[c.tipo];
    if (!t) throw new Error(`${cfg.provincia}: tipo de subdivisión censal sin clasificar: ${c.tipo} (${c.nombre})`);
    const dv = divisiones[c.cd];
    if (!dv) throw new Error(`${cfg.provincia}: subdivisión sin división censal: ${c.nombre}`);
    if (dv.er !== c.er) throw new Error(`${cfg.provincia}: ${c.nombre}: región económica distinta de la de su división censal`);
    const d = censo(c.censo);
    const [xx, yy] = a(c.x, c.y);
    const [visible, s, extra] = (cfg.nombreVisible || {})[c.id] || [c.nombre, null, []];
    items.push({
      c: c.id, n: visible, censoNombre: c.nombre, sFija: s,
      alias: [...new Set([...variantes(c.nombre), ...extra, ...(visible !== c.nombre ? [c.nombre] : [])])],
      t, r: c.er, cd: c.cd, sup: dv.n, division: dv.n, cma: c.ca || null,
      x: xx, y: yy, lat: c.lat, lon: c.lon,
      p: d.p, p16: d.p16, cambio: d.cambio, viviendas: d.viviendas, superficie: d.superficie, densidad: d.densidad,
    });
  }

  /* Nombres de URL: el nombre; si se repite, el de mayor prioridad conserva el corto y el otro lleva el tipo en inglés */
  const porSlug = new Map();
  for (const r of items) {
    const k = r.sFija || slug(r.n);
    (porSlug.get(k) || porSlug.set(k, []).get(k)).push(r);
  }
  for (const [k, grupo] of porSlug) {
    grupo.sort((m, n) => cfg.prioridad[TIPOS[m.t].grupo] - cfg.prioridad[TIPOS[n.t].grupo] || (n.p || 0) - (m.p || 0));
    grupo.forEach((r, i) => (r.s = i === 0 ? k : `${k}-${slug(TIPOS[r.t].en)}`));
  }
  if (new Set(items.map((r) => r.s)).size !== items.length) throw new Error(`Nombres de URL repetidos en ${cfg.provincia}`);
  const porCodigo = new Map(items.map((r) => [r.c, r]));
  for (const k of Object.keys(cfg.fichas)) {
    const r = items.find((x) => x.s === k);
    if (!r || !cfg.tiposFicha.includes(r.t)) throw new Error(`${cfg.provincia}: ficha completa sin localidad del tipo esperado: ${k}`);
    if (cfg.fichas[k].nombre !== r.n) throw new Error(`${cfg.provincia}: nombre de la ficha distinto del de la localidad: ${k}`);
    r.ficha = true;
  }

  /* --- Lugares designados, comunidades y nombres geográficos (sin página propia) --- */
  const nombresCsd = new Set(items.flatMap((r) => [norm(r.censoNombre), ...r.alias.map(norm)]));
  const comunidades = [];
  const vistos = new Set();
  const agrega = (o) => {
    const padre = porCodigo.get(o.m);
    if (!padre) throw new Error(`${o.n}: subdivisión ${o.m} inexistente`);
    const k = `${norm(o.n)}|${o.m}`;
    if (vistos.has(k) || norm(o.n) === norm(padre.censoNombre) || norm(o.n) === norm(padre.n)) return false;
    vistos.add(k);
    const [xx, yy] = a(o.mx, o.my);
    comunidades.push({ n: o.n, alias: variantes(o.n), t: o.t, m: o.m, r: padre.r, sup: padre.sup, x: xx, y: yy, lat: o.lat, lon: o.lon, p: o.p ?? null, p16: o.p16 ?? null, id: o.id });
    return true;
  };

  /* 1. Lugares designados de Statistics Canada (con población del Censo 2021, incluida en la de su subdivisión) */
  const designados = [];
  for (const f of J.dpl) {
    const d = objeto(J.dpl_campos, f);
    const t = POR_DPL[d.tipo];
    if (!t) throw new Error(`${cfg.provincia}: tipo de lugar designado sin clasificar: ${d.tipo} (${d.nombre})`);
    const v = censo(d.censo);
    if (agrega({ n: d.nombre, t, m: d.csd, mx: d.x, my: d.y, lat: d.lat, lon: d.lon, p: v.p, p16: v.p16, id: d.uid })) designados.push({ n: norm(d.nombre), lat: d.lat, lon: d.lon });
  }

  /* 2. Nombres geográficos oficiales (CGNDB, sin población) */
  const ORDEN = cfg.ordenGn;
  const cgn = J.cgn.map((f) => objeto(J.cgn_campos, f));
  cgn.sort((x, y) => (ORDEN.indexOf(x.tipo) + 1 || 99) - (ORDEN.indexOf(y.tipo) + 1 || 99));
  for (const g of cgn) {
    const padre = porCodigo.get(g.csd);
    let t = POR_GN[g.tipo];
    if (cfg.gnMunicipal.has(g.tipo)) {
      /* Municipios que ya son una subdivisión censal; el nombre legal («Rural Municipality of …») se añade a las variantes */
      if (nombresCsd.has(norm(g.nombre))) continue;
      const legal = g.nombre.match(/^(?:The )?(?:District|Municipality|Rural Municipality|Town|City|Village) of (.+)$/);
      if (legal && norm(padre.censoNombre) === norm(legal[1])) {
        padre.alias.push(g.nombre);
        continue;
      }
      t = "nombre-municipal";
    }
    if (!t) throw new Error(`${cfg.provincia}: tipo de nombre geográfico sin clasificar: ${g.tipo} (${g.nombre})`);
    if (t === "reserva-nombre") {
      if (nombresCsd.has(norm(g.nombre))) continue;
      if (TIPOS[padre.t].grupo === "indigena" && numeros(g.nombre) && numeros(g.nombre) === numeros(padre.censoNombre)) {
        padre.alias.push(g.nombre);
        continue;
      }
    }
    /* El mismo lugar ya registrado como lugar designado (a menos de 5 km) */
    if (designados.some((d) => d.n === norm(g.nombre) && km(d, g) < 5)) continue;
    agrega({ n: g.nombre, t, m: g.csd, mx: g.x, my: g.y, lat: g.lat, lon: g.lon, id: `cgn-${g.id}` });
  }
  for (const r of items) r.alias = [...new Set(r.alias)].filter((v) => v !== r.n);

  /* Ancla estable de cada lugar dentro de la página de su subdivisión (/<subdivisión>#lugar-<nombre>) */
  for (const o of comunidades) {
    const hermanos = (porCodigo.get(o.m).comunidades ||= []);
    const b = `lugar-${slug(o.n) || String(o.id).toLowerCase()}`;
    let ancla = b;
    for (let k = 2; hermanos.some((h) => h.ancla === ancla); k++) ancla = `${b}-${k}`;
    o.ancla = ancla;
    hermanos.push(o);
  }

  /* Hospitales (lista explícita de la provincia, con el nombre oficial vigente) */
  const hospitales = [];
  for (const f of J.salud) {
    const h = objeto(J.salud_campos, f);
    const nombre = cfg.hospitales[h.nombre];
    if (nombre && !hospitales.some((x) => x.nombre === nombre)) hospitales.push({ ...h, nombre });
  }
  const faltan = [...new Set(Object.values(cfg.hospitales))].filter((n) => !hospitales.some((h) => h.nombre === n));
  if (faltan.length) throw new Error(`${cfg.provincia}: hospitales de la lista ausentes en la base ODHF: ${faltan.join(", ")}`);

  /* Escuelas (ODEF 2022): la base trae algunos nombres franceses con «?» en lugar de la letra acentuada */
  const escuelas = J.escuelas.map((f) => objeto(J.escuelas_campos, f)).map((e) => {
    if (!e.nombre || !e.nombre.includes("?")) return e;
    const bueno = (cfg.escuelasNombres || {})[e.nombre];
    if (!bueno) throw new Error(`${cfg.provincia}: nombre de escuela con caracteres dañados sin corrección: ${e.nombre}`);
    return { ...e, nombre: bueno };
  });

  return {
    meta: { consultado: J.consultado },
    regiones: Object.fromEntries(Object.entries(J.er).map(([k, v]) => [k, v.split(" / ")[0]])),
    mapa,
    items: [...items, ...comunidades],
    porCodigo,
    epa: J.epa,
    cmhc: J.cmhc,
    provincia: censo(J.provincia),
    divisiones,
    escuelas,
    hospitales,
  };
}
