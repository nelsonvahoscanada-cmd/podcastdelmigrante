// Solo para la verificación temporal en producción: ninguna llamada a /api/ llega al servidor
// (no se registran visitas, eventos ni estadísticas de miniwebs).
const pw = require("playwright");
const orig = pw.chromium.launch.bind(pw.chromium);
let bloqueadas = 0;
pw.chromium.launch = async (...a) => {
  const b = await orig(...a);
  const nc = b.newContext.bind(b);
  b.newContext = async (...o) => {
    const c = await nc(...o);
    await c.route(/\/api\//, (r) => { bloqueadas++; r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"vistas":0}' }); });
    return c;
  };
  b.newPage = async (...o) => (await b.newContext(...o)).newPage();
  return b;
};
process.on("exit", () => console.log(`llamadas a /api/ bloqueadas: ${bloqueadas}`));
