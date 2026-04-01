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
