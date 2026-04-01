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
