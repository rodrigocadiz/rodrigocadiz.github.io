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
    const noteRegex = /((?:![^!]*!|\.)*)([=^_]*[A-Ga-gz])([\',]*)(\d*\/?\.?\d*)/g;

    const newBody = bodyStr.replace(noteRegex, (match, prefix, noteName, octave, durStr) => {
        if (noteName.endsWith("z")) {
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
    if (!durStr || durStr === "") return 1;
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
    const gridInL = gridUnit / 0.125;
    if (gridInL <= 0) return durMultiplier;
    const snapped = Math.max(gridInL, Math.round(durMultiplier / gridInL) * gridInL);
    return snapped;
}

function durationToAbc(dur) {
    if (dur === 1) return "";
    if (dur === 0.5) return "/2";
    if (dur === 0.25) return "/4";
    if (dur === 1.5) return "3/2";
    if (dur === 2.5) return "5/2";
    if (dur === 3.5) return "7/2";
    if (Number.isInteger(dur)) return String(dur);
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

    renderThumbnails();
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

// skipQuantize: set true when called from the note editor to avoid re-quantizing an edit
function showVariant(idx, skipQuantize = false) {
    if (idx < 0 || idx >= carouselVariants.length) return;
    carouselIndex = idx;

    const v = carouselVariants[idx];
    const counter = document.getElementById("varCounter");
    counter.textContent = `Variant ${idx + 1} of ${carouselVariants.length}`;

    const displayAbc = (!skipQuantize && carouselQuantGrid < 16)
        ? requantizeAbc(v.abc, carouselQuantGrid)
        : v.abc;
    v._displayAbc = displayAbc;

    // Render main score with click listener for note editing
    const main = document.getElementById("variantMain");
    main.innerHTML = "";
    const scoreId = "varMain_" + idx;
    main.id = scoreId;
    try {
        ABCJS.renderAbc(scoreId, displayAbc, {
            responsive: "resize",
            scale: 1.0,
            clickListener: makeClickListener(
                () => carouselVariants[idx]._displayAbc || carouselVariants[idx].abc,
                (newAbc) => {
                    carouselVariants[idx].abc = newAbc;
                    carouselVariants[idx]._displayAbc = newAbc;
                },
                () => showVariant(idx, true)
            )
        });
    } catch (e) { console.error(e); }
    main.id = "variantMain";

    document.getElementById("varAbcCode").textContent = displayAbc;

    document.querySelectorAll(".thumb-card").forEach((el, i) => {
        el.classList.toggle("active", i === idx);
    });

    const activeThumb = document.querySelector(`.thumb-card[data-idx="${idx}"]`);
    if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }

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

    document.querySelectorAll(".thumb-card").forEach(el => el.classList.remove("selected-for-train"));
    const thumb = document.querySelector(`.thumb-card[data-idx="${carouselIndex}"]`);
    if (thumb) thumb.classList.add("selected-for-train");

    if (carouselOnSelect) carouselOnSelect(carouselIndex);

    const selectBtn = document.getElementById("varSelect");
    selectBtn.textContent = "Selected";
    selectBtn.style.background = "var(--success)";
}

/* =========================================
   TIMELINE
   ========================================= */

let timelineDragIdx = null;
let timelinePlayActive = false;

function renderTimeline() {
    const bar = document.getElementById("timelineItems");
    if (!bar) return;
    const list = loadTimeline();
    bar.innerHTML = "";

    if (!list.length) {
        bar.innerHTML = '<div class="timeline-empty">Add variants here using "Add to Timeline" in the carousel</div>';
        return;
    }

    list.forEach((item, i) => {
        const slot = document.createElement("div");
        slot.className = "timeline-slot";
        slot.draggable = true;
        slot.dataset.idx = i;
        slot.dataset.id = item.id;

        const scoreId = "tl_" + item.id.slice(0, 8);
        slot.innerHTML = `
            <div class="timeline-slot-score" id="${scoreId}"></div>
            <div class="timeline-slot-label">${escapeHtml(item.label)}</div>
            <button class="timeline-slot-remove" data-id="${item.id}" title="Remove">&times;</button>
        `;

        bar.appendChild(slot);

        try {
            ABCJS.renderAbc(scoreId, item.abc, { responsive: "resize", scale: 0.28 });
        } catch (e) {}

        // Drag to reorder within timeline
        slot.addEventListener("dragstart", (e) => {
            timelineDragIdx = i;
            e.dataTransfer.effectAllowed = "move";
            setTimeout(() => slot.classList.add("dragging"), 0);
        });
        slot.addEventListener("dragend", () => {
            slot.classList.remove("dragging");
            document.querySelectorAll(".timeline-slot").forEach(s => s.classList.remove("drag-over"));
        });
        slot.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            document.querySelectorAll(".timeline-slot").forEach(s => s.classList.remove("drag-over"));
            slot.classList.add("drag-over");
        });
        slot.addEventListener("drop", (e) => {
            e.preventDefault();
            document.querySelectorAll(".timeline-slot").forEach(s => s.classList.remove("drag-over"));
            if (timelineDragIdx !== null && timelineDragIdx !== i) {
                reorderTimeline(timelineDragIdx, i);
                renderTimeline();
            }
            timelineDragIdx = null;
        });

        slot.querySelector(".timeline-slot-remove").addEventListener("click", (e) => {
            e.stopPropagation();
            removeFromTimeline(item.id);
            renderTimeline();
        });

        // Click score thumbnail to play that item
        slot.querySelector(".timeline-slot-score").addEventListener("click", async () => {
            try { await playAbc(item.abc); } catch (e) {}
        });
    });
}

async function playTimeline(onError) {
    const list = loadTimeline();
    if (!list.length) return;
    timelinePlayActive = true;
    for (const item of list) {
        if (!timelinePlayActive) break;
        try {
            await playAbcWebAudio(item.abc);
        } catch (e) {
            if (onError) onError(e);
            break;
        }
    }
    timelinePlayActive = false;
}

function stopTimelinePlay() {
    timelinePlayActive = false;
    stopPlayback();
}

function exportTimelineAbc() {
    const list = loadTimeline();
    if (!list.length) return;
    downloadText("timeline.abc", list.map(item => item.abc).join("\n\n"), "text/plain");
}

/* =========================================
   NOTE EDITOR (Tier A)
   ========================================= */

let editorState = null; // { abc, startChar, endChar, token, setAbcFn, rerenderFn }

function initNoteEditor() {
    const panel = document.getElementById("noteEditorPanel");
    if (!panel) return;

    document.getElementById("noteEditorClose").addEventListener("click", hideNoteEditor);
    document.getElementById("notePitchUp").addEventListener("click", () => shiftEditorPitch(1));
    document.getElementById("notePitchDown").addEventListener("click", () => shiftEditorPitch(-1));
    document.getElementById("noteDurApply").addEventListener("click", applyEditorDuration);
}

// Returns a clickListener callback bound to the given ABC source
function makeClickListener(getAbcFn, setAbcFn, rerenderFn) {
    return function(abcElem, tuneNumber, classes, analysis, drag, mouseEvent) {
        if (!abcElem || abcElem.el_type !== "note") return;
        if (abcElem.rest) return;
        if (typeof abcElem.startChar !== "number" || typeof abcElem.endChar !== "number") return;

        const abc = getAbcFn();
        if (!abc) return;
        const token = abc.slice(abcElem.startChar, abcElem.endChar);
        if (!token) return;

        editorState = { abc, startChar: abcElem.startChar, endChar: abcElem.endChar, token, setAbcFn, rerenderFn };
        showNoteEditor(token, mouseEvent);
    };
}

function showNoteEditor(token, mouseEvent) {
    const panel = document.getElementById("noteEditorPanel");
    if (!panel) return;

    const midi = abcTokenToMidi(token);
    document.getElementById("notePitchDisplay").textContent = midi !== null ? midiToNoteName(midi) : "?";

    // Select closest matching duration in dropdown
    const { durStr } = abcNoteTokenSplit(token);
    const durSelect = document.getElementById("noteDurSelect");
    let matched = false;
    Array.from(durSelect.options).forEach(opt => {
        if (opt.value === durStr) { opt.selected = true; matched = true; }
        else opt.selected = false;
    });
    if (!matched && durSelect.options.length) durSelect.options[0].selected = true;

    // Position panel near click
    if (mouseEvent) {
        const x = Math.min(mouseEvent.clientX + 14, window.innerWidth - 230);
        const y = Math.min(mouseEvent.clientY - 20, window.innerHeight - 210);
        panel.style.left = x + "px";
        panel.style.top = y + "px";
    }

    panel.classList.remove("hidden");
}

function hideNoteEditor() {
    const panel = document.getElementById("noteEditorPanel");
    if (panel) panel.classList.add("hidden");
    editorState = null;
}

function shiftEditorPitch(semitones) {
    if (!editorState) return;
    const { abc, startChar, endChar, token, setAbcFn, rerenderFn } = editorState;
    const midi = abcTokenToMidi(token);
    if (midi === null) return;
    const newMidi = clamp(midi + semitones, 21, 108);
    const { durStr } = abcNoteTokenSplit(token);
    const newToken = midiToAbcPitch(newMidi) + durStr;
    const newAbc = abc.slice(0, startChar) + newToken + abc.slice(endChar);

    editorState = { ...editorState, abc: newAbc, token: newToken, endChar: startChar + newToken.length };
    document.getElementById("notePitchDisplay").textContent = midiToNoteName(newMidi);
    setAbcFn(newAbc);
    rerenderFn(newAbc);
}

function applyEditorDuration() {
    if (!editorState) return;
    const { abc, startChar, endChar, token, setAbcFn, rerenderFn } = editorState;
    const newDurStr = document.getElementById("noteDurSelect").value;
    const { pitchPart } = abcNoteTokenSplit(token);
    const newToken = pitchPart + newDurStr;
    const newAbc = abc.slice(0, startChar) + newToken + abc.slice(endChar);

    editorState = { ...editorState, abc: newAbc, token: newToken, endChar: startChar + newToken.length };
    setAbcFn(newAbc);
    rerenderFn(newAbc);
}

// Split an ABC note token into its pitch part (letter+accidentals+octave) and duration suffix
function abcNoteTokenSplit(token) {
    let i = 0;
    while (i < token.length && "^_=".includes(token[i])) i++;
    if (i < token.length) i++; // skip pitch letter
    while (i < token.length && (token[i] === "'" || token[i] === ",")) i++;
    return { pitchPart: token.slice(0, i), durStr: token.slice(i) };
}

// Convert an ABC note token to a MIDI pitch number
function abcTokenToMidi(token) {
    let i = 0;
    let accidental = "";
    while (i < token.length && "^_=".includes(token[i])) accidental += token[i++];
    if (i >= token.length) return null;
    const ch = token[i++];
    if (!"CDEFGABcdefgab".includes(ch)) return null;
    const letterToSemitone = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const upper = ch.toUpperCase();
    let midi = 60 + letterToSemitone[upper];
    if (ch >= "a") midi += 12; // lowercase = one octave up from middle C
    while (i < token.length && (token[i] === "'" || token[i] === ",")) {
        midi += (token[i] === "'") ? 12 : -12;
        i++;
    }
    const accMap = { "^": 1, "^^": 2, "_": -1, "__": -2, "=": 0, "": 0 };
    midi += accMap[accidental] || 0;
    return midi;
}

// Convert a MIDI number to a human-readable note name (e.g., 60 → "C4")
function midiToNoteName(midi) {
    if (midi === null) return "?";
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const pc = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    return names[pc] + octave;
}
