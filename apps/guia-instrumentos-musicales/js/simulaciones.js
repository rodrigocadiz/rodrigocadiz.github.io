/* Simulaciones interactivas de la sección Acústica.
   Reemplazan las figuras estáticas de acustica.dxr (2001) por animaciones
   en <canvas> con controles deslizantes y sonido sintetizado con Web Audio
   (no se lee ningún archivo, así que funciona también desde file://).

   Uso: SIMS.montar(contenedor, "tipo", opciones) -> { destruir() }
        SIMS.detenerSonido()
*/
(function () {
  "use strict";

  var C = {
    fondo: "#ffffff", rejilla: "#efe6cf", eje: "#b9a77c", tinta: "#1d1407", tenue: "#8a7a5c",
    rojo: "#c8102e", navy: "#1d1450", azul: "#2f5fb3", ambar: "#ffb431", naranjo: "#e87e10", turquesa: "#1aa9a9"
  };
  var PALETA = ["#1d1450", "#2f5fb3", "#1aa9a9", "#5b8a1e", "#e87e10", "#a0522d", "#8e3b8a", "#c8102e"];
  var VEL_SONIDO = 343;
  var reduceMov = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------ utilidades */
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function fmtHz(f) { return f >= 1000 ? (f / 1000).toFixed(f >= 10000 ? 1 : 2).replace(".", ",") + " kHz" : (f < 10 ? f.toFixed(1).replace(".", ",") : Math.round(f)) + " Hz"; }
  function fmtNum(v, d) { return v.toFixed(d).replace(".", ","); }
  var NOTAS = ["Do", "Do♯", "Re", "Re♯", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si"];
  function nota(f) {
    var n = 12 * Math.log2(f / 440) + 69, r = Math.round(n), c = Math.round((n - r) * 100);
    return NOTAS[(r % 12 + 12) % 12] + (Math.floor(r / 12) - 1) + (c ? " " + (c > 0 ? "+" : "−") + Math.abs(c) + " c" : "");
  }
  function lerpLog(a, b, u) { return a * Math.pow(b / a, u); }

  /* ------------------------------------------------------------ audio */
  var Audio = (function () {
    var ctx = null, actual = null;
    function contexto() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    function salida(nivel) {
      var c = contexto(); if (!c) return null;
      var g = c.createGain();
      g.gain.setValueAtTime(0, c.currentTime);
      g.gain.linearRampToValueAtTime(nivel == null ? 0.18 : nivel, c.currentTime + 0.04);
      g.connect(c.destination);
      return g;
    }
    function detener() {
      if (actual) { var a = actual; actual = null; a.detener(); }
    }
    function iniciar(voz) {
      detener();
      if (window.GUIA_AUDIO) window.GUIA_AUDIO.pausarReproductor();
      actual = voz;
    }
    function soltar(voz) { if (actual === voz) actual = null; }
    return { contexto: contexto, salida: salida, detener: detener, iniciar: iniciar, soltar: soltar, activo: function () { return actual; } };
  })();

  /* Voz continua formada por osciladores sinusoidales (frecuencias y amplitudes libres). */
  function vozParcial(obtener) {
    var c = Audio.contexto(); if (!c) return null;
    var out = Audio.salida(), osc = [], gan = [];
    function aplicar() {
      var p = obtener(), f = p.f, a = p.a;
      var tot = a.reduce(function (s, x) { return s + Math.abs(x); }, 0) || 1;
      var esc = Math.min(1, 1 / tot);
      while (osc.length < f.length) {
        var o = c.createOscillator(), g = c.createGain();
        g.gain.value = 0; o.connect(g); g.connect(out); o.start();
        osc.push(o); gan.push(g);
      }
      var t = c.currentTime;
      for (var i = 0; i < osc.length; i++) {
        var fi = f[i] || 0, ai = i < f.length && fi > 0 && fi < c.sampleRate / 2 ? a[i] * esc : 0;
        if (fi > 0) osc[i].frequency.setTargetAtTime(fi, t, 0.015);
        gan[i].gain.setTargetAtTime(ai, t, 0.02);
      }
    }
    aplicar();
    var voz = {
      actualizar: aplicar,
      detener: function () {
        var t = c.currentTime;
        out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + 0.06);
        setTimeout(function () { osc.forEach(function (o) { try { o.stop(); } catch (e) {} }); out.disconnect(); }, 120);
      }
    };
    return voz;
  }

  /* Voz armónica: un oscilador con forma de onda definida por amplitudes de armónicos. */
  function vozArmonica(obtener) {
    var c = Audio.contexto(); if (!c) return null;
    var out = Audio.salida(), o = c.createOscillator();
    var ultimo = "";
    function aplicar() {
      var p = obtener(), amps = p.a, n = amps.length;
      var clave = amps.map(function (x) { return x.toFixed(3); }).join(",");
      if (clave !== ultimo) {
        var re = new Float32Array(n + 1), im = new Float32Array(n + 1);
        var tot = 0;
        for (var i = 0; i < n; i++) { im[i + 1] = amps[i]; tot += Math.abs(amps[i]); }
        if (tot === 0) im[1] = 0.0001;
        o.setPeriodicWave(c.createPeriodicWave(re, im, { disableNormalization: false }));
        ultimo = clave;
      }
      o.frequency.setTargetAtTime(p.f, c.currentTime, 0.015);
      if (p.nivel != null) out.gain.setTargetAtTime(0.18 * p.nivel, c.currentTime, 0.02);
    }
    aplicar();
    o.connect(out); o.start();
    return {
      actualizar: aplicar,
      detener: function () {
        var t = c.currentTime;
        out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + 0.06);
        setTimeout(function () { try { o.stop(); } catch (e) {} out.disconnect(); }, 120);
      }
    };
  }

  /* Ruido blanco filtrado. */
  function vozRuido(obtener) {
    var c = Audio.contexto(); if (!c) return null;
    var out = Audio.salida(0.25);
    var buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    var fil = c.createBiquadFilter(); fil.type = "lowpass";
    src.connect(fil); fil.connect(out); src.start();
    function aplicar() { fil.frequency.setTargetAtTime(obtener().corte, c.currentTime, 0.02); }
    aplicar();
    return {
      actualizar: aplicar,
      detener: function () {
        var t = c.currentTime;
        out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + 0.06);
        setTimeout(function () { try { src.stop(); } catch (e) {} out.disconnect(); }, 120);
      }
    };
  }

  /* Golpe: parciales que decaen (cuerda pulsada, membrana, barra). */
  function golpe(f, a, decaimientos, dur) {
    var c = Audio.contexto(); if (!c) return;
    Audio.detener();
    if (window.GUIA_AUDIO) window.GUIA_AUDIO.pausarReproductor();
    dur = dur || 3;
    var out = c.createGain(), t0 = c.currentTime + 0.01;
    out.gain.value = 0.32; out.connect(c.destination);
    var tot = a.reduce(function (s, x) { return s + Math.abs(x); }, 0) || 1;
    for (var i = 0; i < f.length; i++) {
      if (!(f[i] > 0) || f[i] >= c.sampleRate / 2 || !a[i]) continue;
      var o = c.createOscillator(), g = c.createGain();
      o.frequency.value = f[i];
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(Math.abs(a[i]) / tot, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.min(dur, decaimientos[i]));
      o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.1);
    }
    setTimeout(function () { out.disconnect(); }, (dur + 0.4) * 1000);
  }

  /* ------------------------------------------------------------ controles */
  function Controles(raiz) { this.raiz = raiz; }
  Controles.prototype.rango = function (o) {
    var w = el("label", "sim-rango");
    var cab = el("span", "sim-rango-cab");
    var nom = el("span", "sim-rango-nom", o.etiqueta), val = el("output", "sim-rango-val");
    cab.appendChild(nom); cab.appendChild(val);
    var inp = el("input"); inp.type = "range";
    var log = !!o.log;
    inp.min = log ? 0 : o.min; inp.max = log ? 1000 : o.max; inp.step = log ? 1 : (o.paso || "any");
    function aValor() { return log ? lerpLog(o.min, o.max, inp.value / 1000) : parseFloat(inp.value); }
    function desdeValor(v) { inp.value = log ? Math.round(Math.log(v / o.min) / Math.log(o.max / o.min) * 1000) : v; }
    desdeValor(o.valor);
    function pintar() { var v = aValor(); val.textContent = o.fmt ? o.fmt(v) : v; }
    inp.addEventListener("input", function () { pintar(); o.cambio(aValor()); });
    w.appendChild(cab); w.appendChild(inp); pintar();
    this.raiz.appendChild(w);
    return { set: function (v) { desdeValor(v); pintar(); }, el: w, inp: inp };
  };
  Controles.prototype.opciones = function (o) {
    var w = el("div", "sim-opciones");
    if (o.etiqueta) w.appendChild(el("span", "sim-rango-nom", o.etiqueta));
    var g = el("div", "sim-segmentos"); g.setAttribute("role", o.multiple ? "group" : "radiogroup");
    var botones = o.items.map(function (it) {
      var b = el("button", null, it.t); b.type = "button";
      if (it.title) b.title = it.title;
      b.addEventListener("click", function () {
        if (o.multiple) {
          var on = b.getAttribute("aria-pressed") !== "true";
          var activos = botones.filter(function (x) { return x.getAttribute("aria-pressed") === "true"; });
          if (!on && activos.length <= 1) return;
          b.setAttribute("aria-pressed", on ? "true" : "false");
          o.cambio(botones.map(function (x, k) { return x.getAttribute("aria-pressed") === "true" ? o.items[k].v : null; }).filter(function (x) { return x !== null; }));
        } else {
          botones.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
          o.cambio(it.v);
        }
      });
      g.appendChild(b); return b;
    });
    function set(v) {
      botones.forEach(function (b, k) {
        var on = o.multiple ? v.indexOf(o.items[k].v) >= 0 : o.items[k].v === v;
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    set(o.valor);
    w.appendChild(g); this.raiz.appendChild(w);
    return { set: set, el: w };
  };
  Controles.prototype.casilla = function (o) {
    var w = el("label", "sim-casilla"), i = el("input");
    i.type = "checkbox"; i.checked = !!o.valor;
    i.addEventListener("change", function () { o.cambio(i.checked); });
    w.appendChild(i); w.appendChild(el("span", null, o.etiqueta));
    this.raiz.appendChild(w);
    return { set: function (v) { i.checked = v; }, el: w };
  };
  Controles.prototype.boton = function (o) {
    var b = el("button", "sim-boton" + (o.cls ? " " + o.cls : ""), o.html); b.type = "button";
    b.addEventListener("click", o.clic);
    this.raiz.appendChild(b);
    return b;
  };

  var ICO_SONIDO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var ICO_STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" fill="currentColor"/></svg>';
  var ICO_GOLPE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21l9-9M14 4l6 6-4 4-6-6z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  var ICO_PAUSA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';
  var ICO_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>';

  /* ------------------------------------------------------------ marco común */
  function crear(cont, cfg) {
    var raiz = el("div", "sim");
    var lienzo = el("div", "sim-lienzo");
    var canvas = el("canvas"); canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", cfg.titulo || "Simulación");
    lienzo.appendChild(canvas);
    var lectura = el("div", "sim-lectura"); lectura.setAttribute("aria-live", "polite");
    lienzo.appendChild(lectura);
    var barraAcc = el("div", "sim-acciones");
    var ctrl = el("div", "sim-controles");
    raiz.appendChild(lienzo); raiz.appendChild(barraAcc); raiz.appendChild(ctrl);
    cont.appendChild(raiz);

    var ctx = canvas.getContext("2d");
    var S = { w: 0, h: 0, t: 0, ultimo: 0, corriendo: !reduceMov, visible: true, vel: 1, raf: 0, sucio: true };
    var proporcion = cfg.proporcion || 0.42;
    function medir() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = lienzo.clientWidth;
      var h = Math.max(cfg.altoMin || 190, Math.min(cfg.altoMax || 340, Math.round(w * proporcion)));
      canvas.style.height = h + "px";
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      S.w = w; S.h = h; S.sucio = true;
    }
    var ro = "ResizeObserver" in window ? new ResizeObserver(medir) : null;
    if (ro) ro.observe(lienzo); else window.addEventListener("resize", medir);
    var io = "IntersectionObserver" in window ? new IntersectionObserver(function (e) { S.visible = e[0].isIntersecting; if (S.visible) bucle(); }, { rootMargin: "80px" }) : null;
    if (io) io.observe(canvas);
    medir();

    var api = {
      raiz: raiz, ctx: ctx, S: S, controles: new Controles(ctrl), acciones: new Controles(barraAcc),
      lectura: function (html) { lectura.innerHTML = html; },
      redibujar: function () { S.sucio = true; if (!S.corriendo) bucle(); },
      voz: null
    };

    /* Botón de pausa de la animación */
    if (cfg.animada !== false) {
      var bPausa = api.acciones.boton({ html: S.corriendo ? ICO_PAUSA + "<span>Pausar animación</span>" : ICO_PLAY + "<span>Animar</span>", cls: "sim-boton-sec", clic: function () {
        S.corriendo = !S.corriendo;
        bPausa.innerHTML = S.corriendo ? ICO_PAUSA + "<span>Pausar animación</span>" : ICO_PLAY + "<span>Animar</span>";
        S.ultimo = 0; bucle();
      } });
    }

    /* Botón de sonido continuo */
    if (cfg.sonido) {
      var bSon = api.acciones.boton({ html: ICO_SONIDO + "<span>Escuchar</span>", cls: "sim-boton-son", clic: function () {
        if (api.voz) { apagar(); return; }
        var v = cfg.sonido();
        if (!v) return;
        v.alDetener = function () { api.voz = null; bSon.classList.remove("activo"); bSon.innerHTML = ICO_SONIDO + "<span>Escuchar</span>"; };
        var detOrig = v.detener;
        v.detener = function () { detOrig(); v.alDetener(); };
        Audio.iniciar(v);
        api.voz = v;
        bSon.classList.add("activo"); bSon.innerHTML = ICO_STOP + "<span>Detener</span>";
      } });
    }
    function apagar() { if (api.voz) { var v = api.voz; Audio.soltar(v); v.detener(); } }
    api.sonar = function () { if (api.voz) api.voz.actualizar(); };

    function bucle(ts) {
      cancelAnimationFrame(S.raf);
      S.raf = requestAnimationFrame(function paso(now) {
        if (!S.visible) { S.ultimo = 0; return; }
        if (S.corriendo) {
          if (S.ultimo) S.t += Math.min(0.05, (now - S.ultimo) / 1000) * S.vel;
          S.ultimo = now;
        }
        if (S.corriendo || S.sucio) {
          ctx.clearRect(0, 0, S.w, S.h);
          ctx.fillStyle = C.fondo; ctx.fillRect(0, 0, S.w, S.h);
          cfg.dibujar(ctx, S.w, S.h, S.t);
          S.sucio = false;
        }
        if (S.corriendo) S.raf = requestAnimationFrame(paso);
      });
    }
    api.iniciar = function () { bucle(); };
    api.destruir = function () {
      cancelAnimationFrame(S.raf); apagar();
      if (ro) ro.disconnect(); if (io) io.disconnect();
    };
    return api;
  }

  /* ------------------------------------------------------------ dibujo */
  function rejilla(ctx, x0, y0, w, h, nx, ny) {
    ctx.strokeStyle = C.rejilla; ctx.lineWidth = 1; ctx.beginPath();
    for (var i = 0; i <= nx; i++) { var x = Math.round(x0 + w * i / nx) + 0.5; ctx.moveTo(x, y0); ctx.lineTo(x, y0 + h); }
    for (var j = 0; j <= ny; j++) { var y = Math.round(y0 + h * j / ny) + 0.5; ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); }
    ctx.stroke();
    ctx.strokeStyle = C.eje; ctx.beginPath();
    var ym = Math.round(y0 + h / 2) + 0.5; ctx.moveTo(x0, ym); ctx.lineTo(x0 + w, ym); ctx.stroke();
  }
  /* Traza y = fn(u) con u en [0,1]; amplitud ±1 se mapea a ±h/2·escala. Usa min/máx por píxel. */
  function traza(ctx, x0, y0, w, h, fn, color, grosor, esc, guiones) {
    var ym = y0 + h / 2, A = h / 2 * (esc || 0.9);
    ctx.strokeStyle = color; ctx.lineWidth = grosor || 2; ctx.lineJoin = "round";
    ctx.setLineDash(guiones || []);
    ctx.beginPath();
    var sub = 4;
    for (var px = 0; px <= w; px++) {
      var mn = Infinity, mx = -Infinity;
      for (var s = 0; s < sub; s++) { var v = fn((px + s / sub) / w); if (v < mn) mn = v; if (v > mx) mx = v; }
      if (px === 0) ctx.moveTo(x0, ym - mx * A);
      if (mx - mn > 0.25) { ctx.lineTo(x0 + px, ym - mx * A); ctx.lineTo(x0 + px, ym - mn * A); }
      else ctx.lineTo(x0 + px, ym - (mn + mx) / 2 * A);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }
  function texto(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = (o.peso || "600") + " " + (o.tam || 12) + "px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillStyle = o.color || C.tenue; ctx.textAlign = o.alin || "left"; ctx.textBaseline = o.base || "alphabetic";
    ctx.fillText(s, x, y);
  }
  function espectro(ctx, x0, y0, w, h, barras, o) {
    o = o || {};
    ctx.strokeStyle = C.eje; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(x0, y0 + h + 0.5); ctx.lineTo(x0 + w, y0 + h + 0.5); ctx.stroke();
    var max = o.max || Math.max.apply(null, barras.map(function (b) { return Math.abs(b.a); }).concat([1e-9]));
    var n = o.n || barras.length;
    var paso = w / (n + 1), bw = Math.max(2, Math.min(18, paso * 0.5));
    barras.forEach(function (b, i) {
      var x = x0 + paso * (b.pos != null ? b.pos : i + 1), bh = Math.abs(b.a) / max * (h - 14);
      ctx.fillStyle = b.color || C.rojo;
      ctx.fillRect(x - bw / 2, y0 + h - bh, bw, bh);
      if (b.etq && paso > 22) texto(ctx, b.etq, x, y0 + h + 13, { alin: "center", tam: 10, peso: "400" });
    });
    if (o.titulo) texto(ctx, o.titulo, x0, y0 + 10, { tam: 11 });
  }
  /* Velocidad visual de oscilación (rad/s) que crece con la frecuencia real, en escala logarítmica. */
  function omegaVisual(f) { var u = Math.max(0, Math.min(1, Math.log(f / 30) / Math.log(60))); return 1.2 + 9 * u; }
  function margenes(w, h) { var m = Math.max(10, Math.min(24, w * 0.03)); return { x: m, y: 14, w: w - 2 * m, h: h - 28 }; }

  /* ================================================================ SIMULACIONES */
  var TIPOS = {};

  /* ---- Onda sinusoidal: frecuencia y amplitud */
  TIPOS.onda = function (cont) {
    var p = { f: 220, A: 0.8 }, VENT = 0.01;
    var s = crear(cont, {
      titulo: "Onda sinusoidal", proporcion: 0.36,
      sonido: function () { return vozArmonica(function () { return { f: p.f, a: [1], nivel: p.A }; }); },
      dibujar: function (ctx, w, h, t) {
        var m = margenes(w, h);
        rejilla(ctx, m.x, m.y, m.w, m.h, 10, 4);
        var fase = t * 2.2;
        traza(ctx, m.x, m.y, m.w, m.h, function (u) { return p.A * Math.sin(2 * Math.PI * p.f * u * VENT - fase); }, C.rojo, 2.4);
        texto(ctx, "0 ms", m.x, h - 3, { tam: 10 }); texto(ctx, "10 ms", m.x + m.w, h - 3, { tam: 10, alin: "right" });
        var T = 1 / p.f;
        if (T < VENT) {
          var x1 = m.x + m.w * 0.02, x2 = x1 + m.w * T / VENT;
          ctx.strokeStyle = C.navy; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x1, m.y + 6); ctx.lineTo(x2, m.y + 6); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x1, m.y + 2); ctx.lineTo(x1, m.y + 10); ctx.moveTo(x2, m.y + 2); ctx.lineTo(x2, m.y + 10); ctx.stroke();
          texto(ctx, "T", (x1 + x2) / 2, m.y + 20, { alin: "center", color: C.navy });
        }
      }
    });
    function leer() {
      s.lectura("<b>" + fmtHz(p.f) + "</b> · período T = " + fmtNum(1000 / p.f, p.f > 1000 ? 2 : 1) + " ms · λ = " + fmtNum(VEL_SONIDO / p.f, p.f > 340 ? 2 : 1) + " m · " + nota(p.f) + " · amplitud " + fmtNum(p.A, 2));
    }
    var cF = s.controles.rango({ etiqueta: "Frecuencia", min: 50, max: 2000, log: true, valor: p.f, fmt: fmtHz, cambio: function (v) { p.f = v; leer(); s.sonar(); s.redibujar(); } });
    var cA = s.controles.rango({ etiqueta: "Amplitud", min: 0, max: 1, paso: 0.01, valor: p.A, fmt: function (v) { return fmtNum(v, 2); }, cambio: function (v) { p.A = v; leer(); s.sonar(); s.redibujar(); } });
    /* las grabaciones originales de la página ajustan la simulación */
    cont.addEventListener("sim:ajustar", function (e) {
      p.f = e.detail.f; p.A = e.detail.A; cF.set(p.f); cA.set(p.A); leer(); s.redibujar();
    });
    leer(); s.iniciar(); return s;
  };

  /* ---- Formas de onda por suma de armónicos (Fourier) */
  var FORMAS = {
    sinusoide: function (n) { return n === 1 ? 1 : 0; },
    cuadrada: function (n) { return n % 2 ? 4 / (Math.PI * n) : 0; },
    sierra: function (n) { return (n % 2 ? 1 : -1) * 2 / (Math.PI * n); },
    triangular: function (n) { return n % 2 ? (((n - 1) / 2) % 2 ? -1 : 1) * 8 / (Math.PI * Math.PI * n * n) : 0; }
  };
  TIPOS.formas = function (cont) {
    var p = { forma: "cuadrada", N: 5, f: 196 }, construyendo = null;
    function amps() { var a = []; for (var n = 1; n <= p.N; n++) a.push(FORMAS[p.forma](n)); return a; }
    var s = crear(cont, {
      titulo: "Síntesis de formas de onda", proporcion: 0.5, altoMin: 260,
      sonido: function () { return vozArmonica(function () { return { f: p.f, a: amps() }; }); },
      dibujar: function (ctx, w, h, t) {
        var m = margenes(w, h), hw = m.h * 0.62, hs = m.h - hw - 18, a = amps(), fase = t * 0.9;
        rejilla(ctx, m.x, m.y, m.w, hw, 8, 4);
        traza(ctx, m.x, m.y, m.w, hw, function (u) {
          var x = 2 * Math.PI * (2 * u) - fase, v = 0;
          for (var k = 1; k <= 400; k++) { var c = FORMAS[p.forma](k); if (c) v += c * Math.sin(k * x); if (p.forma === "sinusoide") break; }
          return v * 0.8;
        }, C.eje, 1.2, 0.9, [5, 4]);
        traza(ctx, m.x, m.y, m.w, hw, function (u) {
          var x = 2 * Math.PI * (2 * u) - fase, v = 0;
          for (var k = 0; k < a.length; k++) if (a[k]) v += a[k] * Math.sin((k + 1) * x);
          return v * 0.8;
        }, C.rojo, 2.4);
        var bar = a.map(function (x, i) { return { a: x, etq: i < 12 || (i + 1) % 5 === 0 ? String(i + 1) : "", color: x ? C.rojo : C.rejilla }; });
        espectro(ctx, m.x, m.y + hw + 10, m.w, hs, bar, { n: Math.max(12, p.N), max: 1.3, titulo: "Espectro (armónicos)" });
      }
    });
    var cN;
    function leer() {
      var a = amps(), act = a.filter(function (x) { return x; }).length;
      s.lectura("<b>" + p.N + (p.N === 1 ? " armónico" : " armónicos") + "</b> (" + act + " con energía) · fundamental " + fmtHz(p.f) + " · el más agudo: " + fmtHz(p.f * p.N));
    }
    s.controles.opciones({ etiqueta: "Forma", valor: p.forma, items: [{ t: "Sinusoide", v: "sinusoide" }, { t: "Cuadrada", v: "cuadrada" }, { t: "Diente de sierra", v: "sierra" }, { t: "Triangular", v: "triangular" }], cambio: function (v) { p.forma = v; leer(); s.sonar(); s.redibujar(); } });
    cN = s.controles.rango({ etiqueta: "Número de armónicos", min: 1, max: 40, paso: 1, valor: p.N, fmt: function (v) { return v; }, cambio: function (v) { p.N = v; leer(); s.sonar(); s.redibujar(); } });
    s.controles.rango({ etiqueta: "Frecuencia fundamental", min: 55, max: 880, log: true, valor: p.f, fmt: fmtHz, cambio: function (v) { p.f = v; leer(); s.sonar(); s.redibujar(); } });
    var bC = s.acciones.boton({ html: ICO_PLAY + "<span>Construir armónico a armónico</span>", cls: "sim-boton-sec", clic: function () {
      if (construyendo) { clearInterval(construyendo); construyendo = null; return; }
      p.N = 1; cN.set(1); leer(); s.sonar(); s.redibujar();
      construyendo = setInterval(function () {
        if (p.N >= 25) { clearInterval(construyendo); construyendo = null; return; }
        p.N++; cN.set(p.N); leer(); s.sonar(); s.redibujar();
      }, 450);
    } });
    var destruirBase = s.destruir;
    s.destruir = function () { if (construyendo) clearInterval(construyendo); destruirBase(); };
    leer(); s.iniciar(); return s;
  };

  /* ---- Teorema de Fourier: cada armónico con su propio deslizador */
  TIPOS.fourier = function (cont) {
    var NA = 8, p = { f: 110, a: [1, 0.5, 0.33, 0, 0, 0, 0, 0], ver: true };
    var ctlA = [];
    var s = crear(cont, {
      titulo: "Teorema de Fourier", proporcion: 0.55, altoMin: 280,
      sonido: function () { return vozArmonica(function () { return { f: p.f, a: p.a.slice() }; }); },
      dibujar: function (ctx, w, h, t) {
        var m = margenes(w, h), hw = m.h * 0.64, hs = m.h - hw - 18, fase = t * 0.8;
        var tot = p.a.reduce(function (s, x) { return s + x; }, 0) || 1;
        rejilla(ctx, m.x, m.y, m.w, hw, 8, 4);
        if (p.ver) p.a.forEach(function (ak, k) {
          if (!ak) return;
          traza(ctx, m.x, m.y, m.w, hw, function (u) { return ak / Math.max(1, tot) * Math.sin((k + 1) * (2 * Math.PI * 3 * u - fase)); }, PALETA[k % PALETA.length], 1.1, 0.9);
        });
        traza(ctx, m.x, m.y, m.w, hw, function (u) {
          var v = 0; for (var k = 0; k < NA; k++) if (p.a[k]) v += p.a[k] * Math.sin((k + 1) * (2 * Math.PI * 3 * u - fase));
          return v / Math.max(1, tot);
        }, C.rojo, 2.6);
        texto(ctx, "suma (tiempo)", m.x + 4, m.y + 12, { color: C.rojo, tam: 11 });
        espectro(ctx, m.x, m.y + hw + 10, m.w, hs, p.a.map(function (x, k) { return { a: x, etq: fmtHz(p.f * (k + 1)), color: x ? PALETA[k % PALETA.length] : C.rejilla }; }), { max: 1, titulo: "Espectro de frecuencias" });
      }
    });
    function leer() { s.lectura("Fundamental <b>" + fmtHz(p.f) + "</b> · armónicos en " + p.a.map(function (x, k) { return x ? fmtHz(p.f * (k + 1)) : null; }).filter(Boolean).join(", ")); }
    var gr = el("div", "sim-armonicos"); s.raiz.querySelector(".sim-controles").appendChild(gr);
    var sub = new Controles(gr);
    for (var k = 0; k < NA; k++) (function (k) {
      ctlA.push(sub.rango({ etiqueta: (k === 0 ? "Fundamental" : "Armónico " + (k + 1)), min: 0, max: 1, paso: 0.01, valor: p.a[k], fmt: function (v) { return fmtNum(v, 2); }, cambio: function (v) { p.a[k] = v; leer(); s.sonar(); s.redibujar(); } }));
      ctlA[k].el.style.setProperty("--c", PALETA[k % PALETA.length]);
    })(k);
    function preset(a) { a.forEach(function (v, k) { p.a[k] = v; ctlA[k].set(v); }); leer(); s.sonar(); s.redibujar(); }
    s.controles.opciones({ etiqueta: "Ejemplos", valor: "orig", items: [
      { t: "Fundamental + 2.º + 3.º", v: "orig" }, { t: "Solo impares", v: "imp" }, { t: "Brillante", v: "bri" }, { t: "Tono puro", v: "puro" }
    ], cambio: function (v) {
      preset({ orig: [1, .5, .33, 0, 0, 0, 0, 0], imp: [1, 0, .33, 0, .2, 0, .14, 0], bri: [.6, .7, .8, .6, .55, .5, .4, .35], puro: [1, 0, 0, 0, 0, 0, 0, 0] }[v]);
    } });
    s.controles.rango({ etiqueta: "Frecuencia fundamental", min: 55, max: 660, log: true, valor: p.f, fmt: fmtHz, cambio: function (v) { p.f = v; leer(); s.sonar(); s.redibujar(); } });
    s.controles.casilla({ etiqueta: "Mostrar cada armónico", valor: p.ver, cambio: function (v) { p.ver = v; s.redibujar(); } });
    leer(); s.iniciar(); return s;
  };

  /* ---- Movimiento periódico */
  TIPOS.periodico = function (cont) {
    var p = { f: 150, ciclos: 3, compl: 0.7 };
    function amps() { var b = [1, 0.55, 0.75, 0.35, 0.5, 0.25, 0.32, 0.18, 0.22, 0.12]; return b.map(function (x, k) { return k === 0 ? x : x * p.compl; }); }
    var s = crear(cont, {
      titulo: "Movimiento periódico", proporcion: 0.36,
      sonido: function () { return vozArmonica(function () { return { f: p.f, a: amps() }; }); },
      dibujar: function (ctx, w, h, t) {
        var m = margenes(w, h), a = amps(), tot = a.reduce(function (s, x) { return s + x; }, 0);
        var desp = (t * 0.25) % 1;
        for (var c = -1; c <= p.ciclos; c++) {
          var x1 = m.x + m.w * (c + desp) / p.ciclos, x2 = m.x + m.w * (c + 1 + desp) / p.ciclos;
          if (c % 2 === 0) { ctx.fillStyle = "rgba(255,180,49,.13)"; ctx.fillRect(Math.max(m.x, x1), m.y, Math.min(m.x + m.w, x2) - Math.max(m.x, x1), m.h); }
        }
        rejilla(ctx, m.x, m.y, m.w, m.h, 12, 4);
        traza(ctx, m.x, m.y, m.w, m.h, function (u) {
          var x = 2 * Math.PI * (u * p.ciclos - desp), v = 0;
          for (var k = 0; k < a.length; k++) v += a[k] * Math.cos((k + 1) * x);
          return v / tot;
        }, C.tinta, 3);
        var xa = m.x + m.w * desp / p.ciclos, xb = xa + m.w / p.ciclos;
        if (xb > m.x + m.w) { xa -= m.w / p.ciclos; xb -= m.w / p.ciclos; }
        if (xa < m.x) { xa += m.w / p.ciclos; xb += m.w / p.ciclos; }
        if (xb <= m.x + m.w) {
          ctx.strokeStyle = C.naranjo; ctx.lineWidth = 1.4; ctx.beginPath();
          ctx.moveTo(xa, h - 10); ctx.lineTo(xb, h - 10); ctx.moveTo(xa, h - 15); ctx.lineTo(xa, h - 5); ctx.moveTo(xb, h - 15); ctx.lineTo(xb, h - 5); ctx.stroke();
          texto(ctx, "1 ciclo = período T", (xa + xb) / 2, h - 14, { alin: "center", color: C.naranjo, tam: 11 });
        }
      }
    });
    function leer() { s.lectura("Frecuencia <b>" + fmtHz(p.f) + "</b> = " + Math.round(p.f) + " ciclos por segundo · período T = " + fmtNum(1000 / p.f, 2) + " ms"); }
    s.controles.rango({ etiqueta: "Frecuencia", min: 60, max: 600, log: true, valor: p.f, fmt: fmtHz, cambio: function (v) { p.f = v; p.ciclos = Math.max(1, Math.round(v / 50)); leer(); s.sonar(); s.redibujar(); } });
    s.controles.rango({ etiqueta: "Complejidad de la forma", min: 0, max: 1, paso: 0.01, valor: p.compl, fmt: function (v) { return Math.round(v * 100) + " %"; }, cambio: function (v) { p.compl = v; s.sonar(); s.redibujar(); } });
    leer(); s.iniciar(); return s;
  };

  /* ---- Movimiento aperiódico: ruido */
  TIPOS.ruido = function (cont) {
    var p = { corte: 1200 }, N = 600, buf = new Float32Array(N), cabeza = 0, estado = 0, acum = 0;
    function alfa() { return 1 - Math.exp(-2 * Math.PI * p.corte / 22050); }
    function muestra() { estado += alfa() * ((Math.random() * 2 - 1) - estado); return estado; }
    for (var i = 0; i < N; i++) buf[i] = muestra();
    var s = crear(cont, {
      titulo: "Movimiento aperiódico", proporcion: 0.34,
      sonido: function () { return vozRuido(function () { return { corte: p.corte }; }); },
      dibujar: function (ctx, w, h, t) {
        var m = margenes(w, h);
        var nuevas = Math.floor((t - acum) * 140);
        if (nuevas > 0) { for (var k = 0; k < Math.min(nuevas, N); k++) { buf[cabeza] = muestra(); cabeza = (cabeza + 1) % N; } acum = t; }
        rejilla(ctx, m.x, m.y, m.w, m.h, 12, 4);
        var rms = 0; for (var j = 0; j < N; j++) rms += buf[j] * buf[j]; rms = Math.sqrt(rms / N) || 1;
        traza(ctx, m.x, m.y, m.w, m.h, function (u) { var idx = (cabeza + Math.floor(u * (N - 1))) % N; return Math.max(-1, Math.min(1, buf[idx] / (rms * 2.8))); }, C.tinta, 2.2);
        texto(ctx, "sin ciclos que se repitan", m.x + m.w, m.y + 12, { alin: "right", tam: 11 });
      }
    });
    s.controles.rango({ etiqueta: "Color del ruido (filtro pasa bajos)", min: 100, max: 12000, log: true, valor: p.corte, fmt: function (v) { return "hasta " + fmtHz(v); }, cambio: function (v) { p.corte = v; s.sonar(); } });
    s.lectura("Señal aleatoria: no hay período ni frecuencia fundamental. Al bajar el filtro el ruido se vuelve más «oscuro».");
    s.iniciar(); return s;
  };

  /* ---- Ondas viajeras y estacionarias */
  TIPOS.viajera = function (cont) {
    var p = { modo: "viajera", ondas: 2, comp: true, vel: 1 };
    var s = crear(cont, {
      titulo: "Ondas viajeras y estacionarias", proporcion: 0.5, altoMin: 260, sonido: null,
      dibujar: function (ctx, w, h, t) {
        var m = margenes(w, h), k = 2 * Math.PI * p.ondas, wt = t * 2.4 * p.vel;
        var hp = m.h * 0.3, hc = m.h - hp - 16, yc = m.y + hp + 16;
        /* partículas de aire */
        var filas = 6, cols = Math.round(m.w / 7);
        ctx.fillStyle = C.navy;
        for (var r = 0; r < filas; r++) for (var c = 0; c < cols; c++) {
          var u = (c + (r % 2) * 0.5) / cols, d;
          d = p.modo === "viajera" ? Math.sin(k * u - wt) : Math.sin(Math.PI * p.ondas * 2 * u) * Math.cos(wt);
          var x = m.x + u * m.w - d * (m.w / cols) * 1.6;
          ctx.beginPath(); ctx.arc(x, m.y + 6 + r * (hp - 8) / (filas - 1), 1.7, 0, 7); ctx.fill();
        }
        texto(ctx, "partículas de aire (movimiento longitudinal)", m.x, m.y + hp + 10, { tam: 10 });
        rejilla(ctx, m.x, yc, m.w, hc, 12, 4);
        if (p.modo === "viajera") {
          traza(ctx, m.x, yc, m.w, hc, function (u) { return Math.sin(k * u - wt); }, C.rojo, 2.4, 0.8);
          var xa = m.x + (((wt / k) % 1) + 1) % 1 * m.w;
          ctx.fillStyle = C.naranjo; ctx.beginPath(); ctx.moveTo(xa + 8, yc + 10); ctx.lineTo(xa - 4, yc + 4); ctx.lineTo(xa - 4, yc + 16); ctx.fill();
        } else {
          var kk = Math.PI * p.ondas * 2;
          if (p.comp) {
            traza(ctx, m.x, yc, m.w, hc, function (u) { return 0.5 * Math.sin(kk * u - wt); }, C.azul, 1.2, 0.8, [5, 4]);
            traza(ctx, m.x, yc, m.w, hc, function (u) { return 0.5 * Math.sin(kk * u + wt); }, C.turquesa, 1.2, 0.8, [5, 4]);
          }
          traza(ctx, m.x, yc, m.w, hc, function (u) { return Math.sin(kk * u); }, C.eje, 1, 0.8, [2, 3]);
          traza(ctx, m.x, yc, m.w, hc, function (u) { return -Math.sin(kk * u); }, C.eje, 1, 0.8, [2, 3]);
          traza(ctx, m.x, yc, m.w, hc, function (u) { return Math.sin(kk * u) * Math.cos(wt); }, C.rojo, 2.6, 0.8);
          ctx.fillStyle = C.navy;
          for (var n = 0; n <= p.ondas * 2; n++) { ctx.beginPath(); ctx.arc(m.x + m.w * n / (p.ondas * 2), yc + hc / 2, 4, 0, 7); ctx.fill(); }
          texto(ctx, "● nodos", m.x + m.w, yc + 12, { alin: "right", color: C.navy, tam: 11 });
        }
      }
    });
    var cComp;
    function leer() {
      s.lectura(p.modo === "viajera" ? "La perturbación <b>avanza</b> por el medio: cada punto vibra, pero la forma se desplaza." :
        "Dos ondas iguales que viajan en sentidos opuestos se suman: la forma <b>no avanza</b>; hay nodos fijos y antinodos.");
      cComp.el.hidden = p.modo === "viajera";
    }
    s.controles.opciones({ etiqueta: "Tipo de onda", valor: p.modo, items: [{ t: "Viajera", v: "viajera" }, { t: "Estacionaria", v: "estacionaria" }], cambio: function (v) { p.modo = v; leer(); s.redibujar(); } });
    s.controles.rango({ etiqueta: "Longitudes de onda visibles", min: 1, max: 5, paso: 0.5, valor: p.ondas, fmt: function (v) { return fmtNum(v, 1); }, cambio: function (v) { p.ondas = v; s.redibujar(); } });
    s.controles.rango({ etiqueta: "Velocidad de la animación", min: 0.1, max: 2, paso: 0.05, valor: 1, fmt: function (v) { return fmtNum(v, 2) + "×"; }, cambio: function (v) { p.vel = v; } });
    cComp = s.controles.casilla({ etiqueta: "Mostrar las dos ondas que la forman", valor: p.comp, cambio: function (v) { p.comp = v; s.redibujar(); } });
    leer(); s.iniciar(); return s;
  };

  /* ---- Relación de octava */
  TIPOS.octava = function (cont) {
    var p = { f: 220, rel: 2, oir: "ambas" };
    function f2() { return p.f * p.rel; }
    var s = crear(cont, {
      titulo: "Relación de octava", proporcion: 0.42,
      sonido: function () { return vozParcial(function () { return { f: [p.f, f2()], a: [p.oir === "f2" ? 0 : 1, p.oir === "f1" ? 0 : 0.8] }; }); },
      dibujar: function (ctx, w, h, t) {
        var m = margenes(w, h), hh = (m.h - 10) / 2, fase = t * 1.4;
        var ciclos = 2 * Math.max(1, 1 / p.rel);
        rejilla(ctx, m.x, m.y, m.w, hh, 8, 2); rejilla(ctx, m.x, m.y + hh + 10, m.w, hh, 8, 2);
        traza(ctx, m.x, m.y, m.w, hh, function (u) { return Math.sin(2 * Math.PI * ciclos * u - fase); }, C.navy, 2.2, 0.8);
        traza(ctx, m.x, m.y + hh + 10, m.w, hh, function (u) { return Math.sin(2 * Math.PI * ciclos * p.rel * u - fase * p.rel); }, C.rojo, 2.2, 0.8);
        /* puntos de coincidencia: cada ciclo de la nota de referencia */
        ctx.strokeStyle = "rgba(232,126,16,.55)"; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
        var cmin = Math.min(ciclos, ciclos * p.rel);
        for (var c = 0; c <= cmin + 1; c++) {
          var u = ((c + fase / (2 * Math.PI)) / cmin) % 1.0001;
          var x = m.x + m.w * (((c / cmin) + (fase / (2 * Math.PI)) / ciclos) % 1);
          ctx.beginPath(); ctx.moveTo(x, m.y); ctx.lineTo(x, m.y + m.h); ctx.stroke();
        }
        ctx.setLineDash([]);
        texto(ctx, fmtHz(p.f), m.x + 4, m.y + 12, { color: C.navy });
        texto(ctx, fmtHz(f2()) + (p.rel === 2 ? " (octava superior)" : " (octava inferior)"), m.x + 4, m.y + hh + 22, { color: C.rojo });
      }
    });
    function leer() { s.lectura("<b>" + fmtHz(p.f) + "</b> (" + nota(p.f) + ") y <b>" + fmtHz(f2()) + "</b> (" + nota(f2()) + ") · razón " + (p.rel === 2 ? "2 : 1" : "1 : 2") + ": los ciclos coinciden cada " + (p.rel === 2 ? "dos ciclos de la aguda" : "dos ciclos de la de referencia")); }
    s.controles.rango({ etiqueta: "Frecuencia de referencia", min: 110, max: 880, log: true, valor: p.f, fmt: fmtHz, cambio: function (v) { p.f = v; leer(); s.sonar(); s.redibujar(); } });
    s.controles.opciones({ etiqueta: "Segunda onda", valor: p.rel, items: [{ t: "Octava superior (×2)", v: 2 }, { t: "Octava inferior (÷2)", v: 0.5 }], cambio: function (v) { p.rel = v; leer(); s.sonar(); s.redibujar(); } });
    s.controles.opciones({ etiqueta: "Escuchar", valor: p.oir, items: [{ t: "Ambas", v: "ambas" }, { t: "Referencia", v: "f1" }, { t: "Segunda", v: "f2" }], cambio: function (v) { p.oir = v; s.sonar(); } });
    leer(); s.iniciar(); return s;
  };

  /* ---- Batimiento (abatimiento) */
  TIPOS.batimiento = function (cont) {
    var p = { f1: 440, df: 5, comp: true };
    var cF1, cDf;
    var s = crear(cont, {
      titulo: "Superposición de frecuencias cercanas", proporcion: 0.42,
      sonido: function () { return vozParcial(function () { return { f: [p.f1, p.f1 + p.df], a: [0.5, 0.5] }; }); },
      dibujar: function (ctx, w, h, t) {
        var m = margenes(w, h), f2 = p.f1 + p.df;
        var vent = p.df > 0.4 ? Math.min(2 / p.df, 0.6) : 0.02;
        if (p.df >= 40) vent = 3 / p.df;
        var t0 = t * 0.6 * (p.df < 40 ? 1 : 0.2);
        rejilla(ctx, m.x, m.y, m.w, m.h, 10, 4);
        var densos = p.f1 * vent > 60;
        if (p.comp && !densos) {
          traza(ctx, m.x, m.y, m.w, m.h, function (u) { return 0.5 * Math.sin(2 * Math.PI * p.f1 * (t0 + u * vent)); }, "#8a8a8a", 1, 0.9);
          traza(ctx, m.x, m.y, m.w, m.h, function (u) { return 0.5 * Math.sin(2 * Math.PI * f2 * (t0 + u * vent)); }, "#5a5a5a", 1, 0.9);
        }
        traza(ctx, m.x, m.y, m.w, m.h, function (u) { var tt = t0 + u * vent; return 0.5 * (Math.sin(2 * Math.PI * p.f1 * tt) + Math.sin(2 * Math.PI * f2 * tt)); }, C.rojo, densos ? 1.2 : 2.2, 0.9);
        traza(ctx, m.x, m.y, m.w, m.h, function (u) { return Math.abs(Math.cos(Math.PI * p.df * (t0 + u * vent))); }, "#9a9a9a", 1.2, 0.9, [6, 5]);
        traza(ctx, m.x, m.y, m.w, m.h, function (u) { return -Math.abs(Math.cos(Math.PI * p.df * (t0 + u * vent))); }, "#9a9a9a", 1.2, 0.9, [6, 5]);
        texto(ctx, "0", m.x, h - 3, { tam: 10 }); texto(ctx, fmtNum(vent * 1000, 0) + " ms", m.x + m.w, h - 3, { tam: 10, alin: "right" });
      }
    });
    function leer() {
      var f2 = p.f1 + p.df;
      s.lectura(fmtHz(p.f1) + " + " + fmtHz(f2) + " → " + (p.df === 0 ? "misma frecuencia: no hay abatimiento" :
        p.df < 20 ? "<b>abatimiento de " + fmtNum(p.df, p.df < 10 ? 1 : 0) + " Hz</b>: el sonido crece y decrece " + fmtNum(p.df, p.df < 10 ? 1 : 0) + " veces por segundo" :
        "la envolvente es demasiado rápida para oírse como pulso: aparece un <b>sonido diferencial de " + Math.round(p.df) + " Hz</b>"));
    }
    cF1 = s.controles.rango({ etiqueta: "Frecuencia 1", min: 200, max: 880, log: true, valor: p.f1, fmt: fmtHz, cambio: function (v) { p.f1 = v; leer(); s.sonar(); s.redibujar(); } });
    cDf = s.controles.rango({ etiqueta: "Diferencia (frecuencia 2 − frecuencia 1)", min: 0, max: 120, paso: 0.5, valor: p.df, fmt: function (v) { return fmtNum(v, v < 10 ? 1 : 0) + " Hz"; }, cambio: function (v) { p.df = v; leer(); s.sonar(); s.redibujar(); } });
    s.controles.opciones({ etiqueta: "Ejemplos", valor: null, items: [{ t: "440 + 445 Hz", v: 5 }, { t: "440 + 540 Hz", v: 100 }], cambio: function (v) { p.f1 = 440; p.df = v; cF1.set(440); cDf.set(v); leer(); s.sonar(); s.redibujar(); } });
    s.controles.casilla({ etiqueta: "Mostrar las dos ondas que se suman", valor: p.comp, cambio: function (v) { p.comp = v; s.redibujar(); } });
    leer(); s.iniciar(); return s;
  };

  /* ---- Superposición: igual frecuencia, distinta amplitud y fase */
  TIPOS.superposicion = function (cont) {
    var p = { A1: 0.35, A2: 0.5, fase: 0 };
    var s = crear(cont, {
      titulo: "Superposición de ondas de igual frecuencia", proporcion: 0.42, sonido: null,
      dibujar: function (ctx, w, h, t) {
        var m = margenes(w, h), desp = t * 1.2, fi = p.fase * Math.PI / 180;
        rejilla(ctx, m.x, m.y, m.w, m.h, 8, 4);
        var E = 0.45;
        traza(ctx, m.x, m.y, m.w, m.h, function (u) { return E * p.A1 * Math.sin(2 * Math.PI * 2 * u - desp); }, C.navy, 1.6);
        traza(ctx, m.x, m.y, m.w, m.h, function (u) { return E * p.A2 * Math.sin(2 * Math.PI * 2 * u - desp + fi); }, C.azul, 1.6);
        traza(ctx, m.x, m.y, m.w, m.h, function (u) { return E * (p.A1 * Math.sin(2 * Math.PI * 2 * u - desp) + p.A2 * Math.sin(2 * Math.PI * 2 * u - desp + fi)); }, C.rojo, 2.8);
        texto(ctx, "y₁", m.x + 4, m.y + 12, { color: C.navy }); texto(ctx, "y₂", m.x + 26, m.y + 12, { color: C.azul }); texto(ctx, "y₁ + y₂", m.x + 48, m.y + 12, { color: C.rojo });
      }
    });
    function leer() {
      var fi = p.fase * Math.PI / 180, A = Math.sqrt(p.A1 * p.A1 + p.A2 * p.A2 + 2 * p.A1 * p.A2 * Math.cos(fi));
      var tipo = p.fase < 10 || p.fase > 350 ? "interferencia constructiva: A = A₁ + A₂" : Math.abs(p.fase - 180) < 10 ? "interferencia destructiva: A = |A₁ − A₂|" : "interferencia parcial";
      s.lectura("A₁ = " + fmtNum(p.A1, 2) + " · A₂ = " + fmtNum(p.A2, 2) + " · desfase " + Math.round(p.fase) + "° → <b>A = " + fmtNum(A, 2) + "</b> (" + tipo + ")");
    }
    s.controles.rango({ etiqueta: "Amplitud A₁", min: 0, max: 1, paso: 0.01, valor: p.A1, fmt: function (v) { return fmtNum(v, 2); }, cambio: function (v) { p.A1 = v; leer(); s.redibujar(); } });
    s.controles.rango({ etiqueta: "Amplitud A₂", min: 0, max: 1, paso: 0.01, valor: p.A2, fmt: function (v) { return fmtNum(v, 2); }, cambio: function (v) { p.A2 = v; leer(); s.redibujar(); } });
    s.controles.rango({ etiqueta: "Desfase entre ambas", min: 0, max: 360, paso: 1, valor: p.fase, fmt: function (v) { return Math.round(v) + "°"; }, cambio: function (v) { p.fase = v; leer(); s.redibujar(); } });
    leer(); s.iniciar(); return s;
  };

  /* ---- Membrana circular: modos de Bessel */
  function besselJ(m, x) {
    var s = 0, term = Math.pow(x / 2, m);
    for (var i = 1; i <= m; i++) term /= i;
    for (var k = 0; k < 40; k++) {
      s += term;
      term *= -(x * x / 4) / ((k + 1) * (k + 1 + m));
      if (Math.abs(term) < 1e-14) break;
    }
    return s;
  }
  var MODOS_MEMB = [
    [0, 1, 2.4048], [1, 1, 3.8317], [2, 1, 5.1356], [0, 2, 5.5201], [3, 1, 6.3802],
    [1, 2, 7.0156], [4, 1, 7.5883], [2, 2, 8.4172], [0, 3, 8.6537], [5, 1, 8.7715]
  ];
  TIPOS.membrana = function (cont) {
    var p = { modo: 0, D: 0.66, T: 3000, vel: 1, fase: 0, tPrev: 0 }, R = 220, SIGMA = 0.26;
    function f0() { return 2.4048 / (Math.PI * p.D) * Math.sqrt(p.T / SIGMA); }
    var forma = null, img = null, off = document.createElement("canvas"); off.width = off.height = R;
    var octx = off.getContext("2d");
    function preparar() {
      var md = MODOS_MEMB[p.modo], m = md[0], z = md[2];
      forma = new Float32Array(R * R); var max = 0;
      for (var j = 0; j < R; j++) for (var i = 0; i < R; i++) {
        var x = (i + 0.5) / R * 2 - 1, y = (j + 0.5) / R * 2 - 1, r = Math.sqrt(x * x + y * y);
        var v = r > 1 ? NaN : besselJ(m, z * r) * Math.cos(m * Math.atan2(y, x));
        forma[j * R + i] = v; if (Math.abs(v) > max) max = Math.abs(v);
      }
      for (var k = 0; k < forma.length; k++) forma[k] /= max;
      img = octx.createImageData(R, R);
    }
    function ratio(k) { return MODOS_MEMB[k][2] / MODOS_MEMB[0][2]; }
    var s = crear(cont, {
      titulo: "Modos de vibración de una membrana circular", proporcion: 0.42, altoMin: 260, altoMax: 380,
      sonido: function () { return vozParcial(function () { return { f: [f0() * ratio(p.modo)], a: [1] }; }); },
      dibujar: function (ctx, w, h, t) {
        p.fase += Math.max(0, t - p.tPrev) * omegaVisual(f0() * ratio(p.modo)) * p.vel; p.tPrev = t;
        var c = Math.cos(p.fase), d = img.data;
        for (var k = 0; k < forma.length; k++) {
          var v = forma[k], o = k * 4;
          if (v !== v) { d[o + 3] = 0; continue; }
          var a = v * c, nodo = Math.abs(v) < 0.03;
          if (nodo) { d[o] = 29; d[o + 1] = 20; d[o + 2] = 7; d[o + 3] = 255; continue; }
          if (a >= 0) { d[o] = 255; d[o + 1] = Math.round(255 - a * 120); d[o + 2] = Math.round(255 - a * 230); }
          else { d[o] = Math.round(255 + a * 220); d[o + 1] = Math.round(255 + a * 175); d[o + 2] = Math.round(255 + a * 70); }
          d[o + 3] = 255;
        }
        octx.putImageData(img, 0, 0);
        var angosto = w < 540;
        var zona = angosto ? Math.min(h - 20, w - 24) : Math.min(h - 20, w * 0.48), zx = angosto ? (w - zona) / 2 : 12, zy = (h - zona) / 2;
        var lado = zona * 0.78 * (0.35 + 0.65 * (p.D - 0.2) / 0.6), cx = zx + (zona - lado) / 2, cy = zy + (zona - lado) / 2;
        ctx.imageSmoothingEnabled = true; ctx.drawImage(off, cx, cy, lado, lado);
        ctx.strokeStyle = C.tinta; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx + lado / 2, cy + lado / 2, lado / 2, 0, 7); ctx.stroke();
        /* flechas de tensión alrededor del aro */
        var largoF = 4 + 26 * (p.T - 300) / 7700, rc = lado / 2, ccx = cx + rc, ccy = cy + rc;
        ctx.strokeStyle = C.naranjo; ctx.fillStyle = C.naranjo; ctx.lineWidth = 2;
        for (var q = 0; q < 12; q++) {
          var an = q * Math.PI / 6, x1 = ccx + Math.cos(an) * (rc + 4), y1 = ccy + Math.sin(an) * (rc + 4), x2 = ccx + Math.cos(an) * (rc + 4 + largoF), y2 = ccy + Math.sin(an) * (rc + 4 + largoF);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x2 + Math.cos(an) * 5, y2 + Math.sin(an) * 5); ctx.lineTo(x2 + Math.cos(an + 2.2) * 5, y2 + Math.sin(an + 2.2) * 5); ctx.lineTo(x2 + Math.cos(an - 2.2) * 5, y2 + Math.sin(an - 2.2) * 5); ctx.fill();
        }
        texto(ctx, "Ø " + Math.round(p.D * 100) + " cm", ccx + rc + largoF + 14, cy + lado + 4, { alin: "left", color: C.navy, tam: 11 });
        /* perfil en un diámetro */
        var px = zx + zona + 20, pw = w - px - 14, ph = Math.min(zona * 0.45, 150), py = zy + (zona - ph) / 2;
        if (!angosto) {
          rejilla(ctx, px, py, pw, ph, 6, 2);
          traza(ctx, px, py, pw, ph, function (u) {
            var i = Math.min(R - 1, Math.floor(u * R)), v = forma[Math.floor(R / 2) * R + i];
            return v === v ? v * c : 0;
          }, C.rojo, 2.4, 0.85);
          texto(ctx, "perfil a lo largo de un diámetro", px, py - 6, { tam: 11 });
          texto(ctx, "rojo: sube · azul: baja · líneas negras: líneas nodales", px, py + ph + 18, { tam: 11, peso: "400" });
        }
      }
    });
    function leer() {
      var md = MODOS_MEMB[p.modo];
      s.lectura("Modo <b>(" + md[0] + "," + md[1] + ")</b>: " + md[0] + (md[0] === 1 ? " diámetro nodal" : " diámetros nodales") + " y " + (md[1] - 1) + (md[1] - 1 === 1 ? " círculo nodal" : " círculos nodales") +
        " (además del borde) · f₀ = " + fmtHz(f0()) + " · este modo: <b>" + fmtNum(ratio(p.modo), 3) + " × f₀ = " + fmtHz(f0() * ratio(p.modo)) + "</b>" +
        (p.modo === 0 ? " · modo fundamental" : " · no es un múltiplo entero de f₀: por eso el sonido de un tambor es inarmónico"));
    }
    s.controles.opciones({ etiqueta: "Modo (diámetros, círculos)", valor: 0, items: MODOS_MEMB.map(function (md, k) { return { t: "(" + md[0] + "," + md[1] + ")", v: k, title: fmtNum(md[2] / 2.4048, 3) + " × f₀" }; }), cambio: function (v) { p.modo = v; preparar(); leer(); s.sonar(); s.redibujar(); } });
    s.controles.rango({ etiqueta: "Diámetro de la membrana", min: 0.2, max: 0.8, paso: 0.01, valor: p.D, fmt: function (v) { return Math.round(v * 100) + " cm"; }, cambio: function (v) { p.D = v; leer(); s.sonar(); s.redibujar(); } });
    s.controles.rango({ etiqueta: "Tensión de la membrana", min: 300, max: 8000, log: true, valor: p.T, fmt: function (v) { return Math.round(v / 10) * 10 + " N/m"; }, cambio: function (v) { p.T = v; leer(); s.sonar(); s.redibujar(); } });
    s.controles.rango({ etiqueta: "Velocidad de la animación", min: 0.1, max: 2, paso: 0.05, valor: 1, fmt: function (v) { return fmtNum(v, 2) + "×"; }, cambio: function (v) { p.vel = v; } });
    s.acciones.boton({ html: ICO_GOLPE + "<span>Golpear la membrana</span>", cls: "sim-boton-son", clic: function () {
      var f = [], a = [], d = [];
      MODOS_MEMB.forEach(function (md, k) { f.push(f0() * ratio(k)); a.push([1, .8, .55, .5, .35, .3, .2, .18, .15, .1][k]); d.push(1.6 / Math.sqrt(ratio(k))); });
      golpe(f, a, d, 2.5);
    } });
    preparar(); leer(); s.iniciar(); return s;
  };

  /* ---- Barras: libre-libre y empotrada */
  var BARRAS = {
    libre: { b: [4.7300, 7.8532, 10.9956, 14.1372], forma: function (bl, x) { var s = (Math.cosh(bl) - Math.cos(bl)) / (Math.sinh(bl) - Math.sin(bl)); return Math.cosh(bl * x) + Math.cos(bl * x) - s * (Math.sinh(bl * x) + Math.sin(bl * x)); } },
    empotrada: { b: [1.8751, 4.6941, 7.8548, 10.9955], forma: function (bl, x) { var s = (Math.cosh(bl) + Math.cos(bl)) / (Math.sinh(bl) + Math.sin(bl)); return Math.cosh(bl * x) - Math.cos(bl * x) - s * (Math.sinh(bl * x) - Math.sin(bl * x)); } }
  };
  TIPOS.barra = function (cont) {
    var p = { apoyo: "libre", modo: 0, L: 0.4, vel: 1, fase: 0, tPrev: 0 }, perfil = null, K = 28;
    /* f ∝ 1 / L² (barra de madera de ejemplo: 40 cm → 175 Hz con extremos libres) */
    function f0() { return K / (p.L * p.L) * (p.apoyo === "libre" ? 1 : Math.pow(1.8751 / 4.7300, 2)); }
    function ratio(k) { var b = BARRAS[p.apoyo].b; return Math.pow(b[k] / b[0], 2); }
    function preparar() {
      var B = BARRAS[p.apoyo], bl = B.b[p.modo], n = 200, max = 0; perfil = new Float32Array(n + 1);
      for (var i = 0; i <= n; i++) { perfil[i] = B.forma(bl, i / n); max = Math.max(max, Math.abs(perfil[i])); }
      for (var j = 0; j <= n; j++) perfil[j] /= max;
    }
    var s = crear(cont, {
      titulo: "Modos de vibración de una barra", proporcion: 0.36,
      sonido: function () { return vozParcial(function () { return { f: [f0() * ratio(p.modo)], a: [1] }; }); },
      dibujar: function (ctx, w, h, t) {
        p.fase += Math.max(0, t - p.tPrev) * omegaVisual(f0() * ratio(p.modo)) * p.vel; p.tPrev = t;
        var m0 = margenes(w, h), c = Math.cos(p.fase), ym = m0.y + m0.h / 2 - 6, A = m0.h * 0.28, grosor = Math.max(8, m0.h * 0.07);
        rejilla(ctx, m0.x, m0.y, m0.w, m0.h, 10, 4);
        var bw = m0.w * p.L / 0.8;
        A = Math.min(A, bw * 0.12);
        var m = { x: p.apoyo === "libre" ? m0.x + (m0.w - bw) / 2 : m0.x + 10, y: m0.y, w: p.apoyo === "libre" ? bw : bw - 10, h: m0.h };
        var n = perfil.length - 1;
        ctx.fillStyle = "#c98a3a"; ctx.strokeStyle = "#6b4410"; ctx.lineWidth = 1.2; ctx.beginPath();
        for (var i = 0; i <= n; i++) ctx.lineTo(m.x + m.w * i / n, ym - perfil[i] * c * A - grosor / 2);
        for (var j = n; j >= 0; j--) ctx.lineTo(m.x + m.w * j / n, ym - perfil[j] * c * A + grosor / 2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        if (p.apoyo === "empotrada") { ctx.fillStyle = "#6b6b6b"; ctx.fillRect(m.x - 10, ym - A - 10, 10, 2 * A + 20); }
        ctx.fillStyle = C.navy;
        for (var k = 1; k < n; k++) if (perfil[k] * perfil[k + 1] < 0) {
          var x = m.x + m.w * (k + perfil[k] / (perfil[k] - perfil[k + 1])) / n;
          ctx.beginPath(); ctx.moveTo(x, ym + grosor / 2 + 4); ctx.lineTo(x - 6, ym + grosor / 2 + 14); ctx.lineTo(x + 6, ym + grosor / 2 + 14); ctx.fill();
        }
        var yc = ym + A + grosor / 2 + 6;
        ctx.strokeStyle = C.navy; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(m.x, yc); ctx.lineTo(m.x + m.w, yc); ctx.moveTo(m.x, yc - 5); ctx.lineTo(m.x, yc + 5); ctx.moveTo(m.x + m.w, yc - 5); ctx.lineTo(m.x + m.w, yc + 5); ctx.stroke();
        texto(ctx, "L = " + Math.round(p.L * 100) + " cm", m.x + m.w / 2, yc - 4, { alin: "center", color: C.navy, tam: 11 });
        texto(ctx, "▲ nodos (en el modo 1 de una barra libre: dónde se apoya o se ata la tecla)", m0.x, h - 3, { tam: 10 });
      }
    });
    function leer() {
      var r = [0, 1, 2, 3].map(function (k) { return fmtNum(ratio(k), 2); }).join(" : ");
      s.lectura("L = " + Math.round(p.L * 100) + " cm → f₀ = " + fmtHz(f0()) + " (la frecuencia varía con 1/L²: la mitad del largo, cuatro veces la frecuencia) · modo " + (p.modo + 1) + " = <b>" + fmtNum(ratio(p.modo), 2) + " × f₀ = " + fmtHz(f0() * ratio(p.modo)) + "</b> · razones de la barra " + (p.apoyo === "libre" ? "libre" : "empotrada") + ": " + r + " (una cuerda: 1 : 2 : 3 : 4)");
    }
    s.controles.opciones({ etiqueta: "Extremos", valor: p.apoyo, items: [{ t: "Libres (xilófono, marimba)", v: "libre" }, { t: "Uno empotrado", v: "empotrada" }], cambio: function (v) { p.apoyo = v; preparar(); leer(); s.sonar(); s.redibujar(); } });
    s.controles.opciones({ etiqueta: "Modo", valor: 0, items: [1, 2, 3, 4].map(function (n) { return { t: String(n), v: n - 1 }; }), cambio: function (v) { p.modo = v; preparar(); leer(); s.sonar(); s.redibujar(); } });
    s.controles.rango({ etiqueta: "Largo de la barra", min: 0.2, max: 0.8, paso: 0.005, valor: p.L, fmt: function (v) { return Math.round(v * 100) + " cm"; }, cambio: function (v) { p.L = v; leer(); s.sonar(); s.redibujar(); } });
    s.acciones.boton({ html: ICO_GOLPE + "<span>Golpear la barra</span>", cls: "sim-boton-son", clic: function () {
      golpe([0, 1, 2, 3].map(function (k) { return f0() * ratio(k); }), [1, .45, .25, .12], [2.2, .9, .5, .3], 2.4);
    } });
    preparar(); leer(); s.iniciar(); return s;
  };

  /* ---- Cuerda pulsada y frotada */
  TIPOS.cuerdaExcitacion = function (cont) {
    var p = { tipo: "pulsada", pos: 0.2, N: 30, vel: 1, estela: true };
    function amp(n) {
      return p.tipo === "pulsada" ? 2 * Math.sin(n * Math.PI * p.pos) / (n * n * Math.PI * Math.PI * p.pos * (1 - p.pos)) : 8 / (n * n * Math.PI * Math.PI);
    }
    function forma(x, ph) {
      var v = 0;
      for (var n = 1; n <= p.N; n++) v += amp(n) * Math.sin(n * Math.PI * x) * (p.tipo === "pulsada" ? Math.cos(n * ph) : Math.sin(n * ph));
      return v;
    }
    var s = crear(cont, {
      titulo: "Cuerda pulsada o frotada", proporcion: 0.52, altoMin: 270,
      sonido: function () {
        if (p.tipo === "pulsada") return null;
        return vozArmonica(function () { var a = []; for (var n = 1; n <= p.N; n++) a.push(amp(n)); return { f: 147, a: a }; });
      },
      dibujar: function (ctx, w, h, t) {
        var m = margenes(w, h), hc = m.h * 0.62, hs = m.h - hc - 18, ph = t * 1.6 * p.vel;
        var x0 = m.x + 10, ww = m.w - 20, ym = m.y + hc / 2, A = hc * 0.42;
        ctx.fillStyle = "#777"; ctx.fillRect(x0 - 8, ym - 18, 8, 36); ctx.fillRect(x0 + ww, ym - 18, 8, 36);
        if (p.estela) {
          for (var k = 1; k <= 8; k++) {
            ctx.globalAlpha = 0.07 * (9 - k) / 8 + 0.03;
            traza(ctx, x0, ym - A, ww, 2 * A, function (u) { return forma(u, ph - k * 0.12); }, C.navy, 1.4, 1);
          }
          ctx.globalAlpha = 1;
        }
        traza(ctx, x0, ym - A, ww, 2 * A, function (u) { return forma(u, ph); }, C.rojo, 2.6, 1);
        var xp = x0 + ww * p.pos;
        ctx.strokeStyle = C.naranjo; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xp, m.y); ctx.lineTo(xp, m.y + hc); ctx.stroke(); ctx.setLineDash([]);
        texto(ctx, p.tipo === "pulsada" ? "punto de pulsación" : "punto del arco", xp + 4, m.y + 10, { color: C.naranjo, tam: 11 });
        var bar = []; for (var n = 1; n <= Math.min(p.N, 24); n++) bar.push({ a: amp(n), etq: n % 2 && n < 20 ? String(n) : "", color: Math.abs(amp(n)) < 1e-3 ? C.rejilla : C.rojo });
        espectro(ctx, m.x, m.y + hc + 10, m.w, hs, bar, { n: 24, titulo: "Amplitud de cada armónico" });
      }
    });
    var bPulsar;
    function leer() {
      var falt = [];
      if (p.tipo === "pulsada") for (var n = 2; n <= p.N; n++) if (Math.abs(Math.sin(n * Math.PI * p.pos)) < 0.02) falt.push(n);
      s.lectura(p.tipo === "pulsada" ? "Cuerda pulsada en " + Math.round(p.pos * 100) + " % del largo: la forma inicial es un triángulo que se desdobla en dos ondas que se reflejan en los extremos." + (falt.length ? " Faltan los armónicos <b>" + falt.slice(0, 6).join(", ") + "</b> (tienen un nodo en el punto de pulsación)." : "") :
        "Cuerda frotada (movimiento de Helmholtz): un vértice recorre la cuerda; la cuerda se pega al arco y luego resbala, una vez por ciclo. Armónicos en 1/n².");
      bPulsar.hidden = p.tipo !== "pulsada";
      var bs = s.raiz.querySelector(".sim-boton-son:not(.pulsar)"); if (bs) bs.hidden = p.tipo === "pulsada";
    }
    s.controles.opciones({ etiqueta: "Excitación", valor: p.tipo, items: [{ t: "Pulsada (guitarra, arpa, pizzicato)", v: "pulsada" }, { t: "Frotada con arco", v: "frotada" }], cambio: function (v) { p.tipo = v; if (s.voz && v === "pulsada") Audio.detener(); leer(); s.redibujar(); } });
    s.controles.rango({ etiqueta: "Punto de excitación", min: 0.05, max: 0.5, paso: 0.01, valor: p.pos, fmt: function (v) { return Math.round(v * 100) + " % del largo"; }, cambio: function (v) { p.pos = v; leer(); s.sonar(); s.redibujar(); } });
    s.controles.rango({ etiqueta: "Armónicos considerados", min: 1, max: 40, paso: 1, valor: p.N, fmt: function (v) { return v; }, cambio: function (v) { p.N = v; leer(); s.sonar(); s.redibujar(); } });
    s.controles.rango({ etiqueta: "Cámara lenta", min: 0.05, max: 2, paso: 0.05, valor: 1, fmt: function (v) { return fmtNum(v, 2) + "×"; }, cambio: function (v) { p.vel = v; } });
    s.controles.casilla({ etiqueta: "Dejar estela", valor: p.estela, cambio: function (v) { p.estela = v; s.redibujar(); } });
    bPulsar = s.acciones.boton({ html: ICO_GOLPE + "<span>Pulsar la cuerda</span>", cls: "sim-boton-son pulsar", clic: function () {
      var f = [], a = [], d = []; for (var n = 1; n <= p.N; n++) { f.push(147 * n); a.push(Math.abs(amp(n))); d.push(3 / Math.pow(n, 0.6)); }
      golpe(f, a, d, 3);
    } });
    leer(); s.iniciar(); return s;
  };

  /* ---- Modos de una cuerda en tensión */
  TIPOS.modosCuerda = function (cont) {
    var p = { modos: [1], f1: 110, vel: 1, fase: 0, tPrev: 0 };
    var s = crear(cont, {
      titulo: "Modos de vibración de una cuerda", proporcion: 0.42,
      sonido: function () { return vozParcial(function () { return { f: p.modos.map(function (n) { return p.f1 * n; }), a: p.modos.map(function (n) { return 1 / n; }) }; }); },
      dibujar: function (ctx, w, h, t) {
        var m = margenes(w, h), x0 = m.x + 10, ww = m.w - 20, ym = m.y + m.h / 2 - 8, A = m.h * 0.36;
        p.fase += Math.max(0, t - p.tPrev) * omegaVisual(p.f1) * 0.5 * p.vel; p.tPrev = t;
        var ph = p.fase;
        texto(ctx, "f₁ = " + fmtHz(p.f1) + " · animación ralentizada", m.x + m.w, m.y + 10, { alin: "right", tam: 11 });
        ctx.fillStyle = "#777"; ctx.fillRect(x0 - 8, ym - 16, 8, 32); ctx.fillRect(x0 + ww, ym - 16, 8, 32);
        var tot = p.modos.reduce(function (s, n) { return s + 1 / n; }, 0);
        if (p.modos.length === 1) {
          var n = p.modos[0];
          traza(ctx, x0, ym - A, ww, 2 * A, function (u) { return Math.sin(n * Math.PI * u); }, C.eje, 1, 1, [4, 4]);
          traza(ctx, x0, ym - A, ww, 2 * A, function (u) { return -Math.sin(n * Math.PI * u); }, C.eje, 1, 1, [4, 4]);
          traza(ctx, x0, ym - A, ww, 2 * A, function (u) { return Math.sin(n * Math.PI * u) * Math.cos(n * ph); }, C.rojo, 2.6, 1);
          ctx.fillStyle = C.navy;
          for (var k = 0; k <= n; k++) { ctx.beginPath(); ctx.arc(x0 + ww * k / n, ym, 4, 0, 7); ctx.fill(); }
          for (var a = 0; a < n; a++) texto(ctx, "A", x0 + ww * (a + 0.5) / n, ym - A - 4, { alin: "center", tam: 10, color: C.naranjo });
          /* longitud de onda */
          var lw = ww * 2 / n, yy = m.y + m.h - 6;
          if (lw <= ww + 1) {
            ctx.strokeStyle = C.navy; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + lw, yy); ctx.moveTo(x0, yy - 5); ctx.lineTo(x0, yy + 5); ctx.moveTo(x0 + lw, yy - 5); ctx.lineTo(x0 + lw, yy + 5); ctx.stroke();
            texto(ctx, "λ" + n + " = 2L/" + n, x0 + lw / 2, yy - 4, { alin: "center", color: C.navy, tam: 11 });
          } else texto(ctx, "λ1 = 2L (el doble del largo de la cuerda)", x0, yy, { color: C.navy, tam: 11 });
        } else {
          p.modos.forEach(function (n, k) {
            traza(ctx, x0, ym - A, ww, 2 * A, function (u) { return Math.sin(n * Math.PI * u) * Math.cos(n * ph) / n / tot; }, PALETA[(n - 1) % PALETA.length], 1.1, 1);
          });
          traza(ctx, x0, ym - A, ww, 2 * A, function (u) { var v = 0; p.modos.forEach(function (n) { v += Math.sin(n * Math.PI * u) * Math.cos(n * ph) / n; }); return v / tot; }, C.rojo, 2.6, 1);
          texto(ctx, "en rojo: la cuerda real, suma de los modos elegidos", x0, m.y + m.h - 6, { tam: 11 });
        }
      }
    });
    function leer() {
      if (p.modos.length === 1) {
        var n = p.modos[0];
        s.lectura("Armónico <b>" + n + "</b>: " + n + (n === 1 ? " antinodo" : " antinodos") + ", " + (n + 1) + " nodos · f" + n + " = " + n + " × f₁ = <b>" + fmtHz(p.f1 * n) + "</b> (" + nota(p.f1 * n) + ")");
      } else s.lectura("Superposición de los armónicos " + p.modos.join(", ") + ": " + p.modos.map(function (n) { return fmtHz(p.f1 * n); }).join(" + "));
    }
    s.controles.opciones({ etiqueta: "Armónicos (puedes elegir varios)", multiple: true, valor: p.modos, items: [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return { t: String(n), v: n }; }), cambio: function (v) { p.modos = v; leer(); s.sonar(); s.redibujar(); } });
    s.controles.rango({ etiqueta: "Frecuencia fundamental f₁", min: 55, max: 440, log: true, valor: p.f1, fmt: fmtHz, cambio: function (v) { p.f1 = v; leer(); s.sonar(); s.redibujar(); } });
    s.controles.rango({ etiqueta: "Velocidad de la animación", min: 0.1, max: 2, paso: 0.05, valor: 1, fmt: function (v) { return fmtNum(v, 2) + "×"; }, cambio: function (v) { p.vel = v; } });
    leer(); s.iniciar(); return s;
  };

  /* ---- Física de la cuerda: largo, tensión y densidad */
  TIPOS.cuerdaFisica = function (cont) {
    var p = { L: 0.65, T: 70, mu: 3 };
    function f() { return 1 / (2 * p.L) * Math.sqrt(p.T / (p.mu / 1000)); }
    var cL, cT, cM;
    var s = crear(cont, {
      titulo: "Frecuencia de una cuerda", proporcion: 0.3, altoMin: 170,
      sonido: function () { return vozArmonica(function () { var a = []; for (var n = 1; n <= 12; n++) a.push(1 / (n * n) * (n % 2 ? 1 : 0.8)); return { f: f(), a: a }; }); },
      dibujar: function (ctx, w, h, t) {
        var m = margenes(w, h), ww = (m.w - 30) * p.L / 1.2, x0 = m.x + 14, ym = m.y + m.h / 2;
        var A = m.h * 0.28 * Math.min(1, 0.6 + 40 / p.T) , vis = Math.log2(f() / 20) * 2.2;
        ctx.fillStyle = "#777"; ctx.fillRect(x0 - 8, ym - 16, 8, 32); ctx.fillRect(x0 + ww, ym - 16, 8, 32);
        var grosor = 1 + p.mu / 2.2;
        traza(ctx, x0, ym - A, ww, 2 * A, function (u) { return Math.sin(Math.PI * u); }, C.eje, 1, 1, [4, 4]);
        traza(ctx, x0, ym - A, ww, 2 * A, function (u) { return -Math.sin(Math.PI * u); }, C.eje, 1, 1, [4, 4]);
        traza(ctx, x0, ym - A, ww, 2 * A, function (u) { return Math.sin(Math.PI * u) * Math.cos(t * vis); }, "#8a5a1a", grosor, 1);
        ctx.strokeStyle = C.navy; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, m.y + m.h); ctx.lineTo(x0 + ww, m.y + m.h); ctx.stroke();
        texto(ctx, "L = " + fmtNum(p.L, 2) + " m", x0 + ww / 2, m.y + m.h - 4, { alin: "center", color: C.navy, tam: 11 });
      }
    });
    function leer() { var fr = f(); s.lectura("f = (1 / 2L) · √(T / μ) = <b>" + fmtHz(fr) + "</b> (" + nota(fr) + ")"); }
    function upd() { leer(); s.sonar(); s.redibujar(); }
    cL = s.controles.rango({ etiqueta: "Largo L", min: 0.25, max: 1.2, paso: 0.005, valor: p.L, fmt: function (v) { return fmtNum(v, 2) + " m"; }, cambio: function (v) { p.L = v; upd(); } });
    cT = s.controles.rango({ etiqueta: "Tensión T", min: 10, max: 150, paso: 0.5, valor: p.T, fmt: function (v) { return Math.round(v) + " N"; }, cambio: function (v) { p.T = v; upd(); } });
    cM = s.controles.rango({ etiqueta: "Densidad lineal μ", min: 0.3, max: 15, log: true, valor: p.mu, fmt: function (v) { return fmtNum(v, v < 10 ? 1 : 0) + " g/m"; }, cambio: function (v) { p.mu = v; upd(); } });
    s.controles.opciones({ etiqueta: "Ejemplos", valor: null, items: [
      { t: "Violín, cuerda La", v: [0.328, 50, 0.6] }, { t: "Guitarra, 6.ª cuerda", v: [0.65, 70, 6.2] }, { t: "Contrabajo, cuerda Mi", v: [1.06, 99, 13] }
    ], cambio: function (v) { p.L = v[0]; p.T = v[1]; p.mu = v[2]; cL.set(p.L); cT.set(p.T); cM.set(p.mu); upd(); } });
    leer(); s.iniciar(); return s;
  };

  /* ---- Tubos: abierto o cerrado, presión y desplazamiento */
  function tuboFis(tipo) {
    return {
      /* m = 1, 2, 3...: el m-ésimo modo que el tubo admite */
      n: function (m) { return tipo === "abierto" ? m : 2 * m - 1; },
      f: function (m, L) { return tipo === "abierto" ? m * VEL_SONIDO / (2 * L) : (2 * m - 1) * VEL_SONIDO / (4 * L); },
      k: function (m) { return tipo === "abierto" ? m * Math.PI : (2 * m - 1) * Math.PI / 2; },
      /* tubo cerrado en x = 0 (izquierda), abierto en x = 1 */
      desp: function (m, u) { var k = this.k(m); return tipo === "abierto" ? Math.cos(k * u) : Math.sin(k * u); },
      pres: function (m, u) { var k = this.k(m); return tipo === "abierto" ? Math.sin(k * u) : Math.cos(k * u); }
    };
  }
  /* Dibuja el tubo con sus extremos bien marcados y las partículas de aire. */
  function dibujarTubo(ctx, x, y, w, h, tipo, F, m, ph, rotulos) {
    ctx.fillStyle = "#fbf6ea"; ctx.fillRect(x, y, w, h);
    var cols = Math.max(10, Math.round(w / 9)), filas = Math.max(4, Math.round(h / 11));
    for (var r = 0; r < filas; r++) for (var q = 0; q <= cols; q++) {
      var u = (q + (r % 2) * 0.5) / cols; if (u > 1) continue;
      var d = F.desp(m, u) * Math.sin(ph) * (w / cols) * 2.6;
      var dens = -F.pres(m, u) * Math.sin(ph);
      ctx.fillStyle = dens > 0.3 ? "#c8102e" : dens < -0.3 ? "#2f5fb3" : "#8a7a5c";
      ctx.beginPath(); ctx.arc(Math.min(x + w + 6, Math.max(x + 3, x + u * w + d)), y + 6 + r * (h - 12) / (filas - 1), 1.8, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.stroke();
    /* extremo izquierdo: tapa si es cerrado; boca abierta si no */
    if (tipo === "cerrado") { ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x - 1, y - 3); ctx.lineTo(x - 1, y + h + 3); ctx.stroke(); }
    else { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 7, y - 6); ctx.moveTo(x, y + h); ctx.lineTo(x - 7, y + h + 6); ctx.stroke(); }
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + 7, y - 6); ctx.moveTo(x + w, y + h); ctx.lineTo(x + w + 7, y + h + 6); ctx.stroke();
    if (rotulos !== false) {
      texto(ctx, tipo === "cerrado" ? "cerrado" : "abierto", x, y - 8, { tam: 10, color: C.tinta });
      texto(ctx, "abierto", x + w, y - 8, { tam: 10, color: C.tinta, alin: "right" });
    }
  }
  /* Curva de presión o desplazamiento bajo el tubo (sin marco, para que no parezca otro tubo). */
  function curvaTubo(ctx, x, y, w, h, fn, ph, color, etiqueta, desfase) {
    ctx.strokeStyle = C.rejilla; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + h / 2 + 0.5); ctx.lineTo(x + w, y + h / 2 + 0.5); ctx.stroke();
    traza(ctx, x, y, w, h, fn, C.eje, 1, 0.85, [4, 4]);
    traza(ctx, x, y, w, h, function (u) { return -fn(u); }, C.eje, 1, 0.85, [4, 4]);
    traza(ctx, x, y, w, h, function (u) { return fn(u) * (desfase ? -Math.sin(ph) : Math.sin(ph)); }, color, 2.4, 0.85);
    texto(ctx, etiqueta, x, y + 10, { color: color, tam: 11 });
  }
  function armonicosTubo(F, L, cuantos) {
    var f = [], a = [];
    for (var m = 1; m <= cuantos; m++) { var n = F.n(m); f.push(F.f(m, L)); a.push(1 / n); }
    return { f: f, a: a };
  }

  TIPOS.tubo = function (cont, op) {
    op = op || {};
    var tipo = op.tipo || "abierto", F = tuboFis(tipo);
    var p = { modo: 1, L: 0.6, vista: op.vista || "ambas", vel: 1, fase: 0, tPrev: 0, oir: "modo" };
    var s = crear(cont, {
      titulo: "Columna de aire en un tubo " + tipo, proporcion: 0.55, altoMin: 300,
      sonido: function () {
        return vozParcial(function () {
          return p.oir === "modo" ? { f: [F.f(p.modo, p.L)], a: [1] } : armonicosTubo(F, p.L, 8);
        });
      },
      dibujar: function (ctx, w, h, t) {
        p.fase += Math.max(0, t - p.tPrev) * omegaVisual(F.f(p.modo, p.L)) * 0.6 * p.vel; p.tPrev = t;
        var m = margenes(w, h), ph = p.fase;
        var uL = Math.log(p.L / 0.15) / Math.log(2.5 / 0.15);
        var tx = m.x + 18, tw = (m.w - 90) * (0.3 + 0.7 * uL), th = Math.min(66, m.h * 0.24), ty = m.y + 12;
        dibujarTubo(ctx, tx, ty, tw, th, tipo, F, p.modo, ph);
        texto(ctx, "L = " + fmtNum(p.L, 2) + " m", tx + tw + 14, ty + th / 2 + 4, { color: C.navy, tam: 12 });
        var gy = ty + th + 30, gh = m.y + m.h - gy, partes = p.vista === "ambas" ? 2 : 1, hh = (gh - (partes - 1) * 12) / partes, y = gy;
        if (p.vista !== "presion") { curvaTubo(ctx, tx, y, tw, hh, function (u) { return F.desp(p.modo, u); }, ph, C.azul, "desplazamiento del aire"); y += hh + 12; }
        if (p.vista !== "desplazamiento") curvaTubo(ctx, tx, y, tw, hh, function (u) { return F.pres(p.modo, u); }, ph, C.rojo, "presión acústica", true);
      }
    });
    function leer() {
      var n = F.n(p.modo), lista = [1, 2, 3, 4, 5].map(function (k) { return F.n(k); }).join(", ");
      s.lectura("L = " + fmtNum(p.L, 2) + " m · " + (n === 1 ? "fundamental" : "armónico " + n) + ": <b>" + fmtHz(F.f(p.modo, p.L)) + "</b> (" + nota(F.f(p.modo, p.L)) + ")" +
        " · este tubo solo admite los armónicos " + lista + "…" + (tipo === "abierto" ? " (f = n · c / 2L)" : " (f = n · c / 4L: los pares no existen)") +
        " · partículas: rojo = compresión, azul = rarefacción.");
    }
    s.controles.opciones({ etiqueta: "Modo de vibración", valor: 1, items: [1, 2, 3, 4, 5].map(function (k) { var n = F.n(k); return { t: n === 1 ? "Fundamental" : "Armónico " + n, v: k }; }), cambio: function (v) { p.modo = v; leer(); s.sonar(); s.redibujar(); } });
    s.controles.opciones({ etiqueta: "Al escuchar", valor: p.oir, items: [{ t: "Solo el modo elegido", v: "modo" }, { t: "El tubo completo (todos sus armónicos a la vez)", v: "todo" }], cambio: function (v) { p.oir = v; s.sonar(); } });
    s.controles.opciones({ etiqueta: "Ver", valor: p.vista, items: [{ t: "Desplazamiento y presión", v: "ambas" }, { t: "Desplazamiento", v: "desplazamiento" }, { t: "Presión", v: "presion" }], cambio: function (v) { p.vista = v; s.redibujar(); } });
    s.controles.rango({ etiqueta: "Largo del tubo L", min: 0.15, max: 2.5, log: true, valor: p.L, fmt: function (v) { return fmtNum(v, 2) + " m"; }, cambio: function (v) { p.L = v; leer(); s.sonar(); s.redibujar(); } });
    s.controles.rango({ etiqueta: "Velocidad de la animación", min: 0.1, max: 2, paso: 0.05, valor: 1, fmt: function (v) { return fmtNum(v, 2) + "×"; }, cambio: function (v) { p.vel = v; } });
    leer(); s.iniciar(); return s;
  };

  /* ---- Comparación: tubo abierto y tubo cerrado del mismo largo */
  TIPOS.tubosComparar = function (cont) {
    var A = tuboFis("abierto"), Z = tuboFis("cerrado");
    var p = { L: 0.6, vista: "presion", fase: 0, tPrev: 0, oir: "abierto" };
    var s = crear(cont, {
      titulo: "Tubo abierto y tubo cerrado", proporcion: 0.5, altoMin: 300,
      sonido: function () { return vozParcial(function () { return armonicosTubo(p.oir === "abierto" ? A : Z, p.L, 8); }); },
      dibujar: function (ctx, w, h, t) {
        p.fase += Math.max(0, t - p.tPrev) * 2.2; p.tPrev = t;
        var m = margenes(w, h), mitad = (m.h - 10) / 2;
        var uL = Math.log(p.L / 0.15) / Math.log(2.5 / 0.15), tw = (m.w - 120) * (0.3 + 0.7 * uL), tx = m.x + 18;
        [[A, "abierto", m.y + 12], [Z, "cerrado", m.y + mitad + 22]].forEach(function (cfg, i) {
          var F = cfg[0], y = cfg[2], th = Math.min(50, mitad * 0.36), ph = p.fase * (i === 0 ? 1 : 0.5);
          dibujarTubo(ctx, tx, y, tw, th, cfg[1], F, 1, ph);
          texto(ctx, (i === 0 ? "Abierto: f = c / 2L = " : "Cerrado: f = c / 4L = ") + fmtHz(F.f(1, p.L)), tx + tw + 14, y + th / 2 + 4, { color: i === 0 ? C.navy : C.rojo, tam: 12 });
          var gy = y + th + 10, gh = mitad - th - 22;
          if (p.vista === "presion") curvaTubo(ctx, tx, gy, tw, gh, function (u) { return F.pres(1, u); }, ph, C.rojo, "presión", true);
          else curvaTubo(ctx, tx, gy, tw, gh, function (u) { return F.desp(1, u); }, ph, C.azul, "desplazamiento");
        });
      }
    });
    function leer() {
      s.lectura("Con el mismo largo (" + fmtNum(p.L, 2) + " m), el tubo cerrado suena <b>una octava más grave</b>: " + fmtHz(Z.f(1, p.L)) + " frente a " + fmtHz(A.f(1, p.L)) +
        ". En el extremo abierto la presión es mínima (nodo); en el cerrado es máxima (antinodo).");
    }
    s.controles.rango({ etiqueta: "Largo de ambos tubos", min: 0.15, max: 2.5, log: true, valor: p.L, fmt: function (v) { return fmtNum(v, 2) + " m"; }, cambio: function (v) { p.L = v; leer(); s.sonar(); s.redibujar(); } });
    s.controles.opciones({ etiqueta: "Ver", valor: p.vista, items: [{ t: "Presión", v: "presion" }, { t: "Desplazamiento", v: "desplazamiento" }], cambio: function (v) { p.vista = v; s.redibujar(); } });
    s.controles.opciones({ etiqueta: "Escuchar", valor: p.oir, items: [{ t: "Tubo abierto", v: "abierto" }, { t: "Tubo cerrado", v: "cerrado" }], cambio: function (v) { p.oir = v; s.sonar(); } });
    leer(); s.iniciar(); return s;
  };

  /* ---- Largo efectivo de un tubo con un orificio */
  TIPOS.orificio = function (cont) {
    var p = { pos: 0.7, tam: 0.6, L: 0.6 };
    function Le() { return p.L * (p.pos + (1 - p.pos) * Math.exp(-4.5 * p.tam * p.tam)); }
    function f() { return VEL_SONIDO / (4 * Le()); }
    var cPos, cTam;
    var s = crear(cont, {
      titulo: "Largo efectivo de un tubo", proporcion: 0.26, altoMin: 220, altoMax: 260,
      sonido: function () { return vozArmonica(function () { return { f: f(), a: [1, 0, 0.35, 0, 0.18, 0, 0.08] }; }); },
      dibujar: function (ctx, w, h, t) {
        var m = margenes(w, h), tx = m.x + 14, tw = m.w - 28, ty = m.y + 30, th = Math.min(96, m.h * 0.45);
        ctx.fillStyle = "#fbf6ea"; ctx.fillRect(tx, ty, tw, th);
        ctx.strokeStyle = C.tinta; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + tw, ty); ctx.moveTo(tx, ty + th); ctx.lineTo(tx + tw, ty + th); ctx.stroke();
        ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(tx, ty - 2); ctx.lineTo(tx, ty + th + 2); ctx.stroke();
        var hx = tx + tw * p.pos, hr = 3 + p.tam * th * 0.42;
        ctx.fillStyle = "#fff"; ctx.strokeStyle = C.tinta; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(hx, ty, hr, Math.max(2, hr * 0.35), 0, 0, 7); ctx.fill(); ctx.stroke();
        var le = Le() / p.L, xe = tx + tw * le, c = Math.cos(t * 2.6);
        ctx.strokeStyle = C.naranjo; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(xe, ty - 6); ctx.lineTo(xe, ty + th + 6); ctx.stroke(); ctx.setLineDash([]);
        /* presión de la fundamental en el largo efectivo (cuarto de onda) */
        traza(ctx, tx, ty + 6, tw * le, th - 12, function (u) { return Math.cos(Math.PI / 2 * u); }, C.eje, 1, 0.9, [4, 4]);
        traza(ctx, tx, ty + 6, tw * le, th - 12, function (u) { return -Math.cos(Math.PI / 2 * u); }, C.eje, 1, 0.9, [4, 4]);
        traza(ctx, tx, ty + 6, tw * le, th - 12, function (u) { return Math.cos(Math.PI / 2 * u) * c; }, C.rojo, 2.4, 0.9);
        function cota(x1, x2, y, s) {
          ctx.strokeStyle = C.navy; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.moveTo(x1, y - 5); ctx.lineTo(x1, y + 5); ctx.moveTo(x2, y - 5); ctx.lineTo(x2, y + 5); ctx.stroke();
          texto(ctx, s, (x1 + x2) / 2, y - 5, { alin: "center", color: C.navy, tam: 12 });
        }
        cota(tx, xe, ty - 14, "Le = " + fmtNum(Le() * 100, 1) + " cm");
        cota(tx, tx + tw, ty + th + 22, "L = " + fmtNum(p.L * 100, 0) + " cm");
        texto(ctx, "extremo cerrado", tx, ty + th + 44, { tam: 10 }); texto(ctx, "extremo abierto", tx + tw, ty + th + 44, { tam: 10, alin: "right" });
      }
    });
    function leer() {
      s.lectura("Orificio " + (p.tam < 0.15 ? "muy pequeño: casi no cambia el largo efectivo" : p.tam < 0.55 ? "mediano: el largo efectivo se acorta en parte" : "grande: el tubo «termina» casi en el orificio") +
        " · Le = " + fmtNum(Le() * 100, 1) + " cm · f = c / 4Le = <b>" + fmtHz(f()) + "</b> (" + nota(f()) + "). Modelo simplificado, con fines ilustrativos.");
    }
    function upd() { leer(); s.sonar(); s.redibujar(); }
    cPos = s.controles.rango({ etiqueta: "Posición del orificio", min: 0.25, max: 0.95, paso: 0.005, valor: p.pos, fmt: function (v) { return Math.round(v * 100) + " % del largo"; }, cambio: function (v) { p.pos = v; upd(); } });
    cTam = s.controles.rango({ etiqueta: "Tamaño del orificio", min: 0, max: 1, paso: 0.01, valor: p.tam, fmt: function (v) { return Math.round(v * 100) + " % del diámetro del tubo"; }, cambio: function (v) { p.tam = v; upd(); } });
    s.controles.opciones({ etiqueta: "Tamaños de ejemplo", valor: null, items: [{ t: "Agujero muy pequeño", v: 0.05 }, { t: "Agujero mediano", v: 0.4 }, { t: "Agujero grande", v: 0.95 }], cambio: function (v) { p.tam = v; cTam.set(v); upd(); } });
    leer(); s.iniciar(); return s;
  };

  /* ------------------------------------------------------------ API */
  window.SIMS = {
    montar: function (cont, tipo, op) { return TIPOS[tipo] ? TIPOS[tipo](cont, op) : null; },
    detenerSonido: function () { Audio.detener(); },
    tipos: Object.keys(TIPOS)
  };
})();
