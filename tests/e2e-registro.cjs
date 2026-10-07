/*
  Prueba de extremo a extremo (navegador) del registro de empresas.
  FormSubmit se SIMULA: esta prueba nunca envía correos reales.

  Requiere Playwright y un servidor local en la raíz del sitio:
    python3 -m http.server 8765
    node tests/e2e-registro.cjs            (BASE=http://localhost:8765/)
*/
const { chromium } = require("playwright");
const assert = require("node:assert/strict");

const BASE = process.env.BASE || "http://localhost:8765/";
const FS = "https://formsubmit.co/**";

async function fillValid(pg) {
  await pg.fill("#fCompany", "Panadería La Esquina");
  await pg.selectOption("#fCategoryIntake", "vivienda");
  await pg.fill("#fCity", "Edmonton");
  await pg.selectOption("#fProvinceIntake", "Alberta");
  await pg.check("input[name=addressMode][value=sin-direccion]");
  await pg.fill("#fName", "Ana María Pérez");
  await pg.fill("#fTitle", "Asesora inmobiliaria");
  await pg.check("input[name=languages][value=es]");
  await pg.fill("#fShort", "Te ayudo a encontrar tu primera vivienda en Edmonton.");
  await pg.fill("#fServices", "Compra de vivienda\nArriendo");
  await pg.fill("#fWhatsapp", "1 780 555 1234");
  await pg.fill("#fInstagram", "@ana.perez");
  await pg.fill("#fRequester", "Ana Pérez");
  await pg.fill("#fEmail", "ana@example.com");
  await pg.fill("#fGiven", "Ana María");
  await pg.fill("#fFamily", "Pérez");
  for (const n of ["consentData", "consentPublish", "consentTruth"]) await pg.check(`input[name=${n}]`);
}

async function openForm(b, width, fsHandler) {
  const ctx = await b.newContext({ viewport: { width, height: 900 } });
  const pg = await ctx.newPage();
  const errors = [];
  pg.on("pageerror", (e) => errors.push(e.message));
  const sent = [];
  await pg.route(/^https:\/\/(fonts\.|www\.youtube|img\.youtube)/, (r) => r.abort());
  await pg.route(FS, async (route) => {
    sent.push(JSON.parse(route.request().postData()));
    await fsHandler(route);
  });
  await pg.clock.install();
  await pg.goto(BASE + "registra-tu-empresa.html");
  return { ctx, pg, errors, sent };
}

const ok = (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"success":"true","message":"The form was submitted successfully."}' });
const needsActivation = (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"success":"false","message":"This form needs Activation. We\'ve sent you an email containing an \'Activate Form\' link."}' });

(async () => {
  const b = await chromium.launch();

  /* 1. Portada: vitrina y botones */
  for (const width of [1280, 375]) {
    const pg = await b.newPage({ viewport: { width, height: 900 } });
    await pg.route(/^https:\/\/(fonts\.|www\.youtube|img\.youtube)/, (r) => r.abort());
    await pg.goto(BASE + "index.html");
    const v = await pg.evaluate(() => ({
      title: document.querySelector(".biz-showcase__title")?.textContent,
      links: [...document.querySelectorAll(".biz-showcase__btn")].map((a) => a.getAttribute("href") + "|" + a.textContent.trim()),
      oldBanner: !!document.querySelector(".help-banner"),
      sw: document.documentElement.scrollWidth,
    }));
    assert.equal(v.title, "Conectamos personas con empresas en Canadá");
    assert.deepEqual(v.links, ["quien-puede-ayudarte.html|Explorar directorio empresarial", "registra-tu-empresa.html|Quiero registrar mi empresa"]);
    assert.equal(v.oldBanner, false);
    assert.equal(v.sw, width, "sin scroll horizontal en la portada");
    console.log(`ok portada ${width}px`);
    await pg.close();
  }

  /* 2. Directorio: sigue funcionando y tiene la invitación */
  {
    const pg = await b.newPage();
    await pg.goto(BASE + "quien-puede-ayudarte.html");
    assert.ok((await pg.$$(".biz-card")).length >= 2, "el directorio sigue listando perfiles");
    assert.equal(await pg.getAttribute(".biz-join .biz-btn", "href"), "registra-tu-empresa.html");
    console.log("ok directorio");
    await pg.close();
  }

  for (const width of [1280, 390]) {
    /* 3. Validación: nada se envía con errores */
    {
      const { ctx, pg, errors, sent } = await openForm(b, width, ok);
      await pg.click("#intakeForm [type=submit]");
      const n = await pg.$$eval(".intake-error", (e) => e.length);
      assert.ok(n >= 10, "muestra errores por campo");
      assert.equal(sent.length, 0);
      assert.equal(await pg.isVisible("#intakeStatus"), true);
      assert.equal(await pg.evaluate(() => document.documentElement.scrollWidth), width, "sin scroll horizontal en el formulario");
      assert.deepEqual(errors, []);
      console.log(`ok validación ${width}px (${n} errores)`);
      await ctx.close();
    }

    /* 4. Envío correcto → confirmación con número de solicitud */
    {
      const { ctx, pg, errors, sent } = await openForm(b, width, ok);
      await fillValid(pg);
      await pg.clock.runFor(9000);
      await pg.click("#intakeForm [type=submit]");
      await pg.waitForSelector("#intakeDone:not([hidden])");
      assert.equal(sent.length, 1);
      const p = sent[0];
      assert.equal(p.email, "ana@example.com");
      assert.equal(p._honey, "");
      assert.match(p._autoresponse, /SOL-\d{8}-[A-Z0-9]{4}/);
      assert.match(p["Ficha para js/businesses.js"], /published: false/);
      assert.match(p["Ficha para js/businesses.js"], /instagram: "https:\/\/www\.instagram\.com\/ana\.perez\/"/);
      assert.equal(p["1 · Dirección física pública"], "No (sin dirección física pública)");
      const id = await pg.textContent("[data-done-id]");
      assert.match(id, /^SOL-\d{8}-[A-Z0-9]{4}$/);
      assert.equal(await pg.isVisible("#intakeForm"), false);
      assert.deepEqual(errors, []);
      if (width === 390) await pg.locator("#intakeDone").screenshot({ path: process.env.SHOTS ? process.env.SHOTS + "/done-390.png" : "/dev/null" });
      console.log(`ok envío ${width}px → ${id}`);

      /* reenvío inmediato bloqueado (misma pestaña) */
      await pg.goto(BASE + "registra-tu-empresa.html");
      await fillValid(pg);
      await pg.clock.runFor(9000);
      await pg.click("#intakeForm [type=submit]");
      await pg.waitForSelector("#intakeStatus:not([hidden])");
      assert.equal(sent.length, 1, "no se reenvía en menos de un minuto");
      await ctx.close();
    }

    /* 5. FormSubmit no registra (formulario sin activar) → sin confirmación */
    {
      const { ctx, pg, sent } = await openForm(b, width, needsActivation);
      await fillValid(pg);
      await pg.clock.runFor(9000);
      await pg.click("#intakeForm [type=submit]");
      await pg.waitForSelector("#intakeStatus:not([hidden])");
      assert.equal(sent.length, 1);
      assert.match(await pg.textContent("#intakeStatus"), /No pudimos registrar tu solicitud/);
      assert.equal(await pg.isVisible("#intakeDone"), false);
      assert.equal(await pg.inputValue("#fCompany"), "Panadería La Esquina", "los datos se conservan");
      console.log(`ok sin activar ${width}px`);
      await ctx.close();
    }
  }

  /* 6. Error de red → sin confirmación */
  {
    const { ctx, pg } = await openForm(b, 1280, (r) => r.abort());
    await fillValid(pg);
    await pg.clock.runFor(9000);
    await pg.click("#intakeForm [type=submit]");
    await pg.waitForSelector("#intakeStatus:not([hidden])");
    assert.equal(await pg.isVisible("#intakeDone"), false);
    console.log("ok error de red");
    await ctx.close();
  }

  /* 7. Anti-spam: trampa llena o envío instantáneo → no se envía */
  {
    const { ctx, pg, sent } = await openForm(b, 1280, ok);
    await fillValid(pg);
    await pg.click("#intakeForm [type=submit]");          /* < 8 s */
    await pg.waitForSelector("#intakeStatus:not([hidden])");
    await pg.evaluate(() => { document.querySelector("[name=_honey]").value = "spam"; });
    await pg.clock.runFor(9000);
    await pg.click("#intakeForm [type=submit]");
    assert.equal(sent.length, 0);
    console.log("ok anti-spam");
    await ctx.close();
  }

  /* 8. Perfiles existentes intactos */
  for (const slug of ["tomas-velazquez", "carlos-d-castillo"]) {
    const pg = await b.newPage();
    await pg.route(/^https:\/\/(fonts\.|www\.youtube|img\.youtube)/, (r) => r.abort());
    await pg.goto(BASE + `perfil-${slug}.html`);
    assert.ok(await pg.$(".biz-connect"), "sección Conecta intacta en " + slug);
    console.log(`ok perfil ${slug}`);
    await pg.close();
  }

  await b.close();
  console.log("TODO OK");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
