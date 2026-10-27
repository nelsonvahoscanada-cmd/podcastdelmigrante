/* Precarga para verificar producción sin generar visitas: en cada navegador que abren las pruebas
   se bloquean las estadísticas de las miniwebs (/api/events) y cualquier registro del contador (POST /api/vistas). */
const pw = require("playwright");
let bloqueadas = 0;
const launch = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = async (...a) => {
  const b = await launch(...a);
  const nc = b.newContext.bind(b);
  b.newContext = async (...o) => {
    const c = await nc(...o);
    await c.route(/\/api\/(events|vistas)/, (r) => (r.request().method() === "GET" && /\/api\/vistas\//.test(r.request().url()) ? r.continue() : (bloqueadas++, r.abort())));
    return c;
  };
  b.newPage = async (...o) => (await b.newContext(...o)).newPage();
  return b;
};
process.on("exit", () => console.log(`PETICIONES-BLOQUEADAS ${bloqueadas}`));
