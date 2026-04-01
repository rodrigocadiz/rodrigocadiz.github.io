/* =========================================
   NEURAL
   ========================================= */

let varNet = null;
let optimizer = null;
let logVarT = null;
// lastBatch is declared in main.js

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
