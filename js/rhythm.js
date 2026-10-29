/**
 * TypeScope — Real-Time Typing Rhythm Analysis
 * js/rhythm.js
 *
 * Tracks typing performance in short time windows (5-second intervals)
 * during an active test, then renders a post-test chart showing how speed
 * varied throughout the test.
 *
 * Architecture:
 *   - The typing engine (typing-engine.js) calls RhythmModule.recordSnapshot()
 *     every 5 seconds while a test is running.
 *   - Each snapshot records { intervalIndex, wpm, chars, timestamp }
 *   - After the test finishes, RhythmModule.renderChart() plots the snapshots
 *     as a line chart using Chart.js (or a simple HTML fallback).
 *   - Snapshots are attached to the session result and stored in localStorage
 *     so historical rhythm charts can be viewed later (optional).
 *   - Short tests (< 10 seconds) and tests with only 1 interval are handled
 *     gracefully with an appropriate message.
 *
 * Related courses:
 *   JavaScript Essentials 2  - closures, setInterval, data collection
 *   Introduction to Data Analytics Essentials - time-series analysis, trend detection
 */

"use strict";

/* ─────────────────────────────────────────────────────────────────────────────
   1. RHYTHM STATE
   Holds the current test's interval snapshots.
   Reset at the start of each test by the engine.
   ───────────────────────────────────────────────────────────────────────────── */
const RhythmState = {
  /** Array of { intervalLabel, grossWPM, netWPM, chars } per 5-second window */
  snapshots: [],
  /** Timestamp of the last snapshot (to compute per-interval delta) */
  lastSnapshotTime: null,
  /** Character count at the last snapshot */
  lastCharCount: 0,
  /** Error count at the last snapshot */
  lastErrorCount: 0,
};

/* ─────────────────────────────────────────────────────────────────────────────
   2. RHYTHM MODULE
   ───────────────────────────────────────────────────────────────────────────── */
const RhythmModule = {

  /**
   * Resets all rhythm tracking state.
   * Called by the typing engine at the start of each test.
   */
  reset() {
    RhythmState.snapshots = [];
    RhythmState.lastSnapshotTime = null;
    RhythmState.lastCharCount = 0;
    RhythmState.lastErrorCount = 0;
  },

  /**
   * Records a 5-second interval snapshot.
   * Called by the typing engine's countdown interval when elapsed is a multiple of 5.
   *
   * @param {Object} params
   * @param {number} params.elapsedSeconds - total seconds since test start
   * @param {number} params.totalCharsTyped - all keystrokes so far (including errors)
   * @param {number} params.correctChars - correctly typed chars so far
   * @param {number} params.uncorrectedErrors - current uncorrected error count
   */
  recordSnapshot({ elapsedSeconds, totalCharsTyped, correctChars, uncorrectedErrors }) {
    const now = Date.now();

    // Compute this interval's delta characters and duration
    const deltaChars = totalCharsTyped - RhythmState.lastCharCount;
    const deltaTime = RhythmState.lastSnapshotTime
      ? (now - RhythmState.lastSnapshotTime) / 1000
      : elapsedSeconds;

    // Guard against zero time
    const intervalSeconds = Math.max(deltaTime, 0.1);

    // Gross WPM for this 5-second window (characters typed / 5 * 12 = WPM equiv)
    // Standard: (chars / 5) / (time_in_minutes)
    const intervalGrossWPM = Math.round((deltaChars / 5) / (intervalSeconds / 60));
    // Net WPM: penalized by uncorrected errors relative to interval chars
    const intervalNetWPM = Math.max(0, intervalGrossWPM);

    RhythmState.snapshots.push({
      label: `${Math.round(elapsedSeconds)}s`,
      grossWPM: intervalGrossWPM,
      netWPM: intervalNetWPM,
      chars: deltaChars,
      elapsedSeconds: Math.round(elapsedSeconds),
    });

    RhythmState.lastSnapshotTime = now;
    RhythmState.lastCharCount = totalCharsTyped;
    RhythmState.lastErrorCount = uncorrectedErrors;
  },

  /**
   * Returns a copy of the current snapshots array.
   * Used by the engine to attach rhythm data to the session result.
   * @returns {Array}
   */
  getSnapshots() {
    return [...RhythmState.snapshots];
  },

  /**
   * Renders the rhythm chart after a test finishes.
   * @param {string} canvasId - canvas element ID
   * @param {Array} snapshots - rhythm snapshot array (from session or current state)
   */
  renderChart(canvasId, snapshots) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const data = Array.isArray(snapshots) ? snapshots : RhythmState.snapshots;

    if (!data || data.length < 2) {
      this._showEmpty(canvas, data && data.length === 1
        ? "Only one interval captured. Complete a longer test for rhythm analysis."
        : "No rhythm data available. Complete a typing test to see your speed rhythm.");
      return;
    }

    // Detect Chart.js availability
    if (typeof Chart === "undefined") {
      this._renderFallback(canvas, data);
      return;
    }

    // Destroy any existing chart on this canvas
    const existingKey = "rhythm_" + canvasId;
    if (this._chartInstances) {
      if (this._chartInstances[existingKey]) {
        try { this._chartInstances[existingKey].destroy(); } catch (e) {}
      }
    } else {
      this._chartInstances = {};
    }

    const labels = data.map((s) => s.label);
    const wpmValues = data.map((s) => s.grossWPM || 0);

    // Compute average for reference line
    const avg = wpmValues.length > 0
      ? Math.round(wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length)
      : 0;

    const theme = {
      blue: "#4f8ef7",
      blueLight: "rgba(79, 142, 247, 0.18)",
      green: "#34d399",
      textColor: "#94a3b8",
      titleColor: "#f1f5f9",
      gridColor: "rgba(255, 255, 255, 0.07)",
    };

    const ctx = canvas.getContext("2d");

    this._chartInstances[existingKey] = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "WPM (per 5s window)",
            data: wpmValues,
            borderColor: theme.blue,
            backgroundColor: theme.blueLight,
            borderWidth: 2.5,
            pointRadius: 5,
            pointBackgroundColor: theme.blue,
            pointBorderColor: "#0d1117",
            pointBorderWidth: 2,
            fill: true,
            tension: 0.4,
          },
          {
            label: `Avg ${avg} WPM`,
            data: wpmValues.map(() => avg),
            borderColor: theme.green,
            borderWidth: 1.5,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            tension: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: "easeInOutQuart" },
        plugins: {
          legend: {
            labels: {
              color: theme.textColor,
              font: { family: "'Inter', sans-serif", size: 11 },
              boxWidth: 12,
            },
          },
          tooltip: {
            backgroundColor: "#1a2035",
            borderColor: "#2a3347",
            borderWidth: 1,
            titleColor: theme.titleColor,
            bodyColor: theme.textColor,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} WPM`,
              afterLabel: (ctx) => {
                const snap = data[ctx.dataIndex];
                return snap ? `${snap.chars} chars typed` : "";
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textColor,
              font: { family: "'Inter', sans-serif", size: 11 },
            },
            title: {
              display: true,
              text: "Elapsed Time",
              color: theme.textColor,
              font: { size: 11 },
            },
          },
          y: {
            grid: { color: theme.gridColor },
            ticks: {
              color: theme.textColor,
              font: { family: "'Inter', sans-serif", size: 11 },
            },
            title: {
              display: true,
              text: "WPM",
              color: theme.textColor,
              font: { size: 11 },
            },
            beginAtZero: true,
            suggestedMin: 0,
          },
        },
      },
    });
  },

  /**
   * Renders the rhythm summary stats below the chart.
   * @param {string} containerId - container for stats row
   * @param {Array} snapshots
   */
  renderStats(containerId, snapshots) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const data = Array.isArray(snapshots) && snapshots.length > 0
      ? snapshots
      : RhythmState.snapshots;

    if (!data || data.length === 0) {
      container.innerHTML = "";
      return;
    }

    const wpmValues = data.map((s) => s.grossWPM || 0).filter((v) => v >= 0);
    if (wpmValues.length === 0) { container.innerHTML = ""; return; }

    const avg = Math.round(wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length);
    const peak = Math.max(...wpmValues);
    const low = Math.min(...wpmValues);
    const firstHalf = wpmValues.slice(0, Math.floor(wpmValues.length / 2));
    const secondHalf = wpmValues.slice(Math.floor(wpmValues.length / 2));
    const avgFirst = firstHalf.length ? Math.round(firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length) : 0;
    const avgSecond = secondHalf.length ? Math.round(secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length) : 0;
    const trend = avgSecond > avgFirst + 3 ? "📈 Improving" : avgFirst > avgSecond + 3 ? "📉 Slowing" : "➡️ Consistent";

    container.innerHTML = `
      <div class="rhythm-stats-row">
        <div class="rhythm-stat"><span class="rhythm-stat-value">${avg}</span><span class="rhythm-stat-label">Avg WPM</span></div>
        <div class="rhythm-stat"><span class="rhythm-stat-value" style="color:var(--clr-accent-green);">${peak}</span><span class="rhythm-stat-label">Peak WPM</span></div>
        <div class="rhythm-stat"><span class="rhythm-stat-value" style="color:var(--clr-accent-amber);">${low}</span><span class="rhythm-stat-label">Slowest</span></div>
        <div class="rhythm-stat"><span class="rhythm-stat-value" style="font-size:var(--fs-base);">${trend}</span><span class="rhythm-stat-label">Trend</span></div>
      </div>
    `;
  },

  /** Shows an empty/placeholder message on the canvas area. */
  _showEmpty(canvas, message) {
    // Use parent container if possible
    const parent = canvas.parentElement;
    if (parent) {
      parent.innerHTML = `
        <div class="rhythm-empty-state">
          <div style="font-size:2rem; margin-bottom:var(--sp-3);" aria-hidden="true">📉</div>
          <p class="rhythm-empty-text">${message}</p>
        </div>`;
    }
  },

  /** Renders a simple HTML bar-chart fallback when Chart.js is not available. */
  _renderFallback(canvas, data) {
    const max = Math.max(...data.map((s) => s.grossWPM || 0), 1);
    const bars = data.map((s) => {
      const h = Math.round(((s.grossWPM || 0) / max) * 100);
      return `<div class="rhythm-fallback-bar-wrap" title="${s.label}: ${s.grossWPM} WPM">
        <div class="rhythm-fallback-bar" style="height:${h}%;"></div>
        <span class="rhythm-fallback-label">${s.label}</span>
      </div>`;
    }).join("");

    const parent = canvas.parentElement;
    if (parent) {
      parent.innerHTML = `<div class="rhythm-fallback-chart">${bars}</div>`;
    }
  },

  /** Computed chart instance registry */
  _chartInstances: {},
};
