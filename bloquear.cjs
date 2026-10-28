// Solo para la verificación temporal: no registra visitas ni eventos durante la prueba.
const pw = require("playwright");
const orig = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = async (...a) => {
  const b = await orig(...a);
  const nc = b.newContext.bind(b);
  b.newContext = async (...o) => {
    const c = await nc(...o);
    await c.route(/\/api\/(vistas|events)/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"vistas":0}' }));
    return c;
  };
  b.newPage = async (...o) => (await b.newContext(...o)).newPage();
  return b;
};
