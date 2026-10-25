/*
  /api/vistas/ART-AAAA-NNN — Contador público de visualizaciones.
  La lógica está en functions/_lib/vistas.js (ver docs/contador-visualizaciones.md).
*/
import { leerVistas, registrarVista, metodoNoPermitido } from "../../_lib/vistas.js";

export const onRequestGet = ({ request, env, params }) => leerVistas(request, env, params.id);
export const onRequestPost = ({ request, env, params }) => registrarVista(request, env, params.id);
export const onRequest = () => metodoNoPermitido();
