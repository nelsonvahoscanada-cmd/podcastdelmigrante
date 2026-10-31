/*
  descubre-canada.js — Módulo «Descubre tu Canadá» de la portada.
  Lee window.CD_DISPONIBLES (js/canada-datos-disponibles.js, generado por
  scripts/build-canada-datos.mjs desde CD_REGIONS) y muestra el contador, las
  provincias y territorios publicados (con enlace a su guía) y los demás como
  «Próximamente», sin enlace. Sin datos, el módulo se queda con el botón
  principal, que siempre lleva a /canada-en-datos/.
*/
(function () {
  "use strict";
  var datos = window.CD_DISPONIBLES;
  var conteo = document.getElementById("descubreConteo");
  var bloque = document.getElementById("descubreRegiones");
  var lista = document.getElementById("descubreLista");
  var proximas = document.getElementById("descubreProximas");
  if (!datos || !Array.isArray(datos.regiones) || !conteo || !bloque || !lista || !proximas) return;

  var si = datos.regiones.filter(function (r) { return r.url; });
  var no = datos.regiones.filter(function (r) { return !r.url; });
  if (!si.length) return;

  conteo.textContent = si.length + " de " + datos.regiones.length + " provincias y territorios ya disponibles";
  conteo.hidden = false;

  si.forEach(function (r) {
    var li = document.createElement("li");
    li.className = "descubre__region";
    var a = document.createElement("a");
    a.href = r.url;
    a.textContent = r.name;
    a.setAttribute("data-descubre", "region");
    li.appendChild(a);
    lista.appendChild(li);
  });

  if (no.length) {
    var etiqueta = document.createElement("span");
    etiqueta.className = "descubre__pronto";
    etiqueta.textContent = "Próximamente";
    proximas.appendChild(etiqueta);
    proximas.appendChild(document.createTextNode(" " + no.map(function (r) { return r.name; }).join(" · ")));
    proximas.hidden = false;
  }
  bloque.hidden = false;
})();
