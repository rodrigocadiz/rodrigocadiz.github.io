// ============================================================
// FME UC 2026 — Google Apps Script
// Pegar en: Extensions → Apps Script → deploy como web app
// ============================================================

const JURADOS_ESPERADOS = {
  A: ["José Miguel Fernández", "Roque Rivas", "Anthony de Ritis", "Miguel Farías", "Rodrigo Cádiz", "Juan Pablo Vergara"],
  B: ["Pink Noise", "Anthony de Ritis", "Miguel Farías", "Rodrigo Cádiz", "Juan Pablo Vergara"],
  C: ["José Miguel Fernández", "Roque Rivas", "Anthony de Ritis", "Miguel Farías", "Rodrigo Cádiz", "Juan Pablo Vergara"],
};
const TOTAL_OBRAS = { A: 31, B: 8, C: 9 };
// 3 criterios uniformes (Calidad compositiva · Originalidad · Realización técnica), máx. 30

// ─── POST: recibe evaluación de un jurado ─────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    const prefix    = data.modoTest ? "TEST_" : "";
    const sheetName = prefix + (data.categoria || "X");
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);

    if (sheet.getLastRow() === 0) {
      const critHeaders = (data.evaluaciones[0] && data.evaluaciones[0].scores
        ? Object.keys(data.evaluaciones[0].scores) : []).map(k => k.toUpperCase());
      sheet.appendRow([
        "Timestamp", "Jurado", "Categoria", "ModoTest",
        "Num", "Titulo", "Duracion", "Anio", "Concurso",
        ...critHeaders, "Total", "LinkRoto", "Comentario"
      ]);
      sheet.getRange(1, 1, 1, sheet.getLastColumn())
        .setFontWeight("bold").setBackground("#1c2128").setFontColor("#e6edf3");
    }

    const ts = new Date().toISOString();
    (data.evaluaciones || []).forEach(function(ev) {
      const scoreVals = ev.scores ? Object.values(ev.scores) : [];
      sheet.appendRow([
        ts, data.jurado, data.categoria, data.modoTest ? "SI" : "NO",
        ev.num, ev.titulo, ev.duracion, ev.anio, ev.concurso ? "SI" : "NO",
        ...scoreVals, ev.total,
        ev.brokenLink ? "SI" : "NO",
        ev.comentario || ""
      ]);
    });

    _registrarComplecion(ss, data);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── GET: progreso + puntajes promedio por obra ───────────────────────────
function doGet(e) {
  try {
    const ss       = SpreadsheetApp.getActiveSpreadsheet();
    const progress = _calcularProgreso(ss);
    const scores   = _calcularPromediosPorObra(ss);
    return ContentService
      .createTextOutput(JSON.stringify({ progress: progress, scores: scores, generatedAt: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── Calcular promedios por obra desde las hojas de evaluación ────────────
function _calcularPromediosPorObra(ss) {
  const result = {};
  ["A", "B", "C"].forEach(function(cat) {
    result[cat] = {};
    const sheet = ss.getSheetByName(cat);
    if (!sheet || sheet.getLastRow() < 2) return;

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const idxJurado = headers.indexOf("Jurado");
    const idxNum    = headers.indexOf("Num");
    const idxTitulo = headers.indexOf("Titulo");
    const idxTotal  = headers.indexOf("Total");
    const idxRoto   = headers.indexOf("LinkRoto");
    if (idxTotal === -1) return;

    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    rows.forEach(function(row) {
      const jurado = row[idxJurado];
      const num    = String(row[idxNum]);
      const titulo = row[idxTitulo];
      const total  = parseFloat(row[idxTotal]) || 0;
      const roto   = row[idxRoto] === "SI";
      if (!num || !jurado) return;
      if (!result[cat][num]) {
        result[cat][num] = { titulo: titulo, totales: [], jurados: [], brokenLinks: 0 };
      }
      result[cat][num].totales.push(total);
      result[cat][num].jurados.push(jurado);
      if (roto) result[cat][num].brokenLinks++;
    });

    // Calculate averages
    Object.keys(result[cat]).forEach(function(num) {
      const d = result[cat][num];
      d.promedio = d.totales.length
        ? Math.round((d.totales.reduce((a,b) => a+b, 0) / d.totales.length) * 10) / 10
        : 0;
      d.numEvaluaciones = d.totales.length;
    });
  });
  return result;
}

// ─── Calcular progreso por jurado ─────────────────────────────────────────
function _calcularProgreso(ss) {
  const result = {};
  ["A", "B", "C"].forEach(function(cat) {
    result[cat] = {};
    (JURADOS_ESPERADOS[cat] || []).forEach(function(j) {
      result[cat][j] = { obras: 0, total: TOTAL_OBRAS[cat], completo: false, lastActivity: null };
    });
    const catSheet = ss.getSheetByName(cat);
    if (catSheet && catSheet.getLastRow() > 1) {
      const rows = catSheet.getRange(2, 1, catSheet.getLastRow() - 1, 3).getValues();
      const countPer = {}, lastPer = {};
      rows.forEach(function(row) {
        const ts = row[0], jurado = row[1];
        if (!jurado) return;
        countPer[jurado] = (countPer[jurado] || 0) + 1;
        if (!lastPer[jurado] || ts > lastPer[jurado]) lastPer[jurado] = ts;
      });
      Object.keys(countPer).forEach(function(jurado) {
        if (!result[cat][jurado]) result[cat][jurado] = { obras: 0, total: TOTAL_OBRAS[cat], completo: false, lastActivity: null };
        result[cat][jurado].obras = countPer[jurado];
        result[cat][jurado].lastActivity = lastPer[jurado] ? new Date(lastPer[jurado]).toISOString() : null;
        result[cat][jurado].completo = countPer[jurado] >= TOTAL_OBRAS[cat];
      });
    }
  });
  return result;
}

function _registrarComplecion(ss, data) {
  let sheet = ss.getSheetByName("Progreso");
  if (!sheet) {
    sheet = ss.insertSheet("Progreso");
    sheet.appendRow(["Timestamp", "Jurado", "Categoria", "ModoTest", "Obras", "Completo"]);
    sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#1c2128").setFontColor("#e6edf3");
  }
  const obras = (data.evaluaciones || []).length;
  sheet.appendRow([new Date().toISOString(), data.jurado, data.categoria,
    data.modoTest ? "SI" : "NO", obras, obras >= (TOTAL_OBRAS[data.categoria] || 0) ? "SI" : "NO"]);
}

// ─── Funciones de prueba ──────────────────────────────────────────────────
function testPost() {
  const mockData = {
    jurado: "Rodrigo Cádiz", categoria: "A", modoTest: true,
    timestamp: new Date().toISOString(),
    evaluaciones: [
      { num: 1, titulo: "Obra de prueba", duracion: "5:00", anio: "2025", concurso: true,
        scores: { comp: 8, son: 7, orig: 9, tec: 8 }, total: 32, brokenLink: false, comentario: "Prueba OK" }
    ]
  };
  Logger.log(doPost({ postData: { contents: JSON.stringify(mockData) } }).getContent());
}
function testGet() { Logger.log(doGet({}).getContent()); }
