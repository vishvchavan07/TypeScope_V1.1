/**
 * TypeScope — Interactive Visualizations & Charting Engine
 * js/charts.js
 *
 * Implements 4 core performance charts:
 *   1. WPM Progression (Line chart over sessions)
 *   2. Accuracy Trend (Line / Area chart over sessions)
 *   3. Speed by Difficulty (Comparative Bar chart)
 *   4. Typing Error Breakdown (Doughnut / Bar chart by category)
 *
 * Designed to work seamlessly with Chart.js, with built-in graceful HTML5 Canvas
 * fallbacks in case CDN is unreachable or offline.
 *
 * Related courses:
 *   JavaScript Essentials 1  — DOM, objects, canvas context
 *   JavaScript Essentials 2  — modules, third-party library integration, defensive fallbacks
 *   Introduction to Data Analytics Essentials — data visualization principles, charts
 */

"use strict";

const ChartManager = {
  instances: {
    wpm: null,
    accuracy: null,
    difficulty: null,
    error: null,
    overview: null,
  },

  /** Theme tokens for consistent dark analytics styling */
  theme: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    textColor: "#94a3b8",
    titleColor: "#f1f5f9",
    gridColor: "rgba(255, 255, 255, 0.07)",
    blue: "#4f8ef7",
    blueLight: "rgba(79, 142, 247, 0.15)",
    violet: "#8b6ff5",
    violetLight: "rgba(139, 111, 245, 0.15)",
    green: "#34d399",
    greenLight: "rgba(52, 211, 153, 0.15)",
    amber: "#fbbf24",
    amberLight: "rgba(251, 191, 36, 0.15)",
    red: "#f87171",
    redLight: "rgba(248, 113, 113, 0.15)",
  },

  /** Checks if Chart.js is available on window */
  isChartJsAvailable() {
    return typeof Chart !== "undefined";
  },

  /** Safely destroys a chart instance */
  destroy(key) {
    if (this.instances[key]) {
      try {
        this.instances[key].destroy();
      } catch (e) {
        console.warn(`ChartManager: error destroying ${key}`, e);
      }
      this.instances[key] = null;
    }
  },

  /** Destroys all active chart instances */
  destroyAll() {
    for (const key in this.instances) {
      this.destroy(key);
    }
  },

  /**
   * 1. WPM Progression Chart
   * Shows Net WPM and Gross WPM progression chronologically.
   *
   * @param {string} canvasId
   * @param {Array<Object>} sessions - chronologically sorted sessions
   */
  renderWPMProgression(canvasId, sessions) {
    this.destroy("wpm");
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (!Array.isArray(sessions) || sessions.length === 0) {
      this.showEmptyState(canvas, "No session data available for WPM progression.");
      return;
    }

    const labels = sessions.map((s, idx) => {
      const d = new Date(s.date);
      const shortDate = !isNaN(d.getTime())
        ? `${d.getMonth() + 1}/${d.getDate()}`
        : `#${idx + 1}`;
      return `Test ${idx + 1} (${shortDate})`;
    });

    const netWpms   = sessions.map((s) => (s.netWPM !== undefined ? s.netWPM : s.wpm) || 0);
    const grossWpms = sessions.map((s) => s.grossWPM || 0);

    if (this.isChartJsAvailable()) {
      const ctx = canvas.getContext("2d");

      // Blue gradient fill for Net WPM
      const netGradient = ctx.createLinearGradient(0, 0, 0, 300);
      netGradient.addColorStop(0, "rgba(79, 142, 247, 0.35)");
      netGradient.addColorStop(1, "rgba(79, 142, 247, 0.0)");

      this.instances.wpm = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Net WPM",
              data: netWpms,
              borderColor: this.theme.blue,
              backgroundColor: netGradient,
              fill: true,
              tension: 0.32,
              borderWidth: 2.5,
              pointBackgroundColor: this.theme.blue,
              pointHoverRadius: 6,
              pointRadius: sessions.length > 20 ? 2 : 4,
            },
            {
              label: "Gross WPM",
              data: grossWpms,
              borderColor: "rgba(148, 163, 184, 0.45)",
              borderDash: [5, 5],
              fill: false,
              tension: 0.3,
              borderWidth: 1.5,
              pointRadius: 0,
            },
          ],
        },
        options: this.getBaseOptions("Words Per Minute (WPM)", true),
      });
    } else {
      this.drawFallbackLineChart(canvas, labels, [
        { label: "Net WPM", data: netWpms, color: this.theme.blue },
        { label: "Gross WPM", data: grossWpms, color: this.theme.textColor, dashed: true },
      ], "WPM Progression");
    }
  },

  /**
   * Overview Mini WPM Progression Chart
   * Shows recent Net WPM trend on the Overview dashboard.
   *
   * @param {string} canvasId
   * @param {Array<Object>} sessions
   */
  renderOverviewChart(canvasId, sessions) {
    this.destroy("overview");
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (!Array.isArray(sessions) || sessions.length === 0) {
      this.showEmptyState(canvas, "Complete a test to see your performance trajectory.");
      return;
    }

    // Sort chronologically (oldest to newest)
    const chronological = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = chronological.map((s, idx) => `Test ${idx + 1}`);
    const netWpms = chronological.map((s) => (s.netWPM !== undefined ? s.netWPM : s.wpm) || 0);

    if (this.isChartJsAvailable()) {
      const ctx = canvas.getContext("2d");
      const gradient = ctx.createLinearGradient(0, 0, 0, 240);
      gradient.addColorStop(0, "rgba(79, 142, 247, 0.35)");
      gradient.addColorStop(1, "rgba(79, 142, 247, 0.0)");

      this.instances.overview = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Net WPM",
              data: netWpms,
              borderColor: this.theme.blue,
              backgroundColor: gradient,
              fill: true,
              tension: 0.35,
              borderWidth: 2.5,
              pointBackgroundColor: this.theme.blue,
              pointRadius: chronological.length > 15 ? 2 : 4,
            },
          ],
        },
        options: this.getBaseOptions("Net WPM", false),
      });
    } else {
      this.drawFallbackLineChart(canvas, labels, [
        { label: "Net WPM", data: netWpms, color: this.theme.blue, dashed: false },
      ], "Net WPM Progression");
    }
  },

  /**
   * 2. Accuracy Trend Chart
   * Shows Accuracy % over time.
   *
   * @param {string} canvasId
   * @param {Array<Object>} sessions
   */
  renderAccuracyTrend(canvasId, sessions) {
    this.destroy("accuracy");
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (!Array.isArray(sessions) || sessions.length === 0) {
      this.showEmptyState(canvas, "No session data available for accuracy trend.");
      return;
    }

    const labels = sessions.map((s, idx) => `#${idx + 1}`);
    const accs = sessions.map((s) => s.accuracy || 0);

    if (this.isChartJsAvailable()) {
      const ctx = canvas.getContext("2d");

      const accGradient = ctx.createLinearGradient(0, 0, 0, 260);
      accGradient.addColorStop(0, "rgba(52, 211, 153, 0.35)");
      accGradient.addColorStop(1, "rgba(52, 211, 153, 0.0)");

      this.instances.accuracy = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Accuracy (%)",
              data: accs,
              borderColor: this.theme.green,
              backgroundColor: accGradient,
              fill: true,
              tension: 0.3,
              borderWidth: 2.5,
              pointBackgroundColor: this.theme.green,
              pointHoverRadius: 6,
              pointRadius: sessions.length > 20 ? 2 : 4,
            },
          ],
        },
        options: {
          ...this.getBaseOptions("Accuracy (%)", false),
          scales: {
            ...this.getBaseOptions("Accuracy (%)", false).scales,
            y: {
              ...this.getBaseOptions("Accuracy (%)", false).scales.y,
              min: Math.max(0, Math.floor((Math.min(...accs) - 5) / 5) * 5),
              max: 100,
            },
          },
        },
      });
    } else {
      this.drawFallbackLineChart(canvas, labels, [
        { label: "Accuracy (%)", data: accs, color: this.theme.green },
      ], "Accuracy Trend");
    }
  },

  /**
   * 3. Speed by Difficulty Chart
   * Bar chart comparing Net WPM across Beginner, Intermediate, and Advanced tiers.
   *
   * @param {string} canvasId
   * @param {Object} diffStats - from calcSpeedByDifficulty()
   */
  renderDifficultyComparison(canvasId, diffStats) {
    this.destroy("difficulty");
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const labels = ["Beginner", "Intermediate", "Advanced"];
    const data = [
      diffStats.beginner ? diffStats.beginner.avgNetWPM : 0,
      diffStats.intermediate ? diffStats.intermediate.avgNetWPM : 0,
      diffStats.advanced ? diffStats.advanced.avgNetWPM : 0,
    ];
    const counts = [
      diffStats.beginner ? diffStats.beginner.count : 0,
      diffStats.intermediate ? diffStats.intermediate.count : 0,
      diffStats.advanced ? diffStats.advanced.count : 0,
    ];

    const hasAnyData = counts.some((c) => c > 0);
    if (!hasAnyData) {
      this.showEmptyState(canvas, "No tests completed across difficulty tiers yet.");
      return;
    }

    if (this.isChartJsAvailable()) {
      const ctx = canvas.getContext("2d");
      this.instances.difficulty = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Average Net WPM",
              data,
              backgroundColor: [
                "rgba(52, 211, 153, 0.75)",  // Green for Beginner
                "rgba(251, 191, 36, 0.75)",  // Amber for Intermediate
                "rgba(248, 113, 113, 0.75)", // Red for Advanced
              ],
              borderColor: [
                this.theme.green,
                this.theme.amber,
                this.theme.red,
              ],
              borderWidth: 1.5,
              borderRadius: 6,
              maxBarThickness: 50,
            },
          ],
        },
        options: {
          ...this.getBaseOptions("Average Net WPM", false),
          plugins: {
            ...this.getBaseOptions("Average Net WPM", false).plugins,
            tooltip: {
              callbacks: {
                label(context) {
                  const idx = context.dataIndex;
                  const c = counts[idx];
                  return `${context.parsed.y} WPM (${c} test${c === 1 ? "" : "s"})`;
                },
              },
            },
          },
        },
      });
    } else {
      this.drawFallbackBarChart(canvas, labels, data, counts);
    }
  },

  /**
   * 4. Typing Error Breakdown Chart
   * Doughnut chart showing error categories.
   *
   * @param {string} canvasId
   * @param {Object} errorInfo - from calcErrorBreakdown()
   */
  renderErrorBreakdown(canvasId, errorInfo) {
    this.destroy("error");
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const cats = errorInfo.categories || {};
    const labels = ["Letters", "Punctuation", "Digits", "Spaces", "Symbols/Other"];
    const data = [
      cats.letters || 0,
      cats.punctuation || 0,
      cats.digits || 0,
      cats.spaces || 0,
      cats.other || 0,
    ];

    const total = data.reduce((a, b) => a + b, 0);
    if (total === 0) {
      this.showEmptyState(canvas, "Zero uncorrected errors recorded! Excellent accuracy.");
      return;
    }

    if (this.isChartJsAvailable()) {
      const ctx = canvas.getContext("2d");
      this.instances.error = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels,
          datasets: [
            {
              data,
              backgroundColor: [
                "rgba(79, 142, 247, 0.8)",  // Letters: Blue
                "rgba(139, 111, 245, 0.8)", // Punctuation: Violet
                "rgba(251, 191, 36, 0.8)",  // Digits: Amber
                "rgba(52, 211, 153, 0.8)",  // Spaces: Green
                "rgba(248, 113, 113, 0.8)", // Other: Red
              ],
              borderColor: "rgba(10, 15, 30, 0.9)",
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "right",
              labels: {
                color: this.theme.textColor,
                font: { family: this.theme.fontFamily, size: 12 },
                boxWidth: 14,
                padding: 12,
              },
            },
            tooltip: {
              backgroundColor: "#0c1427",
              titleColor: this.theme.titleColor,
              bodyColor: this.theme.textColor,
              borderColor: "#2a385f",
              borderWidth: 1,
              padding: 10,
              cornerRadius: 6,
              callbacks: {
                label(context) {
                  const val = context.parsed;
                  const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                  return `${context.label}: ${val} (${pct}%)`;
                },
              },
            },
          },
        },
      });
    } else {
      this.drawFallbackDoughnutChart(canvas, labels, data, total);
    }
  },

  /** Common base chart options for Chart.js */
  getBaseOptions(yTitle, showLegend = true) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: showLegend,
          labels: {
            color: this.theme.textColor,
            font: { family: this.theme.fontFamily, size: 12 },
            boxWidth: 14,
          },
        },
        tooltip: {
          backgroundColor: "#0c1427",
          titleColor: this.theme.titleColor,
          bodyColor: this.theme.textColor,
          borderColor: "#2a385f",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 6,
        },
      },
      scales: {
        x: {
          grid: { color: this.theme.gridColor },
          ticks: {
            color: this.theme.textColor,
            font: { family: this.theme.fontFamily, size: 11 },
          },
        },
        y: {
          grid: { color: this.theme.gridColor },
          title: {
            display: !!yTitle,
            text: yTitle,
            color: this.theme.textColor,
            font: { family: this.theme.fontFamily, size: 11 },
          },
          ticks: {
            color: this.theme.textColor,
            font: { family: this.theme.fontFamily, size: 11 },
          },
          beginAtZero: true,
        },
      },
    };
  },

  /** Renders a styled empty state inside a canvas */
  showEmptyState(canvas, message) {
    const parent = canvas.parentElement;
    if (!parent) return;

    // Check if an existing empty message exists
    let emptyEl = parent.querySelector(".chart-inline-empty");
    if (!emptyEl) {
      emptyEl = document.createElement("div");
      emptyEl.className = "chart-inline-empty";
      parent.appendChild(emptyEl);
    }

    emptyEl.style.display = "flex";
    canvas.style.display = "none";
    emptyEl.innerHTML = `
      <div style="text-align:center; padding:2rem 1rem; color:var(--clr-text-muted);">
        <div style="font-size:2rem; margin-bottom:0.5rem; opacity:0.6;">📊</div>
        <p style="font-size:var(--fs-sm); margin:0;">${message}</p>
      </div>
    `;
  },

  /* ─────────────────────────────────────────────────────────────────────────────
     NATIVE HTML5 CANVAS FALLBACK DRAWING METHODS
     Used if Chart.js is not loaded or offline
     ───────────────────────────────────────────────────────────────────────────── */

  drawFallbackLineChart(canvas, labels, datasets, title) {
    canvas.style.display = "block";
    const ctx = canvas.getContext("2d");
    const w = (canvas.width = canvas.parentElement.clientWidth || 400);
    const h = (canvas.height = canvas.parentElement.clientHeight || 240);

    ctx.clearRect(0, 0, w, h);

    const padLeft = 45;
    const padBottom = 35;
    const padTop = 25;
    const padRight = 20;

    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    // Determine max value
    let maxVal = 0;
    datasets.forEach((ds) => {
      maxVal = Math.max(maxVal, ...ds.data);
    });
    maxVal = Math.ceil((maxVal * 1.15) / 10) * 10 || 50;

    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";

    for (let i = 0; i <= 4; i++) {
      const y = padTop + (chartH / 4) * i;
      const val = Math.round(maxVal - (maxVal / 4) * i);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
      ctx.fillText(String(val), 8, y + 3);
    }

    // Draw datasets
    datasets.forEach((ds) => {
      if (ds.data.length === 0) return;
      ctx.strokeStyle = ds.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      if (ds.dashed) {
        ctx.setLineDash([4, 4]);
      } else {
        ctx.setLineDash([]);
      }

      ds.data.forEach((val, idx) => {
        const x = padLeft + (chartW / Math.max(1, ds.data.length - 1)) * idx;
        const y = padTop + chartH - (val / maxVal) * chartH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw points
      if (!ds.dashed) {
        ctx.fillStyle = ds.color;
        ds.data.forEach((val, idx) => {
          const x = padLeft + (chartW / Math.max(1, ds.data.length - 1)) * idx;
          const y = padTop + chartH - (val / maxVal) * chartH;
          ctx.beginPath();
          ctx.arc(x, y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });
  },

  drawFallbackBarChart(canvas, labels, data, counts) {
    canvas.style.display = "block";
    const ctx = canvas.getContext("2d");
    const w = (canvas.width = canvas.parentElement.clientWidth || 400);
    const h = (canvas.height = canvas.parentElement.clientHeight || 240);

    ctx.clearRect(0, 0, w, h);

    const padLeft = 45;
    const padBottom = 35;
    const padTop = 25;
    const padRight = 20;

    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    const maxVal = Math.ceil((Math.max(...data, 20) * 1.2) / 10) * 10;
    const barWidth = Math.min(50, (chartW / labels.length) * 0.5);

    const colors = [this.theme.green, this.theme.amber, this.theme.red];

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";

    for (let i = 0; i <= 4; i++) {
      const y = padTop + (chartH / 4) * i;
      const val = Math.round(maxVal - (maxVal / 4) * i);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
      ctx.fillText(String(val), 8, y + 3);
    }

    // Bars
    labels.forEach((label, idx) => {
      const xCenter = padLeft + (chartW / labels.length) * (idx + 0.5);
      const val = data[idx];
      const barH = (val / maxVal) * chartH;
      const y = padTop + chartH - barH;

      ctx.fillStyle = colors[idx % colors.length];
      ctx.fillRect(xCenter - barWidth / 2, y, barWidth, barH);

      // Label
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "center";
      ctx.fillText(label, xCenter, h - 12);
      ctx.fillText(`${val} WPM`, xCenter, y - 5);
    });
    ctx.textAlign = "left";
  },

  drawFallbackDoughnutChart(canvas, labels, data, total) {
    canvas.style.display = "block";
    const ctx = canvas.getContext("2d");
    const w = (canvas.width = canvas.parentElement.clientWidth || 400);
    const h = (canvas.height = canvas.parentElement.clientHeight || 240);

    ctx.clearRect(0, 0, w, h);

    const centerX = w * 0.4;
    const centerY = h * 0.5;
    const radius = Math.min(centerX - 20, centerY - 20);

    const colors = [
      this.theme.blue,
      this.theme.violet,
      this.theme.amber,
      this.theme.green,
      this.theme.red,
    ];

    let startAngle = -Math.PI / 2;

    data.forEach((val, idx) => {
      if (val === 0) return;
      const sliceAngle = (val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(centerX, centerY, radius * 0.55, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[idx % colors.length];
      ctx.fill();
      startAngle += sliceAngle;
    });

    // Legend
    let legendY = 30;
    ctx.textAlign = "left";
    ctx.font = "11px sans-serif";
    labels.forEach((label, idx) => {
      const val = data[idx];
      if (val === 0) return;
      ctx.fillStyle = colors[idx % colors.length];
      ctx.fillRect(w * 0.72, legendY, 10, 10);
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`${label}: ${val}`, w * 0.72 + 16, legendY + 9);
      legendY += 22;
    });
  },
};
