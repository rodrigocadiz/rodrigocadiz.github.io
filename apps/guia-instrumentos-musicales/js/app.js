/* Guía de Instrumentos Musicales · versión HTML5
   ------------------------------------------------------------------
   Aplicación de una sola página sin dependencias ni servidor: se abre
   index.html directamente desde el disco (file://) o desde cualquier
   hosting estático. El contenido viene de js/data.js (extraído de las
   películas Director de 2001) y los medios de ../extraido/.

   Rutas (hash, para que funcionen sin servidor):
     #/                                portada
     #/familia/<familia>               familia
     #/familia/<familia>/<inst>        instrumento
     #/familia/<familia>/<inst>/s/<sección>   instrumento, en una sección
     #/familia/<familia>/<inst>/t/<técnica>   instrumento, en una técnica
     #/az                              índice A-Z
     #/acustica[/<tema>]               acústica
     #/autores                         créditos
*/
(function () {
  "use strict";

  /* Carpeta de los medios extraídos, relativa a index.html. Si se publica
     la app en otro lugar basta con cambiar esta línea (o definir
     window.GUIA_CONFIG = { assetBase: "..." } antes de cargar app.js). */
  var ASSET_BASE = (window.GUIA_CONFIG && window.GUIA_CONFIG.assetBase) || "medios/";

  var EXTRA = window.GUIA_EXTRA;
  var TITULO_APP = "Guía de Instrumentos Musicales";

  /* ---------------------------------------------------------------- utilidades */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
  function asset(p) { return p ? ASSET_BASE + String(p).split("/").map(encodeURIComponent).join("/") : ""; }
  function plural(n, uno, varios) { return n + " " + (n === 1 ? uno : varios); }
  function fmtTiempo(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function iconoLink() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  }
  function iconoLupa() {
    return '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M13 13l4.5 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  }
  function iconoPlay() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>'; }

  var avisoTimer = null;
  function aviso(txt) {
    var el = $("#aviso");
    el.textContent = txt;
    el.classList.add("visible");
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { el.classList.remove("visible"); }, 1900);
  }

  function copiar(texto) {
    function viejo() {
      var t = document.createElement("textarea");
      t.value = texto; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch (e) { /* nada */ }
      t.remove();
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto).catch(viejo);
    } else viejo();
    aviso("Enlace copiado");
  }

  /* ---------------------------------------------------------------- datos */
  var FAMILIAS = EXTRA.FAMILY_ORDER.map(function (id) {
    return DATA.families.filter(function (f) { return f.id === id; })[0];
  }).filter(Boolean);

  function familia(id) { return FAMILIAS.filter(function (f) { return f.id === id; })[0] || null; }
  function instrumento(fam, id) { return fam ? fam.instruments.filter(function (i) { return i.id === id; })[0] || null : null; }
  function extra(id) { return DATA.extras.filter(function (e) { return e.id === id; })[0] || null; }
  function rutaInst(f, i) { return "#/familia/" + f + "/" + i; }
  /* URL absoluta: un url() relativo dentro de una variable CSS se resolvería
     contra la carpeta css/ y no contra index.html. */
  function strip(famId) { return new URL(EXTRA.STRIPS[famId] || "ui/collage.jpg", location.href).href; }

  var ESTAMPILLA_POR_INST = {};
  EXTRA.STAMPS.forEach(function (s) {
    var k = s[2] + "/" + s[3];
    if (!s[4] && !ESTAMPILLA_POR_INST[k]) ESTAMPILLA_POR_INST[k] = EXTRA.STAMP_DIR + s[0];
  });

  function numTecnicas(inst) {
    if (inst.instrumentos && inst.instrumentos.length) return inst.instrumentos.filter(function (g) { return !g.section; }).length;
    return (inst.techniques || []).length;
  }

  /* Muchos textos de introducción parten con los nombres del instrumento en
     otros idiomas: "Violín (violon, fr; Geige, al; violin, ingl; violino, it) ..."
     Se separan para mostrarlos como etiquetas. */
  var IDIOMAS = { fr: "fr", al: "al", ingl: "ingl", ing: "ingl", it: "it", esp: "esp" };
  function separarNombres(texto) {
    var m = /^([^()]{1,60})\(([^)]{4,220})\)\s*/.exec(texto || "");
    if (!m) return null;
    var partes = m[2].split(/;\s*/).map(function (p) {
      var mm = /^(.+?),\s*([a-zA-Z.]+)\.?$/.exec(p.trim());
      if (!mm) return null;
      var cod = mm[2].replace(/\./g, "").toLowerCase();
      return IDIOMAS[cod] ? { nombre: mm[1].trim(), idioma: IDIOMAS[cod] } : null;
    });
    if (!partes.length || partes.some(function (p) { return !p; })) return null;
    return { nombres: partes, resto: texto.slice(m[0].length) };
  }

  function parrafoTexto(p) { return typeof p === "string" ? p : (p && p.text) || ""; }

  /* ---------------------------------------------------------------- reproductor global */
  var Reproductor = (function () {
    var audio = new Audio();
    audio.preload = "auto";
    var cola = [], idx = -1, arrastrando = false;
    var el = {
      caja: $("#reproductor"), arte: $("#rep-arte"), titulo: $("#rep-titulo"), sub: $("#rep-sub"),
      play: $("#rep-play"), prev: $("#rep-prev"), next: $("#rep-next"), barra: $("#rep-barra"),
      t: $("#rep-t"), d: $("#rep-d"), cerrar: $("#rep-cerrar"), ir: $("#rep-ir"), controles: $(".rep-controles")
    };

    function actual() { return cola[idx] || null; }

    function cargar(i) {
      idx = i;
      var it = actual();
      if (!it) return;
      if (window.SIMS) window.SIMS.detenerSonido();
      audio.src = asset(it.src);
      audio.play().catch(function (e) { console.warn("No se pudo reproducir", it.src, e); });
      el.caja.hidden = false;
      document.documentElement.style.setProperty("--rep-h", el.caja.offsetHeight + "px");
      el.titulo.textContent = it.titulo || "";
      el.sub.textContent = it.sub || "";
      el.arte.src = it.arte ? asset(it.arte) : "";
      el.ir.href = it.ruta || "#/";
      el.prev.disabled = idx <= 0;
      el.next.disabled = idx >= cola.length - 1;
      el.controles.classList.toggle("cola", cola.length > 1);
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: it.titulo || "", artist: it.sub || "", album: TITULO_APP,
            artwork: it.arte && /^https?:/.test(location.protocol) ? [{ src: new URL(asset(it.arte), location.href).href }] : []
          });
        } catch (e) { /* algunos navegadores no aceptan file:// en artwork */ }
      }
      marcar();
    }

    function marcar() {
      var it = actual();
      var src = it && !audio.paused ? it.src : null;
      $$("[data-src]").forEach(function (b) {
        var on = src !== null && b.getAttribute("data-src") === src;
        b.classList.toggle("sonando", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
        var img = b.querySelector("img.ico-parlante");
        if (img) img.src = on ? "ui/parlante_on.png" : "ui/parlante.png";
        var card = b.closest("[data-tarjeta]");
        if (card && b.hasAttribute("data-principal")) card.classList.toggle("sonando", on);
      });
      $$("[data-tarjeta].sonando").forEach(function (c) {
        if (!c.querySelector("[data-src].sonando")) c.classList.remove("sonando");
      });
      el.play.classList.toggle("pausado", audio.paused);
      el.play.setAttribute("aria-label", audio.paused ? "Reproducir" : "Pausa");
    }

    audio.addEventListener("play", marcar);
    audio.addEventListener("pause", marcar);
    audio.addEventListener("ended", function () {
      if (idx < cola.length - 1) cargar(idx + 1); else marcar();
    });
    audio.addEventListener("loadedmetadata", function () { el.d.textContent = fmtTiempo(audio.duration); });
    audio.addEventListener("timeupdate", function () {
      if (arrastrando) return;
      el.t.textContent = fmtTiempo(audio.currentTime);
      el.barra.value = audio.duration ? Math.round(audio.currentTime / audio.duration * 1000) : 0;
    });
    audio.addEventListener("error", function () { aviso("No se encontró el archivo de audio"); });

    el.barra.addEventListener("input", function () {
      arrastrando = true;
      if (audio.duration) el.t.textContent = fmtTiempo(el.barra.value / 1000 * audio.duration);
    });
    el.barra.addEventListener("change", function () {
      if (audio.duration) audio.currentTime = el.barra.value / 1000 * audio.duration;
      arrastrando = false;
    });
    el.play.addEventListener("click", alternar);
    el.prev.addEventListener("click", anterior);
    el.next.addEventListener("click", siguiente);
    el.cerrar.addEventListener("click", detener);

    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("play", function () { audio.play(); });
        navigator.mediaSession.setActionHandler("pause", function () { audio.pause(); });
        navigator.mediaSession.setActionHandler("previoustrack", anterior);
        navigator.mediaSession.setActionHandler("nexttrack", siguiente);
      } catch (e) { /* nada */ }
    }

    function alternar() {
      if (!actual()) return;
      if (audio.paused) { if (window.SIMS) window.SIMS.detenerSonido(); audio.play(); } else audio.pause();
    }
    function anterior() { if (audio.currentTime > 2 || idx <= 0) audio.currentTime = 0; else cargar(idx - 1); }
    function siguiente() { if (idx < cola.length - 1) cargar(idx + 1); }
    function detener() {
      audio.pause(); audio.removeAttribute("src"); audio.load();
      cola = []; idx = -1;
      el.caja.hidden = true;
      document.documentElement.style.setProperty("--rep-h", "0px");
      marcar();
    }

    /* Toca un elemento; si ya era el actual, pausa/reanuda. */
    function tocar(item, lista) {
      var it = actual();
      if (it && it.src === item.src) { alternar(); return; }
      if (lista && lista.length) {
        cola = lista;
        var i = lista.map(function (x) { return x.src; }).indexOf(item.src);
        cargar(i < 0 ? 0 : i);
      } else {
        cola = [item]; cargar(0);
      }
    }
    function tocarCola(lista) { if (lista.length) { cola = lista; cargar(0); } }

    return { tocar: tocar, tocarCola: tocarCola, alternar: alternar, marcar: marcar, pausar: function () { audio.pause(); }, activo: function () { return !!actual(); } };
  })();

  window.GUIA_AUDIO = { pausarReproductor: function () { Reproductor.pausar(); } };

  /* Botones con data-src: el título y la cola se guardan en atributos. */
  function datosSonido(btn) {
    return {
      src: btn.getAttribute("data-src"),
      titulo: btn.getAttribute("data-titulo") || "",
      sub: btn.getAttribute("data-sub") || "",
      arte: btn.getAttribute("data-arte") || "",
      ruta: btn.getAttribute("data-ruta") || location.hash
    };
  }
  function attrsSonido(o) {
    return ' data-src="' + esc(o.src) + '" data-titulo="' + esc(o.titulo) + '" data-sub="' + esc(o.sub || "") +
      '" data-arte="' + esc(o.arte || "") + '" data-ruta="' + esc(o.ruta || "") + '"' + (o.cola ? ' data-cola="' + esc(o.cola) + '"' : "") +
      (o.principal ? " data-principal" : "") + ' aria-pressed="false"';
  }
  function botonSonido(o, chico) {
    return '<button type="button" class="btn-sonido' + (chico ? " chico" : "") + '"' + attrsSonido(o) +
      ' aria-label="Escuchar ' + esc(o.titulo) + '"><img class="ico-parlante" src="ui/parlante.png" alt=""></button>';
  }
  function chipSonido(o) {
    return '<button type="button" class="chip"' + attrsSonido(o) + '><span class="punto"><img class="ico-parlante" src="ui/parlante.png" alt=""></span>' + esc(o.etiqueta || o.titulo) + "</button>";
  }

  /* ---------------------------------------------------------------- visor de imágenes */
  var Visor = (function () {
    var dlg = $("#visor"), img = $("#visor-img"), marco = $("#visor-marco"), cap = $("#visor-cap"), cont = $("#visor-cont");
    var lista = [], i = 0, x0 = null;
    function mostrar() {
      var it = lista[i];
      marco.classList.remove("ampliado");
      img.src = it.src; img.alt = it.cap || "";
      cap.textContent = it.cap || "";
      cont.textContent = lista.length > 1 ? (i + 1) + " / " + lista.length : "";
      $(".visor-ant", dlg).hidden = $(".visor-sig", dlg).hidden = lista.length < 2;
    }
    function abrir(el) {
      var grupo = el.closest("[data-grupo]") || $("#contenido");
      var imgs = $$("[data-zoom]", grupo).filter(function (x) { return x.offsetParent !== null || x === el; });
      lista = imgs.map(function (x) { return { src: x.getAttribute("data-zoom"), cap: x.getAttribute("data-cap") || x.alt || "" }; });
      i = Math.max(0, imgs.indexOf(el));
      mostrar();
      if (!dlg.open) dlg.showModal();
    }
    function mover(d) { if (lista.length < 2) return; i = (i + d + lista.length) % lista.length; mostrar(); }
    dlg.addEventListener("click", function (e) {
      var b = e.target.closest("[data-visor]");
      if (b) {
        var a = b.getAttribute("data-visor");
        if (a === "cerrar") dlg.close(); else mover(a === "sig" ? 1 : -1);
        return;
      }
      if (e.target === img) { marco.classList.toggle("ampliado"); return; }
      if (e.target === marco || e.target === dlg) dlg.close();
    });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { mover(1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { mover(-1); e.preventDefault(); }
    });
    dlg.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener("touchend", function (e) {
      if (x0 === null || marco.classList.contains("ampliado")) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) mover(dx < 0 ? 1 : -1);
      x0 = null;
    });
    return { abrir: abrir };
  })();

  function imgZoom(src, cap, extraAttrs) {
    var u = asset(src);
    return '<img src="' + u + '" data-zoom="' + u + '" data-cap="' + esc(cap || "") + '" alt="' + esc(cap || "") + '" loading="lazy" decoding="async"' + (extraAttrs || "") + ">";
  }

  /* ---------------------------------------------------------------- menú de familias */
  function htmlMenuFamilias() {
    return FAMILIAS.map(function (f) {
      return '<div class="mf-col" style="--strip:url(\'' + strip(f.id) + '\')"><h3><a href="#/familia/' + f.id + '">' + esc(f.name) + "</a></h3><ul>" +
        f.instruments.map(function (i) { return '<li><a href="' + rutaInst(f.id, i.id) + '">' + esc(i.name) + "</a></li>"; }).join("") +
        "</ul></div>";
    }).join("");
  }
  var menuFam = $("#menu-familias"), btnFam = $("#btn-familias");
  menuFam.innerHTML = htmlMenuFamilias();
  function menuFamilias(abrir) {
    if (abrir === undefined) abrir = menuFam.hidden;
    menuFam.hidden = !abrir;
    btnFam.setAttribute("aria-expanded", abrir ? "true" : "false");
    if (abrir) { var a = $("a", menuFam); if (a) a.focus({ preventScroll: true }); }
  }
  btnFam.addEventListener("click", function () { menuFamilias(); });
  document.addEventListener("click", function (e) {
    if (!menuFam.hidden && !e.target.closest("#menu-familias") && !e.target.closest("#btn-familias")) menuFamilias(false);
  });

  /* ---------------------------------------------------------------- buscador */
  var Buscador = (function () {
    var dlg = $("#buscador"), input = $("#buscador-input"), res = $("#buscador-res");
    var indice = null, sel = 0, resultados = [];

    function construir() {
      indice = [];
      FAMILIAS.forEach(function (f) {
        indice.push({ tipo: "Familias", titulo: f.name, sub: "Familia", ruta: "#/familia/" + f.id, img: null, peso: 3, ico: f.name[0] });
        f.instruments.forEach(function (i) {
          var est = ESTAMPILLA_POR_INST[f.id + "/" + i.id];
          indice.push({ tipo: "Instrumentos", titulo: i.name, sub: f.name, ruta: rutaInst(f.id, i.id), img: est || i.photo, peso: 4 });
          (i.techniques || []).forEach(function (t) {
            indice.push({ tipo: "Técnicas de ejecución", titulo: t.label, sub: i.name + " · " + f.name, ruta: rutaInst(f.id, i.id) + "/t/" + slug(t.label), img: null, ico: "♪", peso: 2, texto: (t.explanations || []).join(" ") });
          });
          (i.instrumentos || []).forEach(function (g) {
            if (g.section) return;
            indice.push({ tipo: "Instrumentos", titulo: g.name, sub: i.name, ruta: rutaInst(f.id, i.id) + "/t/" + slug(g.name), img: (g.images || [])[0], peso: 3.5 });
          });
          var cuerpo = (i.intro || []).concat(i.notas || [], i.digitacion_texto || []).map(parrafoTexto).join(" ");
          if (cuerpo) indice.push({ tipo: "En los textos", titulo: i.name, sub: f.name, ruta: rutaInst(f.id, i.id) + "/s/introduccion", soloTexto: true, texto: cuerpo, ico: "¶", peso: 1 });
        });
      });
      EXTRA.STAMPS.forEach(function (s) {
        var f = familia(s[2]), i = instrumento(f, s[3]);
        if (!f || !i) return;
        var yaEsta = indice.some(function (x) { return x.tipo === "Instrumentos" && norm(x.titulo) === norm(s[1]); });
        if (!yaEsta) indice.push({ tipo: "Instrumentos", titulo: s[1], sub: "ver " + i.name, ruta: rutaInst(s[2], s[3]) + (s[4] ? "/t/" + s[4] : ""), img: EXTRA.STAMP_DIR + s[0], peso: 3 });
      });
      var ac = extra("acustica");
      if (ac) ac.topics.forEach(function (t) {
        indice.push({ tipo: "Acústica", titulo: t.name, sub: "Acústica en general", ruta: "#/acustica/" + t.key, ico: "∿", peso: 3, texto: t.intro ? t.intro.body : "" });
        t.items.forEach(function (it, n) {
          if (it.section || !it.heading) return;
          indice.push({ tipo: "Acústica", titulo: it.heading, sub: t.name, ruta: "#/acustica/" + t.key + "/" + n, ico: "∿", peso: 2.5, texto: it.body || "" });
        });
      });
      indice.push({ tipo: "Secciones", titulo: "Autores y créditos", sub: "Equipo, intérpretes y ejemplos musicales", ruta: "#/autores", ico: "✎", peso: 2 });
      indice.push({ tipo: "Secciones", titulo: "Instrumentos A-Z", sub: "Índice alfabético con estampillas", ruta: "#/az", ico: "A", peso: 2 });
      indice.forEach(function (x) { x.n = norm(x.titulo); x.nt = norm(x.texto || ""); });
    }

    function resaltar(texto, q) {
      if (!q) return esc(texto);
      var n = norm(texto), p = n.indexOf(q);
      if (p < 0) return esc(texto);
      return esc(texto.slice(0, p)) + "<mark>" + esc(texto.slice(p, p + q.length)) + "</mark>" + esc(texto.slice(p + q.length));
    }
    function fragmento(x, q) {
      var p = x.nt.indexOf(q);
      if (p < 0) return x.sub;
      var a = Math.max(0, p - 40), b = Math.min(x.texto.length, p + q.length + 60);
      return (a > 0 ? "…" : "") + x.texto.slice(a, b).trim() + (b < x.texto.length ? "…" : "");
    }

    function buscar(qRaw) {
      var q = norm(qRaw).trim();
      if (!q) { ayuda(); return; }
      var palabras = q.split(/\s+/);
      var lista = [];
      indice.forEach(function (x) {
        var s = 0;
        if (!x.soloTexto) {
          if (x.n === q) s = 100;
          else if (x.n.indexOf(q) === 0) s = 60;
          else if ((" " + x.n).indexOf(" " + q) >= 0) s = 40;
          else if (x.n.indexOf(q) >= 0) s = 25;
          else if (palabras.length > 1 && palabras.every(function (w) { return x.n.indexOf(w) >= 0 || norm(x.sub).indexOf(w) >= 0; })) s = 18;
        }
        if (!s && x.nt && q.length >= 3 && x.nt.indexOf(q) >= 0) s = x.soloTexto ? 6 : 8;
        if (s) lista.push({ x: x, s: s * x.peso, enTexto: s <= 8 });
      });
      lista.sort(function (a, b) { return b.s - a.s || a.x.titulo.localeCompare(b.x.titulo, "es"); });
      var porTipo = {}, orden = [];
      lista.forEach(function (r) {
        var t = r.x.tipo;
        if (!porTipo[t]) { porTipo[t] = []; orden.push(t); }
        if (porTipo[t].length < (t === "Técnicas de ejecución" ? 12 : 8)) porTipo[t].push(r);
      });
      resultados = [];
      var html = orden.map(function (t) {
        return "<h4>" + esc(t) + "</h4>" + porTipo[t].map(function (r) {
          var x = r.x, k = resultados.length;
          resultados.push(x);
          var vis = x.img ? '<img src="' + asset(x.img) + '" alt="" loading="lazy">' : '<span class="ico">' + esc(x.ico || "·") + "</span>";
          var sub = r.enTexto ? resaltar(fragmento(x, q), q) : esc(x.sub);
          return '<a class="res" role="option" id="res-' + k + '" href="' + x.ruta + '" aria-selected="false">' + vis +
            "<div><strong>" + resaltar(x.titulo, q) + "</strong><small>" + sub + "</small></div></a>";
        }).join("");
      }).join("");
      res.innerHTML = html || '<div class="buscador-ayuda"><p>No hay resultados para «' + esc(qRaw) + '».</p></div>';
      sel = 0; marcarSel();
    }

    function ayuda() {
      resultados = [];
      var sug = ["Violín", "pizzicato", "Sordina", "Marimba", "frullato", "armónicos", "Frecuencia", "Arpa", "glissando", "Tam tam"];
      res.innerHTML = '<div class="buscador-ayuda"><p>Busca entre los instrumentos, sus técnicas de ejecución, los textos descriptivos y los temas de acústica.</p><div class="sugerencias">' +
        sug.map(function (s) { return '<button type="button" data-sug="' + esc(s) + '">' + esc(s) + "</button>"; }).join("") + "</div></div>";
    }

    function marcarSel() {
      $$(".res", res).forEach(function (a, k) {
        a.setAttribute("aria-selected", k === sel ? "true" : "false");
        if (k === sel) a.scrollIntoView({ block: "nearest" });
      });
    }

    input.addEventListener("input", function () { buscar(input.value); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { sel = Math.min(sel + 1, resultados.length - 1); marcarSel(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); marcarSel(); e.preventDefault(); }
      else if (e.key === "Enter" && resultados[sel]) { e.preventDefault(); ir(resultados[sel].ruta); }
    });
    res.addEventListener("click", function (e) {
      var b = e.target.closest("[data-sug]");
      if (b) { input.value = b.getAttribute("data-sug"); buscar(input.value); input.focus(); return; }
      var a = e.target.closest("a.res");
      if (a) { e.preventDefault(); ir(a.getAttribute("href")); }
    });
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target.closest("[data-action='cerrar-buscador']")) dlg.close();
    });

    function ir(ruta) { dlg.close(); navegar(ruta); }
    function abrir(q) {
      if (!indice) construir();
      if (typeof q === "string") input.value = q;
      if (!dlg.open) dlg.showModal();
      input.focus(); input.select();
      buscar(input.value);
    }
    return { abrir: abrir };
  })();

  /* ---------------------------------------------------------------- navegación */
  var app = $("#contenido");
  var porClic = false;                 // true si la navegación viene de un enlace (no de atrás/adelante)
  var posiciones = {};                 // scroll guardado por ruta
  var rutaActual = null;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  function navegar(ruta) {
    porClic = true;
    if (location.hash === ruta) router(); else location.hash = ruta;
  }
  function reemplazarRuta(ruta) {
    history.replaceState(history.state, "", ruta);
    rutaActual = ruta.replace(/^#\/?/, "");
  }

  function marcarNav(seccion) {
    $$("[data-nav]").forEach(function (a) {
      a.classList.toggle("activo", a.getAttribute("data-nav") === seccion);
      if (a.tagName === "A") {
        if (a.getAttribute("data-nav") === seccion) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      }
    });
  }

  function titulo(t) { document.title = t ? t + " · " + TITULO_APP : TITULO_APP; }

  function router() {
    var hash = location.hash.replace(/^#\/?/, "");
    if (rutaActual !== null) posiciones[rutaActual] = window.scrollY;
    var p = hash.split("/").filter(Boolean).map(function (x) { try { return decodeURIComponent(x); } catch (e) { return x; } });
    var restaurar = !porClic && posiciones[hash] !== undefined;
    var foco = null;
    menuFamilias(false);

    /* compatibilidad con las rutas de la versión anterior (app_web) */
    if (p[0] === "extra" && p[1]) { location.replace("#/" + (p[1] === "az" ? "az" : p[1])); return; }

    var mismaPagina = false;
    if (!p.length) vistaPortada();
    else if (p[0] === "familia" && p[1] && p[2]) {
      var clave = p[1] + "/" + p[2];
      mismaPagina = app.getAttribute("data-pagina") === "inst:" + clave && (p[3] === "s" || p[3] === "t");
      if (!mismaPagina) vistaInstrumento(p[1], p[2]);
      if (p[3] === "t" && p[4]) foco = { tecnica: p[4] };
      else if (p[3] === "s" && p[4]) foco = { seccion: p[4] };
    }
    else if (p[0] === "familia" && p[1]) vistaFamilia(p[1]);
    else if (p[0] === "familias") vistaFamilias();
    else if (p[0] === "az") vistaAZ(p[1]);
    else if (p[0] === "acustica") { vistaAcustica(p[1]); if (p[2]) foco = { item: p[2] }; }
    else if (p[0] === "autores") vistaAutores();
    else vistaNoEncontrada();

    rutaActual = hash;
    Reproductor.marcar();

    if (foco) {
      requestAnimationFrame(function () { enfocar(foco, !mismaPagina); });
      /* las imágenes diferidas pueden mover el destino: se corrige una vez */
      if (!mismaPagina) setTimeout(function () { enfocar(foco, true, true); }, 450);
    } else if (restaurar) {
      requestAnimationFrame(function () { window.scrollTo(0, posiciones[hash]); });
    } else if (!mismaPagina) {
      window.scrollTo(0, 0);
    }
    if (porClic && !mismaPagina) app.focus({ preventScroll: true });
    porClic = false;
  }

  function enfocar(f, instantaneo, sinDestello) {
    var el = null;
    if (f.tecnica) {
      el = document.getElementById("t-" + f.tecnica);
      if (el && !sinDestello) {
        var filtro = $("#filtro-tecnicas");
        if (filtro && filtro.value) { filtro.value = ""; filtro.dispatchEvent(new Event("input")); }
        el.classList.remove("destacada"); void el.offsetWidth; el.classList.add("destacada");
      }
    } else if (f.seccion) el = document.getElementById("sec-" + f.seccion);
    else if (f.item) el = document.getElementById("ac-" + f.item);
    if (el) desplazarA(el, instantaneo);
  }

  /* Desplaza hasta un elemento dejando espacio para la barra y el índice fijos. */
  function desplazarA(el, instantaneo) {
    var barra = $("#barra"), indice = $("#indice");
    var off = (barra && barra.offsetParent !== null ? barra.offsetHeight : 0) + (indice ? indice.offsetHeight : 0) + 14;
    function destino() { return Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - off)); }
    var suave = !(instantaneo || reduceMov);
    window.scrollTo({ top: destino(), behavior: suave ? "smooth" : "auto" });
    /* si algo interrumpe el desplazamiento suave (p. ej. el reproductor que se
       actualiza mientras suena), se termina de llegar al destino */
    if (suave) setTimeout(function () {
      if (Math.abs(window.scrollY - destino()) > 4 && document.body.contains(el)) window.scrollTo({ top: destino(), behavior: "auto" });
    }, 900);
  }
  var reduceMov = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Enlaces a una sección o técnica de la página actual (botón "Leer introducción",
     índice de secciones, resultados de búsqueda): se resuelven sin recargar la vista,
     también cuando la dirección ya era la misma. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href^='#/familia/']");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var m = /^#\/familia\/([^/]+)\/([^/]+)\/(s|t)\/([^/]+)$/.exec(a.getAttribute("href"));
    if (!m || app.getAttribute("data-pagina") !== "inst:" + m[1] + "/" + m[2]) return;
    e.preventDefault();
    reemplazarRuta(a.getAttribute("href"));
    enfocar(m[3] === "t" ? { tecnica: m[4] } : { seccion: m[4] }, false);
  });

  /* Enlaces internos: se marca que la navegación es "nueva" (para subir al inicio). */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href^='#']");
    if (a && !e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) porClic = true;
  }, true);

  /* Delegación de acciones globales */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-src]");
    if (b) {
      e.preventDefault(); e.stopPropagation();
      Reproductor.tocar(datosSonido(b));
      var aj = b.getAttribute("data-ajuste"), item = b.closest(".ac-item"), sim = item && item.querySelector("[data-sim]");
      if (aj && sim) sim.dispatchEvent(new CustomEvent("sim:ajustar", { detail: { f: +aj.split(",")[0], A: +aj.split(",")[1] } }));
      return;
    }
    var z = e.target.closest("[data-zoom]");
    if (z) { e.preventDefault(); Visor.abrir(z); return; }
    var acc = e.target.closest("[data-action]");
    if (acc) {
      var a = acc.getAttribute("data-action");
      if (a === "buscar") { e.preventDefault(); Buscador.abrir(); }
      else if (a === "familias-movil") { e.preventDefault(); navegar("#/familias"); }
      else if (a === "tocar-todo") {
        var cola2 = acc.getAttribute("data-cola-objetivo");
        var items = $$('[data-cola="' + cola2 + '"][data-principal]').filter(function (x) { return x.closest("[data-tarjeta]").hidden !== true; }).map(datosSonido);
        Reproductor.tocarCola(items);
        aviso("Reproduciendo todas las técnicas");
      }
      else if (a === "copiar-enlace") {
        var r = acc.getAttribute("data-ruta");
        copiar(location.href.split("#")[0] + r);
      }
    }
  });

  document.addEventListener("keydown", function (e) {
    var t = e.target, enCampo = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); Buscador.abrir(); return; }
    if (enCampo || $("dialog[open]")) return;
    if (e.key === "/") { e.preventDefault(); Buscador.abrir(); }
    else if (e.key === "Escape") menuFamilias(false);
    else if (e.key === " " && Reproductor.activo() && (t === document.body || t === app)) { e.preventDefault(); Reproductor.alternar(); }
    else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && e.altKey) {
      var v = $(e.key === "ArrowLeft" ? ".vecino.ant" : ".vecino.sig");
      if (v) { e.preventDefault(); navegar(v.getAttribute("href")); }
    }
  });

  window.addEventListener("hashchange", router);

  /* ---------------------------------------------------------------- vistas */
  function migas(lista) {
    return '<nav class="migas" aria-label="Ruta">' + lista.map(function (m, k) {
      var sep = k ? '<span class="sep" aria-hidden="true">›</span>' : "";
      return sep + (m[1] ? '<a href="' + m[1] + '">' + esc(m[0]) + "</a>" : '<span aria-current="page">' + esc(m[0]) + "</span>");
    }).join("") + "</nav>";
  }

  function lateral(famId, instId) {
    var fam = familia(famId);
    return '<aside class="lateral" style="--strip:url(\'' + strip(famId) + '\')" aria-label="Familias e instrumentos">' +
      '<nav class="lateral-familias">' + FAMILIAS.map(function (f) {
        return '<a href="#/familia/' + f.id + '"' + (f.id === famId ? ' class="activa" aria-current="true"' : "") + ">" + esc(f.name) + "</a>";
      }).join("") + "</nav>" +
      (fam ? '<div class="lateral-instrumentos"><h4>' + esc(fam.name) + "</h4><ul>" + fam.instruments.map(function (i) {
        return '<li><a href="' + rutaInst(fam.id, i.id) + '"' + (i.id === instId ? ' class="activa" aria-current="page"' : "") + ">" + esc(i.name) + "</a></li>";
      }).join("") + "</ul></div>" : "") + "</aside>";
  }

  function selector(famId, instId) {
    var fam = familia(famId);
    return '<div class="selector" style="--strip:url(\'' + strip(famId) + '\')">' +
      '<div class="selector-fila familias">' + FAMILIAS.map(function (f) {
        return '<a href="#/familia/' + f.id + '"' + (f.id === famId ? ' class="activa"' : "") + ">" + esc(f.name) + "</a>";
      }).join("") + "</div>" +
      (fam && instId !== undefined ? '<div class="selector-fila instrumentos">' + fam.instruments.map(function (i) {
        return '<a href="' + rutaInst(fam.id, i.id) + '"' + (i.id === instId ? ' class="activa"' : "") + ">" + esc(i.name) + "</a>";
      }).join("") + "</div>" : "") + "</div>";
  }

  var simsActivas = [];
  function montar(html, pagina) {
    simsActivas.forEach(function (x) { try { x.destruir(); } catch (e) { /* nada */ } });
    simsActivas = [];
    app.innerHTML = html;
    if (window.SIMS) $$("[data-sim]", app).forEach(function (c) {
      var op = null; try { op = JSON.parse(c.getAttribute("data-op") || "null"); } catch (e) { /* nada */ }
      var sim = window.SIMS.montar(c, c.getAttribute("data-sim"), op);
      if (sim) simsActivas.push(sim);
    });
    app.setAttribute("data-pagina", pagina || "");
    /* el selector móvil se desplaza para mostrar el elemento activo */
    $$(".selector-fila").forEach(function (fila) {
      var act = $(".activa", fila);
      if (act) fila.scrollLeft = act.offsetLeft - fila.clientWidth / 2 + act.offsetWidth / 2;
    });
  }

  /* ---- Portada */
  var ZONAS = [
    { id: "percusion", poly: "0 0, 18.75% 0, 18.75% 100%, 0 100%" },
    { id: "cuerdas", poly: "18.75% 0, 47.25% 0, 47.25% 100%, 18.75% 100%" },
    { id: "maderas", poly: "47.25% 0, 64% 0, 64% 100%, 47.25% 100%" },
    { id: "bronces", poly: "64% 0, 75% 0, 75% 42%, 83.5% 42%, 83.5% 100%, 64% 100%" },
    { id: "solistas", poly: "75% 0, 100% 0, 100% 100%, 83.5% 100%, 83.5% 42%, 75% 42%" }
  ];

  function vistaPortada() {
    titulo("");
    marcarNav("portada");
    var html = '<div class="portada">' +
      '<div class="collage" id="collage" role="group" aria-label="Familias de instrumentos">' +
      ZONAS.map(function (z) {
        var f = familia(z.id);
        return '<a class="collage-zona" href="#/familia/' + z.id + '" style="--zona:polygon(' + z.poly + ')" data-fam="' + z.id + '" aria-label="' + esc(f.name) + '"></a>' +
          '<div class="collage-velo" style="--zona:polygon(' + z.poly + ')"></div>';
      }).join("") +
      "</div>" +
      '<div class="portada-cuerpo">' +
      '<button type="button" class="portada-buscar" data-action="buscar">' + iconoLupa() + "<span>Busca un instrumento, una técnica o un concepto acústico…</span><kbd>/</kbd></button>" +
      '<h2 class="seccion-titulo">Familias</h2><div class="familias-grid">' +
      FAMILIAS.map(function (f) {
        return '<a class="familia-card" href="#/familia/' + f.id + '" style="--strip:url(\'' + strip(f.id) + '\')"><h3>' + esc(f.name) + "</h3><p>" +
          esc(f.instruments.map(function (i) { return i.name; }).join(" · ")) + "</p></a>";
      }).join("") + "</div>" +
      '<h2 class="seccion-titulo">Más en la guía</h2><div class="accesos">' +
      acceso("#/az", "Instrumentos A-Z", "imagenes/az.dxr/az/EstampillaMaracas_4348.png", "Índice alfabético de todos los instrumentos, con las estampillas del original.") +
      acceso("#/acustica", "Acústica en general", "imagenes/acustica.dxr/acustica/suma3senos_6009.png", "Principios de acústica y el comportamiento de membranas, cuerdas y tubos.") +
      acceso("#/autores", "Autores", "imagenes/az.dxr/az/EstampillaPiano_3620.png", "Equipo del proyecto, músicos intérpretes y obras de los ejemplos musicales.") +
      "</div></div></div>";
    montar(html, "portada");

  }
  function acceso(ruta, nombre, img, texto) {
    return '<a class="acceso ventana" href="' + ruta + '"><div class="ventana-barra"><span>' + esc(nombre) + '</span><span aria-hidden="true">›</span></div>' +
      '<div class="ventana-cuerpo"><img src="' + asset(img) + '" alt="" loading="lazy"><p>' + esc(texto) + "</p></div></a>";
  }

  /* ---- Listado de familias (destino del botón "Familias" en móviles) */
  function vistaFamilias() {
    titulo("Familias");
    marcarNav("familia");
    montar('<div class="envoltura">' + migas([["Portada", "#/"], ["Familias"]]) + '<h1 class="titulo-pagina">Familias</h1>' +
      '<div class="familias-grid">' + FAMILIAS.map(function (f) {
        return '<a class="familia-card" href="#/familia/' + f.id + '" style="--strip:url(\'' + strip(f.id) + '\')"><h3>' + esc(f.name) + "</h3><p>" +
          esc(f.instruments.map(function (i) { return i.name; }).join(" · ")) + "</p></a>";
      }).join("") + "</div></div>", "familias");
  }

  /* ---- Familia */
  function vistaFamilia(famId) {
    var fam = familia(famId);
    if (!fam) return vistaNoEncontrada();
    titulo(fam.name);
    marcarNav("familia");
    var html = '<div class="interior">' + lateral(famId, null) + '<div class="contenido">' + selector(famId) +
      migas([["Portada", "#/"], [fam.name]]) +
      '<h1 class="titulo-pagina">' + esc(fam.name) + "</h1>" +
      '<div class="instrumentos-grid" data-grupo>' + fam.instruments.map(function (i) {
        var ruta = rutaInst(fam.id, i.id);
        var base = i.sonido_base ? botonSonido({ src: i.sonido_base.audio, titulo: i.name, sub: "Sonido del instrumento · " + fam.name, arte: i.photo, ruta: ruta }, true) : "";
        return '<div class="inst-card ventana"><div class="ventana-barra"><span>' + esc(fam.name) + "</span></div>" +
          '<a class="ventana-cuerpo" href="' + ruta + '" style="text-decoration:none;color:inherit">' +
          '<div class="foto">' + (i.photo ? '<img src="' + asset(i.photo) + '" alt="' + esc(i.name) + '" loading="lazy">' : "") + "</div>" +
          '<div class="datos"><div><strong>' + esc(i.name) + "</strong></div></div></a>" +
          (base ? '<div style="position:absolute;right:10px;bottom:10px">' + base + "</div>" : "") + "</div>";
      }).join("") + "</div></div></div>";
    montar(html, "fam:" + famId);
  }

  /* ---- Instrumento */
  function parrafos(lista) {
    return (lista || []).map(function (p) {
      if (typeof p === "string") return "<p>" + esc(p) + "</p>";
      var imgs = p.images || [];
      return (p.heading ? "<h4>" + esc(p.heading) + "</h4>" : "") + "<p>" + esc(p.text) + "</p>" +
        (imgs.length ? '<div class="parrafo-imgs">' + imgs.map(function (im) {
          return "<figure>" + imgZoom(im.file, im.caption) + (im.caption ? "<figcaption>" + esc(im.caption) + "</figcaption>" : "") + "</figure>";
        }).join("") + "</div>" : "");
    }).join("");
  }

  function vistaInstrumento(famId, instId) {
    var fam = familia(famId), inst = instrumento(fam, instId);
    if (!fam || !inst) return vistaNoEncontrada();
    titulo(inst.name);
    marcarNav("familia");
    var ruta = rutaInst(famId, instId);
    var arte = ESTAMPILLA_POR_INST[famId + "/" + instId] || inst.photo;
    var cola = "q-" + famId + "-" + instId;

    /* Introducción: nombres en otros idiomas + texto */
    var intro = (inst.intro || []).slice();
    var nombres = null;
    if (intro.length && typeof intro[0] === "string") {
      var sep = separarNombres(intro[0]);
      if (sep) { nombres = sep.nombres; intro[0] = sep.resto; }
    }
    var entrada = intro.length ? parrafoTexto(intro[0]) : "";

    var esAccesorios = !!(inst.instrumentos && inst.instrumentos.length);
    var tecnicas = inst.techniques || [];
    var nT = numTecnicas(inst);

    /* Pestañas de la ficha: Fotografía / Partes / Rango */
    var pestanas = [];
    if (inst.photo) pestanas.push({ k: "foto", t: "Fotografía" });
    if (inst.esquema) pestanas.push({ k: "esquema", t: "Partes" });
    if (inst.rango_imgs && inst.rango_imgs.length) pestanas.push({ k: "rango", t: inst.rango_imgs.length > 1 ? "Rangos" : "Rango" });

    var secciones = [];
    if (intro.length) secciones.push(["introduccion", "Introducción"]);
    secciones.push(["tecnicas", esAccesorios ? "Instrumentos" : "Técnicas", nT]);
    if ((inst.digitacion_imgs || []).length || (inst.digitacion_texto || []).length) secciones.push(["digitacion", "Digitación"]);
    if ((inst.gallery || []).length) secciones.push(["imagenes", "Imágenes", inst.gallery.length]);
    if ((inst.notas || []).length) secciones.push(["notas", "Notas"]);

    var idx = fam.instruments.indexOf(inst);
    var ant = fam.instruments[idx - 1], sig = fam.instruments[idx + 1];

    var html = '<div class="interior">' + lateral(famId, instId) + '<div class="contenido" data-grupo>' + selector(famId, instId) +
      migas([["Portada", "#/"], [fam.name, "#/familia/" + famId], [inst.name]]) +
      '<div class="inst-cabeza">' +
        '<div class="ficha ventana"><div class="ventana-barra"><h2>Ficha técnica</h2></div><div class="ventana-cuerpo">' +
          (pestanas.length ? '<div class="ficha-pestanas" role="tablist" aria-label="Ficha técnica">' + pestanas.map(function (p, k) {
            return '<button type="button" role="tab" id="tab-' + p.k + '" aria-controls="ficha-vista" aria-selected="' + (k === 0) + '" tabindex="' + (k === 0 ? 0 : -1) + '" data-ficha="' + p.k + '">' + p.t + "</button>";
          }).join("") + "</div>" : "") +
          '<div class="ficha-vista" id="ficha-vista" role="tabpanel"></div>' +
        "</div></div>" +
        '<div class="inst-info">' +
          '<span class="etiqueta-familia" style="--fam:' + esc(fam.color) + ';color:rgba(255,255,255,.7)">' + esc(fam.name) + "</span>" +
          '<div class="inst-titulo' + (inst.name.length > 16 ? " largo" : "") + '"><h1>' + esc(inst.name) + "</h1>" +
            (inst.sonido_base ? botonSonido({ src: inst.sonido_base.audio, titulo: inst.name, sub: "Sonido del instrumento · " + fam.name, arte: arte, ruta: ruta }) : "") + "</div>" +
          (nombres ? '<div class="otros-nombres" aria-label="Nombre en otros idiomas">' + nombres.map(function (n) {
            return "<span><i>" + esc(n.idioma) + "</i>" + esc(n.nombre) + "</span>";
          }).join("") + "</div>" : "") +
          (entrada ? '<p class="inst-entrada">' + esc(entrada) + "</p>" : "") +
          '<div class="inst-acciones">' +
            (nT && !esAccesorios && tecnicas.some(function (t) { return (t.audios || []).length; }) ? '<button type="button" class="btn" data-action="tocar-todo" data-cola-objetivo="' + cola + '">' + iconoPlay() + "Escuchar todas las técnicas</button>" : "") +
          "</div>" +
        "</div>" +
      "</div>" +
      '<nav class="indice" id="indice" aria-label="Secciones">' + secciones.map(function (s) {
        return '<a href="' + ruta + "/s/" + s[0] + '" data-sec="' + s[0] + '">' + s[1] + "</a>";
      }).join("") + "</nav>" +
      (intro.length ? bloque("introduccion", "Introducción", '<div class="prosa">' + parrafos(intro) + "</div>") : "") +
      bloqueTecnicas(fam, inst, ruta, arte, cola) +
      bloqueDigitacion(inst) +
      ((inst.gallery || []).length ? bloque("imagenes", "Otras imágenes", '<div class="galeria">' + inst.gallery.map(function (im) {
        return "<figure>" + imgZoom(im.file, im.label) + (im.label ? "<figcaption>" + esc(im.label) + "</figcaption>" : "") + "</figure>";
      }).join("") + "</div>") : "") +
      ((inst.notas || []).length ? bloque("notas", "Notas adicionales", '<div class="prosa">' + parrafos(inst.notas) + "</div>") : "") +
      '<nav class="vecinos" aria-label="Instrumentos vecinos">' +
        (ant ? '<a class="vecino ant" href="' + rutaInst(famId, ant.id) + '"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4"/></svg><div><small>Anterior</small><strong>' + esc(ant.name) + "</strong></div></a>" : "<span></span>") +
        (sig ? '<a class="vecino sig" href="' + rutaInst(famId, sig.id) + '"><div><small>Siguiente</small><strong>' + esc(sig.name) + '</strong></div><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4"/></svg></a>' : "") +
      "</nav>" +
      "</div></div>";
    montar(html, "inst:" + famId + "/" + instId);

    /* Ficha con pestañas accesibles (flechas izquierda/derecha) */
    var vista = $("#ficha-vista");
    function verFicha(k) {
      $$("[data-ficha]").forEach(function (b) {
        var on = b.getAttribute("data-ficha") === k;
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
        if (on) vista.setAttribute("aria-labelledby", b.id);
      });
      if (k === "foto") vista.innerHTML = imgZoom(inst.photo, inst.name + " · fotografía");
      else if (k === "esquema") vista.innerHTML = imgZoom(inst.esquema, inst.name + " · partes");
      else if (k === "rango") vista.innerHTML = '<div class="ficha-rangos">' + inst.rango_imgs.map(function (r) {
        return "<figure>" + imgZoom(r.file, r.label || (inst.name + " · rango")) + (r.label ? "<figcaption>" + esc(r.label) + "</figcaption>" : "") + "</figure>";
      }).join("") + "</div>";
    }
    if (pestanas.length) verFicha(pestanas[0].k);
    else vista.innerHTML = '<p class="vacio">No se conserva ficha técnica para este instrumento.</p>';
    var tabs = $$("[data-ficha]");
    tabs.forEach(function (b, k) {
      b.addEventListener("click", function () { verFicha(b.getAttribute("data-ficha")); });
      b.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        var n = tabs[(k + d + tabs.length) % tabs.length];
        n.focus(); verFicha(n.getAttribute("data-ficha"));
        e.preventDefault();
      });
    });

    /* Filtro de técnicas */
    var filtro = $("#filtro-tecnicas");
    if (filtro) {
      var tarjetas = $$("#lista-tecnicas [data-tarjeta]");
      var cont = $("#contador-tecnicas");
      filtro.addEventListener("input", function () {
        var q = norm(filtro.value).trim(), vis = 0;
        tarjetas.forEach(function (c) {
          var ok = !q || c.getAttribute("data-busqueda").indexOf(q) >= 0;
          c.hidden = !ok; if (ok) vis++;
        });
        $$("#lista-tecnicas .accesorio-grupo").forEach(function (h) {
          var n = h.nextElementSibling, alguno = false;
          while (n && !n.classList.contains("accesorio-grupo")) { if (!n.hidden) alguno = true; n = n.nextElementSibling; }
          h.hidden = !alguno;
        });
        cont.textContent = q ? vis + " de " + tarjetas.length : "";
      });
    }

    /* Índice que sigue el scroll */
    var enlaces = $$("#indice a");
    if ("IntersectionObserver" in window && enlaces.length) {
      var visibles = {};
      var obs = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { visibles[en.target.id] = en.isIntersecting; });
        var activo = null;
        secciones.forEach(function (s) { if (!activo && visibles["sec-" + s[0]]) activo = s[0]; });
        enlaces.forEach(function (a) { a.classList.toggle("activo", a.getAttribute("data-sec") === activo); });
      }, { rootMargin: "-120px 0px -55% 0px" });
      secciones.forEach(function (s) { var el = document.getElementById("sec-" + s[0]); if (el) obs.observe(el); });
    }
  }

  function bloque(id, nombre, cuerpo, acciones) {
    return '<section class="bloque ventana" id="sec-' + id + '" aria-labelledby="h-' + id + '"><div class="ventana-barra"><h2 id="h-' + id + '">' + esc(nombre) + "</h2>" +
      (acciones ? '<div class="acciones">' + acciones + "</div>" : "") + '</div><div class="ventana-cuerpo">' + cuerpo + "</div></section>";
  }

  function bloqueTecnicas(fam, inst, ruta, arte, cola) {
    var esAccesorios = !!(inst.instrumentos && inst.instrumentos.length);
    var tecnicas = inst.techniques || [];
    if (!esAccesorios && !tecnicas.length) {
      return bloque("tecnicas", "Técnicas de ejecución", '<p class="vacio">El material original no incluye grabaciones de técnicas para este instrumento.</p>');
    }
    var herramientas = '<div class="herramientas"><label class="filtro">' + iconoLupa() +
      '<input type="search" id="filtro-tecnicas" placeholder="' + (esAccesorios ? "Filtrar instrumentos…" : "Filtrar técnicas…") + '" aria-label="Filtrar"></label>' +
      '<span class="contador" id="contador-tecnicas" aria-live="polite"></span></div>';
    var tarjetas;
    if (esAccesorios) {
      tarjetas = inst.instrumentos.map(function (g) {
        if (g.section) return '<h3 class="accesorio-grupo">' + esc(g.section) + "</h3>";
        var id = slug(g.name), r = ruta + "/t/" + id;
        var vars = g.variantes || [];
        var img0 = (g.images || [])[0];
        return '<article class="tecnica" id="t-' + id + '" data-tarjeta data-busqueda="' + esc(norm(g.name + " " + vars.map(function (v) { return v.label; }).join(" "))) + '">' +
          '<div class="tecnica-cabeza">' +
            (vars[0] ? botonSonido({ src: vars[0].audio, titulo: g.name, sub: vars[0].label + " · " + inst.name, arte: img0 || arte, ruta: r, cola: cola, principal: true }) : "") +
            "<h3>" + esc(g.name) + "</h3>" +
            '<button type="button" class="enlace-tecnica" data-action="copiar-enlace" data-ruta="' + r + '" aria-label="Copiar enlace a ' + esc(g.name) + '">' + iconoLink() + "</button></div>" +
          ((g.images || []).length ? '<div class="accesorio-imgs">' + g.images.map(function (f) { return imgZoom(f, g.name); }).join("") + "</div>" : "") +
          (vars.length > 1 ? '<div class="tecnica-tomas"><small>Variantes:</small>' + vars.map(function (v) {
            return chipSonido({ src: v.audio, titulo: g.name, etiqueta: v.label, sub: v.label + " · " + inst.name, arte: img0 || arte, ruta: r });
          }).join("") + "</div>" : "") +
          "</article>";
      }).join("");
    } else {
      tarjetas = tecnicas.map(function (t) {
        var id = slug(t.label), r = ruta + "/t/" + id;
        var audios = t.audios || [];
        var nots = (t.notacion ? [t.notacion] : []).concat(t.notacion_extra || []);
        var videos = t.videos || [];
        var expl = (t.explanations || []).join(" ");
        return '<article class="tecnica" id="t-' + id + '" data-tarjeta data-busqueda="' + esc(norm(t.label + " " + expl)) + '">' +
          '<div class="tecnica-cabeza">' +
            (audios[0] ? botonSonido({ src: audios[0].audio, titulo: t.label, sub: inst.name + " · " + fam.name, arte: arte, ruta: r, cola: cola, principal: true }) : "") +
            "<h3>" + esc(t.label) + "</h3>" +
            '<button type="button" class="enlace-tecnica" data-action="copiar-enlace" data-ruta="' + r + '" aria-label="Copiar enlace a ' + esc(t.label) + '">' + iconoLink() + "</button></div>" +
          (nots.length ? '<div class="tecnica-notacion' + (nots.length > 1 ? " multiple" : "") + '">' + nots.map(function (n) { return imgZoom(n, t.label + " · notación"); }).join("") + "</div>" : "") +
          (videos.length ? '<div class="tecnica-videos">' + videos.map(function (v) {
            return '<video controls preload="metadata" playsinline src="' + asset(v.src) + '#t=0.1" aria-label="' + esc(t.label) + '"></video>';
          }).join("") + "</div>" : "") +
          (expl ? "<p>" + esc(expl) + "</p>" : "") +
          (audios.length > 1 ? '<div class="tecnica-tomas"><small>Otras tomas:</small>' + audios.slice(1).map(function (a) {
            return chipSonido({ src: a.audio, titulo: t.label + " (" + a.label + ")", etiqueta: a.label, sub: inst.name + " · " + fam.name, arte: arte, ruta: r });
          }).join("") + "</div>" : "") +
          "</article>";
      }).join("");
    }
    var acciones = !esAccesorios && tecnicas.some(function (t) { return (t.audios || []).length; })
      ? '<button type="button" class="btn" style="padding:2px 10px;font-size:.8rem" data-action="tocar-todo" data-cola-objetivo="' + cola + '">' + iconoPlay() + "Escuchar todas</button>" : "";
    return bloque("tecnicas", esAccesorios ? "Instrumentos de percusión menor" : "Técnicas de ejecución", herramientas + '<div class="tecnicas-grid" id="lista-tecnicas">' + tarjetas + "</div>", acciones);
  }

  function bloqueDigitacion(inst) {
    var imgs = inst.digitacion_imgs || [], txt = inst.digitacion_texto || [];
    if (!imgs.length && !txt.length) return "";
    return bloque("digitacion", "Digitación",
      (imgs.length ? '<div class="galeria" style="margin-bottom:14px">' + imgs.map(function (im) { return "<figure>" + imgZoom(im.file, "Digitación") + "</figure>"; }).join("") + "</div>" : "") +
      (txt.length ? '<div class="prosa">' + parrafos(txt) + "</div>" : ""));
  }

  /* ---- A-Z */
  var filtroAZ = { q: "", fam: "" };
  function entradasAZ() {
    var lista = EXTRA.STAMPS.map(function (s) {
      var f = familia(s[2]), i = instrumento(f, s[3]);
      return { nombre: s[1], img: EXTRA.STAMP_DIR + s[0], fam: f, ruta: rutaInst(s[2], s[3]) + (s[4] ? "/t/" + s[4] : ""), destino: i ? i.name : "" };
    });
    FAMILIAS.forEach(function (f) {
      f.instruments.forEach(function (i) {
        var cubierto = EXTRA.STAMPS.some(function (s) {
          return s[2] === f.id && s[3] === i.id && !s[4] && norm(s[1]).slice(0, 5) === norm(i.name).slice(0, 5);
        });
        if (!cubierto) lista.push({ nombre: i.name, img: i.photo, fam: f, ruta: rutaInst(f.id, i.id), destino: i.name });
      });
    });
    lista.sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); });
    return lista;
  }

  function vistaAZ() {
    titulo("Instrumentos A-Z");
    marcarNav("az");
    var html = '<div class="envoltura">' + migas([["Portada", "#/"], ["Instrumentos A-Z"]]) +
      '<h1 class="titulo-pagina">Instrumentos A-Z</h1>' +
      '<div class="az-barra"><div class="az-filtro"><label class="filtro">' + iconoLupa() +
      '<input type="search" id="az-q" placeholder="Filtrar por nombre…" aria-label="Filtrar instrumentos" value="' + esc(filtroAZ.q) + '"></label>' +
      '<div class="az-familias" role="group" aria-label="Familia"><button type="button" data-fam="" aria-pressed="' + (!filtroAZ.fam) + '">Todas</button>' +
      FAMILIAS.map(function (f) { return '<button type="button" data-fam="' + f.id + '" aria-pressed="' + (filtroAZ.fam === f.id) + '">' + esc(f.name) + "</button>"; }).join("") +
      '</div></div><div class="az-letras" id="az-letras"></div></div><div id="az-lista"></div></div>';
    montar(html, "az");
    var todas = entradasAZ();
    function pintar() {
      var q = norm(filtroAZ.q).trim();
      var vis = todas.filter(function (e) { return (!q || norm(e.nombre).indexOf(q) >= 0 || norm(e.destino).indexOf(q) >= 0) && (!filtroAZ.fam || e.fam.id === filtroAZ.fam); });
      var grupos = {}, letras = [];
      vis.forEach(function (e) {
        var l = norm(e.nombre)[0].toUpperCase();
        if (!grupos[l]) { grupos[l] = []; letras.push(l); }
        grupos[l].push(e);
      });
      $("#az-letras").innerHTML = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("").map(function (l) {
        return grupos[l] ? '<a href="#/az" data-letra="' + l + '">' + l + "</a>" : '<span aria-hidden="true">' + l + "</span>";
      }).join("");
      $("#az-lista").innerHTML = letras.length ? letras.map(function (l) {
        return '<section class="az-grupo" id="az-' + l + '"><h2>' + l + '</h2><div class="az-lista">' + grupos[l].map(function (e) {
          var otro = norm(e.destino) !== norm(e.nombre) && e.destino ? "en " + e.destino : e.fam.name;
          return '<a class="estampilla" href="' + e.ruta + '" style="--fam:' + esc(e.fam.color) + '">' +
            (e.img ? '<img src="' + asset(e.img) + '" alt="" loading="lazy">' : '<span class="sin-img">' + esc(e.nombre[0]) + "</span>") +
            "<div><strong>" + esc(e.nombre) + "</strong><small>" + esc(otro) + "</small></div></a>";
        }).join("") + "</div></section>";
      }).join("") : '<p class="az-vacio">Ningún instrumento coincide con el filtro.</p>';
    }
    pintar();
    $("#az-q").addEventListener("input", function (e) { filtroAZ.q = e.target.value; pintar(); });
    $(".az-familias").addEventListener("click", function (e) {
      var b = e.target.closest("[data-fam]"); if (!b) return;
      filtroAZ.fam = b.getAttribute("data-fam");
      $$(".az-familias button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      pintar();
    });
    $("#az-letras").addEventListener("click", function (e) {
      var a = e.target.closest("[data-letra]"); if (!a) return;
      e.preventDefault();
      var g = document.getElementById("az-" + a.getAttribute("data-letra"));
      if (g) g.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ---- Acústica */
  function vistaAcustica(temaKey) {
    var ac = extra("acustica");
    if (!ac) return vistaNoEncontrada();
    var tema = ac.topics.filter(function (t) { return t.key === temaKey; })[0] || ac.topics[0];
    titulo(tema.name);
    marcarNav("acustica");
    var intro = tema.intro;
    var cuerpo = "";
    function bloqueSim(clave, imgs) {
      var sim = SIM_ACUSTICA[tema.key + "/" + clave];
      if (!sim) return null;
      return '<div class="ac-sim" data-sim="' + sim[0] + '"' + (sim[1] ? " data-op='" + JSON.stringify(sim[1]) + "'" : "") + "></div>";
    }
    if (intro) {
      var imgs = intro.images || [];
      var simI = bloqueSim("intro", imgs);
      cuerpo += '<div class="ac-intro"><h2>' + esc(intro.heading) + "</h2>" +
        (intro.body ? '<div class="prosa"><p>' + esc(intro.body) + "</p></div>" : "") +
        (simI || (imgs.length ? '<div class="ac-imgs">' + imgs.map(figuraAc).join("") + "</div>" : "")) + "</div>";
    }
    cuerpo += tema.items.map(function (it, n) {
      if (it.section) return '<h3 class="ac-seccion">' + esc(it.section) + "</h3>";
      var imgs = it.images || [], sons = it.sonidos || [];
      var sim = bloqueSim(n, imgs);
      var textoHtml = '<div class="ac-texto">' + (it.heading ? "<h3>" + esc(it.heading) + "</h3>" : "") +
        (it.body ? '<div class="prosa"><p>' + esc(it.body) + "</p></div>" : "") +
        (sons.length ? '<div class="tecnica-tomas"><small>Grabaciones originales:</small>' + sons.map(function (s) {
          var chip = chipSonido({ src: s.audio, titulo: s.label, etiqueta: s.label, sub: tema.name, ruta: "#/acustica/" + tema.key + "/" + n });
          /* Las grabaciones de 2001 son sinusoides puras (medidas: 220, 440 y 880 Hz;
             amplitud "baja" = 0,39 de la "alta"). Al tocarlas, la simulación muestra lo mismo. */
          var m = /(aguda|media|baja)_(alta|baja)\.mp3$/.exec(s.audio);
          if (m) chip = chip.replace('<button type="button" class="chip"', '<button type="button" class="chip" data-ajuste="' +
            { aguda: 880, media: 440, baja: 220 }[m[1]] + "," + (m[2] === "alta" ? 1 : 0.39) + '"');
          return chip;
        }).join("") + "</div>" : "") + "</div>";
      if (sim) return '<article class="ac-item con-sim" id="ac-' + n + '">' + textoHtml + sim + "</article>";
      return '<article class="ac-item' + (imgs.length ? "" : " solo-texto") + '" id="ac-' + n + '">' +
        (imgs.length ? '<div class="ac-imgs">' + imgs.map(figuraAc).join("") + "</div>" : "") + textoHtml + "</article>";
    }).join("");
    if (!intro && !tema.items.length) cuerpo = '<p class="vacio">No se conserva material para este tema.</p>';

    var html = '<div class="envoltura">' + migas([["Portada", "#/"], ["Acústica en general", "#/acustica"], [tema.name]]) +
      '<h1 class="titulo-pagina">Acústica en general</h1>' +
      '<nav class="temas" aria-label="Temas">' + ac.topics.map(function (t) {
        return '<a href="#/acustica/' + t.key + '"' + (t === tema ? ' aria-current="page"' : "") + ">" + esc(t.name.replace("Acústica de ", "")) + "</a>";
      }).join("") + "</nav>" +
      '<div class="ventana" data-grupo><div class="ventana-barra"><h2>' + esc(tema.name) + '</h2></div><div class="ventana-cuerpo">' + cuerpo + "</div></div></div>";
    montar(html, "acustica:" + tema.key);
  }
  /* Simulaciones interactivas que reemplazan las figuras de acustica.dxr */
  var SIM_ACUSTICA = {
    "principios/5": ["formas"], "principios/6": ["periodico"], "principios/7": ["ruido"], "principios/8": ["viajera"],
    "principios/9": ["onda"], "principios/10": ["octava"], "principios/11": ["fourier"], "principios/12": ["batimiento"],
    "principios/13": ["superposicion"],
    "membranas/1": ["barra"], "membranas/3": ["membrana"],
    "cuerdas/0": ["cuerdaExcitacion"], "cuerdas/1": ["modosCuerda"], "cuerdas/2": ["cuerdaFisica"],
    "tubos/intro": ["tubosComparar"], "tubos/0": ["tubo", { tipo: "cerrado" }],
    "tubos/1": ["tubo", { tipo: "abierto" }], "tubos/2": ["orificio"]
  };
  function figuraAc(f) {
    var o = typeof f === "string" ? { file: f } : (f || {});
    if (!o.file) return "";
    return "<figure>" + imgZoom(o.file, o.caption) + (o.caption ? "<figcaption>" + esc(o.caption) + "</figcaption>" : "") + "</figure>";
  }

  /* ---- Autores */
  function vistaAutores() {
    var au = extra("autores");
    titulo("Autores");
    marcarNav("autores");
    var html = '<div class="envoltura autores">' + migas([["Portada", "#/"], ["Autores"]]) +
      '<h1 class="titulo-pagina">Autores</h1>' +
      '<div class="ventana"><div class="ventana-barra"><h2>Guía de Instrumentos Musicales</h2></div><div class="ventana-cuerpo prosa">' +
      parrafos(au ? au.textos : []) + "</div></div></div>";
    montar(html, "autores");
  }

  function vistaNoEncontrada() {
    titulo("No encontrado");
    marcarNav("");
    montar('<div class="no-encontrado"><h1 class="titulo-pagina">Página no encontrada</h1><p class="bajada" style="margin:10px auto 20px">La dirección no corresponde a ninguna sección de la guía.</p><a class="btn" href="#/">Volver a la portada</a></div>', "404");
  }

  router();
})();
