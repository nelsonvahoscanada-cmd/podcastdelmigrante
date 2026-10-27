/*
  canada-directorio.js — «Explora las ciudades y pueblos de <provincia>»
  ======================================================================
  Páginas: canada-en-datos/<provincia> (sección #localidades), para
  cualquier provincia o territorio con directorio (Alberta, Ontario…).
  - Los datos (js/<provincia>-localidades.js, data-src) se descargan solo
    cuando el lector se acerca a la sección, para no pesar en la carga
    inicial. Definen window.CD_LOCALIDADES.
  - Buscador por nombre (sin distinguir acentos ni mayúsculas) y filtros
    por tipo oficial y por región económica; el mapa y el listado se
    actualizan juntos.
  - El listado es la forma principal (y accesible) de navegar; el mapa
    es un complemento: tocar un punto o una región ayuda a filtrar.
  - Directorio extendido (si los datos traen provincia.extendido, p. ej.
    Columbia Británica): variantes del nombre en la búsqueda, filtros por
    distrito y tamaño de población, orden, «Restablecer filtros» y mapa con
    acercamiento y agrupación de puntos. Las provincias sin esa marca
    funcionan exactamente igual que antes.
*/
(function () {
  "use strict";

  const raiz = document.getElementById("cdLoc");
  if (!raiz) return;

  const $ = (id) => document.getElementById(id);
  const buscar = $("cdLocBuscar");
  const selTipo = $("cdLocTipo");
  const selRegion = $("cdLocRegion");
  const estado = $("cdLocEstado");
  const lista = $("cdLocLista");
  const mas = $("cdLocMas");
  const figura = $("cdLocMapa");
  /* Controles del directorio extendido (solo existen en las provincias que lo activan) */
  const selSub = $("cdLocSub");
  const selPob = $("cdLocPob");
  const selOrden = $("cdLocOrden");
  const btnReset = $("cdLocReset");
  const PASO = 40;
  const SVG = "http://www.w3.org/2000/svg";

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  let D = null;
  let items = [];
  let visibles = [];
  let mostrados = 0;
  let puntos = null;
  let seleccion = -1;
  let ext = false;
  let vista = null; /* ventana visible del mapa extendido: { x, y, w, h } */

  /* ---------- Carga diferida ---------- */
  function cargar() {
    if (D || cargar.enCurso) return;
    cargar.enCurso = true;
    const s = document.createElement("script");
    s.src = raiz.dataset.src;
    s.onload = () => {
      D = window.CD_LOCALIDADES;
      iniciar();
    };
    s.onerror = () => {
      estado.textContent = "No se pudo cargar el directorio. Recarga la página para intentarlo de nuevo.";
      cargar.enCurso = false;
    };
    document.head.appendChild(s);
  }
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) {
        io.disconnect();
        cargar();
      }
    }, { rootMargin: "400px 0px" });
    io.observe(raiz);
  } else cargar();
  if (location.hash === "#localidades") cargar();

  /* ---------- Datos ---------- */
  function iniciar() {
    items = D.localidades.map((f, i) => ({
      i,
      nombre: f[0],
      tipo: f[1],
      region: String(f[2]),
      x: f[3],
      y: f[4],
      municipio: f[5],
      poblacion: f[6],
      url: f[7],
      ficha: f[8] === 1,
      sub: f[9] || "",
      clave: norm(f[0] + (f[10] ? " " + f[10].replace(/\|/g, " ") : "")),
    }));
    ext = !!D.provincia.extendido;
    /* Orden: fichas completas, municipios (de mayor a menor población) y después comunidades, por nombre */
    const peso = (x) => (x.ficha ? 0 : x.municipio === -1 ? 1 : 2);
    items.sort((a, b) => peso(a) - peso(b) || (b.poblacion || 0) - (a.poblacion || 0) || a.nombre.localeCompare(b.nombre, "es"));
    dibujarMapa();
    [buscar, selTipo, selRegion, selSub, selPob, selOrden, btnReset].forEach((c) => c && (c.disabled = false));
    let t = null;
    buscar.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(filtrar, 120);
    });
    selTipo.addEventListener("change", filtrar);
    selRegion.addEventListener("change", filtrar);
    [selSub, selPob, selOrden].forEach((c) => c && c.addEventListener("change", filtrar));
    if (btnReset)
      btnReset.addEventListener("click", () => {
        buscar.value = "";
        [selTipo, selRegion, selSub, selPob, selOrden].forEach((c) => c && (c.value = ""));
        filtrar();
        buscar.focus();
      });
    mas.addEventListener("click", () => pintarLista(true));
    filtrar();
  }

  /* ---------- Mapa ---------- */
  function dibujarMapa() {
    const m = D.mapa;
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", `0 0 ${m.ancho} ${m.alto}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Mapa de ${D.provincia.nombre} con sus ${D.provincia.regiones} y las localidades del listado`);
    svg.classList.add("cd-loc__svg");
    const regiones = document.createElementNS(SVG, "g");
    for (const r of m.regiones) {
      const p = document.createElementNS(SVG, "path");
      p.setAttribute("d", r.d);
      p.setAttribute("class", "cd-loc__region");
      p.dataset.region = r.r;
      const t = document.createElementNS(SVG, "title");
      t.textContent = `Región ${D.regiones[r.r]}: tocar para filtrar`;
      p.appendChild(t);
      p.addEventListener("click", () => {
        selRegion.value = selRegion.value === r.r ? "" : r.r;
        filtrar();
      });
      regiones.appendChild(p);
    }
    puntos = document.createElementNS(SVG, "g");
    puntos.setAttribute("class", "cd-loc__puntos");
    svg.append(regiones, puntos);
    figura.appendChild(svg);
    if (ext) controlesZoom(svg);
    const ficha = document.createElement("div");
    ficha.className = "cd-loc__tarjeta";
    ficha.id = "cdLocTarjeta";
    ficha.hidden = true;
    figura.appendChild(ficha);
  }

  /* ---------- Mapa extendido: acercar, alejar y agrupar puntos ---------- */
  function controlesZoom(svg) {
    const m = D.mapa;
    vista = { x: 0, y: 0, w: m.ancho, h: m.alto };
    svg.classList.add("cd-loc__svg--zoom");
    const caja = document.createElement("div");
    caja.className = "cd-loc__zoom";
    caja.innerHTML = `<button type="button" data-z="in" aria-label="Acercar el mapa">+</button><button type="button" data-z="out" aria-label="Alejar el mapa">−</button><button type="button" data-z="all" aria-label="Ver toda la provincia">⤢</button>`;
    caja.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.z === "all") return mostrarZona(null);
      const f = b.dataset.z === "in" ? 0.5 : 2;
      mostrarZona({ x: vista.x + vista.w / 2, y: vista.y + vista.h / 2, w: vista.w * f });
    });
    figura.appendChild(caja);
    svg.addEventListener("dblclick", (e) => {
      const pt = aMapa(svg, e);
      mostrarZona({ x: pt.x, y: pt.y, w: vista.w / 2 });
    });
  }
  function aMapa(svg, e) {
    const r = svg.getBoundingClientRect();
    return { x: vista.x + ((e.clientX - r.left) / r.width) * vista.w, y: vista.y + ((e.clientY - r.top) / r.height) * vista.h };
  }
  /* Centra la vista en (x, y) con ancho w (null = toda la provincia) */
  function mostrarZona(z) {
    const m = D.mapa;
    if (!z || z.w >= m.ancho) vista = { x: 0, y: 0, w: m.ancho, h: m.alto };
    else {
      const w = Math.max(m.ancho / 32, z.w);
      const h = (w * m.alto) / m.ancho;
      vista = { w, h, x: Math.min(Math.max(0, z.x - w / 2), m.ancho - w), y: Math.min(Math.max(0, z.y - h / 2), m.alto - h) };
    }
    figura.querySelector("svg").setAttribute("viewBox", `${vista.x} ${vista.y} ${vista.w} ${vista.h}`);
    pintarPuntos();
  }
  /* Ajusta la vista a los puntos del listado cuando un filtro reduce la búsqueda */
  function encuadrar() {
    if (!ext) return;
    if (visibles.length === items.length || !visibles.length) return mostrarZona(null);
    const xs = visibles.map((v) => v.x), ys = visibles.map((v) => v.y);
    const w = Math.max(Math.max(...xs) - Math.min(...xs), ((Math.max(...ys) - Math.min(...ys)) * D.mapa.ancho) / D.mapa.alto) * 1.3 + 20;
    mostrarZona({ x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2, w });
  }
  function pintarAgrupados() {
    puntos.textContent = "";
    const frag = document.createDocumentFragment();
    const k = vista.w / D.mapa.ancho; /* tamaño constante en pantalla al acercar */
    const dentro = visibles.filter((it) => it.x >= vista.x && it.x <= vista.x + vista.w && it.y >= vista.y && it.y <= vista.y + vista.h);
    const sueltos = [];
    const celdas = new Map();
    if (dentro.length > 250) {
      const lado = vista.w / 22;
      for (const it of dentro) {
        if (it.ficha || it.i === seleccion) { sueltos.push(it); continue; }
        const c = `${Math.floor((it.x - vista.x) / lado)}|${Math.floor((it.y - vista.y) / lado)}`;
        (celdas.get(c) || celdas.set(c, []).get(c)).push(it);
      }
      for (const g of celdas.values()) if (g.length < 3) sueltos.push(...g);
    } else sueltos.push(...dentro);
    for (const g of celdas.values()) {
      if (g.length < 3) continue;
      const cx = g.reduce((a, v) => a + v.x, 0) / g.length, cy = g.reduce((a, v) => a + v.y, 0) / g.length;
      const grupo = document.createElementNS(SVG, "g");
      grupo.setAttribute("class", "cd-loc__grupo");
      grupo.setAttribute("tabindex", "0");
      grupo.setAttribute("role", "button");
      grupo.setAttribute("aria-label", `${g.length} localidades en esta zona: acercar el mapa`);
      const c = document.createElementNS(SVG, "circle");
      c.setAttribute("cx", cx);
      c.setAttribute("cy", cy);
      c.setAttribute("r", (7 + Math.min(9, Math.log2(g.length) * 1.6)) * k);
      const t = document.createElementNS(SVG, "text");
      t.setAttribute("x", cx);
      t.setAttribute("y", cy);
      t.setAttribute("font-size", 8.5 * k);
      t.textContent = g.length > 999 ? "999+" : String(g.length);
      grupo.append(c, t);
      const acercar = () => mostrarZona({ x: cx, y: cy, w: vista.w / 3 });
      grupo.addEventListener("click", acercar);
      grupo.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), acercar()));
      frag.appendChild(grupo);
    }
    sueltos.sort((a, b) => (a.municipio === -1) - (b.municipio === -1));
    for (const it of sueltos) {
      const c = document.createElementNS(SVG, "circle");
      c.setAttribute("cx", it.x);
      c.setAttribute("cy", it.y);
      c.setAttribute("r", (it.ficha ? 6 : it.municipio === -1 ? 3.2 : 2.4) * k);
      c.setAttribute("class", `cd-loc__punto${it.ficha ? " es-ficha" : it.municipio === -1 ? " es-municipio" : ""}${it.i === seleccion ? " es-sel" : ""}`);
      if (it.i === seleccion) c.style.r = `${7 * k}px`;
      c.dataset.i = it.i;
      c.addEventListener("click", () => mostrarTarjeta(it));
      frag.appendChild(c);
    }
    puntos.appendChild(frag);
  }

  function pintarPuntos() {
    if (ext && vista) {
      pintarAgrupados();
      document.querySelectorAll(".cd-loc__region").forEach((p) => p.classList.toggle("es-activa", p.dataset.region === selRegion.value));
      return;
    }
    puntos.textContent = "";
    const frag = document.createDocumentFragment();
    /* Primero comunidades y después municipios, para que estos queden encima */
    const orden = visibles.slice().sort((a, b) => (a.municipio === -1) - (b.municipio === -1));
    for (const it of orden) {
      const c = document.createElementNS(SVG, "circle");
      c.setAttribute("cx", it.x);
      c.setAttribute("cy", it.y);
      c.setAttribute("r", it.ficha ? 6 : it.municipio === -1 ? 3.2 : 1.8);
      c.setAttribute("class", `cd-loc__punto${it.ficha ? " es-ficha" : it.municipio === -1 ? " es-municipio" : ""}${it.i === seleccion ? " es-sel" : ""}`);
      c.dataset.i = it.i;
      c.addEventListener("click", () => mostrarTarjeta(it));
      frag.appendChild(c);
    }
    puntos.appendChild(frag);
    document.querySelectorAll(".cd-loc__region").forEach((p) => p.classList.toggle("es-activa", p.dataset.region === selRegion.value));
  }

  function enlaceDe(it) {
    const base = `/canada-en-datos/${D.provincia.slug}/`;
    if (it.url) return { href: base + it.url, texto: it.ficha ? `Ver la ficha completa de ${it.nombre}` : `Ver información de ${it.nombre}` };
    const m = D.localidades[it.municipio];
    return { href: base + m[7], texto: `Ver el municipio: ${m[0]}` };
  }

  function descripcion(it) {
    const tipo = D.tipos[it.tipo];
    const partes = [tipo[0] === tipo[1] ? tipo[0] : `${tipo[0]} (${tipo[1]})`];
    if (it.municipio !== -1) partes.push(`pertenece a ${D.localidades[it.municipio][0]}`);
    if (it.sub && it.sub !== it.nombre) partes.push(it.sub);
    partes.push(`región ${D.regiones[it.region]}`);
    return partes.join(" · ");
  }

  function mostrarTarjeta(it) {
    seleccion = it.i;
    const t = $("cdLocTarjeta");
    const e = enlaceDe(it);
    t.innerHTML = `<p class="cd-loc__tarjeta-nombre">${esc(it.nombre)}</p>
      <p>${esc(descripcion(it))}</p>
      ${it.poblacion != null ? `<p>Población: ${miles(it.poblacion)} <small>(${esc(D.provincia.poblacion)})</small></p>` : ""}
      <a href="${esc(e.href)}">${esc(e.texto)}</a>
      <button type="button" class="cd-loc__cerrar" aria-label="Cerrar">×</button>`;
    t.hidden = false;
    t.querySelector(".cd-loc__cerrar").addEventListener("click", () => {
      t.hidden = true;
      seleccion = -1;
      pintarPuntos();
    });
    pintarPuntos();
  }

  /* ---------- Filtros y listado ---------- */
  function filtrar() {
    const q = norm(buscar.value.trim());
    const tipo = selTipo.value;
    const region = selRegion.value;
    const sub = selSub ? selSub.value : "";
    const pob = selPob ? selPob.value : "";
    const [pmin, pmax] = /^\d+-\d*$/.test(pob) ? pob.split("-").map((v, i) => (v === "" ? (i ? Infinity : 0) : Number(v))) : [null, null];
    visibles = items.filter((it) => {
      if (q && !it.clave.includes(q)) return false;
      if (region && it.region !== region) return false;
      if (sub && it.sub !== sub) return false;
      if (pob === "con" && it.poblacion == null) return false;
      if (pob === "sin" && it.poblacion != null) return false;
      if (pmin !== null && (it.poblacion == null || it.poblacion < pmin || it.poblacion > pmax)) return false;
      if (tipo.startsWith("grupo:")) return D.tipos[it.tipo][2] === tipo.slice(6);
      return !tipo || it.tipo === tipo;
    });
    const orden = selOrden ? selOrden.value : "";
    if (orden === "az" || orden === "za") visibles.sort((a, b) => a.nombre.localeCompare(b.nombre, "es") * (orden === "az" ? 1 : -1));
    else if (orden === "pob-" || orden === "pob+") visibles.sort((a, b) => (a.poblacion == null) - (b.poblacion == null) || (orden === "pob-" ? (b.poblacion || 0) - (a.poblacion || 0) : (a.poblacion || 0) - (b.poblacion || 0)));
    mostrados = 0;
    lista.textContent = "";
    pintarLista(false);
    if (ext && vista) encuadrar();
    else pintarPuntos();
    estado.textContent = visibles.length
      ? `${miles(visibles.length)} ${visibles.length === 1 ? "localidad encontrada" : "localidades encontradas"} de ${miles(items.length)}.`
      : "No encontramos localidades con esos criterios. Prueba con otro nombre o quita un filtro.";
  }

  function pintarLista(continuar) {
    const desde = mostrados;
    const hasta = Math.min(visibles.length, mostrados + PASO);
    const frag = document.createDocumentFragment();
    for (const it of visibles.slice(desde, hasta)) {
      const li = document.createElement("li");
      li.className = "cd-loc__item" + (it.ficha ? " es-ficha" : "");
      const e = enlaceDe(it);
      li.innerHTML = `<a href="${esc(e.href)}">
          <span class="cd-loc__item-nombre">${esc(it.nombre)}${it.ficha ? ' <span class="cd-loc__marca">Ficha completa</span>' : ""}</span>
          <span class="cd-loc__item-tipo">${esc(descripcion(it))}</span>
          ${it.poblacion != null ? `<span class="cd-loc__item-pob">${miles(it.poblacion)} hab.</span>` : ""}
        </a>`;
      li.addEventListener("mouseenter", () => resaltar(it.i, true));
      li.addEventListener("mouseleave", () => resaltar(it.i, false));
      li.querySelector("a").addEventListener("focus", () => resaltar(it.i, true));
      li.querySelector("a").addEventListener("blur", () => resaltar(it.i, false));
      frag.appendChild(li);
    }
    lista.appendChild(frag);
    mostrados = hasta;
    mas.hidden = mostrados >= visibles.length;
    mas.textContent = `Mostrar más (${miles(visibles.length - mostrados)} restantes)`;
    if (continuar && lista.children[desde]) lista.children[desde].querySelector("a").focus();
  }

  function resaltar(i, si) {
    const c = puntos && puntos.querySelector(`circle[data-i="${i}"]`);
    if (!c) return;
    c.classList.toggle("es-hover", si);
    /* Mapa con acercamiento: el realce mantiene su tamaño en pantalla */
    if (ext && vista) c.style.r = si || c.classList.contains("es-sel") ? `${(7 * vista.w) / D.mapa.ancho}px` : "";
    if (si) puntos.appendChild(c);
  }
})();
