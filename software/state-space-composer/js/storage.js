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
    await net.save("downloads://variance-controller");
    const t = lvt ? lvt.dataSync()[0] : -2.0;
    downloadText("transpose_logvar.json", JSON.stringify({ logVarT: t }, null, 2));
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
    const model = await tf.loadLayersModel(tf.io.browserFiles(files));
    setVarNet(model);
    setOptimizer(tf.train.adam(0.02));
}
