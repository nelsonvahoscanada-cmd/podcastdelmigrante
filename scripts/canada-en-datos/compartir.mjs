/*
  compartir.mjs — Bloque «Compartir esta guía» de Canadá en Datos
  ======================================================================
  Lo usan las fichas provinciales (scripts/build-canada-datos.mjs) y las
  fichas de localidades (scripts/canada-en-datos/localidades.mjs).

  - Comparte siempre la URL permanente (canónica) de la página abierta,
    nunca la de la vista previa ni la de la portada de Canadá.
  - Sin JavaScript también funciona: los enlaces de WhatsApp, Facebook,
    X y correo son enlaces normales.
  - Con JavaScript (js/canada-compartir.js): «Compartir esta guía» abre
    el menú nativo del teléfono o del sistema (Web Share API) y, si no
    existe, muestra los enlaces de redes; «Copiar enlace» copia la URL y
    lo confirma en un mensaje accesible (role="status").
*/

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

/* Iconos simples (sin dependencias externas) */
const ICONOS = {
  compartir: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  copiar: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/**
 * @param {{ url: string, titulo: string, texto: string, lugar: string }} o
 *   url    URL permanente y absoluta (la misma de <link rel="canonical">)
 *   titulo título para compartir (el de la página, sin la marca)
 *   texto  frase breve que acompaña al enlace en los mensajes
 *   lugar  nombre de la provincia o localidad (para las etiquetas accesibles)
 */
export function compartirHtml({ url, titulo, texto, lugar }) {
  const msg = `${texto} ${url}`;
  const redes = [
    ["whatsapp", "WhatsApp", `https://wa.me/?text=${encodeURIComponent(msg)}`],
    ["facebook", "Facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`],
    ["x", "X", `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`],
    ["correo", "Correo", `mailto:?subject=${encodeURIComponent(titulo)}&body=${encodeURIComponent(msg)}`],
  ];
  return `<div class="cd-share" data-cd-share data-url="${esc(url)}" data-titulo="${esc(titulo)}" data-texto="${esc(texto)}">
          <p class="cd-share__titulo" id="cdShareTitulo">Comparte esta guía de ${esc(lugar)}</p>
          <div class="cd-share__acciones">
            <button type="button" class="cd-share__btn cd-share__btn--principal" data-share-nativo aria-describedby="cdShareTitulo">${ICONOS.compartir}<span>Compartir esta guía</span></button>
            <button type="button" class="cd-share__btn" data-share-copiar aria-describedby="cdShareTitulo">${ICONOS.copiar}<span>Copiar enlace</span></button>
          </div>
          <p class="cd-share__redes" data-share-redes>También en: ${redes.map(([k, n, h]) => `<a class="cd-share__red cd-share__red--${k}" href="${esc(h)}"${k === "correo" ? "" : ' target="_blank" rel="noopener"'} aria-label="Compartir la guía de ${esc(lugar)} por ${n}">${n}</a>`).join(" · ")}</p>
          <p class="cd-share__url"><span>Enlace permanente:</span> <a href="${esc(url)}">${esc(url.replace(/^https:\/\//, ""))}</a></p>
          <p class="cd-share__estado" data-share-estado role="status" aria-live="polite"></p>
        </div>`;
}
