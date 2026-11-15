/*
  enlaces-definitivos.mjs — enlaces internos a la URL final
  ======================================================================
  Cloudflare Pages sirve cada página sin «.html» y redirige (308) la
  variante con extensión: /index.html → /, /guia.html?… → /guia?…,
  /quien-puede-ayudarte.html → /quien-puede-ayudarte. Los enlaces del
  sitio deben apuntar directamente a la URL final, sin esa redirección.

  enlacesDefinitivos(html) reescribe SOLO el valor de href="…" de esos
  enlaces internos (con o sin «/» inicial). No toca el texto, los enlaces
  externos ni ningún otro atributo. Lo usan:
    - scripts/build-desafio.mjs y scripts/build-ediciones.mjs, sobre la
      cabecera y el pie que copian de 404.html;
    - tests/seo-enlaces.test.mjs, que comprueba que las páginas públicas
      (salvo las excepciones documentadas allí) no enlacen a URL con .html.
  404.html y las páginas de Canadá en Datos conservan su cabecera (fuera
  del alcance de este cambio).
*/
const PAGINAS = "index|guia|guia-ruta|quien-puede-ayudarte|historia|historia-vida|columna|colaborador|noticias|planes-directorio|registra-tu-empresa|perfil-[a-z0-9-]+";

export function enlacesDefinitivos(html) {
  return String(html)
    .replace(new RegExp(`href="(/?)(${PAGINAS})\\.html(?=[?#"])`, "g"), (_, barra, pagina) => (pagina === "index" ? 'href="/' : `href="${barra}${pagina}`));
}

/* conFundador(html): enlace «Fundador» (→ /perfil-nelson-vahos) en la columna
   «El medio» del pie, justo después de «Puntos de distribución». Una sola vez:
   si el enlace ya está, no cambia nada. Lo usan build-desafio.mjs y
   build-ediciones.mjs sobre el pie que copian de 404.html; las demás páginas
   lo traen escrito en su HTML. 404.html y Canadá en Datos no lo llevan
   (excepción pendiente de autorización: regenerar sus 4.193 páginas). */
export const ENLACE_FUNDADOR = '<a href="/perfil-nelson-vahos">Fundador</a>';
export function conFundador(html) {
  const s = String(html);
  if (s.includes(ENLACE_FUNDADOR)) return s;
  return s.replace(/\n([ \t]*)(<a href="[^"]*#distribution">Puntos de distribución<\/a>)/, (_, sangria, enlace) => `\n${sangria}${enlace}\n${sangria}${ENLACE_FUNDADOR}`);
}
