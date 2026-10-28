/*
  Prueba de extremo a extremo (navegador) de la verificación Turnstile del
  formulario «Solicita tu Perfil Empresarial Premium». No usa el servidor ni
  envía nada: Turnstile, /registro/config y /registro/enviar se simulan, y se
  revisa lo que el navegador envía en cada caso.

  Casos:
    1. Envío normal: el token va en la solicitud, una sola vez.
    2. Token vencido antes de enviar (más de 4 minutos, p. ej., en la galería
       del iPhone): se renueva y se envía el nuevo; los datos y las
       fotografías se conservan.
    3. El servidor responde «turnstile_expired»: se renueva y se reintenta
       UNA vez con la misma clave de idempotencia (sin duplicados).
    4. La renovación necesita que la persona marque la casilla: no se envía
       nada, se avisa y, al completarla, el envío funciona.
    5. Doble toque en «Enviar solicitud»: una sola solicitud.
    6. Al volver a la página después de 5 minutos, la verificación se renueva.

  1. python3 -m http.server 8799   (en la raíz del repositorio)
  2. node tests/e2e-registro-turnstile.cjs   (BASE=http://127.0.0.1:8799, NAVEGADOR=chromium|webkit)
*/
const pw = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");

const BASE = process.env.BASE || "http://127.0.0.1:8799";
const NAVEGADOR = process.env.NAVEGADOR || "chromium";
const ROOT = path.join(__dirname, "..");
const PAGINA = BASE + "/registra-tu-empresa.html";

/* Turnstile simulado: misma interfaz que el real. window.__manual = true hace que reset() no emita token solo. */
const FAKE_TURNSTILE = `window.__tokens=0;window.__resets=0;window.turnstile={o:null,t:'',at:0,
render(box,o){this.o=o;const i=document.createElement('input');i.type='hidden';i.name='cf-turnstile-response';box.appendChild(i);this.i=i;setTimeout(()=>this.emit(),30);return 'w1';},
emit(){window.__tokens++;this.t='token-'+window.__tokens;this.at=Date.now();this.i.value=this.t;this.o.callback&&this.o.callback(this.t);},
getResponse(){return this.t;},
isExpired(){return !!this.t&&Date.now()-this.at>300000;},
reset(){window.__resets++;this.t='';this.i.value='';if(!window.__manual)setTimeout(()=>this.emit(),30);}};`;

async function abrir(browser, perfil) {
  const ctx = await browser.newContext({ ...perfil, locale: "es-CA" });
  const pg = await ctx.newPage();
  pg.errores = [];
  pg.on("pageerror", (e) => pg.errores.push(e.message));
  pg.envios = [];
  pg.respuestas = [];   /* cola de respuestas del servidor simulado */
  await ctx.route("https://challenges.cloudflare.com/**", (r) => r.fulfill({ contentType: "text/javascript", body: FAKE_TURNSTILE }));
  await ctx.route("**/registro/config", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ready: true, turnstileSiteKey: "1x00000000000000000000AA" }) }));
  await ctx.route(/\/api\//, (r) => r.fulfill({ contentType: "application/json", body: "{}" }));
  await ctx.route("**/registro/enviar", async (r) => {
    const cuerpo = r.request().postDataBuffer() || Buffer.alloc(0);
    const texto = cuerpo.toString("utf8");
    const campo = (n) => (texto.match(new RegExp(`name="${n}"\\r\\n\\r\\n([^\\r]*)`)) || [])[1] || "";
    pg.envios.push({ token: campo("cf-turnstile-response"), idem: campo("idempotencyKey"), nombre: campo("name"), imagen: /name="image"; filename=/.test(texto), adicionales: (texto.match(/name="extraImages"; filename=/g) || []).length, bytes: cuerpo.length });
    await new Promise((res) => setTimeout(res, 200));
    const [status, json] = pg.respuestas.shift() || [201, { ok: true, requestId: "SOL-20261028-ABCDEF" }];
    r.fulfill({ status, contentType: "application/json", body: JSON.stringify(json) });
  });
  await pg.clock.install();
  await pg.goto(PAGINA);
  await pg.clock.runFor(200);
  await pg.waitForFunction(() => !document.querySelector("#intakeForm [type=submit]").disabled && window.turnstile && window.turnstile.t);
  return { ctx, pg };
}

async function llenar(pg) {
  await pg.fill("#fName", "Panadería La Esquina");
  await pg.selectOption("#fCategory", "otra");
  await pg.fill("#fCategoryOther", "Panadería");
  await pg.fill("#fCity", "Edmonton");
  await pg.selectOption("#fProvince", "Alberta");
  await pg.fill("#fRepresentative", "Ana María Pérez");
  await pg.fill("#fSummary", "Pan artesanal latino hecho a diario.");
  await pg.fill("#fServices", "Pan dulce, tortas por encargo y catering.");
  await pg.fill("#fEmail", "ana@example.com");
  await pg.fill("#fWhatsapp", "1 780 555 1234");
  await pg.check("input[name=imageKind][value=foto]");
  await pg.setInputFiles("#fImage", path.join(ROOT, "assets/tomas-velazquez.jpg"));
  await pg.waitForSelector("#imagePreview:not([hidden])");
  await pg.setInputFiles("#fExtraImages", [path.join(ROOT, "assets/carlos-d-castillo-card.jpg")]);
  await pg.waitForSelector("#extraPreviews:not([hidden])");
  for (const n of ["consentData", "consentRights", "consentPublish"]) await pg.check(`input[name=${n}]`);
}

/* Pulsa «Enviar» y deja correr el reloj simulado hasta que termine */
async function enviar(pg, ms = 3000) {
  await pg.click("#intakeForm [type=submit]");
  await esperar(pg, ms);
}
async function esperar(pg, ms) {
  /* Avanza el reloj simulado de a poco y deja tiempo real a la red simulada */
  for (let hecho = 0; hecho < ms; hecho += 250) {
    await pg.clock.runFor(250);
    await pg.waitForTimeout(40);
  }
  await pg.waitForFunction(() => { const b = document.querySelector("#intakeForm [type=submit]"); return !b.disabled || !document.querySelector("#intakeDone").hidden; }, null, { timeout: 10000 });
}
const confirmado = (pg) => pg.locator("#intakeDone").isVisible();

(async () => {
  const motor = pw[NAVEGADOR];
  const browser = await motor.launch();
  const perfiles = NAVEGADOR === "webkit" ? { "iPhone (Safari/WebKit)": pw.devices["iPhone 13"] } : { computador: { viewport: { width: 1366, height: 900 } }, "iPhone (Chromium)": pw.devices["iPhone 13"] };
  for (const [nombre, perfil] of Object.entries(perfiles)) {
    if (NAVEGADOR === "chromium" && perfil.defaultBrowserType === "webkit") delete perfil.defaultBrowserType;

    /* 1. Envío normal */
    let { ctx, pg } = await abrir(browser, perfil);
    await llenar(pg);
    await enviar(pg);
    assert.ok(await confirmado(pg), `${nombre}: confirmación`);
    assert.equal(pg.envios.length, 1);
    assert.equal(pg.envios[0].token, "token-1", "el token del widget va en la solicitud");
    assert.ok(pg.envios[0].imagen && pg.envios[0].adicionales === 1, "fotografías incluidas");
    assert.deepEqual(pg.errores, []);
    await ctx.close();

    /* 2. Token vencido antes de enviar (la persona tardó más de 4 minutos) */
    ({ ctx, pg } = await abrir(browser, perfil));
    await llenar(pg);
    await pg.clock.fastForward(6 * 60 * 1000);
    assert.equal(await pg.evaluate(() => window.turnstile.isExpired()), true, "la casilla puede seguir en verde con el token vencido");
    await enviar(pg);
    assert.ok(await confirmado(pg), `${nombre}: confirmación tras renovar`);
    assert.equal(pg.envios.length, 1, "una sola solicitud");
    assert.notEqual(pg.envios[0].token, "token-1", "no se envía el token vencido");
    assert.ok(pg.envios[0].token, "se envía el token nuevo");
    assert.equal(pg.envios[0].nombre, "Panadería La Esquina", "datos conservados");
    assert.ok(pg.envios[0].imagen && pg.envios[0].adicionales === 1, "fotografías conservadas");
    assert.deepEqual(pg.errores, []);
    await ctx.close();

    /* 3. El servidor dice que el token venció o ya se usó: un reintento con la misma clave */
    ({ ctx, pg } = await abrir(browser, perfil));
    await llenar(pg);
    pg.respuestas.push([403, { ok: false, code: "turnstile_expired", error: "La verificación de seguridad venció." }]);
    await enviar(pg, 5000);
    assert.ok(await confirmado(pg), `${nombre}: confirmación tras el reintento`);
    assert.equal(pg.envios.length, 2, "un solo reintento");
    assert.notEqual(pg.envios[0].token, pg.envios[1].token, "token nuevo en el reintento");
    assert.equal(pg.envios[0].idem, pg.envios[1].idem, "misma clave de idempotencia: el servidor no duplica");
    assert.deepEqual(pg.errores, []);
    await ctx.close();

    /* 3b. Si el reintento también falla, se avisa con un mensaje claro y los datos siguen */
    ({ ctx, pg } = await abrir(browser, perfil));
    await llenar(pg);
    pg.respuestas.push([403, { ok: false, code: "turnstile_expired", error: "La verificación de seguridad venció. Vuelve a completarla y pulsa «Enviar solicitud». Tus datos y fotografías siguen en el formulario." }]);
    pg.respuestas.push([403, { ok: false, code: "turnstile_invalid", error: "No pudimos verificar que no eres un robot. Vuelve a completar la verificación y pulsa «Enviar solicitud». Tus datos y fotografías siguen en el formulario." }]);
    await enviar(pg, 5000);
    assert.equal(pg.envios.length, 2, "no reintenta sin fin");
    assert.ok(!(await confirmado(pg)));
    assert.match(await pg.textContent("#intakeStatus"), /Tus datos y fotografías siguen en el formulario/);
    assert.doesNotMatch(await pg.textContent("#intakeStatus"), /[Rr]ecarga la página/);
    assert.equal(await pg.inputValue("#fName"), "Panadería La Esquina");
    assert.equal(await pg.locator("#extraPreviews img").count(), 1, "las fotografías siguen elegidas");
    await pg.clock.runFor(200);
    await enviar(pg);
    assert.ok(await confirmado(pg), `${nombre}: el reintento manual funciona`);
    assert.equal(pg.envios.length, 3);
    assert.equal(new Set(pg.envios.map((e) => e.idem)).size, 1, "siempre la misma clave de idempotencia");
    assert.deepEqual(pg.errores, []);
    await ctx.close();

    /* 4. La renovación necesita interacción: no se envía nada sin token */
    ({ ctx, pg } = await abrir(browser, perfil));
    await llenar(pg);
    await pg.evaluate(() => { window.__manual = true; });
    await pg.clock.fastForward(6 * 60 * 1000);
    await enviar(pg, 50000);
    assert.equal(pg.envios.length, 0, "sin token no se envía");
    assert.match(await pg.textContent("#intakeStatus"), /Completa la verificación de seguridad/);
    assert.equal(await pg.isEnabled("#intakeForm [type=submit]"), true, "el botón queda disponible");
    await pg.evaluate(() => window.turnstile.emit());   /* la persona marca la casilla */
    await enviar(pg);
    assert.ok(await confirmado(pg));
    assert.equal(pg.envios.length, 1);
    assert.deepEqual(pg.errores, []);
    await ctx.close();

    /* 5. Doble toque: una sola solicitud */
    ({ ctx, pg } = await abrir(browser, perfil));
    await llenar(pg);
    await pg.evaluate(() => { const b = document.querySelector("#intakeForm [type=submit]"); const f = document.getElementById("intakeForm"); f.requestSubmit(b); f.requestSubmit(b); });
    await esperar(pg, 3000);
    assert.ok(await confirmado(pg));
    assert.equal(pg.envios.length, 1, "doble toque: un solo envío");
    await ctx.close();

    /* 6. Volver a la página después de 5 minutos renueva la verificación */
    ({ ctx, pg } = await abrir(browser, perfil));
    await llenar(pg);
    await pg.clock.fastForward(5 * 60 * 1000);
    const antes = await pg.evaluate(() => window.__resets);
    await pg.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
    await pg.clock.runFor(200);
    assert.equal(await pg.evaluate(() => window.__resets), antes + 1, "renovada al volver");
    await enviar(pg);
    assert.ok(await confirmado(pg));
    assert.equal(pg.envios.length, 1);
    assert.deepEqual(pg.errores, []);
    await ctx.close();

    console.log(`✓ ${NAVEGADOR} · ${nombre}: envío normal, token vencido, reintento, sin duplicados, doble toque y regreso a la página`);
  }
  await browser.close();
  console.log("Turnstile del formulario: OK");
})().catch((e) => { console.error(e); process.exit(1); });
