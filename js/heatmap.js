/**
 * TypeScope — Keyboard Error Heatmap
 * js/heatmap.js
 *
 * Renders a visual keyboard heatmap that shows which keys are most frequently
 * mistyped by the user, based on their real saved typing sessions.
 *
 * Architecture:
 *   - Aggregates errorMap data from all sessions in localStorage
 *   - Builds an HTML keyboard layout covering all printable keys
 *   - Colors each key by error frequency (neutral → blue → amber → red)
 *   - Shows a color-scale legend and per-key tooltip/count on hover
 *   - Provides a clear empty state when insufficient data exists
 *
 * Error data structure (per session, from typing-engine.js):
 *   session.errorMap = { "a": 3, "s": 1, " ": 2, ... }
 *   Maps expected (target) characters to the count of times they were mistyped.
 *
 * Related courses:
 *   JavaScript Essentials 1  - DOM, events, objects, arrays
 *   JavaScript Essentials 2  - higher-order functions, data transformation
 *   Introduction to Data Analytics Essentials - frequency analysis, normalization
 */

"use strict";

/* ─────────────────────────────────────────────────────────────────────────────
   1. KEYBOARD LAYOUT DEFINITION
   Standard QWERTY layout rows. Each key entry has:
     key   — the character the key represents (what errorMap tracks)
     label — what to display on the keycap
     w     — relative width multiplier (1 = standard key)
   ───────────────────────────────────────────────────────────────────────────── */
const KEYBOARD_ROWS = [
  [
    { key: "`", label: "`" }, { key: "1", label: "1" }, { key: "2", label: "2" },
    { key: "3", label: "3" }, { key: "4", label: "4" }, { key: "5", label: "5" },
    { key: "6", label: "6" }, { key: "7", label: "7" }, { key: "8", label: "8" },
    { key: "9", label: "9" }, { key: "0", label: "0" }, { key: "-", label: "-" },
    { key: "=", label: "=" }, { key: "__bs", label: "⌫", w: 2 },
  ],
  [
    { key: "__tab", label: "Tab", w: 1.5 },
    { key: "q", label: "Q" }, { key: "w", label: "W" }, { key: "e", label: "E" },
    { key: "r", label: "R" }, { key: "t", label: "T" }, { key: "y", label: "Y" },
    { key: "u", label: "U" }, { key: "i", label: "I" }, { key: "o", label: "O" },
    { key: "p", label: "P" }, { key: "[", label: "[" }, { key: "]", label: "]" },
    { key: "\\", label: "\\", w: 1.5 },
  ],
  [
    { key: "__caps", label: "Caps", w: 1.75 },
    { key: "a", label: "A" }, { key: "s", label: "S" }, { key: "d", label: "D" },
    { key: "f", label: "F" }, { key: "g", label: "G" }, { key: "h", label: "H" },
    { key: "j", label: "J" }, { key: "k", label: "K" }, { key: "l", label: "L" },
    { key: ";", label: ";" }, { key: "'", label: "'" },
    { key: "__enter", label: "Enter", w: 2.25 },
  ],
  [
    { key: "__shift", label: "⇧ Shift", w: 2.25 },
    { key: "z", label: "Z" }, { key: "x", label: "X" }, { key: "c", label: "C" },
    { key: "v", label: "V" }, { key: "b", label: "B" }, { key: "n", label: "N" },
    { key: "m", label: "M" }, { key: ",", label: "," }, { key: ".", label: "." },
    { key: "/", label: "/" },
    { key: "__shift", label: "⇧ Shift", w: 2.75 },
  ],
  [
    { key: "__ctrl", label: "Ctrl", w: 1.5 },
    { key: "__alt", label: "Alt", w: 1.25 },
    { key: " ", label: "Space", w: 6.25 },
    { key: "__alt", label: "Alt", w: 1.25 },
    { key: "__ctrl", label: "Ctrl", w: 1.5 },
  ],
];

/* ─────────────────────────────────────────────────────────────────────────────
   2. COLOR INTERPOLATION — cool-to-warm gradient
   ───────────────────────────────────────────────────────────────────────────── */

/** Linear interpolation between two values. */
function hmLerp(a, b, t) {
  return Math.round(a + (b - a) * Math.max(0, Math.min(1, t)));
}

/**
 * Returns a CSS rgba() color for a normalized error intensity (0–1).
 *   0   = neutral blue-grey (no errors)
 *   0.5 = amber (moderate)
 *   1   = red (highest)
 *
 * @param {number} intensity - 0..1
 * @returns {string}
 */
function hmIntensityToColor(intensity) {
  if (intensity <= 0) return "rgba(30, 37, 48, 0.85)";

  const stops = [
    [0.00, [30, 60, 120]],
    [0.25, [79, 142, 247]],
    [0.50, [251, 191, 36]],
    [0.75, [249, 115, 22]],
    [1.00, [248, 71, 71]],
  ];

  let i = 0;
  while (i < stops.length - 2 && stops[i + 1][0] <= intensity) i++;
  const [t0, c0] = stops[i];
  const [t1, c1] = stops[i + 1];
  const blend = (intensity - t0) / (t1 - t0);

  const r = hmLerp(c0[0], c1[0], blend);
  const g = hmLerp(c0[1], c1[1], blend);
  const b = hmLerp(c0[2], c1[2], blend);
  const alpha = 0.55 + intensity * 0.45;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. AGGREGATE ERROR DATA FROM SESSIONS
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Aggregates errorMap from all sessions into one map.
 * @param {Array<Object>} sessions
 * @returns {{ aggregated: Object, totalErrors: number, sessionCount: number }}
 */
function hmAggregateErrors(sessions) {
  const aggregated = {};
  let totalErrors = 0;
  let sessionCount = 0;

  if (!Array.isArray(sessions)) return { aggregated, totalErrors, sessionCount };

  sessions.forEach((session) => {
    if (!session.errorMap || typeof session.errorMap !== "object") return;
    sessionCount++;
    Object.entries(session.errorMap).forEach(([char, count]) => {
      const n = parseInt(count, 10);
      if (isNaN(n) || n <= 0) return;
      // Normalize uppercase to lowercase so 'A' and 'a' aggregate together
      const k = char.length === 1 ? char.toLowerCase() : char;
      aggregated[k] = (aggregated[k] || 0) + n;
      totalErrors += n;
    });
  });

  return { aggregated, totalErrors, sessionCount };
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. MAIN HEATMAP MODULE
   ───────────────────────────────────────────────────────────────────────────── */

const HeatmapModule = {

  /**
   * Renders the keyboard heatmap into a given container.
   * @param {string} containerId
   * @param {Array<Object>} sessions
   */
  render(containerId, sessions) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { aggregated, totalErrors, sessionCount } = hmAggregateErrors(sessions);

    if (sessionCount === 0 || totalErrors === 0) {
      container.innerHTML = this._emptyHTML(sessionCount);
      return;
    }

    const maxErrors = Math.max(...Object.values(aggregated), 1);
    const sortedKeys = Object.entries(aggregated)
      .sort(([, a], [, b]) => b - a)
      .filter(([, c]) => c > 0);
    const top5 = sortedKeys.slice(0, 5);

    container.innerHTML = `
      <div class="heatmap-wrapper">

        <!-- Stats bar with 3D Toggle -->
        <div class="heatmap-stats-bar">
          <div class="heatmap-stat">
            <span class="heatmap-stat-value">${totalErrors.toLocaleString()}</span>
            <span class="heatmap-stat-label">Total Errors</span>
          </div>
          <div class="heatmap-stat">
            <span class="heatmap-stat-value">${sessionCount}</span>
            <span class="heatmap-stat-label">Sessions Analyzed</span>
          </div>
          <div class="heatmap-stat">
            <span class="heatmap-stat-value">${sortedKeys.length}</span>
            <span class="heatmap-stat-label">Affected Keys</span>
          </div>
          <div class="heatmap-stat">
            <span class="heatmap-stat-value" style="color:var(--clr-accent-red);">${top5[0] ? this._displayKey(top5[0][0]) : "—"}</span>
            <span class="heatmap-stat-label">Hardest Key</span>
          </div>
          <div style="margin-left:auto;">
            <button class="btn btn-secondary btn-sm" id="heatmap-3d-toggle-btn" type="button">
              ${this.isIsometric ? "📐 Flat 2D View" : "🧊 Isometric 3D View"}
            </button>
          </div>
        </div>

        <!-- Keyboard Container -->
        <div class="heatmap-keyboard-container ${this.isIsometric ? "heatmap-keyboard-isometric" : ""}"
             id="heatmap-keyboard-wrap"
             role="img"
             aria-label="Keyboard error heatmap — redder and higher elevated keys indicate more errors">
          ${this._buildKeyboard(aggregated, maxErrors)}
        </div>

        <!-- Gradient legend -->
        <div class="heatmap-legend" aria-hidden="true">
          <span class="heatmap-legend-label">Fewer errors (Flat)</span>
          <div class="heatmap-legend-gradient"></div>
          <span class="heatmap-legend-label">More errors (3D Elevated)</span>
        </div>

        <!-- Top keys breakdown -->
        ${top5.length > 0 ? this._buildTopKeys(top5, totalErrors) : ""}
      </div>
    `;

    // Hook 3D toggle button
    const toggleBtn = document.getElementById("heatmap-3d-toggle-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        this.isIsometric = !this.isIsometric;
        this.render(containerId, sessions);
      });
    }
  },

  isIsometric: false,

  /**
   * Visually flashes a keycap when typed in real time
   * @param {string} char
   */
  strikeKey(char) {
    if (!char) return;
    const key = char.toLowerCase();
    const keyEl = document.querySelector(`.heatmap-key[data-key="${key}"]`);
    if (keyEl) {
      keyEl.classList.remove("key-struck");
      void keyEl.offsetWidth;
      keyEl.classList.add("key-struck");
      setTimeout(() => {
        if (keyEl) keyEl.classList.remove("key-struck");
      }, 160);
    }
  },

  /** Builds the HTML keyboard with colored keys and 3D elevation. */
  _buildKeyboard(aggregated, maxErrors) {
    const rows = KEYBOARD_ROWS.map((row) => {
      const keys = row.map((kd) => {
        const isFunc = kd.key.startsWith("__");
        const errKey = kd.key.toLowerCase();
        const count = isFunc ? 0 : (aggregated[errKey] || 0);
        const intensity = isFunc || maxErrors === 0 ? 0 : count / maxErrors;
        const bg = hmIntensityToColor(intensity);
        const textColor = intensity > 0.55 ? "#fff" : "#b0bfcf";
        const flexStyle = kd.w && kd.w > 1 ? `flex:${kd.w};` : "flex:1;";
        const keyElev = 4 + Math.round(intensity * 12);
        const tooltip = isFunc
          ? kd.label
          : count > 0
            ? `${this._displayKey(kd.key)}: ${count} error${count !== 1 ? "s" : ""}`
            : `${this._displayKey(kd.key)}: no errors`;

        return `<div class="heatmap-key heatmap-key-3d${isFunc ? " heatmap-key-func" : ""}"
                     data-key="${errKey}"
                     style="${flexStyle} background:${bg}; color:${textColor}; --key-elev:${keyElev}px;"
                     title="${tooltip}"
                     aria-label="${tooltip}">
          <span class="heatmap-key-label">${kd.label}</span>
          ${count > 0 && !isFunc ? `<span class="heatmap-key-count">${count}</span>` : ""}
        </div>`;
      }).join("");
      return `<div class="heatmap-row">${keys}</div>`;
    }).join("");

    return `<div class="heatmap-keyboard">${rows}</div>`;
  },

  /** Builds the top mistyped keys bar chart section. */
  _buildTopKeys(top5, totalErrors) {
    const rows = top5.map(([key, count], idx) => {
      const pct = totalErrors > 0 ? ((count / totalErrors) * 100).toFixed(1) : "0.0";
      const barW = top5[0][1] > 0 ? Math.round((count / top5[0][1]) * 100) : 0;
      return `<div class="heatmap-topkey-row">
        <span class="heatmap-topkey-rank">#${idx + 1}</span>
        <span class="heatmap-topkey-pill">${this._displayKey(key)}</span>
        <div class="heatmap-topkey-bar-wrap">
          <div class="heatmap-topkey-bar" style="width:${barW}%;"></div>
        </div>
        <span class="heatmap-topkey-count">${count}</span>
        <span class="heatmap-topkey-pct">${pct}%</span>
      </div>`;
    }).join("");

    return `<div class="heatmap-topkeys-section">
      <p class="stat-label" style="margin-bottom:var(--sp-3); font-size:var(--fs-sm);">Top Mistyped Keys</p>
      <div class="heatmap-topkeys-list">${rows}</div>
    </div>`;
  },

  /** Human-readable key label. */
  _displayKey(key) {
    if (!key || key.startsWith("__")) return key.replace("__", "");
    if (key === " ") return "Space";
    return key.toUpperCase();
  },

  /** Empty state HTML. */
  _emptyHTML(sessionCount) {
    const msg = sessionCount === 0
      ? "Complete at least one typing test to see your keyboard error heatmap."
      : "No mistyped characters recorded in your sessions yet.";
    return `<div class="heatmap-empty-state">
      <div class="heatmap-empty-icon" aria-hidden="true">⌨️</div>
      <p class="heatmap-empty-title">No Heatmap Data Yet</p>
      <p class="heatmap-empty-desc">${msg}</p>
    </div>`;
  },
};
