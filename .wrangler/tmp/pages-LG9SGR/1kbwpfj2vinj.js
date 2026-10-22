// <define:__ROUTES__>
var define_ROUTES_default = {
  version: 1,
  description: "Las funciones de Pages solo se ejecutan en la plantilla de art\xEDculos (redirecci\xF3n de /articulo?slug=), en el registro de empresas (/registro/*) y en las carpetas internas del repositorio, que responden 404 (no son parte del sitio); todo lo dem\xE1s se sirve como archivo est\xE1tico.",
  include: [
    "/articulo",
    "/articulo.html",
    "/articulo/",
    "/registro/*",
    "/admin-worker/*",
    "/db/*",
    "/docs/*",
    "/tests/*",
    "/scripts/*",
    "/functions/*",
    "/.github/*"
  ],
  exclude: []
};

// ../../../tmp/claude-0/-home-user/86bd38a2-b310-542f-b99c-21ab2ae4b64e/scratchpad/wr/node_modules/wrangler/templates/pages-dev-pipeline.ts
import worker from "/home/user/podcastdelmigrante/.wrangler/tmp/pages-LG9SGR/functionsWorker-0.22875749276708945.mjs";
import { isRoutingRuleMatch } from "/tmp/claude-0/-home-user/86bd38a2-b310-542f-b99c-21ab2ae4b64e/scratchpad/wr/node_modules/wrangler/templates/pages-dev-util.ts";
export * from "/home/user/podcastdelmigrante/.wrangler/tmp/pages-LG9SGR/functionsWorker-0.22875749276708945.mjs";
var routes = define_ROUTES_default;
var pages_dev_pipeline_default = {
  fetch(request, env, context) {
    const { pathname } = new URL(request.url);
    for (const exclude of routes.exclude) {
      if (isRoutingRuleMatch(pathname, exclude)) {
        return env.ASSETS.fetch(request);
      }
    }
    for (const include of routes.include) {
      if (isRoutingRuleMatch(pathname, include)) {
        const workerAsHandler = worker;
        if (workerAsHandler.fetch === void 0) {
          throw new TypeError("Entry point missing `fetch` handler");
        }
        return workerAsHandler.fetch(request, env, context);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
export {
  pages_dev_pipeline_default as default
};
//# sourceMappingURL=1kbwpfj2vinj.js.map
