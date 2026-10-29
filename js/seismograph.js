/**
 * TypeScope — Real-Time Cadence Seismograph (EKG Oscilloscope)
 * js/seismograph.js
 *
 * Visualizes typing rhythm dynamics in real time:
 *   • Captures exact millisecond intervals between consecutive keystrokes (IKIs)
 *   • Plots a glowing neon biofeedback waveform reminiscent of an EKG / seismograph
 *   • Identifies flow state rhythm vs. cognitive lag & hesitation spikes
 *   • Lightweight canvas rendering updating at 60 FPS
 */

"use strict";

const CadenceSeismograph = {
  canvas: null,
  ctx: null,
  lastTime: null,
  intervals: [],
  maxPoints: 40,
  animId: null,
  active: false,

  init(canvasId = "seismograph-canvas") {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.startLoop();
  },

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
  },

  reset() {
    this.lastTime = null;
    this.intervals = [];
    const valEl = document.getElementById("seismograph-val");
    if (valEl) valEl.textContent = "— ms";
  },

  recordKeystroke(isError = false) {
    const now = performance.now();
    if (!this.lastTime) {
      this.lastTime = now;
      return;
    }

    const delta = Math.round(now - this.lastTime);
    this.lastTime = now;

    // Filter extreme pauses (cap at 1000ms for clean visualization)
    const clampedDelta = Math.min(1000, Math.max(30, delta));

    this.intervals.push({
      delta: clampedDelta,
      rawDelta: delta,
      isError: !!isError,
    });

    if (this.intervals.length > this.maxPoints) {
      this.intervals.shift();
    }

    const valEl = document.getElementById("seismograph-val");
    if (valEl) {
      valEl.textContent = `${delta} ms`;
      if (delta < 180) {
        valEl.style.color = "var(--clr-accent-green)";
      } else if (delta < 350) {
        valEl.style.color = "var(--clr-accent-cyan)";
      } else {
        valEl.style.color = "var(--clr-accent-amber)";
      }
    }
  },

  startLoop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    const loop = () => {
      this.render();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  },

  render() {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    // Subtle oscilloscope grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.moveTo(0, h * 0.25);
    ctx.lineTo(w, h * 0.25);
    ctx.moveTo(0, h * 0.75);
    ctx.lineTo(w, h * 0.75);
    ctx.stroke();

    if (this.intervals.length < 2) {
      // Idle pulse line
      ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.6);
      ctx.lineTo(w, h * 0.6);
      ctx.stroke();
      return;
    }

    const step = w / (this.maxPoints - 1);
    const startOffset = (this.maxPoints - this.intervals.length) * step;

    // Compute Y coordinate: 50ms is bottom, 600ms is top
    const getY = (delta) => {
      const normalized = Math.min(1, Math.max(0, (delta - 40) / 500));
      return h - 8 - normalized * (h - 16);
    };

    // Draw glowing wave
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.5;

    for (let i = 0; i < this.intervals.length - 1; i++) {
      const pt1 = this.intervals[i];
      const pt2 = this.intervals[i + 1];

      const x1 = startOffset + i * step;
      const y1 = getY(pt1.delta);
      const x2 = startOffset + (i + 1) * step;
      const y2 = getY(pt2.delta);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      if (pt2.isError) {
        ctx.strokeStyle = "#f87171";
        ctx.shadowColor = "#f87171";
      } else if (pt2.delta < 180) {
        ctx.strokeStyle = "#34d399";
        ctx.shadowColor = "#34d399";
      } else if (pt2.delta < 320) {
        ctx.strokeStyle = "#38bdf8";
        ctx.shadowColor = "#38bdf8";
      } else {
        ctx.strokeStyle = "#fbbf24";
        ctx.shadowColor = "#fbbf24";
      }

      ctx.stroke();

      // Error marker pip
      if (pt2.isError) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(x2, y2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Reset shadow
    ctx.shadowBlur = 0;
  },
};
