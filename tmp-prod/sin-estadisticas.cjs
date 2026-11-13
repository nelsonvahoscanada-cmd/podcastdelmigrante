/* Preload TEMPORAL para las pruebas en producción: ninguna visita ni evento
   llega a las estadísticas. En cada contexto de navegador:
   - navigator.sendBeacon queda anulado (se cuenta cada intento);
   - toda petición a /api/* se responde localmente (GET /api/vistas/* con
     datos ficticios para que el contador se dibuje; el resto 204) y se cuenta.
   Al terminar escribe /tmp/out/estadisticas-<script>.txt. */
const Module = require("module"); const fs = require("fs"); const path = require("path");
const cont = { beacon: 0, api: 0 };
const orig = Module._load;
Module._load = function (req, ...rest) {
  const m = orig.call(this, req, ...rest);
  if (req === "playwright" && !m.__sinEstadisticas) {
    const launch = m.chromium.launch.bind(m.chromium);
    m.chromium.launch = async (...a) => {
      const b = await launch(...a);
      const nc = b.newContext.bind(b);
      b.newContext = async (...o) => {
        const c = await nc(...o);
        await c.exposeBinding("__beaconBloqueado", () => { cont.beacon++; });
        await c.addInitScript(() => { navigator.sendBeacon = () => { try { window.__beaconBloqueado(); } catch (e) {} return true; }; });
        await c.route(/\/api\//, (r) => {
          cont.api++;
          const u = r.request().url();
          if (r.request().method() === "GET" && u.includes("/api/vistas/")) {
            const id = decodeURIComponent(u.split("/api/vistas/")[1].split("?")[0]);
            return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id, vistas: 1, visible: true }) });
          }
          return r.fulfill({ status: 204, body: "" });
        });
        return c;
      };
      return b;
    };
    m.__sinEstadisticas = true;
  }
  return m;
};
process.on("exit", () => {
  try { fs.mkdirSync("/tmp/out", { recursive: true }); fs.writeFileSync(`/tmp/out/estadisticas-${path.basename(process.argv[1])}.txt`, JSON.stringify(cont)); } catch (e) {}
});
