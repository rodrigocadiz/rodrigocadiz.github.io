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
