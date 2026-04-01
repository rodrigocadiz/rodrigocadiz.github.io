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
                if (k > 0) currAbs = src.pitch + transpose;
            } else {
                currAbs = currAbs + xs[0];
            }
            if (k === 0) currAbs = src.pitch + transpose;

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

        if (hairpinEndAt[k] === "<") pendingHairpinEnd = "!<)!";
        else if (hairpinEndAt[k] === ">") pendingHairpinEnd = "!>)!";
    }
    if (pendingHairpinEnd) body.push(pendingHairpinEnd);

    if (hairpinStart[m - 1] && !hairpinEndAt[m - 1]) {
        if (hairpinStart[m - 1] === "<") body.push("!<)!");
        if (hairpinStart[m - 1] === ">") body.push("!>)!");
    }

    const abcText = header.join("\n") + "\n" + body.join(" ") + "\n";
    return { abc: abcText, splitDec: edited.splitDec, mergeDec: edited.mergeDec };
}
