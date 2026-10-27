const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  console.log("chromium", b.version(), "| node tz", process.versions.tz, "| icu", process.versions.icu);
  const r = await p.evaluate(() => {
    const out = [];
    for (const z of ["America/Vancouver", "America/Whitehorse", "America/Edmonton", "America/Dawson_Creek", "America/Fort_Nelson", "America/Creston"])
      for (const d of ["2026-10-31T18:00:00Z", "2026-11-02T18:00:00Z", "2027-01-15T18:00:00Z", "2027-07-01T18:00:00Z"])
        out.push(`${z} ${d} → ${new Intl.DateTimeFormat("en-CA", { timeZone: z, hour: "2-digit", minute: "2-digit", hour12: false, timeZoneName: "short" }).format(new Date(d))}`);
    return out;
  });
  r.forEach((l) => console.log("Z|" + l));
  for (const z of ["America/Vancouver", "America/Edmonton"]) for (const d of ["2026-11-02T18:00:00Z", "2027-07-01T18:00:00Z"]) console.log("NODE|" + z + " " + d + " → " + new Intl.DateTimeFormat("en-CA", { timeZone: z, hour: "2-digit", minute: "2-digit", hour12: false, timeZoneName: "short" }).format(new Date(d)));
  await b.close();
})();
