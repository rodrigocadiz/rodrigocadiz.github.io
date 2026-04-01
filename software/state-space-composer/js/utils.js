/* =========================================
   UTILS
   ========================================= */
function accidentalToSemitone(acc) {
    if (acc == null) return 0;
    if (typeof acc === "number") return acc;
    const a = String(acc).toLowerCase().trim();
    if (a === "sharp" || a === "^") return 1;
    if (a === "flat" || a === "_") return -1;
    if (a === "natural" || a === "=") return 0;
    if (a === "dblsharp" || a === "^^") return 2;
    if (a === "dblflat" || a === "__") return -2;
    return 0;
}

function staffPitchToMidi(diatonicStepsFromC4, accidentalSemis = 0) {
    const scale = [0, 2, 4, 5, 7, 9, 11];
    const deg = ((diatonicStepsFromC4 % 7) + 7) % 7;
    const oct = Math.floor(diatonicStepsFromC4 / 7);
    return 60 + 12 * oct + scale[deg] + accidentalSemis;
}

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function softplus(x) { return Math.log(1 + Math.exp(x)); }

function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; }

function floatToFrac(x, maxDen = 64) {
    if (!isFinite(x) || x <= 0) return { num: 1, den: 1 };
    let best = { num: Math.round(x), den: 1, err: Math.abs(x - Math.round(x)) };
    for (let den = 1; den <= maxDen; den++) {
        const num = Math.round(x * den);
        const approx = num / den;
        const err = Math.abs(x - approx);
        if (err < best.err) best = { num, den, err };
    }
    const g = gcd(best.num, best.den);
    return { num: best.num / g, den: best.den / g };
}

function durToAbcToken(durWhole, unitWhole) {
    const mult = durWhole / unitWhole;
    const fr = floatToFrac(mult, 64);
    if (fr.den === 1) {
        if (fr.num === 1) return "";
        return String(fr.num);
    }
    if (fr.num === 1) return "/" + String(fr.den);
    return String(fr.num) + "/" + String(fr.den);
}

function midiToAbcPitch(midi) {
    const pcNames = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"];
    const pc = ((midi % 12) + 12) % 12;
    let name = pcNames[pc];
    const octave = Math.floor((midi - 60) / 12);
    let marks = "";
    if (octave >= 1) {
        name = name.replace(/[A-G]/, s => s.toLowerCase());
        for (let i = 1; i < octave; i++) marks += "'";
    } else if (octave < 0) {
        for (let i = 0; i < (-octave); i++) marks += ",";
    }
    return name + marks;
}

function keyToScalePCs(keyStr) {
    const k = (keyStr || "C").trim();
    const isMinor = /m(in)?$/i.test(k) && !/maj/i.test(k);
    const rootMap = {
        "C": 0, "G": 7, "D": 2, "A": 9, "E": 4, "B": 11, "F#": 6, "C#": 1,
        "F": 5, "Bb": 10, "Eb": 3, "Ab": 8, "Db": 1, "Gb": 6, "Cb": 11
    };
    const m = k.match(/^([A-Ga-g])([#b]?)(.*)$/);
    let rootName = "C";
    if (m) {
        rootName = m[1].toUpperCase() + (m[2] || "");
        if (rootName === "A" && isMinor) rootName = "A";
    }
    const root = rootMap[rootName] ?? 0;
    const majorSteps = [0, 2, 4, 5, 7, 9, 11];
    const minorSteps = [0, 2, 3, 5, 7, 8, 10];
    const steps = isMinor ? minorSteps : majorSteps;
    return steps.map(s => (root + s) % 12);
}

function quantizePitchToScale(m, pcs) {
    const base = Math.round(m);
    let best = base, bestErr = Infinity;
    for (let cand = base - 8; cand <= base + 8; cand++) {
        const pc = ((cand % 12) + 12) % 12;
        if (!pcs.includes(pc)) continue;
        const err = Math.abs(cand - m);
        if (err < bestErr) { bestErr = err; best = cand; }
    }
    return best;
}

function velToDyn(v, expand = false) {
    if (expand) {
        if (v < 26) return "!ppp!";
        if (v < 38) return "!pp!";
        if (v < 52) return "!p!";
        if (v < 66) return "!mp!";
        if (v < 82) return "!mf!";
        if (v < 98) return "!f!";
        if (v < 112) return "!ff!";
        return "!fff!";
    } else {
        if (v < 38) return "!pp!";
        if (v < 52) return "!p!";
        if (v < 68) return "!mp!";
        if (v < 84) return "!mf!";
        if (v < 102) return "!f!";
        return "!ff!";
    }
}

function dynToVel(d) {
    const s = (d || "").replace(/!/g, "").toLowerCase().trim();
    const map = { "ppp": 24, "pp": 32, "p": 46, "mp": 62, "mf": 78, "f": 96, "ff": 112, "fff": 124 };
    return map[s] ?? 80;
}

function artToGate(decos) {
    if (!Array.isArray(decos)) return 0.85;
    const hasStacc = decos.includes("staccato") || decos.includes(".");
    const hasTenuto = decos.includes("tenuto") || decos.includes("-");
    if (hasStacc) return 0.35;
    if (hasTenuto) return 0.95;
    return 0.85;
}

function gateToArt(g) {
    if (g < 0.45) return ".";
    if (g > 0.88) return "-";
    return "";
}

function beta22() {
    return clamp((Math.random() + Math.random()) / 2, 0.18, 0.82);
}

function sig(x) { return 1 / (1 + Math.exp(-x)); }

function escapeHtml(s) {
    return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
