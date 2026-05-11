/* =========================================
   STORAGE
   ========================================= */

const TIMELINE_KEY = "nk_timeline_v1";

function loadTimeline() {
    try { return JSON.parse(localStorage.getItem(TIMELINE_KEY) || "[]"); }
    catch (_) { return []; }
}

function saveTimeline(list) {
    localStorage.setItem(TIMELINE_KEY, JSON.stringify(list));
}

function addToTimeline(abcText, label = "") {
    const list = loadTimeline();
    list.push({
        id: crypto.randomUUID(),
        label,
        abc: abcText,
        addedAt: new Date().toISOString()
    });
    saveTimeline(list);
    return list;
}

function removeFromTimeline(id) {
    saveTimeline(loadTimeline().filter(x => x.id !== id));
}

function reorderTimeline(fromIdx, toIdx) {
    const list = loadTimeline();
    const [item] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, item);
    saveTimeline(list);
}

function downloadText(filename, text, mime = "application/json") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 250);
}

async function saveModelDownload(tf) {
    const net = getVarNet();
    const lvt = getLogVarT();
    if (!net) throw new Error("Model not initialized.");

    let artifacts;
    await net.save(tf.io.withSaveHandler(async a => {
        artifacts = a;
        return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
    }));

    // Encode binary weights as base64 so everything fits in one JSON file
    const weightB64 = btoa(String.fromCharCode(...new Uint8Array(artifacts.weightData)));
    const bundle = {
        modelTopology: artifacts.modelTopology,
        weightSpecs:   artifacts.weightSpecs,
        weightData:    weightB64,
        logVarT:       lvt ? lvt.dataSync()[0] : -2.0
    };
    downloadText("variance-controller.json", JSON.stringify(bundle));
}

async function saveModelLocal(tf) {
    const net = getVarNet();
    const lvt = getLogVarT();
    if (!net) throw new Error("Model not initialized.");
    await net.save("localstorage://variance-controller");
    if (lvt) localStorage.setItem("nk_logVarT", String(lvt.dataSync()[0]));
}

async function loadModelLocal(tf) {
    const model = await tf.loadLayersModel("localstorage://variance-controller");
    setVarNet(model);
    setOptimizer(tf.train.adam(0.02));
    const t = parseFloat(localStorage.getItem("nk_logVarT") || "-2.0");
    const lvt = getLogVarT();
    if (lvt) lvt.assign(tf.scalar(t));
}

async function loadModelFromFiles(tf, fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) throw new Error("No files selected.");

    // Single bundled JSON (new format)
    if (files.length === 1 && files[0].name.endsWith('.json')) {
        const bundle = JSON.parse(await files[0].text());
        if (bundle.weightData && bundle.modelTopology) {
            const weightData = Uint8Array.from(atob(bundle.weightData), c => c.charCodeAt(0)).buffer;
            const model = await tf.loadLayersModel(
                tf.io.fromMemory(bundle.modelTopology, bundle.weightSpecs, weightData)
            );
            setVarNet(model);
            setOptimizer(tf.train.adam(0.02));
            if (bundle.logVarT !== undefined) {
                const lvt = getLogVarT();
                if (lvt) lvt.assign(tf.scalar(bundle.logVarT));
            }
            return;
        }
    }

    // Legacy: separate .json + .bin files
    const model = await tf.loadLayersModel(tf.io.browserFiles(files));
    setVarNet(model);
    setOptimizer(tf.train.adam(0.02));
}
