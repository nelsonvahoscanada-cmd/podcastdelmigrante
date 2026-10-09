/*
  Prueba de extremo a extremo (navegador) del registro de empresas.
  NUNCA envía correos reales: Resend y Turnstile se simulan en local.

  1. Simuladores:   node tests/e2e/simuladores.mjs /tmp/correos.jsonl
  2. Sitio local con D1/R2 locales (wrangler.toml de prueba con los mismos
     bindings que producción y estas variables):
       TURNSTILE_VERIFY_URL = "http://127.0.0.1:9999/turnstile"
       RESEND_API_URL       = "http://127.0.0.1:9999/resend"
     npx wrangler d1 execute <db> --local --file=db/directorio/0001_solicitudes.sql
     npx wrangler pages dev . --port 8788
  3. node tests/e2e-registro.cjs        (BASE=http://127.0.0.1:8788, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8788";
const SHOTS = process.env.SHOTS || "";
const ROOT = path.join(__dirname, "..");
const ID_RE = /^SOL-\d{8}-[A-Z2-9]{6}$/;
const FAKE_TURNSTILE = `window.turnstile={render(box){const i=document.createElement('input');i.type='hidden';i.name='cf-turnstile-response';i.value='token-ok';box.appendChild(i);return 'w1';},reset(){}};`;

async function open(browser, profile) {
  const ctx = await browser.newContext(profile);
  const pg = await ctx.newPage();
  pg.errors = [];
  pg.on("pageerror", (e) => pg.errors.push(e.message));
  await pg.route("https://challenges.cloudflare.com/**", (r) => r.fulfill({ contentType: "text/javascript", body: FAKE_TURNSTILE }));
  await pg.goto(BASE + "/registra-tu-empresa");
  await pg.waitForFunction(() => !document.querySelector("#intakeForm [type=submit]").disabled);
  return { ctx, pg };
}

async function fill(pg, d) {
  await pg.fill("#fName", d.name);
  await pg.selectOption("#fCategory", d.category);
  if (d.categoryOther) await pg.fill("#fCategoryOther", d.categoryOther);
  await pg.fill("#fCity", d.city);
  await pg.selectOption("#fProvince", "Alberta");
  await pg.fill("#fRepresentative", d.rep);
  await pg.fill("#fSummary", d.summary);
  await pg.fill("#fEmail", d.email);
  if (d.whatsapp) await pg.fill("#fWhatsapp", d.whatsapp);
  if (d.website) await pg.fill("#fWebsite", d.website);
  await pg.check(`input[name=imageKind][value=${d.kind}]`);
  await pg.setInputFiles("#fImage", path.join(ROOT, d.file));
  await pg.waitForSelector("#imagePreview:not([hidden])");
  for (const n of ["consentData", "consentRights", "consentPublish"]) await pg.check(`input[name=${n}]`);
}

const RUNS = [
  ["escritorio", { viewport: { width: 1366, height: 900 } }, { name: "Panadería La Esquina", category: "otra", categoryOther: "Panadería", city: "Edmonton", rep: "Ana María Pérez", summary: "Pan artesanal latino hecho a diario.", email: "ana@example.com", whatsapp: "1 780 555 1234", kind: "foto", file: "assets/tomas-velazquez.jpg" }],
  ["iphone", devices["iPhone 13"], { name: "Transportes Andes", category: "automoviles", city: "Calgary", rep: "Luis Rojas", summary: "Mudanzas en Alberta.", email: "luis@example.com", website: "transportesandes.ca", kind: "logo", file: "assets/logo.png" }],
  ["android", devices["Pixel 7"], { name: "Salud Integral María", category: "salud", city: "Red Deer", rep: "María Gómez", summary: "Acompañamiento en salud.", email: "maria@example.com", whatsapp: "14035550000", kind: "foto", file: "assets/carlos-d-castillo-card.jpg" }],
];

(async () => {
  const browser = await chromium.launch();
  for (const [name, profile, d] of RUNS) {
    const { ctx, pg } = await open(browser, profile);
    if (name === "escritorio") {
      await pg.click("#intakeForm [type=submit]");
      const errs = await pg.$$eval(".intake-error", (e) => e.map((x) => x.textContent).filter(Boolean));
      assert.ok(errs.length >= 8, "el formulario vacío muestra errores");
      assert.ok(await pg.isHidden("#intakeDone"), "sin registro no hay confirmación");
    }
    await fill(pg, d);
    assert.equal(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name}: sin desplazamiento horizontal`);
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, `formulario-${name}.png`), fullPage: true });
    await pg.click("#intakeForm [type=submit]");
    await pg.waitForSelector("#intakeDone:not([hidden])", { timeout: 15000 });
    const id = (await pg.textContent("[data-done-id]")).trim();
    assert.match(id, ID_RE);
    assert.doesNotMatch(await pg.textContent("#intakeDone"), /@gmail|Nelson/i, "la confirmación no muestra datos del administrador");
    if (SHOTS) await pg.locator("#intakeDone").screenshot({ path: path.join(SHOTS, `confirmacion-${name}.png`) });
    assert.deepEqual(pg.errors, []);
    console.log(`✓ ${name}: ${id}`);
    await ctx.close();
  }
  await browser.close();
  console.log("Registro de extremo a extremo: OK");
})().catch((e) => { console.error(e); process.exit(1); });
