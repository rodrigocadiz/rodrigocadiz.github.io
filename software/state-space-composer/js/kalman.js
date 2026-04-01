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

    const net = getVarNet();
    const outAll = (net && tf) ? predictLogVars(feats, tf) : feats.map(f => [...mlp(f), -2.0, -2.0]);

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
