/* =========================================
   MAIN
   ========================================= */

let lastBatch = null;

function renderOriginalScore() {
    const abcIn = document.getElementById("abcIn");
    const origErr = document.getElementById("origErr");
    if (!abcIn || !origErr) return;
    const abc = abcIn.value;
    origErr.textContent = "";
    try {
        ABCJS.renderAbc("orig", abc, {
            responsive: "resize",
            clickListener: makeClickListener(
                () => document.getElementById("abcIn").value,
                (newAbc) => { document.getElementById("abcIn").value = newAbc; },
                renderOriginalScore
            )
        });
    } catch (e) {
        origErr.textContent = "ABC Render Error: " + e;
    }
}

async function run() {
    const abc = document.getElementById("abcIn").value;
    const outErr = document.getElementById("outErr");
    const origErr = document.getElementById("origErr");

    outErr.textContent = "";
    origErr.textContent = "";

    document.getElementById("emptyState").style.display = "none";
    document.getElementById("variantBrowser").style.display = "none";
    const varPanel = document.getElementById("variantPanel");
    const loader = document.createElement("div");
    loader.className = "loading-spinner";
    loader.textContent = "Generating...";
    loader.id = "_loader";
    varPanel.insertBefore(loader, varPanel.firstChild);

    await new Promise(r => requestAnimationFrame(r));

    renderOriginalScore();

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

    if (!window.tf) {
        document.getElementById("origErr").textContent = "TensorFlow.js not loaded. Neural features disabled.";
    } else {
        initLearning(window.tf);
    }

    // ===== RENDER ORIGINAL SCORE ON LOAD =====
    renderOriginalScore();

    // Live preview: re-render on every edit (hides note editor on manual edit)
    let renderTimer = null;
    document.getElementById("abcIn").addEventListener("input", () => {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(() => {
            hideNoteEditor();
            renderOriginalScore();
        }, 200);
    });

    // ===== KNOB SETUP =====
    const knobGrid = document.getElementById("knobGrid");
    const knobDefs = [
        { id: "adv",       label: "Adventure",    min: 0,   max: 10,  step: 0.1, value: 1.0, color: "#ef4444",
          tooltip: "Global exploration level. Turn up for bold, adventurous variants; turn down to stay close to the original motive." },
        { id: "tempPitch", label: "Pitch",         min: 0.1, max: 10,  step: 0.1, value: 1.0, color: "#4f46e5",
          tooltip: "Pitch variation temperature. Controls how far notes may deviate in pitch from the original melody." },
        { id: "tempRhythm",label: "Rhythm",        min: 0.1, max: 8,   step: 0.1, value: 1.0, color: "#8b5cf6",
          tooltip: "Rhythm variation temperature. Controls how much note durations may change relative to the original." },
        { id: "tempDyn",   label: "Dynamics",      min: 0.1, max: 6,   step: 0.1, value: 1.0, color: "#f59e0b",
          tooltip: "Dynamics temperature. Controls variation in loudness markings (pp, mp, f, ff, etc.)." },
        { id: "tempArt",   label: "Articulation",  min: 0.1, max: 4,   step: 0.1, value: 1.0, color: "#10b981",
          tooltip: "Articulation temperature. Controls variation in note articulation (staccato, tenuto, legato)." },
        { id: "tempEdit",  label: "Edit Temp",     min: 0.1, max: 5,   step: 0.1, value: 1.0, color: "#64748b",
          tooltip: "Structural edit temperature. Scales the probability of split/merge operations. Higher = more rhythmic restructuring." },
        { id: "pSplit",    label: "Split %",       min: 0,   max: 100, step: 1,   value: 20,  color: "#64748b",
          tooltip: "Base probability of splitting a note into two shorter notes, adding rhythmic detail." },
        { id: "pMerge",    label: "Merge %",       min: 0,   max: 100, step: 1,   value: 10,  color: "#64748b",
          tooltip: "Base probability of merging two consecutive notes into one longer note, simplifying the rhythm." },
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
            onChange: (val) => { hiddenInput.value = val; }
        });
        if (def.tooltip) {
            knobGrid.lastElementChild.setAttribute("data-tooltip", def.tooltip);
        }
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
    document.getElementById("stopAudio").addEventListener("click", () => {
        stopTimelinePlay();
    });

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

    // "Add to Timeline" (replaces Save/Wishlist)
    document.getElementById("varAddToTimeline").addEventListener("click", () => {
        if (!carouselVariants.length) return;
        const abc = carouselVariants[carouselIndex]._displayAbc || carouselVariants[carouselIndex].abc;
        addToTimeline(abc, `Variant ${carouselIndex + 1}`);
        renderTimeline();
        const btn = document.getElementById("varAddToTimeline");
        btn.textContent = "Added!";
        setTimeout(() => btn.textContent = "Add to Timeline", 1000);
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

    // Timeline controls
    document.getElementById("tlPlayAll").addEventListener("click", () => {
        playTimeline((err) => document.getElementById("outErr").textContent = String(err));
    });
    document.getElementById("tlStop").addEventListener("click", stopTimelinePlay);
    document.getElementById("tlExportAbc").addEventListener("click", exportTimelineAbc);
    document.getElementById("tlExportMXL").addEventListener("click", () => {
        const list = loadTimeline();
        if (!list.length) return;
        const combined = list.map(item => item.abc).join("\n\n");
        exportVariantMusicXML(combined, "Timeline");
    });
    document.getElementById("tlClear").addEventListener("click", () => {
        if (confirm("Clear the entire timeline?")) {
            saveTimeline([]);
            renderTimeline();
        }
    });

    // Model management
    function setModelStatus(msg, isError) {
        const el = document.getElementById("modelStatus");
        if (!el) return;
        el.textContent = msg;
        el.style.color = isError ? "var(--danger)" : "var(--success)";
        if (msg) setTimeout(() => { el.textContent = ""; }, 4000);
    }

    document.getElementById("saveModelDl").addEventListener("click", () => {
        saveModelDownload(window.tf);
        setModelStatus("Model downloaded as files.");
    });
    document.getElementById("saveModelLs").addEventListener("click", () => {
        saveModelLocal(window.tf);
        setModelStatus("Model saved to browser storage.");
    });
    document.getElementById("loadModelLs").addEventListener("click", async () => {
        try {
            await loadModelLocal(window.tf);
            setModelStatus("Model loaded from browser storage.");
        } catch (e) {
            setModelStatus("No saved model found in this browser.", true);
        }
    });
    document.getElementById("loadModelFileBtn").addEventListener("click", () => document.getElementById("loadModelFile").click());
    document.getElementById("loadModelFile").addEventListener("change", async (e) => {
        try {
            await loadModelFromFiles(window.tf, e.target.files);
            setModelStatus("Model loaded from files.");
        } catch (e) {
            setModelStatus("Failed to load model files.", true);
        }
    });

    // Help drawer
    document.getElementById("helpBtn").addEventListener("click", () => {
        document.getElementById("helpPanel").classList.toggle("hidden");
    });

    // ===== KEYBOARD SHORTCUTS =====
    document.addEventListener("keydown", (e) => {
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
            hideNoteEditor();
            stopPlayback();
        }
    });

    // ===== INIT =====
    initNoteEditor();
    renderTimeline();
});
