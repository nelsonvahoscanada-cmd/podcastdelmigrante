/* TEMPORAL (solo lectura): estado de enlaces oficiales para la miniweb de Nelson Vahos. */
const { chromium } = require("playwright"); const fs = require("fs");
const URLS = ["https://eradioglobal.com", "https://www.eradioglobal.com", "https://facebook.com/eradioglobal", "https://instagram.com/eradioglobal", "https://youtube.com/@eradioglobal4291", "https://www.youtube.com/@ElPodcastDelMigranteOficial", "https://www.tiktok.com/@podcastdelmigrante"];
(async () => {
  const b = await chromium.launch(); const out = [];
  for (const u of URLS) {
    const c = await b.newContext({ locale: "es-CA" }); const p = await c.newPage();
    try {
      const r = await p.goto(u, { waitUntil: "domcontentloaded", timeout: 45000 }); await p.waitForTimeout(2500);
      const t = (await p.title()).slice(0, 90); const txt = (await p.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
      out.push(`${u}\n  estado ${r && r.status()} | URL final ${p.url().slice(0, 100)} | título «${t}»\n  texto: ${txt}`);
      if (/eradioglobal\.com/.test(u)) await p.screenshot({ path: `/tmp/out/${u.replace(/\W+/g, "_")}.png` });
    } catch (e) { out.push(`${u}\n  ERROR ${e.message.split("\n")[0]}`); }
    await c.close();
  }
  await b.close(); fs.writeFileSync("/tmp/out/enlaces.txt", out.join("\n")); console.log(out.join("\n"));
})();
