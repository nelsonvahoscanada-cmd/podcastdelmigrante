/*
  Prueba de extremo a extremo del PANEL (revisión de solicitudes), después de
  tests/e2e-registro.cjs (usa las tres solicitudes que esa prueba crea).
  Panel local con identidad de desarrollo (nunca funciona en Cloudflare):
    admin-worker/.dev.vars → ALLOW_LOCAL_DEV=1
    wrangler.toml con los mismos bindings (DB, DIRECTORIO_DB, SOLICITUDES)
    apuntando a la base y al bucket locales del sitio (--persist-to compartido)
    npx wrangler dev --port 8790 --persist-to <carpeta>
  Ejecutar: node tests/e2e-panel.cjs      (PANEL=…, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const PANEL = process.env.PANEL || "http://127.0.0.1:8790";
const OUT = process.env.SHOTS ? process.env.SHOTS.replace(/\/?$/, "/") : "";
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1366, height: 1000 } });
  const errs = []; pg.on("pageerror", (e) => errs.push(e.message));
  pg.on("requestfailed", (r) => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) errs.push("falló: " + r.url().slice(0, 60)); });
  await pg.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await pg.goto(PANEL + "/solicitudes"); await pg.waitForSelector(".sol-item");
  console.log("7. Lista:", await pg.$$eval(".sol-item__name", (e) => e.map((x) => x.textContent)), "|", await pg.textContent("#counts"));
  // 8. Abrir detalle e imagen privada
  await pg.click(".sol-item >> text=Panadería La Esquina"); await pg.waitForSelector(".preview img");
  await pg.waitForFunction(() => document.querySelector(".preview img").naturalWidth > 0);
  const w = await pg.evaluate(() => document.querySelector(".preview img").naturalWidth);
  console.log("8. Detalle abierto · imagen privada cargada:", w, "px · correo privado visible:", (await pg.textContent("#detail")).includes("ana@example.com"));
  console.log("   Historial inicial:", await pg.$$eval(".sol-history tbody tr", (r) => r.map((x) => x.cells[1].textContent + " (" + x.cells[2].textContent + ")")));
  // 9. Cambios de estado
  const F = "#statusForm";
  const save = async () => {
    await pg.evaluate(() => { document.querySelector("#status").textContent = ""; });
    const [res] = await Promise.all([pg.waitForResponse((r) => r.url().endsWith("/estado")), pg.click(`${F} [type=submit]`)]);
    await pg.waitForTimeout(700);
    return `${res.status()} ${(await res.json()).error || "Cambios guardados."}`;
  };
  await pg.selectOption(`${F} [name=status]`, "en_revision"); await pg.fill(`${F} [name=notes]`, "Revisar fotos y llamar el lunes");
  console.log("9. → En revisión:", await save());
  await pg.selectOption(`${F} [name=status]`, "aprobada");
  console.log("   → Aprobada SIN aprobación del empresario:", await save());
  await pg.check(`${F} [name=ownerApproved]`); await pg.selectOption(`${F} [name=status]`, "aprobada");
  console.log("   → Aprobada con aprobación:", await save(), "| insignia:", await pg.textContent(".sol-detail__head .badge"));
  // rechazar otra
  const tid = await pg.$eval(".sol-item:has-text('Transportes Andes')", (b) => b.dataset.id);
  await pg.goto(PANEL + "/solicitudes?id=" + tid); await pg.waitForSelector(F);
  await pg.selectOption(`${F} [name=status]`, "rechazada"); await pg.fill(`${F} [name=notes]`, "No es negocio latino en Alberta");
  console.log("   → Transportes Andes rechazada:", await save());
  // 10. Recargar: la información se conserva
  await pg.goto(PANEL + "/solicitudes"); await pg.waitForSelector(".sol-item");
  console.log("10. Tras recargar:", await pg.textContent("#counts"));
  await pg.click(".sol-item >> text=Panadería La Esquina"); await pg.waitForSelector(".sol-history");
  const hist = await pg.$$eval(".sol-history tbody tr", (r) => r.map((x) => [...x.cells].map((c) => c.textContent).join(" | ")));
  console.log("    Historial Panadería:\n     " + hist.join("\n     "));
  if (OUT) await pg.locator("#detail").screenshot({ path: OUT + "panel-historial.png" });
  // filtros
  await pg.selectOption("#statusFilter", "rechazada"); await pg.waitForTimeout(500);
  console.log("    Filtro Rechazadas:", await pg.$$eval(".sol-item__name", (e) => e.map((x) => x.textContent)));
  await pg.selectOption("#statusFilter", "aprobada"); await pg.waitForTimeout(500);
  console.log("    Filtro Aprobadas:", await pg.$$eval(".sol-item__name", (e) => e.map((x) => x.textContent)));
  // 11. Eliminación de datos: registrar el pedido, confirmación errónea, eliminar, pasos manuales
  await pg.selectOption("#statusFilter", ""); await pg.waitForTimeout(400);
  await pg.goto(PANEL + "/solicitudes?id=" + tid); await pg.waitForSelector("#delScheduleForm");
  await pg.selectOption("#delScheduleForm [name=channel]", "correo"); await pg.fill("#delScheduleForm [name=notes]", "Pidió eliminar sus datos");
  await Promise.all([pg.waitForResponse((r) => r.url().endsWith("/eliminacion")), pg.click("#delScheduleForm [type=submit]")]);
  await pg.waitForSelector("#delExecuteForm");
  const badge = await pg.$eval(`.sol-item[data-id='${tid}']`, (b) => b.textContent.includes("Eliminación programada"));
  console.log("11. Pedido registrado · insignia en la lista:", badge, "· plazo:", (await pg.textContent(".sol-del p")).match(/más tardar el ([^(]+)/)[1].trim());
  await pg.fill("#delExecuteForm [name=confirm]", "SOL-EQUIVOCADO"); await pg.click("#delExecuteForm [type=submit]");
  await pg.waitForTimeout(300);
  console.log("    Confirmación errónea:", await pg.textContent("#status"), "· sigue en la lista:", !!(await pg.$(`.sol-item[data-id='${tid}']`)));
  pg.once("dialog", (d) => d.accept());
  await pg.fill("#delExecuteForm [name=confirm]", tid);
  const [delRes] = await Promise.all([pg.waitForResponse((r) => r.url().endsWith("/eliminacion")), pg.click("#delExecuteForm [type=submit]")]);
  await pg.waitForTimeout(800);
  console.log("    Eliminar definitivamente:", delRes.status(), "·", await pg.textContent("#status"));
  console.log("    Ya no está en la lista:", !(await pg.$(`.sol-item[data-id='${tid}']`)), "· imagen:", (await pg.request.get(PANEL + `/api/solicitudes/${tid}/imagen`)).status());
  await pg.click("#deletions [data-step=gmail]"); await pg.waitForTimeout(500);
  await pg.click("#deletions [data-step=respuesta]"); await pg.waitForTimeout(500);
  console.log("    Registro de eliminaciones:", await pg.$$eval("#deletions tbody tr", (r) => r.map((x) => [...x.cells].map((c) => c.textContent.trim()).join(" | "))));
  if (OUT) await pg.locator(".sol-deletions").screenshot({ path: OUT + "panel-eliminaciones.png" });
  console.log("    Errores JS/CSP:", JSON.stringify(errs));
  // móvil
  const m = await b.newPage(devices["iPhone 13"]); await m.route(/fonts\./, (r) => r.abort());
  await m.goto(PANEL + "/solicitudes"); await m.waitForSelector(".sol-item");
  await m.click(".sol-item >> text=Panadería La Esquina"); await m.waitForSelector(".sol-history");
  console.log("    Móvil: sin desplazamiento horizontal:", await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  if (OUT) await m.screenshot({ path: OUT + "panel-movil-historial.png", fullPage: true });
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
