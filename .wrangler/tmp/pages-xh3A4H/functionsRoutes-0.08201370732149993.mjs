import { onRequestGet as __registro_config_js_onRequestGet } from "/home/user/podcastdelmigrante/functions/registro/config.js"
import { onRequestPost as __registro_enviar_js_onRequestPost } from "/home/user/podcastdelmigrante/functions/registro/enviar.js"
import { onRequest as ___middleware_js_onRequest } from "/home/user/podcastdelmigrante/functions/_middleware.js"

export const routes = [
    {
      routePath: "/registro/config",
      mountPath: "/registro",
      method: "GET",
      middlewares: [],
      modules: [__registro_config_js_onRequestGet],
    },
  {
      routePath: "/registro/enviar",
      mountPath: "/registro",
      method: "POST",
      middlewares: [],
      modules: [__registro_enviar_js_onRequestPost],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "",
      middlewares: [___middleware_js_onRequest],
      modules: [],
    },
  ]