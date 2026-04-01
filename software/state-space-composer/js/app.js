/* =========================================
   KNOB COMPONENT
   ========================================= */

function createKnob(container, options) {
    const opts = Object.assign({
        label: "Knob",
        min: 0, max: 10, step: 0.1,
        value: 1.0,
        defaultValue: null,
        color: "#4f46e5",
        size: 60,
        onChange: () => {}
    }, options);
    if (opts.defaultValue === null) opts.defaultValue = opts.value;

    const size = opts.size;
    const cx = size / 2, cy = size / 2;
    const r = size / 2 - 6;
    const startAngle = 225; // 7 o'clock (degrees, 0=right, CW)
    const endAngle = -45;   // 5 o'clock
    const totalArc = 270;   // degrees of arc

    let value = opts.value;

    const wrap = document.createElement("div");
    wrap.className = "knob-wrap";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.style.cursor = "pointer";
    svg.style.touchAction = "none";

    function polarToXY(angleDeg) {
        const rad = (angleDeg - 90) * Math.PI / 180;
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    }

    function valueToAngle(v) {
        const frac = (v - opts.min) / (opts.max - opts.min);
        return startAngle - frac * totalArc;
    }

    function arcPath(fromAngle, toAngle) {
        const from = polarToXY(fromAngle);
        const to = polarToXY(toAngle);
        const sweep = fromAngle - toAngle;
        const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
        return `M ${from.x} ${from.y} A ${r} ${r} 0 ${largeArc} 0 ${to.x} ${to.y}`;
    }

    // Background arc
    const bgArc = document.createElementNS("http://www.w3.org/2000/svg", "path");
    bgArc.setAttribute("d", arcPath(startAngle, endAngle));
    bgArc.setAttribute("fill", "none");
    bgArc.setAttribute("stroke", "#e2e8f0");
    bgArc.setAttribute("stroke-width", "4");
    bgArc.setAttribute("stroke-linecap", "round");

    // Value arc
    const valArc = document.createElementNS("http://www.w3.org/2000/svg", "path");
    valArc.setAttribute("fill", "none");
    valArc.setAttribute("stroke", opts.color);
    valArc.setAttribute("stroke-width", "4");
    valArc.setAttribute("stroke-linecap", "round");

    // Indicator line
    const indicator = document.createElementNS("http://www.w3.org/2000/svg", "line");
    indicator.setAttribute("stroke", opts.color);
    indicator.setAttribute("stroke-width", "2.5");
    indicator.setAttribute("stroke-linecap", "round");

    // Center value text
    const valText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    valText.setAttribute("x", cx);
    valText.setAttribute("y", cy + 1);
    valText.setAttribute("text-anchor", "middle");
    valText.setAttribute("dominant-baseline", "central");
    valText.setAttribute("fill", "#1e293b");
    valText.setAttribute("font-size", size < 50 ? "9" : "11");
    valText.setAttribute("font-family", "Inter, system-ui, sans-serif");
    valText.setAttribute("font-weight", "600");

    svg.appendChild(bgArc);
    svg.appendChild(valArc);
    svg.appendChild(indicator);
    svg.appendChild(valText);

    // Label
    const labelEl = document.createElement("div");
    labelEl.className = "knob-label";
    labelEl.textContent = opts.label;

    wrap.appendChild(svg);
    wrap.appendChild(labelEl);
    container.appendChild(wrap);

    function render() {
        const angle = valueToAngle(value);
        // Value arc from start to current
        if (value > opts.min) {
            valArc.setAttribute("d", arcPath(startAngle, angle));
            valArc.style.display = "";
        } else {
            valArc.style.display = "none";
        }

        // Indicator tick
        const indR1 = r - 8;
        const indR2 = r - 2;
        const rad = (angle - 90) * Math.PI / 180;
        indicator.setAttribute("x1", cx + indR1 * Math.cos(rad));
        indicator.setAttribute("y1", cy + indR1 * Math.sin(rad));
        indicator.setAttribute("x2", cx + indR2 * Math.cos(rad));
        indicator.setAttribute("y2", cy + indR2 * Math.sin(rad));

        // Value display
        const displayVal = opts.step >= 1 ? Math.round(value) : value.toFixed(1);
        valText.textContent = displayVal;
    }

    function setValue(v, notify) {
        v = Math.round(v / opts.step) * opts.step;
        v = Math.max(opts.min, Math.min(opts.max, v));
        if (Math.abs(v - value) < opts.step * 0.01) return;
        value = v;
        render();
        if (notify !== false) opts.onChange(value);
    }

    // Drag interaction (vertical)
    let dragging = false;
    let dragStartY = 0;
    let dragStartVal = 0;

    svg.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        dragging = true;
        dragStartY = e.clientY;
        dragStartVal = value;
        svg.setPointerCapture(e.pointerId);
    });

    svg.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const dy = dragStartY - e.clientY;
        const range = opts.max - opts.min;
        const sensitivity = range / 150;
        setValue(dragStartVal + dy * sensitivity);
    });

    svg.addEventListener("pointerup", () => { dragging = false; });
    svg.addEventListener("pointercancel", () => { dragging = false; });

    // Scroll wheel
    svg.addEventListener("wheel", (e) => {
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        setValue(value + dir * opts.step);
    }, { passive: false });

    // Double-click reset
    svg.addEventListener("dblclick", () => {
        setValue(opts.defaultValue);
    });

    render();

    return {
        getValue: () => value,
        setValue: (v) => setValue(v, true),
        element: wrap
    };
}

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

/* =========================================
   NEURAL
   ========================================= */

let varNet = null;
let optimizer = null;
let logVarT = null;
// let lastBatch = null; // Removed to avoid conflict with main.js

function initLearning(tf) {
    if (!tf) throw new Error("TensorFlow.js not provided");
    varNet = tf.sequential();
    varNet.add(tf.layers.dense({ inputShape: [6], units: 16, activation: "tanh" }));
    varNet.add(tf.layers.dense({ units: 16, activation: "tanh" }));
    varNet.add(tf.layers.dense({ units: 6, activation: "linear" }));
    logVarT = tf.variable(tf.scalar(-2.0));
    optimizer = tf.train.adam(0.02);
}

function predictLogVars(features2D, tf) {
    return tf.tidy(() => {
        const X = tf.tensor2d(features2D, [features2D.length, 6], "float32");
        const Y = varNet.predict(X);
        return Y.arraySync();
    });
}

function mlp(phi) {
    const x = phi;
    const W1 = [
        [0.9, 0.1, 0.2, -0.4, 0.3, 0.2],
        [-0.6, 0.4, 0.2, 0.2, -0.2, 0.1],
        [0.2, 0.8, -0.3, 0.0, 0.1, 0.3],
        [0.0, 0.2, 0.8, -0.2, 0.2, -0.2],
        [0.4, 0.1, 0.1, 0.6, 0.2, 0.0],
        [-0.2, 0.1, 0.0, 0.2, 0.6, 0.6],
        [0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        [-0.7, 0.2, 0.0, 0.1, 0.2, 0.5],
    ];
    const b1 = [0.0, 0.1, -0.1, 0.0, 0.0, 0.05, 0.0, 0.0];

    const h = W1.map((row, i) => {
        let s = b1[i];
        for (let j = 0; j < row.length; j++) s += row[j] * x[j];
        return Math.tanh(s);
    });

    const W2 = [
        [-1.3, 0.1, 0.0, 0.1, 0.0, 0.4, 0.1, 0.2],
        [0.1, -1.1, 0.2, 0.1, 0.4, 0.0, 0.1, 0.1],
        [0.2, 0.1, 0.6, 0.2, 0.0, 0.2, 0.1, 0.0],
        [0.1, 0.3, 0.2, 0.1, 0.2, 0.9, 0.1, -0.1],
    ];
    const b2 = [-2.2, -2.4, -2.2, -2.2];

    return W2.map((row, i) => {
        let s = b2[i];
        for (let j = 0; j < row.length; j++) s += row[j] * h[j];
        return s;
    });
}

async function trainOnSelection(batch, tf, steps = 140, margin = 0.5, onStatus) {
    if (!batch || batch.chosenIndex == null) {
        if (onStatus) onStatus("Nothing selected to train on.");
        return;
    }
    if (!varNet || !optimizer) {
        if (onStatus) onStatus("Model not initialized.");
        return;
    }

    const c = batch.chosenIndex;
    const { motiveY, features, variants } = batch;
    const n = motiveY.length;
    const lambdaEdit = 0.35;

    const X = tf.tensor2d(features, [n, 6], "float32");
    const Y = tf.tensor2d(motiveY, [n, 4], "float32");

    const deltas = variants.map(v =>
        tf.tensor2d(v.sampled, [n, 4], "float32").sub(Y)
    );

    const splitDecs = variants.map(v => tf.tensor2d((v.splitDec || new Array(n).fill(0)).map(z => [z]), [n, 1], "float32"));
    const mergeDecs = variants.map(v => tf.tensor2d((v.mergeDec || new Array(n).fill(0)).map(z => [z]), [n, 1], "float32"));

    function nllContinuous(delta, logVars) {
        const var_ = tf.exp(logVars).add(1e-6);
        const term = delta.square().div(var_).add(logVars);
        return term.sum();
    }

    function bceFromLogits(dec01, logits) {
        const zeros = tf.zerosLike(logits);
        const relu = tf.maximum(logits, zeros);
        const negAbs = tf.neg(tf.abs(logits));
        return relu.sub(logits.mul(dec01)).add(tf.log1p(tf.exp(negAbs))).sum();
    }

    function nllTranspose(transpose) {
        if (!logVarT) return tf.scalar(0);
        const varT = tf.exp(logVarT).add(1e-6);
        const t = tf.scalar(transpose || 0, "float32");
        return t.square().div(varT).add(logVarT);
    }

    if (onStatus) onStatus(`Training… 0/${steps}`);

    for (let s = 0; s < steps; s++) {
        optimizer.minimize(() => tf.tidy(() => {
            const out = varNet.apply(X);
            const logVars = out.slice([0, 0], [n, 4]);
            const splitL = out.slice([0, 4], [n, 1]);
            const mergeL = out.slice([0, 5], [n, 1]);

            const nllChosen = nllContinuous(deltas[c], logVars)
                .add(nllTranspose(variants[c].transpose ?? 0))
                .add(bceFromLogits(splitDecs[c], splitL).add(bceFromLogits(mergeDecs[c], mergeL)).mul(lambdaEdit));

            let loss = tf.scalar(0);
            for (let j = 0; j < deltas.length; j++) {
                if (j === c) continue;
                const nllJ = nllContinuous(deltas[j], logVars)
                    .add(nllTranspose(variants[j].transpose ?? 0))
                    .add(bceFromLogits(splitDecs[j], splitL).add(bceFromLogits(mergeDecs[j], mergeL)).mul(lambdaEdit));
                loss = loss.add(tf.softplus(nllChosen.sub(nllJ).add(margin)));
            }

            loss = loss.add(tf.mean(tf.square(logVars)).mul(1e-4));
            loss = loss.add(tf.square(logVarT).mul(1e-5));
            return loss;
        }), true);

        if ((s + 1) % 20 === 0) {
            if (onStatus) onStatus(`Training… ${s + 1}/${steps}`);
            await tf.nextFrame();
        }
    }

    X.dispose(); Y.dispose();
    deltas.forEach(t => t.dispose());
    splitDecs.forEach(t => t.dispose());
    mergeDecs.forEach(t => t.dispose());

    if (onStatus) onStatus("Trained ✓");
}

/* Getters for model state injection in main */
function getVarNet() { return varNet; }
function getLogVarT() { return logVarT; }
function setVarNet(n) { varNet = n; }
function setLogVarT(l) { logVarT = l; }
function setOptimizer(o) { optimizer = o; }


/* =========================================
   AUDIO
   ========================================= */

let audioCtx = null;
let activeSynth = null;
let activeOscillators = [];

function _getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

async function ensureAbcjsReady() {
    for (let i = 0; i < 50; i++) {
        if (window.ABCJS && typeof window.ABCJS.renderAbc === "function") return;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.warn("ABCJS not detected after waiting. Ensure script tags are in index.html");
}

// Piano voice — multi-oscillator with percussive envelope
function createPianoVoice(ctx, freq, velocity, duration, startTime, outputNode) {
    const vel01 = velocity / 127;
    const amp = vel01 * 0.18;

    // Brightness increases with velocity (more harmonics audible)
    const brightness = 0.3 + vel01 * 0.7;

    // Higher notes decay faster
    const pitchFactor = Math.max(0.3, 1.0 - (freq - 261) / 2000);
    const decayTime = Math.min(duration, Math.max(0.15, 0.6 * pitchFactor * duration));
    const sustainLevel = 0.35;

    // Attack time: very short for percussive feel
    const attackTime = 0.005;
    const releaseTime = Math.min(0.08, duration * 0.15);

    // Partials: fundamental + harmonics with decreasing amplitude
    const partials = [
        { type: "sine",     detune: 0,     gain: 1.0 },                         // fundamental
        { type: "sine",     detune: 1200,  gain: 0.45 * brightness },           // octave
        { type: "sine",     detune: 1902,  gain: 0.20 * brightness },           // 5th above octave (3rd harmonic)
        { type: "sine",     detune: 2400,  gain: 0.12 * brightness * brightness }, // 2 octaves
        { type: "triangle", detune: 0,     gain: 0.25 },                         // body warmth
    ];

    // Slight inharmonicity (string stiffness) — higher partials are slightly sharp
    const inharmonicity = 0.0004 * (freq / 261);

    const oscs = [];

    for (const p of partials) {
        const osc = ctx.createOscillator();
        osc.type = p.type;

        // Apply inharmonicity: higher partials get progressively sharper
        const harmonicNum = Math.pow(2, p.detune / 1200);
        const inharmonShift = inharmonicity * harmonicNum * harmonicNum * 100; // cents
        osc.frequency.setValueAtTime(freq, startTime);
        osc.detune.setValueAtTime(p.detune + inharmonShift, startTime);

        const partialGain = ctx.createGain();
        const peakGain = amp * p.gain;

        // Percussive envelope per partial: attack → decay → sustain → release
        partialGain.gain.setValueAtTime(0, startTime);
        partialGain.gain.linearRampToValueAtTime(peakGain, startTime + attackTime);
        partialGain.gain.exponentialRampToValueAtTime(
            Math.max(0.0001, peakGain * sustainLevel),
            startTime + attackTime + decayTime
        );

        // Hold sustain, then release
        const releaseStart = startTime + duration - releaseTime;
        if (releaseStart > startTime + attackTime + decayTime) {
            partialGain.gain.setValueAtTime(peakGain * sustainLevel, releaseStart);
        }
        partialGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(partialGain);
        partialGain.connect(outputNode);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.02);

        oscs.push(osc);
    }

    // Hammer noise — short burst of filtered noise for attack transient
    const noiseLen = 0.025;
    const noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * noiseLen), ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(Math.min(freq * 4, 8000), startTime);
    noiseFilter.Q.setValueAtTime(1.5, startTime);

    const noiseGain = ctx.createGain();
    const noiseAmp = amp * 0.6 * brightness;
    noiseGain.gain.setValueAtTime(noiseAmp, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + noiseLen);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(outputNode);
    noiseSrc.start(startTime);
    noiseSrc.stop(startTime + noiseLen + 0.01);

    return oscs;
}

// Web Audio API synthesizer — piano-like voice, works fully offline / GitHub Pages
async function playAbcWebAudio(abcText) {
    const ctx = _getAudioCtx();
    if (ctx.state === "suspended") await ctx.resume();

    stopPlayback();

    const { events, meta } = parseAbcToEvents(abcText);

    // Extract BPM from parsed ABC metadata
    let bpm = 120;
    if (meta && meta.tempo) {
        if (typeof meta.tempo === "number") bpm = meta.tempo;
        else if (typeof meta.tempo === "object" && meta.tempo.bpm) bpm = meta.tempo.bpm;
    }

    const secPerWhole = 4 * 60 / bpm;

    // Master output with light compression to avoid clipping
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12, ctx.currentTime);
    compressor.knee.setValueAtTime(6, ctx.currentTime);
    compressor.ratio.setValueAtTime(4, ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    compressor.release.setValueAtTime(0.15, ctx.currentTime);
    compressor.connect(ctx.destination);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.8, ctx.currentTime);
    masterGain.connect(compressor);

    let t = ctx.currentTime + 0.05;

    for (const ev of events) {
        const dur = ev.durWhole * secPerWhole;
        const gate = ev.gate ?? 0.85;
        const vel = ev.vel ?? 80;
        const soundDur = dur * gate;

        if (ev.pitch !== null && ev.pitch !== undefined) {
            const freq = 440 * Math.pow(2, (ev.pitch - 69) / 12);
            const oscs = createPianoVoice(ctx, freq, vel, soundDur, t, masterGain);
            for (const osc of oscs) activeOscillators.push(osc);
        }

        t += dur;
    }

    const totalDur = t - ctx.currentTime;
    return new Promise(resolve => setTimeout(resolve, totalDur * 1000));
}

// ABCJS synth — higher quality but requires a soundfont via HTTP (may fail on static hosting)
async function _playAbcjsSynth(abcText) {
    if (!window.ABCJS) throw new Error("ABCJS is not loaded.");
    if (!ABCJS.synth || !ABCJS.synth.CreateSynth) throw new Error("ABCJS synth plugin is not loaded.");

    const ctx = _getAudioCtx();

    let playbackDiv = document.getElementById("_abcPlaybackDiv");
    if (!playbackDiv) {
        playbackDiv = document.createElement("div");
        playbackDiv.id = "_abcPlaybackDiv";
        playbackDiv.style.position = "absolute";
        playbackDiv.style.left = "-10000px";
        document.body.appendChild(playbackDiv);
    }

    playbackDiv.innerHTML = "";
    const visualObjs = ABCJS.renderAbc(playbackDiv, abcText, { add_classes: true });
    const visualObj = visualObjs && visualObjs[0];
    if (!visualObj) throw new Error("Could not render ABC for playback.");

    if (activeSynth) {
        try { activeSynth.stop(); } catch (_) { }
        activeSynth = null;
    }

    const synth = new ABCJS.synth.CreateSynth();
    await synth.init({ audioContext: ctx, visualObj });
    await synth.prime();
    activeSynth = synth;

    if (ctx.state === "suspended") await ctx.resume();
    synth.start();
    return synth;
}

async function playAbc(abcText) {
    // Try ABCJS synth first (richer sound); fall back to Web Audio if unavailable or fails
    if (window.ABCJS && ABCJS.synth && ABCJS.synth.CreateSynth) {
        try {
            return await _playAbcjsSynth(abcText);
        } catch (e) {
            console.warn("ABCJS synth unavailable, using Web Audio fallback:", e.message);
        }
    }
    return await playAbcWebAudio(abcText);
}

function stopPlayback() {
    if (activeSynth) {
        try { activeSynth.stop(); } catch (_) { }
        activeSynth = null;
    }
    for (const osc of activeOscillators) {
        try { osc.stop(); } catch (_) { }
    }
    activeOscillators = [];
}


/* =========================================
   STORAGE
   ========================================= */

const WISH_KEY = "nk_wishlist_v1";

function loadWishlist() {
    try { return JSON.parse(localStorage.getItem(WISH_KEY) || "[]"); }
    catch (_) { return []; }
}

function saveWishlist(list) {
    localStorage.setItem(WISH_KEY, JSON.stringify(list));
}

function addToWishlist(abcText, label = "") {
    const list = loadWishlist();
    list.unshift({
        id: crypto.randomUUID(),
        label,
        abc: abcText,
        createdAt: new Date().toISOString()
    });
    saveWishlist(list);
}

function removeFromWishlist(id) {
    const list = loadWishlist().filter(x => x.id !== id);
    saveWishlist(list);
}

function downloadText(filename, text, mime = "application/json") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 250);
}

async function saveModelDownload(tf) {
    const varNet = getVarNet();
    const logVarT = getLogVarT();
    if (!varNet) throw new Error("Model not initialized.");
    await varNet.save("downloads://variance-controller");
    const t = logVarT ? logVarT.dataSync()[0] : -2.0;
    downloadText("transpose_logvar.json", JSON.stringify({ logVarT: t }, null, 2));
}

async function saveModelLocal(tf) {
    const varNet = getVarNet();
    const logVarT = getLogVarT();
    if (!varNet) throw new Error("Model not initialized.");
    await varNet.save("localstorage://variance-controller");
    if (logVarT) localStorage.setItem("nk_logVarT", String(logVarT.dataSync()[0]));
}

async function loadModelLocal(tf) {
    const model = await tf.loadLayersModel("localstorage://variance-controller");
    setVarNet(model);
    setOptimizer(tf.train.adam(0.02));
    const t = parseFloat(localStorage.getItem("nk_logVarT") || "-2.0");
    const logVarT = getLogVarT();
    if (logVarT) logVarT.assign(tf.scalar(t));
}

async function loadModelFromFiles(tf, fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) throw new Error("No files selected.");
    const model = await tf.loadLayersModel(tf.io.browserFiles(files));
    setVarNet(model);
    setOptimizer(tf.train.adam(0.02));
}


/* =========================================
   ABC TOOLS
   ========================================= */

/* Extract monophonic events from ABC using abcjs parse. */
function parseAbcToEvents(abc) {
    if (!window.ABCJS) throw new Error("ABCJS not loaded");
    const tunes = ABCJS.parseOnly(abc, { print: false });
    if (!tunes || !tunes.length) throw new Error("ABCJS could not parse the input.");

    const tune = tunes[0];
    const meta = tune.metaText || {};
    const key = meta.key || (meta.K || "C");

    const lines = tune.lines || [];
    let voice = null;
    for (const ln of lines) {
        if (!ln.staff) continue;
        for (const st of ln.staff) {
            if (!st.voices || !st.voices.length) continue;
            voice = st.voices[0];
            break;
        }
        if (voice) break;
    }
    if (!voice) throw new Error("No voice content found. Try a simpler monophonic ABC line.");

    const events = [];
    const structure = [];

    for (const el of voice) {
        if (!el) continue;
        if (el.el_type === "bar") {
            structure.push({ type: "bar", sym: el.type || "|" });
            continue;
        }
        if (el.el_type === "note") {
            const dur = (typeof el.duration === "number" ? el.duration : 0.125);
            if (el.rest) {
                const decos = el.decoration || [];
                const dynTok = extractDynFromDecorations(decos);
                const vel = dynTok ? dynToVel(dynTok) : 80;
                const gate = artToGate(decos);
                events.push({ pitch: null, durWhole: dur, gate, vel, decos, isSlurStart: !!el.startSlur, isSlurEnd: !!el.endSlur });
                structure.push({ type: "event" });
                continue;
            }

            let midi = null;
            if (Array.isArray(el.midiPitches) && el.midiPitches.length && typeof el.midiPitches[0].pitch === "number") {
                midi = el.midiPitches[0].pitch;
            } else if (Array.isArray(el.pitches) && el.pitches.length) {
                const p0 = el.pitches[0];
                const diatonic = (typeof p0.pitch === "number") ? p0.pitch : 0;
                const acc = accidentalToSemitone(p0.accidental);
                midi = staffPitchToMidi(diatonic, acc);
            } else {
                continue;
            }

            const decos = el.decoration || [];
            const dynTok = extractDynFromDecorations(decos);
            const vel = dynTok ? dynToVel(dynTok) : 80;
            const gate = artToGate(decos);

            events.push({ pitch: midi, durWhole: dur, gate, vel, decos, isSlurStart: !!el.startSlur, isSlurEnd: !!el.endSlur });
            structure.push({ type: "event" });
        }
    }
    return { events, structure, key, meta };
}

function extractDynFromDecorations(decos) {
    if (!Array.isArray(decos)) return null;
    for (const d of decos) {
        if (typeof d !== "string") continue;
        const s = d.trim();
        if (/^!?(pp|p|mp|mf|f|ff)!?$/i.test(s)) {
            const core = s.replace(/!/g, "").toLowerCase();
            return "!" + core + "!";
        }
    }
    return null;
}

function applyEdits(baseEvents, splitLogits, mergeLogits, opts) {
    const n = baseEvents.length;
    const mode = opts.varLen ?? "off";
    const pSplitBase = clamp((opts.pSplitPct ?? 20) / 100, 0, 0.9);
    const pMergeBase = clamp((opts.pMergePct ?? 10) / 100, 0, 0.9);
    const style = opts.ornStyle ?? "passing";
    const tempEdit = clamp(opts.tempEdit ?? 1.0, 0.2, 4.0);

    const splitDec = new Array(n).fill(0);
    const mergeDec = new Array(n).fill(0);

    if (mode !== "on") {
        return { events: baseEvents.slice(), splitDec, mergeDec };
    }

    const out = [];
    let k = 0;

    while (k < n) {
        const cur = baseEvents[k];
        const nxt = (k + 1 < n) ? baseEvents[k + 1] : null;
        const curIsRest = (cur.pitch == null);
        const nxtIsRest = (!nxt || nxt.pitch == null);

        const pSplit = (!curIsRest && nxt && !nxtIsRest) ? clamp(sig((splitLogits[k] ?? -2) / tempEdit) * pSplitBase, 0, 0.9) : 0;
        const pMerge = (!curIsRest && nxt && !nxtIsRest) ? clamp(sig((mergeLogits[k] ?? -2) / tempEdit) * pMergeBase, 0, 0.9) : 0;

        if (nxt && pMerge > 0 && Math.random() < pMerge) {
            mergeDec[k] = 1;
            out.push({
                pitch: cur.pitch,
                durWhole: cur.durWhole + nxt.durWhole,
                gate: clamp((cur.gate + nxt.gate) / 2, 0.15, 1.0),
                vel: clamp(Math.max(cur.vel, nxt.vel), 20, 120),
            });
            k += 2;
            continue;
        }

        if (nxt && pSplit > 0 && Math.random() < pSplit) {
            splitDec[k] = 1;

            const r = beta22();
            const d1 = Math.max(1e-6, cur.durWhole * r);
            const d2 = Math.max(1e-6, cur.durWhole * (1 - r));
            let midPitch = cur.pitch;

            if (style === "repeat") {
                midPitch = cur.pitch;
            } else {
                const dir = Math.sign(nxt.pitch - cur.pitch) || (Math.random() < 0.5 ? 1 : -1);
                if (style === "neighbor") {
                    midPitch = cur.pitch + dir * 1;
                } else {
                    const dist = Math.abs(nxt.pitch - cur.pitch);
                    midPitch = cur.pitch + dir * (dist >= 2 ? 1 : 1);
                }
            }

            const vMid = clamp((cur.vel + nxt.vel) / 2, 20, 120);

            out.push({ pitch: cur.pitch, durWhole: d1, gate: cur.gate, vel: cur.vel });
            out.push({ pitch: midPitch, durWhole: d2, gate: cur.gate, vel: vMid });
            k += 1;
            continue;
        }

        out.push(cur);
        k += 1;
    }
    return { events: out, splitDec, mergeDec };
}

function buildVariantAbc(parsed, sampled, splitLogits, mergeLogits, variantIndex, opts) {
    const key = parsed.key || (parsed.meta && parsed.meta.key) || "C";
    const pQuant = opts.pitchQuant ?? "key";
    const rQuant = opts.rhythmQuant ?? "palette";
    const palette = parseInt(opts.rhythmPalette ?? "16", 10);
    const transpose = (typeof opts.transpose === "number") ? opts.transpose : 0;
    const unitWhole = 1 / palette;
    const pcs = keyToScalePCs(key);

    const header = [
        `X:${variantIndex}`,
        `T:${(parsed.meta && (parsed.meta.title || parsed.meta.T)) ? (parsed.meta.title || parsed.meta.T) : "Motive"} — Variation ${opts.varNum ?? (variantIndex - 1)}`,
        `L:1/${palette}`,
        `K:${key}`
    ];

    const srcEvents = parsed.events;
    const n = srcEvents.length;

    let anchorPitch = null;
    for (let i = 0; i < n; i++) {
        if (srcEvents[i].pitch != null) { anchorPitch = srcEvents[i].pitch + transpose; break; }
    }
    if (anchorPitch == null) anchorPitch = 60 + transpose;

    let currAbs = anchorPitch;
    const base = [];

    for (let k = 0; k < n; k++) {
        const src = srcEvents[k];
        const xs = sampled[k];

        const srcLog = Math.log(Math.max(1e-6, src.durWhole));
        let deltaLog = xs[1] - srcLog;
        const rClamp = clamp(0.5 * (opts.tempRhythm ?? 1.0), 0.15, 2.5);
        deltaLog = clamp(deltaLog, -rClamp, rClamp);
        let durWhole = src.durWhole * Math.exp(deltaLog);

        if (rQuant === "palette") {
            const g = unitWhole;
            durWhole = Math.max(g, Math.round(durWhole / g) * g);
        } else {
            durWhole = Math.max(unitWhole, durWhole);
        }

        let pitch = null;
        if (src.pitch == null) {
            pitch = null;
        } else {
            if (srcEvents[Math.max(0, k - 1)].pitch == null) {
                // If previous was rest, we rely on relative integration BUT here we just re-anchor slightly?
                // Original logic: "if (k===0) ... else if (srcEvents[k-1]...) currAbs=src..."
                if (k > 0) currAbs = src.pitch + transpose;
            } else {
                currAbs = currAbs + xs[0];
            }
            if (k === 0) currAbs = src.pitch + transpose; // Fix for k=0 case

            let midi = currAbs;
            if (pQuant === "key") midi = quantizePitchToScale(midi, pcs);
            pitch = Math.round(midi);
        }

        base.push({
            pitch,
            durWhole,
            gate: clamp(xs[2], 0.15, 1.0),
            vel: clamp(xs[3], 20, 120),
        });
    }

    const edited = applyEdits(base, splitLogits || new Array(n).fill(-2), mergeLogits || new Array(n).fill(-2), {
        varLen: opts.varLen,
        pSplitPct: opts.pSplitPct,
        pMergePct: opts.pMergePct,
        ornStyle: opts.ornStyle,
        tempEdit: opts.tempEdit
    });
    const ev = edited.events;
    const m = ev.length;

    const vel = ev.map(e => e.vel);
    const gate = ev.map(e => e.gate);

    if (opts.dynRange === "on") {
        const mVel = vel.reduce((a, b) => a + b, 0) / Math.max(1, vel.length);
        const stretch = clamp(opts.dynStretch ?? 1.8, 1.0, 4.0);
        for (let i = 0; i < vel.length; i++) {
            vel[i] = clamp(mVel + (vel[i] - mVel) * stretch, 16, 127);
        }
    }

    const dp = new Array(m).fill(0);
    for (let k = 1; k < m; k++) {
        if (ev[k].pitch != null && ev[k - 1].pitch != null) dp[k] = ev[k].pitch - ev[k - 1].pitch;
        else dp[k] = 0;
    }

    const hairpinStart = new Array(m).fill(null);
    const hairpinEndAt = new Array(m).fill(null);
    const alpha = 0.30;
    let ema = 0;
    const d = new Array(m).fill(0);
    for (let k = 1; k < m; k++) {
        const dv = vel[k] - vel[k - 1];
        ema = alpha * dv + (1 - alpha) * ema;
        d[k] = ema;
    }

    const eps = 1.2;
    const minLen = 3;
    let k0 = 1;
    while (k0 < m) {
        while (k0 < m && Math.abs(d[k0]) <= eps) k0++;
        if (k0 >= m) break;
        const sign = (d[k0] > 0) ? 1 : -1;
        let k1 = k0;
        while (k1 < m && sign * d[k1] > eps) k1++;
        const len = k1 - k0;
        if (len >= minLen) {
            const kind = (sign > 0) ? "<" : ">";
            hairpinStart[k0] = kind;
            hairpinEndAt[k1] = kind;
        }
        k0 = k1 + 1;
    }

    const slurOpenAt = new Array(m).fill(false);
    const slurCloseAt = new Array(m).fill(false);
    let inSlur = false;
    let slurStart = -1;
    const openThr = 0.78;
    const closeThr = 0.58;
    const minSlur = 3;

    for (let k = 0; k < m; k++) {
        if (ev[k].pitch == null) {
            if (inSlur) { slurCloseAt[k] = true; inSlur = false; slurStart = -1; }
            continue;
        }
        // Simple legato score
        const smooth = 1 - clamp(Math.abs(dp[k]) / 12, 0, 1);
        const Ls = 0.65 * gate[k] + 0.35 * smooth;

        if (!inSlur && Ls >= openThr) {
            slurOpenAt[k] = true;
            inSlur = true;
            slurStart = k;
        } else if (inSlur && (Ls <= closeThr)) {
            if (k - slurStart >= minSlur) {
                slurCloseAt[k] = true;
                inSlur = false;
                slurStart = -1;
            }
        }
    }
    if (inSlur) slurCloseAt[m - 1] = true;

    const dynTokenAt = new Array(m).fill(null);
    let lastDynTok = null;
    let lastDynPos = -999;
    for (let k = 0; k < m; k++) {
        if (ev[k].pitch == null) continue;
        const tok = velToDyn(vel[k], (opts.dynRange === 'on'));
        const isStart = (k === 0);
        const afterHairpin = (hairpinEndAt[k] != null);
        const farEnough = (k - lastDynPos >= 4);
        if (isStart || (afterHairpin && farEnough) || (tok !== lastDynTok && farEnough && Math.abs(vel[k] - vel[Math.max(0, k - 1)]) > 6)) {
            dynTokenAt[k] = tok;
            lastDynTok = tok;
            lastDynPos = k;
        }
    }

    const accentAt = new Array(m).fill(false);
    const meanVel = vel.reduce((a, b) => a + b, 0) / Math.max(1, m);
    for (let k = 0; k < m; k++) {
        if (ev[k].pitch == null) continue;
        const leap = Math.abs(dp[k]);
        const prominence = (vel[k] - meanVel);
        const s1 = sig((leap - 4.0) / 1.6);
        const s2 = sig((prominence - 4.0) / 6.0);
        const score = 0.65 * s1 + 0.35 * s2;
        const prob = clamp(0.30 * score, 0, 0.30);
        accentAt[k] = (Math.random() < prob);
    }

    const body = [];
    let pendingHairpinEnd = null;
    for (let k = 0; k < m; k++) {
        // Emit deferred hairpin-end AFTER the previous note to avoid crossing beam groups
        if (pendingHairpinEnd) { body.push(pendingHairpinEnd); pendingHairpinEnd = null; }

        if (slurOpenAt[k]) body.push("(");
        if (dynTokenAt[k]) body.push(dynTokenAt[k]);
        if (hairpinStart[k] === "<") body.push("!<(!");
        if (hairpinStart[k] === ">") body.push("!>(!");

        const durTok = durToAbcToken(ev[k].durWhole, unitWhole);
        let pitchTok = "z";
        if (ev[k].pitch != null) pitchTok = midiToAbcPitch(ev[k].pitch);
        const art = gateToArt(ev[k].gate);
        const acc = accentAt[k] ? "L" : "";

        body.push(`${acc}${art}${pitchTok}${durTok}`);
        if (slurCloseAt[k]) body.push(")");

        // Schedule hairpin-end for emission after this note (at start of next iteration)
        if (hairpinEndAt[k] === "<") pendingHairpinEnd = "!<)!";
        else if (hairpinEndAt[k] === ">") pendingHairpinEnd = "!>)!";
    }
    // Flush any remaining deferred hairpin-end
    if (pendingHairpinEnd) body.push(pendingHairpinEnd);

    // Close any hairpin that was opened on the last event and never closed
    if (hairpinStart[m - 1] && !hairpinEndAt[m - 1]) {
        if (hairpinStart[m - 1] === "<") body.push("!<)!");
        if (hairpinStart[m - 1] === ">") body.push("!>)!");
    }

    const abcText = header.join("\n") + "\n" + body.join(" ") + "\n";
    return { abc: abcText, splitDec: edited.splitDec, mergeDec: edited.mergeDec };
}


/* =========================================
   KALMAN
   ========================================= */

function buildFeatures(ev, k) {
    const N = ev.length;
    const cur = ev[k];
    const prev = k > 0 ? ev[k - 1] : cur;

    const interval = (prev.pitch != null && cur.pitch != null) ? (cur.pitch - prev.pitch) : 0;
    const absIntN = clamp(Math.abs(interval) / 12.0, 0, 2);
    const idx = N > 1 ? k / (N - 1) : 0;
    const contour = interval > 0 ? 1 : (interval < 0 ? -1 : 0);

    const durRatio = (k > 0) ? (cur.durWhole / Math.max(1e-6, prev.durWhole)) : 1.0;
    const durRatioC = clamp(durRatio, 0.25, 4.0) / 4.0;
    const dens = clamp(1.0 / Math.max(1e-6, cur.durWhole), 0, 16) / 16.0;
    const cad = idx;

    return [absIntN, idx, contour, durRatioC, dens, cad];
}

function kalmanSampleVariants(parsed, opts, tf) {
    const events = parsed.events;
    const n = events.length;
    if (!n) throw new Error("No events found.");

    const adventure = opts.adventure ?? 1.0;
    const tPitch = opts.tempPitch ?? 1.0;
    const tRhythm = opts.tempRhythm ?? 1.0;
    const tArt = opts.tempArt ?? 1.0;
    const tDyn = opts.tempDyn ?? 1.0;
    const keepExpr = opts.keepExpr ?? "follow";

    const y = [];
    const pitchValid = [];
    for (let k = 0; k < n; k++) {
        const cur = events[k];
        const prev = (k > 0) ? events[k - 1] : null;
        let dp = 0;
        let valid = false;

        if (k > 0 && cur.pitch != null && prev && prev.pitch != null) {
            dp = cur.pitch - prev.pitch;
            valid = true;
        }

        y.push([
            dp,
            Math.log(Math.max(1e-6, cur.durWhole)),
            clamp(cur.gate ?? 0.85, 0.15, 1.0),
            clamp(cur.vel ?? 80, 20, 120)
        ]);
        pitchValid.push(valid);
    }

    const Rbase = [2.0, 0.10, 0.06, 22.0];
    const exprScale = (keepExpr === "lock") ? 0.1 : 1.0;
    const dim = 4;
    let x = y[0].slice();
    let P = [6, 0.25, 0.20, 120];

    const sampled = [];
    const feats = [];
    for (let k = 0; k < n; k++) feats.push(buildFeatures(events, k));

    const varNet = getVarNet();
    const outAll = (varNet && tf) ? predictLogVars(feats, tf) : feats.map(f => [...mlp(f), -2.0, -2.0]);

    const logVarsAll = outAll.map(r => r.slice(0, 4));
    const splitLogits = outAll.map(r => r[4]);
    const mergeLogits = outAll.map(r => r[5]);

    for (let k = 0; k < n; k++) {
        const logVars = logVarsAll[k];
        const advScale = adventure <= 1.0 ? adventure : adventure * adventure * 0.5;
        const Q = logVars.map((lv, i) => advScale * softplus(lv));
        Q[0] *= tPitch;
        Q[1] *= tRhythm;
        Q[2] *= tArt;
        Q[3] *= tDyn;
        Q[2] *= exprScale;
        Q[3] *= exprScale;

        for (let i = 0; i < dim; i++) P[i] += Q[i];

        const R = Rbase.slice();
        if (!pitchValid[k]) R[0] = 1e9;

        const K = P.map((Pi, i) => Pi / (Pi + R[i]));
        for (let i = 0; i < dim; i++) {
            x[i] = x[i] + K[i] * (y[k][i] - x[i]);
            P[i] = Math.max((1 - K[i]) * P[i], Q[i] * 0.5);
        }

        const xs = x.map((mu, i) => mu + Math.sqrt(Math.max(1e-9, P[i])) * randn());
        const pitchClamp = Math.min(18 + Math.floor(adventure * 2), 36);
        xs[0] = clamp(xs[0], -pitchClamp, pitchClamp);
        xs[2] = clamp(xs[2], 0.15, 1.0);
        xs[3] = clamp(xs[3], 20, 120);

        sampled.push(xs);
        x = xs.slice();
    }

    return { sampled, splitLogits, mergeLogits };
}


/* =========================================
   MUSICXML EXPORT
   ========================================= */

function abcToMusicXML(abcText, title) {
    const { events, key } = parseAbcToEvents(abcText);
    const divisions = 16; // divisions per quarter note (supports down to 64th notes)

    // Key signature: map key string to fifths
    const keyFifths = {
        "Cb": -7, "Gb": -6, "Db": -5, "Ab": -4, "Eb": -3, "Bb": -2, "F": -1,
        "C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F#": 6, "C#": 7,
        "Am": -3, "Em": -2, "Bm": -1, "F#m": 0, "C#m": 1, "G#m": 2, "D#m": 3,
        "Dm": -1, "Gm": -2, "Cm": -3, "Fm": -4, "Bbm": -5, "Ebm": -6, "Abm": -7
    };
    const keyStr = (key || "C").trim();
    const isMinor = /m(in)?$/i.test(keyStr) && !/maj/i.test(keyStr);
    const fifths = keyFifths[keyStr] ?? 0;
    const mode = isMinor ? "minor" : "major";

    function midiToPitch(midi) {
        const noteNames = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
        const alters =    [ 0,   1,   0,   1,   0,   0,   1,   0,   1,   0,   1,   0];
        const pc = ((midi % 12) + 12) % 12;
        const octave = Math.floor(midi / 12) - 1;
        return { step: noteNames[pc], alter: alters[pc], octave };
    }

    function durToMXLDivisions(durWhole) {
        // durWhole is fraction of whole note; quarter = 0.25
        return Math.max(1, Math.round(durWhole * 4 * divisions));
    }

    function durToNoteType(durWhole) {
        // Map duration to MusicXML type + dots
        const types = [
            { dur: 1.0,    type: "whole",    dots: 0 },
            { dur: 0.75,   type: "half",     dots: 1 },
            { dur: 0.5,    type: "half",     dots: 0 },
            { dur: 0.375,  type: "quarter",  dots: 1 },
            { dur: 0.25,   type: "quarter",  dots: 0 },
            { dur: 0.1875, type: "eighth",   dots: 1 },
            { dur: 0.125,  type: "eighth",   dots: 0 },
            { dur: 0.09375,type: "16th",     dots: 1 },
            { dur: 0.0625, type: "16th",     dots: 0 },
            { dur: 0.03125,type: "32nd",     dots: 0 },
        ];
        let best = types[types.length - 1];
        let bestErr = Infinity;
        for (const t of types) {
            const err = Math.abs(durWhole - t.dur);
            if (err < bestErr) { bestErr = err; best = t; }
        }
        return best;
    }

    function velToDynamicMXL(vel) {
        if (vel < 38) return "pp";
        if (vel < 52) return "p";
        if (vel < 68) return "mp";
        if (vel < 84) return "mf";
        if (vel < 102) return "f";
        return "ff";
    }

    // Build measures (assume 4/4)
    const beatsPerMeasure = 4; // quarters
    const measureCapacity = beatsPerMeasure * divisions;

    const measures = [];
    let currentMeasure = [];
    let measureFill = 0;

    for (const ev of events) {
        let durDivs = durToMXLDivisions(ev.durWhole);

        // Split across bar lines if needed
        while (durDivs > 0) {
            const remaining = measureCapacity - measureFill;
            const take = Math.min(durDivs, remaining);

            currentMeasure.push({
                pitch: ev.pitch,
                durationDivs: take,
                durationWhole: take / (4 * divisions),
                vel: ev.vel,
                gate: ev.gate,
                decos: ev.decos,
                isRest: ev.pitch === null,
                isTieStart: durDivs > remaining,
                isTieStop: false, // set below
            });

            measureFill += take;
            durDivs -= take;

            if (measureFill >= measureCapacity) {
                measures.push(currentMeasure);
                currentMeasure = [];
                measureFill = 0;

                // If note continues, next piece is a tie continuation
                if (durDivs > 0 && ev.pitch !== null) {
                    // Mark that the next chunk will be a tie stop
                    currentMeasure._pendingTieStop = true;
                }
            }
        }
    }
    if (currentMeasure.length) measures.push(currentMeasure);

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n';
    xml += '<score-partwise version="4.0">\n';
    xml += '  <work><work-title>' + escapeXml(title || "Variation") + '</work-title></work>\n';
    xml += '  <part-list>\n';
    xml += '    <score-part id="P1"><part-name>Piano</part-name>\n';
    xml += '      <score-instrument id="P1-I1"><instrument-name>Piano</instrument-name></score-instrument>\n';
    xml += '    </score-part>\n';
    xml += '  </part-list>\n';
    xml += '  <part id="P1">\n';

    let lastDynamic = null;

    measures.forEach((mNotes, mi) => {
        xml += '    <measure number="' + (mi + 1) + '">\n';

        if (mi === 0) {
            xml += '      <attributes>\n';
            xml += '        <divisions>' + divisions + '</divisions>\n';
            xml += '        <key><fifths>' + fifths + '</fifths><mode>' + mode + '</mode></key>\n';
            xml += '        <time><beats>4</beats><beat-type>4</beat-type></time>\n';
            xml += '        <clef><sign>G</sign><line>2</line></clef>\n';
            xml += '      </attributes>\n';
        }

        for (const note of mNotes) {
            // Dynamic direction
            if (!note.isRest) {
                const dyn = velToDynamicMXL(note.vel);
                if (dyn !== lastDynamic) {
                    xml += '      <direction placement="below"><direction-type><dynamics><' + dyn + '/></dynamics></direction-type></direction>\n';
                    lastDynamic = dyn;
                }
            }

            xml += '      <note>\n';
            if (note.isRest) {
                xml += '        <rest/>\n';
            } else {
                const p = midiToPitch(note.pitch);
                xml += '        <pitch>\n';
                xml += '          <step>' + p.step + '</step>\n';
                if (p.alter) xml += '          <alter>' + p.alter + '</alter>\n';
                xml += '          <octave>' + p.octave + '</octave>\n';
                xml += '        </pitch>\n';
            }

            xml += '        <duration>' + note.durationDivs + '</duration>\n';

            const noteType = durToNoteType(note.durationWhole);
            xml += '        <type>' + noteType.type + '</type>\n';
            for (let d = 0; d < noteType.dots; d++) xml += '        <dot/>\n';

            // Ties
            if (note.isTieStart) xml += '        <tie type="start"/>\n';
            if (note.isTieStop) xml += '        <tie type="stop"/>\n';

            // Notations (articulations, ties)
            const hasStacc = note.decos && (note.decos.includes("staccato") || note.decos.includes("."));
            const hasTenuto = note.decos && (note.decos.includes("tenuto") || note.decos.includes("-"));
            const hasNotations = hasStacc || hasTenuto || note.isTieStart || note.isTieStop;

            if (hasNotations) {
                xml += '        <notations>\n';
                if (note.isTieStart) xml += '          <tied type="start"/>\n';
                if (note.isTieStop) xml += '          <tied type="stop"/>\n';
                if (hasStacc || hasTenuto) {
                    xml += '          <articulations>\n';
                    if (hasStacc) xml += '            <staccato/>\n';
                    if (hasTenuto) xml += '            <tenuto/>\n';
                    xml += '          </articulations>\n';
                }
                xml += '        </notations>\n';
            }

            xml += '      </note>\n';
        }

        xml += '    </measure>\n';
    });

    xml += '  </part>\n';
    xml += '</score-partwise>\n';
    return xml;
}

function escapeXml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function exportVariantMusicXML(abc, title) {
    const xml = abcToMusicXML(abc, title);
    const filename = (title || "variation").replace(/[^a-zA-Z0-9_-]/g, "_") + ".musicxml";
    downloadText(filename, xml, "application/vnd.recordare.musicxml+xml");
}

/* =========================================
   UI — VARIANT CAROUSEL
   ========================================= */

let carouselVariants = [];
let carouselIndex = 0;
let carouselSelectedIndex = null;
let carouselOnSelect = null;
let carouselOnAudioError = null;
let carouselQuantGrid = 16; // current quantization: 16=16th, 8=8th, 4=quarter

// Re-quantize ABC by snapping durations to a grid
function requantizeAbc(abcText, gridDiv) {
    // gridDiv: 16 = 1/16, 8 = 1/8, 4 = 1/4
    const gridUnit = 1 / gridDiv; // in whole notes: 1/16=0.0625, 1/8=0.125, 1/4=0.25

    // Split into header and body
    const lines = abcText.split("\n");
    const headerLines = [];
    let bodyStart = 0;
    for (let i = 0; i < lines.length; i++) {
        if (/^[A-Z]:./.test(lines[i])) {
            headerLines.push(lines[i]);
            bodyStart = i + 1;
        } else {
            break;
        }
    }
    const bodyStr = lines.slice(bodyStart).join(" ");

    // Match note tokens: optional accidentals/decorations, pitch letter, optional octave, optional duration
    // This regex captures: prefix (dynamics/articulation), note name, octave marks, duration
    const noteRegex = /((?:![^!]*!|\.)*)([=^_]*[A-Ga-gz])([\',]*)(\d*\/?\.?\d*)/g;

    const newBody = bodyStr.replace(noteRegex, (match, prefix, noteName, octave, durStr) => {
        if (noteName.endsWith("z")) {
            // Rest — also quantize
            let dur = parseDurationFraction(durStr);
            dur = snapToGrid(dur, gridUnit);
            return prefix + noteName + octave + durationToAbc(dur);
        }
        let dur = parseDurationFraction(durStr);
        dur = snapToGrid(dur, gridUnit);
        return prefix + noteName + octave + durationToAbc(dur);
    });

    return headerLines.join("\n") + "\n" + newBody;
}

function parseDurationFraction(durStr) {
    if (!durStr || durStr === "") return 1; // default unit length = 1/8 note = 0.125 whole... but in ABC token context, "1" means 1x the L: unit
    // Handle forms: "2", "/2", "3/2", "/", "3/"
    if (durStr === "/") return 0.5;
    if (durStr.includes("/")) {
        const parts = durStr.split("/");
        const num = parts[0] === "" ? 1 : parseInt(parts[0]);
        const den = parts[1] === "" ? 2 : parseInt(parts[1]);
        return num / den;
    }
    return parseInt(durStr) || 1;
}

function snapToGrid(durMultiplier, gridUnit) {
    // durMultiplier is in units of L: (default 1/8)
    // gridUnit is in whole notes, but we need to work in L: units
    // For L:1/8, grid of 1/16 = 0.5 L-units, 1/8 = 1 L-unit, 1/4 = 2 L-units
    // We'll snap to nearest 0.5 for 16th, 1 for 8th, 2 for quarter (assuming L:1/8)
    // Since we don't know L: precisely here, we snap the multiplier to the grid ratio
    // gridUnit relative to 1/8: 16th=0.5, 8th=1, quarter=2
    const gridInL = gridUnit / 0.125; // convert whole-note grid to L:1/8 units
    if (gridInL <= 0) return durMultiplier;
    const snapped = Math.max(gridInL, Math.round(durMultiplier / gridInL) * gridInL);
    return snapped;
}

function durationToAbc(dur) {
    if (dur === 1) return "";
    // Common fractions
    if (dur === 0.5) return "/2";
    if (dur === 0.25) return "/4";
    if (dur === 1.5) return "3/2";
    if (dur === 2.5) return "5/2";
    if (dur === 3.5) return "7/2";
    if (Number.isInteger(dur)) return String(dur);
    // General fraction
    // Find best simple fraction
    for (const den of [2, 4, 8, 16]) {
        const num = dur * den;
        if (Math.abs(num - Math.round(num)) < 0.001) {
            const n = Math.round(num);
            if (n === 1 && den === 1) return "";
            return n + "/" + den;
        }
    }
    return Math.round(dur).toString() || "";
}

function renderVariantCarousel(variants, onSelect, onAudioError) {
    carouselVariants = variants;
    carouselIndex = 0;
    carouselSelectedIndex = null;
    carouselOnSelect = onSelect;
    carouselOnAudioError = onAudioError;

    document.getElementById("emptyState").style.display = "none";
    document.getElementById("variantBrowser").style.display = "block";

    // Render thumbnails
    renderThumbnails();
    // Show first variant
    showVariant(0);
}

function renderThumbnails() {
    const strip = document.getElementById("variantStrip");
    strip.innerHTML = "";

    carouselVariants.forEach((v, i) => {
        const card = document.createElement("div");
        card.className = "thumb-card" + (i === carouselIndex ? " active" : "");
        card.dataset.idx = i;

        const scoreDiv = document.createElement("div");
        scoreDiv.className = "thumb-score";
        const scoreId = "thumb_" + i;
        scoreDiv.id = scoreId;

        const label = document.createElement("div");
        label.className = "thumb-label";
        label.textContent = (i + 1);

        card.appendChild(scoreDiv);
        card.appendChild(label);
        strip.appendChild(card);

        card.addEventListener("click", () => showVariant(i));

        try {
            ABCJS.renderAbc(scoreId, v.abc, { responsive: "resize", scale: 0.35 });
        } catch (e) { }
    });
}

function showVariant(idx) {
    if (idx < 0 || idx >= carouselVariants.length) return;
    carouselIndex = idx;

    const v = carouselVariants[idx];
    const counter = document.getElementById("varCounter");
    counter.textContent = `Variant ${idx + 1} of ${carouselVariants.length}`;

    // Apply quantization
    const displayAbc = (carouselQuantGrid < 16)
        ? requantizeAbc(v.abc, carouselQuantGrid)
        : v.abc;
    v._displayAbc = displayAbc;

    // Render main score
    const main = document.getElementById("variantMain");
    main.innerHTML = "";
    const scoreId = "varMain_" + idx;
    main.id = scoreId;
    try {
        ABCJS.renderAbc(scoreId, displayAbc, { responsive: "resize", scale: 1.0 });
    } catch (e) { console.error(e); }
    main.id = "variantMain";

    // ABC code
    document.getElementById("varAbcCode").textContent = displayAbc;

    // Update thumbnail highlights
    document.querySelectorAll(".thumb-card").forEach((el, i) => {
        el.classList.toggle("active", i === idx);
    });

    // Scroll thumbnail into view
    const activeThumb = document.querySelector(`.thumb-card[data-idx="${idx}"]`);
    if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }

    // Update select button appearance
    const selectBtn = document.getElementById("varSelect");
    if (carouselSelectedIndex === idx) {
        selectBtn.textContent = "Selected";
        selectBtn.style.background = "var(--success)";
    } else {
        selectBtn.textContent = "Select";
        selectBtn.style.background = "";
    }
}

function selectCurrentVariant() {
    if (!carouselVariants.length) return;
    carouselSelectedIndex = carouselIndex;

    // Update thumbnail badges
    document.querySelectorAll(".thumb-card").forEach(el => el.classList.remove("selected-for-train"));
    const thumb = document.querySelector(`.thumb-card[data-idx="${carouselIndex}"]`);
    if (thumb) thumb.classList.add("selected-for-train");

    if (carouselOnSelect) carouselOnSelect(carouselIndex);

    // Update button
    const selectBtn = document.getElementById("varSelect");
    selectBtn.textContent = "Selected";
    selectBtn.style.background = "var(--success)";
}

function renderWishlist(container, onAudioError) {
    if (!container) return;
    const list = loadWishlist();
    container.innerHTML = "";

    if (!list.length) {
        container.innerHTML = '<div class="empty-state">No saved motives yet.</div>';
        return;
    }

    list.forEach((item, i) => {
        const wrap = document.createElement("div");
        wrap.className = "wishlist-item";
        const id = "wish_" + i;

        wrap.innerHTML = `
      <div class="wishlist-header">
        <span class="wishlist-title">${escapeHtml(item.label || ("Saved " + (i + 1)))}</span>
        <div class="wishlist-actions">
           <button class="btn-sm" data-play="${item.id}">Play</button>
           <button class="btn-sm" data-copy="${item.id}">Copy</button>
           <button class="btn-sm btn-danger" data-del="${item.id}">Delete</button>
        </div>
      </div>
      <div class="wishlist-date">${escapeHtml(item.createdAt)}</div>
      <div id="${id}" class="score-tiny"></div>
    `;

        container.appendChild(wrap);

        try { ABCJS.renderAbc(id, item.abc, { responsive: "resize", scale: 0.75 }); } catch (e) { }

        wrap.querySelector(`button[data-play]`).addEventListener("click", async () => {
            try { await playAbc(item.abc); } catch (e) { if (onAudioError) onAudioError(e); }
        });
        wrap.querySelector(`button[data-copy]`).addEventListener("click", () => {
            navigator.clipboard.writeText(item.abc);
        });
        wrap.querySelector(`button[data-del]`).addEventListener("click", () => {
            removeFromWishlist(item.id);
            renderWishlist(container, onAudioError);
        });
    });
}


/* =========================================
   MAIN
   ========================================= */

let lastBatch = null;

async function run() {
    const abc = document.getElementById("abcIn").value;
    const outErr = document.getElementById("outErr");
    const origErr = document.getElementById("origErr");

    // Clear errors
    outErr.textContent = "";
    origErr.textContent = "";

    // Show loading state
    document.getElementById("emptyState").style.display = "none";
    document.getElementById("variantBrowser").style.display = "none";
    const varPanel = document.getElementById("variantPanel");
    const loader = document.createElement("div");
    loader.className = "loading-spinner";
    loader.textContent = "Generating...";
    loader.id = "_loader";
    varPanel.insertBefore(loader, varPanel.firstChild);

    await new Promise(r => requestAnimationFrame(r));

    try {
        ABCJS.renderAbc("orig", abc, { responsive: "resize" });
    } catch (e) {
        origErr.textContent = "Original ABC Render Error: " + e;
        const l = document.getElementById("_loader"); if (l) l.remove();
        return;
    }

    let parsed;
    try {
        parsed = parseAbcToEvents(abc);
    } catch (e) {
        outErr.textContent = "Parse error: " + e.message;
        const l = document.getElementById("_loader"); if (l) l.remove();
        return;
    }

    const nVar = parseInt(document.getElementById("nVar").value, 10);
    const adv = parseFloat(document.getElementById("adv").value);
    const tScale = parseFloat(document.getElementById("tScale").value);
    const tInt = document.getElementById("tInt").checked;
    const pQuant = document.getElementById("pQuant").value;
    const rQuant = document.getElementById("rQuant").value;
    const rPalette = document.getElementById("rPalette").value;
    const keepExpr = document.getElementById("keepExpr").value;

    const tempPitch = parseFloat(document.getElementById("tempPitch").value);
    const tempRhythm = parseFloat(document.getElementById("tempRhythm").value);
    const tempArt = parseFloat(document.getElementById("tempArt").value);
    const tempDyn = parseFloat(document.getElementById("tempDyn").value);
    const tempEdit = parseFloat(document.getElementById("tempEdit").value);
    const pInvert = parseFloat(document.getElementById("pInvert").value);
    const dynRange = document.getElementById("dynRange").checked;

    const motiveY = parsed.events.map((e, k, arr) => {
        let dp = 0;
        if (k > 0 && e.pitch != null && arr[k - 1].pitch != null) dp = e.pitch - arr[k - 1].pitch;
        return [
            dp,
            Math.log(Math.max(1e-6, e.durWhole)),
            clamp(e.gate ?? 0.85, 0.15, 1.0),
            clamp(e.vel ?? 80, 20, 120)
        ];
    });

    const feats = [];
    for (let k = 0; k < parsed.events.length; k++) feats.push(buildFeatures(parsed.events, k));

    const variants = [];
    try {
        const tfRef = window.tf;

        for (let i = 0; i < nVar; i++) {
            let sigmaT = tScale;
            const logVarT = getLogVarT();
            if (logVarT && tfRef) sigmaT *= Math.exp(0.5 * logVarT.dataSync()[0]);

            let transpose = randn() * sigmaT;
            if (tInt) transpose = Math.round(transpose);
            transpose = clamp(transpose, -24, 24);

            const ks = kalmanSampleVariants(parsed, { adventure: adv, keepExpr, tempPitch, tempRhythm, tempArt, tempDyn }, tfRef);

            if (pInvert > 0 && Math.random() < clamp(pInvert, 0, 1)) {
                for (let k = 0; k < ks.sampled.length; k++) {
                    ks.sampled[k][0] = -ks.sampled[k][0];
                }
            }

            const varLenVal = document.getElementById("varLen").checked ? "on" : "off";

            const built = buildVariantAbc(parsed, ks.sampled, ks.splitLogits, ks.mergeLogits, i + 2, {
                varNum: i + 1,
                pitchQuant: pQuant,
                rhythmQuant: rQuant,
                rhythmPalette: rPalette,
                transpose,
                varLen: varLenVal,
                pSplitPct: parseFloat(document.getElementById("pSplit").value),
                pMergePct: parseFloat(document.getElementById("pMerge").value),
                ornStyle: document.getElementById("ornStyle").value,
                tempRhythm,
                dynRange: dynRange ? "on" : "off",
                dynStretch: 1.8,
                tempEdit
            });
            variants.push({ abc: built.abc, sampled: ks.sampled, transpose, splitDec: built.splitDec, mergeDec: built.mergeDec });
        }
    } catch (e) {
        outErr.textContent = "Generation Error: " + e.message + "\n" + e.stack;
        const l = document.getElementById("_loader"); if (l) l.remove();
        return;
    }

    const l = document.getElementById("_loader"); if (l) l.remove();

    lastBatch = { motiveY, features: feats, variants, chosenIndex: null };

    renderVariantCarousel(variants, (idx) => {
        if (lastBatch) lastBatch.chosenIndex = idx;
        document.getElementById("learnStatus").textContent = `Selected Variant ${idx + 1}. Ready to train.`;
    }, (err) => outErr.textContent = String(err));
}

document.addEventListener("DOMContentLoaded", async () => {
    await ensureAbcjsReady();

    // Check TF
    if (!window.tf) {
        document.getElementById("origErr").textContent = "TensorFlow.js not loaded. Neural features disabled.";
    } else {
        initLearning(window.tf);
    }

    // ===== RENDER ORIGINAL SCORE ON LOAD =====
    function renderOriginalScore() {
        const abc = document.getElementById("abcIn").value;
        const origErr = document.getElementById("origErr");
        origErr.textContent = "";
        try {
            ABCJS.renderAbc("orig", abc, { responsive: "resize" });
        } catch (e) {
            origErr.textContent = "ABC Render Error: " + e;
        }
    }

    renderOriginalScore();

    // Live preview: re-render on every edit
    let renderTimer = null;
    document.getElementById("abcIn").addEventListener("input", () => {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(renderOriginalScore, 200);
    });

    // ===== KNOB SETUP =====
    const knobGrid = document.getElementById("knobGrid");
    const knobDefs = [
        { id: "adv",       label: "Adventure",    min: 0,   max: 10,  step: 0.1, value: 1.0, color: "#ef4444" },
        { id: "tempPitch", label: "Pitch",         min: 0.1, max: 10,  step: 0.1, value: 1.0, color: "#4f46e5" },
        { id: "tempRhythm",label: "Rhythm",        min: 0.1, max: 8,   step: 0.1, value: 1.0, color: "#8b5cf6" },
        { id: "tempDyn",   label: "Dynamics",      min: 0.1, max: 6,   step: 0.1, value: 1.0, color: "#f59e0b" },
        { id: "tempArt",   label: "Articulation",  min: 0.1, max: 4,   step: 0.1, value: 1.0, color: "#10b981" },
        { id: "tempEdit",  label: "Edit Temp",     min: 0.1, max: 5,   step: 0.1, value: 1.0, color: "#64748b" },
        { id: "pSplit",    label: "Split %",       min: 0,   max: 100, step: 1,   value: 20,  color: "#64748b" },
        { id: "pMerge",    label: "Merge %",       min: 0,   max: 100, step: 1,   value: 10,  color: "#64748b" },
    ];

    knobDefs.forEach(def => {
        const hiddenInput = document.getElementById(def.id);
        createKnob(knobGrid, {
            label: def.label,
            min: def.min,
            max: def.max,
            step: def.step,
            value: def.value,
            defaultValue: def.value,
            color: def.color,
            size: 60,
            onChange: (val) => {
                hiddenInput.value = val;
            }
        });
    });

    // ===== BUTTON WIRING =====
    document.getElementById("go").addEventListener("click", run);
    document.getElementById("train").addEventListener("click", () => {
        trainOnSelection(lastBatch, window.tf, 140, 0.5, (msg) => {
            document.getElementById("learnStatus").textContent = msg;
        });
    });

    document.getElementById("playOrig").addEventListener("click", () => {
        playAbc(document.getElementById("abcIn").value).catch(e => document.getElementById("origErr").textContent = e);
    });
    document.getElementById("stopAudio").addEventListener("click", stopPlayback);

    // Quantization toggle
    document.querySelectorAll(".quant-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".quant-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            carouselQuantGrid = parseInt(btn.dataset.quant);
            if (carouselVariants.length) showVariant(carouselIndex);
        });
    });

    // Carousel buttons
    document.getElementById("varPrev").addEventListener("click", () => {
        if (carouselVariants.length) showVariant((carouselIndex - 1 + carouselVariants.length) % carouselVariants.length);
    });
    document.getElementById("varNext").addEventListener("click", () => {
        if (carouselVariants.length) showVariant((carouselIndex + 1) % carouselVariants.length);
    });
    document.getElementById("varPlay").addEventListener("click", async () => {
        if (!carouselVariants.length) return;
        const abc = carouselVariants[carouselIndex]._displayAbc || carouselVariants[carouselIndex].abc;
        try { await playAbc(abc); }
        catch (err) { if (carouselOnAudioError) carouselOnAudioError(err); }
    });
    document.getElementById("varSelect").addEventListener("click", selectCurrentVariant);
    document.getElementById("varSave").addEventListener("click", () => {
        if (!carouselVariants.length) return;
        addToWishlist(carouselVariants[carouselIndex].abc, `Variant ${carouselIndex + 1}`);
        const btn = document.getElementById("varSave");
        btn.textContent = "Saved!";
        setTimeout(() => btn.textContent = "Save", 1000);
        renderWishlist(document.getElementById("wishlist"));
    });
    document.getElementById("varCopy").addEventListener("click", () => {
        if (!carouselVariants.length) return;
        const abc = carouselVariants[carouselIndex]._displayAbc || carouselVariants[carouselIndex].abc;
        navigator.clipboard.writeText(abc);
        const btn = document.getElementById("varCopy");
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = "Copy ABC", 1000);
    });

    // MusicXML export
    document.getElementById("varExportMXL").addEventListener("click", () => {
        if (!carouselVariants.length) return;
        const v = carouselVariants[carouselIndex];
        const abc = v._displayAbc || v.abc;
        exportVariantMusicXML(abc, "Variation_" + (carouselIndex + 1));
    });
    document.getElementById("exportOrigMXL").addEventListener("click", () => {
        const abc = document.getElementById("abcIn").value;
        exportVariantMusicXML(abc, "Original_Motive");
    });

    // Model management
    document.getElementById("saveModelDl").addEventListener("click", () => saveModelDownload(window.tf));
    document.getElementById("saveModelLs").addEventListener("click", () => saveModelLocal(window.tf));
    document.getElementById("loadModelLs").addEventListener("click", () => loadModelLocal(window.tf));
    document.getElementById("loadModelFileBtn").addEventListener("click", () => document.getElementById("loadModelFile").click());
    document.getElementById("loadModelFile").addEventListener("change", (e) => loadModelFromFiles(window.tf, e.target.files));

    // Drawers
    document.getElementById("helpBtn").addEventListener("click", () => {
        document.getElementById("helpPanel").classList.toggle("hidden");
    });
    document.getElementById("wishShow").addEventListener("click", () => {
        const panel = document.getElementById("wishlistPanel");
        panel.classList.toggle("hidden");
        renderWishlist(document.getElementById("wishlist"));
    });
    document.getElementById("wishExport").addEventListener("click", () => {
        downloadText("wishlist.json", JSON.stringify(loadWishlist(), null, 2));
    });
    document.getElementById("wishClear").addEventListener("click", () => {
        saveWishlist([]);
        renderWishlist(document.getElementById("wishlist"));
    });
    document.getElementById("wishImportBtn").addEventListener("click", () => document.getElementById("wishImportFile").click());

    // ===== KEYBOARD SHORTCUTS =====
    document.addEventListener("keydown", (e) => {
        // Don't capture when typing in inputs
        if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

        if (e.key === "ArrowLeft") {
            e.preventDefault();
            if (carouselVariants.length) showVariant((carouselIndex - 1 + carouselVariants.length) % carouselVariants.length);
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            if (carouselVariants.length) showVariant((carouselIndex + 1) % carouselVariants.length);
        } else if (e.key === " ") {
            e.preventDefault();
            if (carouselVariants.length) {
                playAbc(carouselVariants[carouselIndex].abc).catch(() => {});
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
            selectCurrentVariant();
        } else if (e.key === "Escape") {
            e.preventDefault();
            stopPlayback();
        }
    });

    // Initial render
    renderWishlist(document.getElementById("wishlist"));
});
