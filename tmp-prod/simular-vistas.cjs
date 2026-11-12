/* Preload local para las e2e: simula /api/vistas/* (sin D1 en wrangler pages dev). */
const Module = require("module");
const orig = Module._load;
Module._load = function (req, ...rest) {
  const m = orig.call(this, req, ...rest);
  if (req === "playwright" && !m.__simulado) {
    const launch = m.chromium.launch.bind(m.chromium);
    m.chromium.launch = async (...a) => {
      const b = await launch(...a);
      const nc = b.newContext.bind(b);
      b.newContext = async (...o) => {
        const c = await nc(...o);
        await c.route("**/api/vistas/**", (r) => {
          const id = decodeURIComponent(r.request().url().split("/api/vistas/")[1].split("?")[0]);
          r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id, vistas: 1234, visible: true }) });
        });
        return c;
      };
      return b;
    };
    m.__simulado = true;
  }
  return m;
};
