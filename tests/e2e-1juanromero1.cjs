/*
  Prueba de extremo a extremo (navegador) del Perfil Premium BIZ-004
  «1JuanRomero1 Inc.»: plantilla estándar con tema «cine», fotografía
  original completa, «Solicitar cotización» (mailto) como contacto preferido
  (también en la barra móvil), llamada, redes, vCard, QR, datos estructurados,
  estadísticas (simuladas) y tarjeta en el directorio; computador, tableta y
  celular. Solo lee páginas.

  1. node scripts/build-public.mjs --out=/tmp/dist
  2. npx wrangler pages dev /tmp/dist --port 8890
  3. node tests/e2e-1juanromero1.cjs   (BASE=http://127.0.0.1:8890, SHOTS=<carpeta> opcional)
*/
const { chromium, devices } = require("playwright");
const assert = require("node:assert/strict");
const M = "contact1juanromero1@gmail.com", B = process.env.BASE || "http://127.0.0.1:8890", SHOTS = process.env.SHOTS || "";
(async () => { const br = await chromium.launch();
 for (const [n,p] of [["computador",{viewport:{width:1440,height:900}}],["tableta",devices["iPad Mini"]],["celular",devices["iPhone 13"]]]) {
  const c = await br.newContext({...p, deviceScaleFactor:1}); const ev=[];
  await c.route(/\/api\/(vistas|events)/, r=>{ev.push(r.request().url());r.fulfill({status:204,body:""});});
  const pg = await c.newPage(); const err=[]; pg.on("pageerror",e=>err.push(e.message));
  await pg.goto(B+"/perfil-1juanromero1",{waitUntil:"networkidle"});
  assert.equal(await pg.getAttribute("html","data-profile-theme"),"cine");
  assert.ok(await pg.locator(".biz-hero__photo").evaluate(i=>i.complete&&i.naturalWidth===630&&getComputedStyle(i).objectFit==="contain"));
  const L = await pg.$$eval("a[data-track]",as=>as.map(a=>[a.dataset.track,a.dataset.trackTarget,a.getAttribute("href"),a.innerText.trim()]));
  const first = await pg.locator(".biz-actions a").first(); assert.equal((await first.innerText()).trim().toLowerCase(),"solicitar cotización"); assert.equal(await first.getAttribute("href"),"mailto:"+M);
  const has=(t,g,h)=>assert.ok(L.some(([a,b,x])=>a===t&&b===g&&x===h),`${n} falta ${t}/${g} ${h}`);
  has("email_click","email","mailto:"+M); has("email_click","email-final","mailto:"+M); has("email_click","email-text","mailto:"+M);
  has("phone_click","phone","tel:+14033637566");
  if (n==="celular") { const sb = pg.locator(".biz-sticky a").first(); assert.equal(await sb.getAttribute("href"),"mailto:"+M); assert.equal(await sb.getAttribute("data-track-target"),"email-sticky"); assert.ok(/cotizaci/i.test(await sb.innerText())); } has("vcard_download","vcard-connect","vcard/1juanromero1.vcf");
  assert.ok(L.some(([a,,h])=>a==="instagram_click"&&h==="https://www.instagram.com/1juanromero1/")); assert.ok(L.some(([a,,h])=>a==="tiktok_click"&&h==="https://www.tiktok.com/@1juanromero1"));
  assert.ok(!L.some(([a])=>a==="whatsapp_click"),"sin WhatsApp"); assert.equal(await pg.locator(".biz-video, .biz-gallery").count(),0,"sin video ni galería inventados");
  const txt = await pg.locator("main").innerText();
  for (const t of ["1JuanRomero1 Inc.","Juan Sebastian Vahos Alvarado","Fundador, Videógrafo y Editor de Video","Calgary","Correo: "+M]) assert.ok(txt.includes(t),t);
  assert.ok(/videos para redes sociales/i.test(txt));
  const ld = await pg.evaluate(()=>JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent));
  assert.equal(ld.mainEntity.email,M); assert.equal(ld.mainEntity.name,"1JuanRomero1 Inc.");
  for (const u of ["vcard/1juanromero1.vcf","assets/qr/perfil-1juanromero1.png","assets/qr/contacto-1juanromero1.svg","assets/directorio/perfiles/1juanromero1-og.jpg"]) assert.equal((await pg.request.get(B+"/"+u)).status(),200,u);
  assert.ok(ev.length>0,"estadísticas: el perfil registra su visita (simulada)");
  const [sw,cw]=await pg.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]); assert.ok(sw<=cw+1,"desborde");
  assert.deepEqual(err,[]);
  if (SHOTS) await pg.screenshot({path:require("node:path").join(SHOTS,`perfil-${n}.png`),fullPage:true});
  /* Directorio: aparece la tarjeta */
  await pg.goto(B+"/quien-puede-ayudarte.html",{waitUntil:"networkidle"});
  assert.ok((await pg.locator("main").innerText()).includes("1JuanRomero1"),"en el directorio");
  console.log("ok",n); await c.close(); }
 await br.close(); console.log("OK 1JuanRomero1: perfil Premium, contacto, vCard, QR, estadísticas y directorio"); })().catch(e=>{console.error(e);process.exit(1);});
