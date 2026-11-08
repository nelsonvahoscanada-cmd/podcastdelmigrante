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
  await c.route(/\/api\/(vistas|events)/, r=>{ev.push(r.request().url()+" "+(r.request().postData()||""));r.fulfill({status:204,body:""});});
  const yt=[]; await c.route(/ytjobs\.co/, r=>r.abort());
  await c.route(/youtube|ytimg|googlevideo/, r=>{yt.push(r.request().url());r.abort();});
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
  assert.ok(!L.some(([a])=>a==="whatsapp_click"),"sin WhatsApp"); assert.equal(await pg.locator(".biz-gallery").count(),0,"sin galería inventada");
  /* Video oficial: sin reproductor ni conexión a YouTube al abrir; se crea al pulsar */
  has("video_click","profile-video-youtube","https://www.youtube.com/watch?v=9rg27W1igsY");
  const vid = pg.locator(".biz-video"); await vid.scrollIntoViewIfNeeded();
  assert.ok(await vid.isVisible(),"sección de video");
  assert.equal(await pg.locator(".biz-video iframe").count(),0,"sin iframe ni autoplay al cargar");
  assert.ok(!yt.length,"no contacta a YouTube al abrir: "+yt.join(","));
  const caja = await pg.locator(".biz-video__frame, .biz-video__play").first().boundingBox();
  assert.ok(Math.abs(caja.width/caja.height-16/9)<0.05 && caja.width<=pg.viewportSize().width,"16:9 adaptable "+JSON.stringify(caja));
  await pg.locator(".biz-video__play").first().click();
  const src = await pg.locator(".biz-video iframe").getAttribute("src");
  assert.match(src,/youtube-nocookie\.com\/embed\/9rg27W1igsY\?/,"reproductor al pulsar");
  /* Portafolio: justo después del video, antes de servicios y del contacto; enlace seguro y medido */
  const orden = await pg.$$eval("#bizRoot > section", (ss) => ss.map((x) => x.className));
  const iv = orden.findIndex((c) => /biz-video/.test(c)), ip = orden.findIndex((c) => /biz-portfolio/.test(c)), ic = orden.findIndex((c) => /biz-contact/.test(c));
  assert.ok(ip === iv + 1 && ip < ic, "orden " + JSON.stringify(orden));
  const port = pg.locator(".biz-portfolio"); await port.scrollIntoViewIfNeeded();
  assert.equal((await port.locator("h2").innerText()).trim().toUpperCase(), "MI PORTAFOLIO PROFESIONAL");
  assert.match(await port.innerText(), /Explora mis proyectos de producción audiovisual/);
  const pb = port.locator("a.biz-btn");
  assert.ok(await pb.isVisible());
  assert.match((await pb.innerText()).toUpperCase(), /VER PORTAFOLIO COMPLETO/);
  assert.equal(await pb.getAttribute("href"), "https://ytjobs.co/talent/profile/91099");
  assert.equal(await pb.getAttribute("target"), "_blank");
  assert.equal(await pb.getAttribute("rel"), "noopener noreferrer");
  assert.equal(await port.locator("iframe").count(), 0);
  const pbb = await pb.boundingBox(); assert.ok(pbb.height >= 44 && pbb.x >= 0 && pbb.x + pbb.width <= pg.viewportSize().width, "botón táctil " + JSON.stringify(pbb));
  const antes = ev.length;
  const [nueva] = await Promise.all([c.waitForEvent("page"), pb.click()]);
  assert.equal(await nueva.evaluate(() => window.opener), null); await nueva.close();
  await pg.waitForTimeout(300);
  assert.ok(ev.slice(antes).some((u) => /website_click/.test(u) && /portfolio/.test(u) && /BIZ-004/.test(u)), "evento website_click/portfolio");
  if (SHOTS) await port.screenshot({ path: require("node:path").join(SHOTS, `portafolio-${n}.png`) });
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
  /* Categoría nueva: filtra solo esta empresa y aparece con su nombre */
  assert.ok((await pg.$$eval("#fCategory option",o=>o.map(x=>[x.value,x.textContent.trim()]))).some(([v,t])=>v==="produccion-audiovisual"&&t==="Producción audiovisual y contenido digital"),"categoría en el filtro");
  await pg.selectOption("#fCategory","produccion-audiovisual");
  assert.deepEqual(await pg.$$eval(".biz-card__name",n=>n.map(x=>x.textContent.trim())),["1JuanRomero1 Inc."]);
  await pg.selectOption("#fCategory","eventos-celebraciones");
  assert.deepEqual(await pg.$$eval(".biz-card__name",n=>n.map(x=>x.textContent.trim())),["Santa Latino"],"Santa Latino conserva su categoría");
  /* Formulario de registro: la categoría nueva está antes de «Otra» */
  await pg.goto(B+"/registra-tu-empresa",{waitUntil:"networkidle"});
  const ops = await pg.$$eval("select[name=category] option",o=>o.map(x=>x.value).filter(Boolean));
  assert.deepEqual(ops.slice(-2),["produccion-audiovisual","otra"],"formulario");
  console.log("ok",n); await c.close(); }
 await br.close(); console.log("OK 1JuanRomero1: perfil Premium, contacto, vCard, QR, estadísticas y directorio"); })().catch(e=>{console.error(e);process.exit(1);});
