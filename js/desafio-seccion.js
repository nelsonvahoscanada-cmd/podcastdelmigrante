/* =========================================================
   desafio-seccion.js — Interacción de /desafio-100-empresas/
   ---------------------------------------------------------
   Las páginas son estáticas (scripts/build-desafio.mjs): sin
   JavaScript se ve todo el contenido. Este archivo solo agrega:
   - filtros por categoría en el archivo de entrevistas;
   - búsqueda y filtro por estado en el Muro del Legado;
   - el reproductor de video (js/video-cover.js), que se conecta
     con YouTube solo al pulsar «Reproducir».
========================================================= */
(function () {
  function filtrosCategoria() {
    const rejilla = document.getElementById("dzRejilla");
    if (!rejilla) return;
    const botones = document.querySelectorAll("[data-dz-categoria]");
    const tarjetas = rejilla.querySelectorAll("[data-categoria]");
    botones.forEach((b) =>
      b.addEventListener("click", () => {
        const c = b.getAttribute("data-dz-categoria");
        botones.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        tarjetas.forEach((t) => {
          t.hidden = c !== "todas" && t.getAttribute("data-categoria") !== c;
        });
      })
    );
  }

  function muro() {
    const q = document.getElementById("dzBuscarMuro");
    if (!q) return;
    const items = document.querySelectorAll("#dzMuro [data-estado]");
    const botones = document.querySelectorAll("[data-dz-estado]");
    const vacio = document.getElementById("dzMuroVacio");
    let estado = "todos";
    function aplicar() {
      const t = q.value.trim().toLowerCase();
      let visibles = 0;
      items.forEach((i) => {
        const ok = (estado === "todos" || i.getAttribute("data-estado") === estado) && (!t || i.getAttribute("data-texto").includes(t));
        i.hidden = !ok;
        if (ok) visibles++;
      });
      if (vacio) vacio.hidden = visibles > 0;
    }
    q.addEventListener("input", aplicar);
    botones.forEach((b) =>
      b.addEventListener("click", () => {
        estado = b.getAttribute("data-dz-estado");
        botones.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        aplicar();
      })
    );
  }

  document.addEventListener("DOMContentLoaded", () => {
    filtrosCategoria();
    muro();
    if (window.VideoCover) window.VideoCover.bind(document);
  });
})();
