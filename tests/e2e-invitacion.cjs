/*
  Prueba de extremo a extremo de las invitaciones del Directorio Empresarial
  en computador, tableta y celular, con el servidor SIMULADO en el navegador
  (la lógica del servidor la cubren tests/membresias.test.mjs y
  admin-worker/test/membresias.test.js sobre SQLite real):
    - /invitacion#c=… de cortesía: textos exactos, el código sale de la barra
      de direcciones y solo viaja en el cuerpo del POST;
    - «Activar mi membresía» → formulario con el plan fijado y el aviso; el
      envío lleva invitationCode; tras confirmar, el código se borra;
    - invitación ya usada, inválida, no disponible; registro cerrado;
    - el servidor rechaza el código al enviar → el formulario sigue como una
      solicitud normal con los datos intactos;
    - sin desbordes horizontales ni errores de JavaScript.
  Nunca contacta el servidor real: /registro/*, /api/* y Turnstile se simulan.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-invitacion.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8890";
const SHOTS = process.env.SHOTS || "";
const ROOT = path.join(__dirname, "..");
const CODE = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
const PERFILES = {
  computador: { viewport: { width: 1440, height: 900 } },
  tableta: { ...devices["iPad Mini"] },
  celular: { ...devices["iPhone 13"] },
};
const FAKE_TURNSTILE = `window.turnstile={o:null,t:'',render(box,o){this.o=o;const i=document.createElement('input');i.type='hidden';i.name='cf-turnstile-response';box.appendChild(i);this.i=i;setTimeout(()=>this.ok(),30);return 'w1';},ok(){this.t='token-ok';this.i.value=this.t;this.o.callback&&this.o.callback(this.t);},getResponse(){return this.t;},isExpired(){return false;},reset(){this.t='';this.i.value='';setTimeout(()=>this.ok(),30);}};`;
const GIFT = { ok: true, kind: "PREMIUM_GIFT", label: "Premium de cortesía", price: "$0 CAD, sin mensualidad y sin vencimiento", plan: "premium", businessName: "Santa Latino", contactName: "Héctor", registroAbierto: true };

async function abrir(browser, perfil, invitacion, enviar) {
  const ctx = await browser.newContext({ ...PERFILES[perfil], locale: "es-CA", timezoneId: "America/Edmonton" });
  const page = await ctx.newPage();
  const s = { page, ctx, errores: [], urls: [], invitacionPosts: [], envios: [] };
  page.on("pageerror", (e) => s.errores.push(e.message));
  page.on("request", (r) => s.urls.push(r.url()));
  await ctx.route("https://challenges.cloudflare.com/**", (r) => r.fulfill({ contentType: "text/javascript", body: FAKE_TURNSTILE }));
  await ctx.route(/\/api\//, (r) => r.fulfill({ contentType: "application/json", body: "{}" }));
  await ctx.route("**/registro/config", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ready: true, turnstileSiteKey: "1x00000000000000000000AA" }) }));
  await ctx.route("**/registro/invitacion", (r) => {
    s.invitacionPosts.push({ method: r.request().method(), body: r.request().postData() || "" });
    const [status, json] = invitacion;
    r.fulfill({ status, contentType: "application/json", body: JSON.stringify(json) });
  });
  await ctx.route("**/registro/enviar", (r) => {
    const texto = (r.request().postDataBuffer() || Buffer.alloc(0)).toString("utf8");
    const campo = (n) => (texto.match(new RegExp(`name="${n}"\\r\\n\\r\\n([^\\r]*)`)) || [])[1] || "";
    s.envios.push({ plan: campo("plan"), invitationCode: campo("invitationCode"), name: campo("name") });
    const [status, json] = (enviar || []).shift() || [201, { ok: true, requestId: "SOL-20261104-ABCDEF" }];
    r.fulfill({ status, contentType: "application/json", body: JSON.stringify(json) });
  });
  return s;
}

async function sinDesborde(page, donde) {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw + 1, `${donde}: desplazamiento horizontal ${sw} > ${cw}`);
}
const visible = (page, sel) => page.locator(sel).isVisible();

async function llenar(page) {
  await page.selectOption("#fCategory", "vivienda");
  await page.fill("#fCity", "Calgary");
  await page.selectOption("#fProvince", "Alberta");
  await page.fill("#fRepresentative", "Héctor");
  await page.fill("#fSummary", "Reseña de prueba.");
  await page.fill("#fServices", "Servicios de prueba.");
  await page.fill("#fEmail", "prueba@example.com");
  await page.fill("#fWhatsapp", "1 403 555 0000");
  await page.check("input[name=imageKind][value=logo]");
  await page.setInputFiles("#fImage", path.join(ROOT, "assets/logo.png"));
  await page.waitForSelector("#imagePreview:not([hidden])");
  for (const n of ["consentData", "consentRights", "consentPublish"]) await page.check(`input[name=${n}]`);
}

(async () => {
  const browser = await chromium.launch();
  for (const perfil of Object.keys(PERFILES)) {
    /* 1. Cortesía válida → formulario → envío con el código → confirmación */
    let s = await abrir(browser, perfil, [200, GIFT]);
    let { page } = s;
    await page.goto(`${BASE}/invitacion#c=${CODE}`, { waitUntil: "networkidle" });
    await page.waitForSelector('.inv-state[data-state="PREMIUM_GIFT"]:not([hidden])');
    assert.equal(await page.textContent("#invTitle"), "¡Bienvenido a Premium!");
    const texto = (await page.textContent("#invCard")).replace(/\s+/g, " ");
    for (const t of [
      "Has recibido una membresía Premium de cortesía de El Podcast del Migrante, sin mensualidad y sin fecha de vencimiento.",
      "Tu membresía $0 CAD",
      "Sin cobros automáticos.",
      "Sin vencimiento programado.",
      "La membresía de cortesía se mantiene activa mientras El Podcast del Migrante la mantenga vigente.",
      "Invitación para Santa Latino · Héctor",
    ]) assert.ok(texto.includes(t), `${perfil}: falta «${t}»`);
    assert.equal(await page.textContent("#invActivate"), "Activar mi membresía");
    /* El código: fuera de la barra de direcciones, nunca en una URL, solo en el cuerpo del POST */
    assert.equal(new URL(page.url()).hash, "");
    assert.ok(s.urls.every((u) => !u.includes(CODE)), `${perfil}: el código apareció en una URL`);
    assert.deepEqual(s.invitacionPosts.map((p) => [p.method, JSON.parse(p.body).code]), [["POST", CODE]]);
    assert.equal(await page.getAttribute('meta[name="robots"]', "content"), "noindex, nofollow");
    await sinDesborde(page, `${perfil} /invitacion`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `invitacion-cortesia-${perfil}.png`), fullPage: true });

    await page.click("#invActivate");
    await page.waitForURL(/registra-tu-empresa\?plan=premium&invitacion=1#solicitud$/);
    await page.waitForFunction(() => !document.querySelector("#intakeForm [type=submit]").disabled && window.turnstile && window.turnstile.t);
    assert.ok(await visible(page, "#invitationBanner"), `${perfil}: aviso de invitación`);
    assert.match(await page.textContent("#invitationBanner"), /Invitación: Premium de cortesía · Santa Latino[\s\S]*Tu membresía: \$0 CAD, sin mensualidad y sin vencimiento\. Sin cobros automáticos\./);
    assert.ok(await page.isChecked("input[name=plan][value=premium]"));
    assert.ok(await page.isDisabled("input[name=plan][value=gratuito]"), "plan fijado por la invitación");
    assert.equal(await page.inputValue("#fName"), "Santa Latino");
    assert.ok(!(await visible(page, '[role=radiogroup] [data-plan-text="premium"]')), "sin la nota de forma de pago");
    await sinDesborde(page, `${perfil} formulario con invitación`);
    if (SHOTS) await page.locator("#solicitud").screenshot({ path: path.join(SHOTS, `formulario-invitacion-${perfil}.png`) });
    await llenar(page);
    await page.click("#intakeForm [type=submit]");
    await page.waitForSelector("#intakeDone:not([hidden])");
    assert.deepEqual(s.envios, [{ plan: "premium", invitationCode: CODE, name: "Santa Latino" }]);
    assert.equal(await page.evaluate(() => sessionStorage.getItem("pdm-invitacion")), null, "el código se borra al confirmar");
    assert.ok(s.urls.every((u) => !u.includes(CODE)));
    assert.deepEqual(s.errores, [], `${perfil}: errores de JavaScript`);
    await s.ctx.close();

    /* 2. El servidor rechaza la invitación al enviar (otro la usó): queda una solicitud normal */
    s = await abrir(browser, perfil, [200, GIFT], [[409, { ok: false, code: "invitation_used", error: "Esta invitación ya fue utilizada." }]]);
    page = s.page;
    await page.goto(`${BASE}/invitacion#c=${CODE}`, { waitUntil: "networkidle" });
    await page.click("#invActivate");
    await page.waitForFunction(() => !document.querySelector("#intakeForm [type=submit]").disabled && window.turnstile && window.turnstile.t);
    await llenar(page);
    await page.click("#intakeForm [type=submit]");
    await page.waitForFunction(() => /ya fue utilizada/.test(document.querySelector("#intakeStatus").textContent));
    assert.ok(!(await visible(page, "#invitationBanner")), "aviso retirado");
    assert.ok(!(await page.isDisabled("input[name=plan][value=gratuito]")), "plan desbloqueado");
    assert.equal(await page.inputValue("#fSummary"), "Reseña de prueba.", "los datos siguen en el formulario");
    assert.equal(await page.evaluate(() => sessionStorage.getItem("pdm-invitacion")), null);
    assert.deepEqual(s.errores, []);
    await s.ctx.close();

    /* 3. Errores en la página de invitación */
    for (const [status, json, frase] of [
      [410, { ok: false, code: "usada" }, "Esta invitación ya fue utilizada."],
      [404, { ok: false, code: "invalida" }, "Esta invitación no es válida."],
      [503, { ok: false, code: "no_disponible" }, "Las invitaciones no están disponibles en este momento."],
    ]) {
      s = await abrir(browser, perfil, [status, json]);
      await s.page.goto(`${BASE}/invitacion#c=${CODE}`, { waitUntil: "networkidle" });
      await s.page.waitForSelector('.inv-state[data-state="error"]:not([hidden])');
      assert.ok((await s.page.textContent("#invCard")).includes(frase), `${perfil}: ${frase}`);
      assert.ok(!(await visible(s.page, "#invActions")), "sin botón de activar");
      if (SHOTS && status === 410) await s.page.screenshot({ path: path.join(SHOTS, `invitacion-usada-${perfil}.png`) });
      assert.deepEqual(s.errores, []);
      await s.ctx.close();
    }
    /* Sin código o mal formado: ni siquiera se consulta al servidor */
    s = await abrir(browser, perfil, [200, GIFT]);
    await s.page.goto(`${BASE}/invitacion`, { waitUntil: "networkidle" });
    await s.page.waitForSelector('.inv-state[data-state="error"]:not([hidden])');
    assert.equal(s.invitacionPosts.length, 0);
    await s.ctx.close();

    /* 4. Registro cerrado: la invitación se muestra, sin botón */
    s = await abrir(browser, perfil, [200, { ...GIFT, registroAbierto: false }]);
    await s.page.goto(`${BASE}/invitacion#c=${CODE}`, { waitUntil: "networkidle" });
    await s.page.waitForSelector("#invClosed:not([hidden])");
    assert.ok(!(await visible(s.page, "#invActions")));
    await s.ctx.close();

    /* 5. Premium pagada: precio real y sin pago simulado */
    s = await abrir(browser, perfil, [200, { ...GIFT, kind: "PREMIUM_PAID", label: "Premium pagada", price: "$24.99 CAD al mes + impuestos aplicables" }]);
    await s.page.goto(`${BASE}/invitacion#c=${CODE}`, { waitUntil: "networkidle" });
    await s.page.waitForSelector('.inv-state[data-state="PREMIUM_PAID"]:not([hidden])');
    const pagada = (await s.page.textContent("#invCard")).replace(/\s+/g, " ");
    assert.ok(pagada.includes("$24.99 CAD/mes + impuestos aplicables") && pagada.includes("Todavía no hay pago en línea."));
    assert.equal(await s.page.textContent("#invActivate"), "Solicitar mi Perfil Premium");
    await s.ctx.close();

    /* 6. Sin invitación, el formulario es el de siempre */
    s = await abrir(browser, perfil, [200, GIFT]);
    await s.page.goto(`${BASE}/registra-tu-empresa?plan=gratuito#solicitud`, { waitUntil: "networkidle" });
    assert.ok(!(await visible(s.page, "#invitationBanner")));
    assert.ok(await s.page.isChecked("input[name=plan][value=gratuito]"));
    assert.ok(!(await s.page.isDisabled("input[name=plan][value=premium]")));
    await sinDesborde(s.page, `${perfil} formulario sin invitación`);
    assert.deepEqual(s.errores, []);
    await s.ctx.close();
    console.log(`✓ ${perfil}`);
  }
  await browser.close();
  console.log("Invitaciones: todo correcto.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
