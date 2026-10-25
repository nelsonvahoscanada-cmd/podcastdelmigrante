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
      clave: norm(f[0]),
    }));
    /* Orden: fichas completas, municipios (de mayor a menor población) y después comunidades, por nombre */
    const peso = (x) => (x.ficha ? 0 : x.municipio === -1 ? 1 : 2);
    items.sort((a, b) => peso(a) - peso(b) || (b.poblacion || 0) - (a.poblacion || 0) || a.nombre.localeCompare(b.nombre, "es"));
    dibujarMapa();
    [buscar, selTipo, selRegion].forEach((c) => (c.disabled = false));
    let t = null;
    buscar.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(filtrar, 120);
    });
    selTipo.addEventListener("change", filtrar);
    selRegion.addEventListener("change", filtrar);
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
    const ficha = document.createElement("div");
    ficha.className = "cd-loc__tarjeta";
    ficha.id = "cdLocTarjeta";
    ficha.hidden = true;
    figura.appendChild(ficha);
  }

  function pintarPuntos() {
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
    visibles = items.filter((it) => {
      if (q && !it.clave.includes(q)) return false;
      if (region && it.region !== region) return false;
      if (tipo.startsWith("grupo:")) return D.tipos[it.tipo][2] === tipo.slice(6);
      return !tipo || it.tipo === tipo;
    });
    mostrados = 0;
    lista.textContent = "";
    pintarLista(false);
    pintarPuntos();
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
    if (si) puntos.appendChild(c);
  }
})();
