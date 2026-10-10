# Auditoría de cumplimiento, privacidad, accesibilidad y transparencia

**Sitio:** podcastdelmigrante.com (El Podcast del Migrante · eRadio Global Corp., Alberta)
**Fecha:** 10 de octubre de 2026
**Base revisada:** rama `main` (commit `93a38ae`). PR #18 (Directorio) excluido salvo donde se indica.
**Alcance:**
- 29 páginas HTML, las plantillas JS y CSS, `functions/`, `_routes.json` y los formularios;
- herramientas de terceros, almacenamiento en el navegador y avisos;
- accesibilidad con axe-core 4.14 (reglas WCAG 2.0/2.1/2.2 A y AA) en escritorio y móvil (iPhone 13), más comprobaciones de teclado, encabezados y landmarks.

> Esta auditoría no es una opinión legal ni una certificación. No afirma
> conformidad con WCAG ni con ninguna ley: identifica riesgos y propone
> medidas. La conformidad WCAG requiere además pruebas manuales con lectores
> de pantalla (pendientes, ver la etapa 5).

---

## 1. Lo que ya cumple o está bien encaminado

**Privacidad y datos**
- Ningún código propio instala cookies. No hay Google Analytics, Meta Pixel, Tag Manager, publicidad ni rastreadores de terceros.
- La medición propia de perfiles (`js/analytics.js` → `/api/events`) envía:
  - el tipo de evento, la página, el perfil, el dominio de procedencia, los parámetros utm y el tipo de dispositivo;
  - ningún nombre, correo ni teléfono.

  Los utm se guardan solo en `sessionStorage`, que se borra al cerrar la pestaña. *Pendiente confirmar qué guarda el Worker de estadísticas, cuyo código no está en este repositorio.*
- El formulario del Directorio (cerrado al público):
  - distingue los datos públicos de los privados;
  - pide tres consentimientos separados y sin premarcar;
  - no tiene casilla promocional;
  - aplica minimización de datos, Turnstile, IP solo como huella cifrada y almacenamiento privado (D1 y R2 sin enlaces públicos);
  - publica solo con la aprobación del negocio.
- El panel privado está protegido con Cloudflare Access, y en cada petición se vuelven a verificar el JWT y `ADMIN_EMAILS`.
- No hay claves ni secretos en el código.

**Editorial**
- Las noticias identifican al autor o a la Redacción.
- 14 de 16 artículos incluyen «Fuentes consultadas» con enlaces oficiales. Los 2 que no las tienen son textos de opinión o experiencia personal.
- 11 de 16 artículos muestran un aviso de «Información importante» según la materia (migración, finanzas, salud, vivienda, educación, comunidad).
- La sección de patrocinadores es honesta («Espacio disponible», «próximamente»). No hay patrocinadores ficticios.
- Los perfiles empresariales no muestran testimonios: el campo `testimonials` está vacío en todos.

**Accesibilidad**
- Todas las páginas tienen `lang="es"`, un único `h1` visible, `<main>` y un enlace «Saltar al contenido». La excepción es `guia-carlos/`.
- El foco del teclado es visible en los primeros 12 elementos de cada página probada.
- No hay desplazamiento horizontal en móvil (390 px) en ninguna página.
- Todas las fotos de las noticias tienen texto alternativo descriptivo.
- Los videos de historias y perfiles solo se cargan al pulsar «reproducir».

---

## 2. Hallazgos por gravedad

### Crítico

| # | Hallazgo | Evidencia | Acción |
|---|---|---|---|
| C1 | Una noticia publicada muestra el texto **«Foto: [CRÉDITO/FUENTE POR CONFIRMAR]»** bajo la imagen de un evento real (corte de cinta). No hay constancia de licencia: riesgo de infracción de derechos de autor y mala imagen editorial. | `articulo-nueva-via-jbs-brooks-highway-873`, `heroImage.credit` en `js/articles.js` | Propietario: confirmar la fuente y la licencia y poner el crédito real, o reemplazar la foto. |

### Alto

| # | Hallazgo | Evidencia | Acción |
|---|---|---|---|
| A1 | **No existen** política de privacidad, términos, política editorial ni página de contacto. Los enlaces del pie «Privacidad», «Términos», «Política editorial», «Correcciones», «Contacto» y «Publicidad» apuntan a `#` (portada) o a `index.html#` (el resto de páginas). | 29 páginas; 19 enlaces `#` en la portada | Etapa 2: publicar los documentos aprobados y corregir los enlaces en las 29 páginas y en los generadores. |
| A2 | Falta la identificación de la empresa y un contacto de privacidad. Solo figura «eRadio Global Corp. Canadá» y una cuenta Gmail. PIPA exige poder indicar quién responde preguntas sobre privacidad. | pie de página; formulario | Propietario: razón social, dirección y responsable de privacidad (ver `docs/legal/README.md`). |
| A3 | 14 de 16 fotos de noticias **sin crédito ni fuente**. Al menos una es una ilustración de una figura pública real (el primer ministro Carney ante el Parlamento) sin la leyenda «ilustrativa» o «IA». | `heroImage.credit` vacío; alt «…ilustrando sus declaraciones…» | Propietario: inventario de origen y licencia de cada imagen; etiquetar las ilustraciones o imágenes de IA (política en el doc. 05). |
| A4 | **Posibles relaciones comerciales sin divulgar.** Un video agradece a Country Hills Toyota «por su respaldo al proyecto» y menciona a Tomás Velázquez, que tiene un perfil en el Directorio. Si hay patrocinio, pago, canje o un perfil gratuito, debe indicarse (Competition Act, publicidad engañosa). | portada, sección de videos («Desafío 100 Empresas») | Propietario: confirmar las relaciones y etiquetar «En alianza con…» o «Patrocinado». |
| A5 | Cloudflare Pages publica **la raíz del repositorio**. Las carpetas `admin-worker/`, `db/`, `docs/`, `tests/`, `scripts/` y `functions/` quedan accesibles como archivos: código del panel, esquema de la base y guías internas. No contienen claves. | sin `_headers`, `_redirects` ni archivo de exclusión; directorio de salida = raíz | **Corregido en el PR** (404 vía middleware + `robots.txt`). Verificar en producción tras fusionar. |
| A6 | El texto de consentimiento del Directorio dice «no se ceden a terceros», pero los datos pasan por proveedores (Cloudflare, Resend, Google/Gmail), en su mayoría fuera de Canadá. PIPA s. 13.1 exige informar del uso de proveedores fuera de Canadá. | `registra-tu-empresa.html` (formulario cerrado) | Antes de abrir el Directorio: nuevo texto (propuesto en la sección 5) y enlace a la política. |
| A7 | Licencia **MIT** en `/LICENSE`, que cubre «el Software y los archivos de documentación asociados» del repositorio. Contradice el «Todos los derechos reservados» del pie y podría leerse como licencia libre sobre textos e imágenes. | `LICENSE` | Propietario y abogado: limitarla al código o retirarla (ver el doc. 04). |
| A9 | **El repositorio de GitHub es público.** Todo su contenido, incluidas todas las ramas, los PR, esta auditoría y los borradores legales, es legible por cualquiera en github.com, más allá de lo que sirva el sitio web. Revisión del historial completo (86 commits, todas las ramas): **no hay claves, tokens ni credenciales**. Solo hay los correos de contacto publicados en los perfiles y vCards, los ID de las bases D1 (que no son secretos) y los correos de autor de los commits. | GitHub → visibilidad «public» | Propietario: decidir si el repositorio pasa a **privado**. Cloudflare Pages sigue funcionando si su aplicación de GitHub tiene acceso al repositorio. Las fotos retiradas en el PR #20 siguen en el historial público. |
| A8 | Plazos de conservación sin definir. Hoy las solicitudes, imágenes, eventos y correos se guardan indefinidamente. | D1, R2, Gmail | Propietario: fijar plazos; luego automatizar el borrado. |

### Medio

| # | Hallazgo | Estado |
|---|---|---|
| M1 | Contraste insuficiente (WCAG 1.4.3) en: descripción de videos (2.9:1), número de «Lo más leído» (1.4:1), créditos y pies de foto (3.4:1), indicador de idioma (1.4:1) y 4 etiquetas pequeñas (3.0–3.4:1). | **Corregido en el PR** |
| M2 | Tarjetas de video con `aria-label` distinto del texto visible (WCAG 2.5.3, *Label in Name*). | **Corregido en el PR** |
| M3 | El boletín de la portada aceptaba un correo y respondía «Gracias» sin guardarlo. Es engañoso, y al activarse requerirá consentimiento expreso CASL. | **Corregido en el PR**: desactivado, con «Por ahora no recopilamos correos». |
| M4 | Videos de las noticias incrustados desde `youtube.com`, que se cargan al llegar a la sección. | **Parcialmente corregido en el PR**: ahora `youtube-nocookie.com` en noticias, historias y Desafío. Propuesto: carga al pulsar también en noticias. |
| M5 | Google Fonts en todas las páginas: la IP del visitante llega a Google. | Propuesto: alojar las fuentes en el propio sitio (etapa 2). |
| M6 | El artículo sobre certificaciones de trabajo (oficios regulados) no tiene aviso. Tampoco lo tienen el de JBS/Highway 873, el del impuesto a la gasolina, «100 empresarios» y el texto personal; en esos cuatro es opcional. | Propuesto: añadir `disclaimerCategory` al de certificaciones. |
| M7 | No hay registro visible de correcciones ni de fechas de actualización en los artículos. | Propuesto con la política editorial (doc. 05). |

### Bajo

| # | Hallazgo | Estado |
|---|---|---|
| B1 | Encabezados del pie (`h4`) que saltan niveles desde `h2`, y `h1`→`h3` en portada y directorio (WCAG 1.3.1, buena práctica). | Propuesto con la etapa 2 (pie). |
| B2 | `guia-carlos/` sin `<main>` ni enlace «saltar al contenido». | Propuesto (no se modificó, para no tocar la guía de Carlos sin aprobación). |
| B3 | Sin página 404: las rutas inexistentes muestran la portada con código 200. | Propuesto (requiere revisar que nada dependa de ese comportamiento). |
| B4 | Las miniaturas de video se cargan desde `img.youtube.com` (la IP llega a Google). | Opcional: miniaturas locales. |
| B5 | Enlace «Panel privado» en el pie de página público. | Aceptable: está protegido con Access. Opcional: quitarlo. |

**Precios, cancelaciones y reembolsos:** no aplica hoy, porque no hay servicios pagados. Queda una plantilla condicional (doc. 07) que **no** debe publicarse hasta que exista un servicio pagado.

---

## 3. Inventario de terceros y tecnologías

| Servicio | Dónde | Recibe | Necesario |
|---|---|---|---|
| Cloudflare (Pages, Workers, D1, R2, Turnstile, Access) | Todo el sitio; Directorio; panel | Datos técnicos (IP, navegador); solicitudes; imágenes; eventos | Sí (alojamiento y seguridad) |
| Google Fonts | Todas las páginas | IP del visitante | No (puede alojarse localmente) |
| YouTube / `youtube-nocookie.com` / `img.youtube.com` | Noticias con video, historias, Desafío, perfiles; miniaturas en la portada | IP; datos de reproducción | No (contenido opcional) |
| Resend | Correos del Directorio | Datos de la solicitud | Sí para el Directorio |
| Google (Gmail) | Bandeja `podcastdelmigrante@gmail.com` | Avisos de solicitudes con imagen | Recomendado: buzón del dominio |
| Facebook, Instagram, TikTok, LinkedIn, WhatsApp | Solo enlaces (sin incrustar ni píxeles) | Nada hasta que la persona hace clic | — |

**Almacenamiento en el navegador:** solo `sessionStorage.pdm_utm`. Cookies de terceros posibles, pendientes de verificar en el navegador:
- `__cf_bm`, si la gestión de bots de Cloudflare está activa;
- Turnstile, en el registro;
- YouTube, al reproducir.

**¿Gestor de consentimiento?** Hoy **no es necesario**: no hay tecnologías no esenciales que se carguen sin acción de la persona, salvo las fuentes y las miniaturas de Google, que no usan cookies. Bastan la política de cookies y la de privacidad. Si se añade analítica de terceros, publicidad o píxeles, habrá que implementar un gestor que bloquee esas herramientas hasta que la persona acepte, y que permita aceptar, rechazar y cambiar la decisión.

---

## 4. Cambios técnicos de este Pull Request (bajo riesgo)

1. `_routes.json` + `functions/_middleware.js`: las carpetas internas responden 404 con `noindex`. `robots.txt` también las excluye. Pruebas nuevas en `tests/pages-function.test.mjs`.
2. `js/article.js`, `js/life-story.js` y `js/desafio-story.js`: los videos se incrustan desde `youtube-nocookie.com`.
3. `css/styles.css` y `css/article.css`: correcciones de contraste. El nuevo token `--gris-texto: #6b6b6b` se aplica solo al texto sobre fondo claro; los bordes y el pie oscuro no cambian.
4. `js/main.js`: el nombre accesible de las tarjetas de video es su texto visible, más «(abre YouTube en una pestaña nueva)». Se añade la utilidad `.sr-only`.
5. `index.html`: el boletín queda desactivado y se avisa de que no se recopilan correos.
6. `docs/legal/`: borradores ES/EN de los 7 documentos y la lista de datos por confirmar. No se publican: `docs/` responde 404.

**Resultado:**
- axe-core: **0 infracciones automáticas** en 30 páginas (16 noticias, portada, Directorio, perfiles, guías, historias, columnas y colaborador), en escritorio y móvil. Antes había 4 tipos de infracción.
- Pruebas: 40/40 del sitio y 21/21 del panel; verificaciones de perfiles y noticias correctas.

---

## 5. Texto propuesto para el consentimiento del Directorio (antes de abrirlo)

> **Autorizo** a eRadio Global Corp. (El Podcast del Migrante) a tratar los
> datos de esta solicitud para evaluarla, contactarme y preparar mi perfil,
> según la [Política de privacidad]. No vendemos tus datos; los tratan
> proveedores que nos prestan servicios de alojamiento y correo, algunos
> fuera de Canadá. Puedes pedir su corrección o eliminación escribiendo a
> [correo de privacidad].

El resto de casillas se mantiene igual. Al cambiar el texto, subir la versión del consentimiento (`CONSENT_VERSION`).

---

## 6. Plan por etapas

| Etapa | Qué | Quién | Riesgo |
|---|---|---|---|
| **0 — Inmediato** | C1 (crédito de foto); verificar A5 abriendo `podcastdelmigrante.com/admin-worker/wrangler.toml` y `/docs/directorio-solicitudes.md` (hoy deberían abrirse; tras el PR, 404); confirmar A4 | Propietario | Alto si se demora |
| **1** | Revisar y fusionar este PR | Propietario | Bajo |
| **2** | Completar los `[PENDIENTE]` → revisión legal → páginas HTML ES/EN (privacidad, cookies, términos, derechos, editorial, contacto, correcciones) → corregir el pie en las 29 páginas y los generadores → créditos y etiquetas de imágenes → fuentes locales → carga al pulsar en los videos de noticias → avisos faltantes | Propietario + técnico | Medio (toca todas las páginas) |
| **3 — Antes de abrir el Directorio** | Nuevo texto de consentimiento (sección 5) y enlaces a la privacidad y a las condiciones para empresas; plazos de conservación y procedimiento de borrado (en el PR #18 o posterior) | Técnico | Bajo |
| **4 — Si hay servicios pagados o boletín** | Doc. 07 con precios; consentimiento CASL separado y baja en un clic; gestor de consentimiento si se añaden herramientas no esenciales | Propietario + técnico | — |
| **5 — Accesibilidad manual** | NVDA + Firefox, VoiceOver iOS, TalkBack Android; recorrido completo con teclado; zoom al 200 % y reflujo al 400 %; formularios con errores; luego declaración de accesibilidad | Técnico + usuarios | — |

---

## 7. Pruebas necesarias antes de publicar los textos legales

1. Todos los `[PENDIENTE]`, `[DECIDIR]` y `[VERIFICAR]` resueltos. Buscarlos en `docs/legal/`: no debe quedar ninguno.
2. Revisión legal (Alberta: PIPA, consumo, medios) y aprobación escrita del propietario.
3. Las versiones ES y EN son equivalentes: mismas secciones y mismos datos.
4. Comprobar en el navegador las cookies y el almacenamiento reales en las páginas principales y en el registro, y ajustar la política de cookies.
5. Enlaces del pie que funcionan en las 29 páginas y en las páginas generadas (`--check` de los generadores).
6. axe-core sin infracciones en las páginas legales nuevas; lectura con un lector de pantalla.
7. Fecha de «última actualización» en cada documento y en el historial de versiones.
