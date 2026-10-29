/**
 * TypeScope — Power Mode & Combo Overdrive Engine
 * js/power-mode.js
 *
 * Provides arcade-style visual immersion:
 *   • Real-time particle spark physics radiating from the active typing caret
 *   • Dynamic combo streak tracking and animated multiplier badges
 *   • Controlled subtle screen-shake on combo milestones and error glitch flashes
 *   • Pure HTML5 Canvas & requestAnimationFrame with zero lag or frame drops
 */

"use strict";

const PowerMode = {
  canvas: null,
  ctx: null,
  particles: [],
  animId: null,
  enabled: true,
  streak: 0,
  maxStreak: 0,
  streakTimeout: null,
  comboBadgeEl: null,
  wrapperEl: null,

  init(wrapperId = "passage-card-wrapper") {
    this.wrapperEl = document.getElementById(wrapperId);
    if (!this.wrapperEl) return;

    // Check setting
    try {
      const raw = localStorage.getItem("typescope_settings");
      if (raw) {
        const s = JSON.parse(raw);
        if (s.powerMode !== undefined) this.enabled = !!s.powerMode;
      }
    } catch {}

    // Ensure canvas exists
    let canvas = document.getElementById("power-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "power-canvas";
      this.wrapperEl.style.position = "relative";
      this.wrapperEl.appendChild(canvas);
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    // Ensure combo badge HUD element exists
    let badge = document.getElementById("combo-hud-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "combo-hud-badge";
      badge.className = "combo-badge-hud";
      badge.innerHTML = `<span>🔥</span> <span id="combo-hud-text">COMBO 0</span>`;
      this.wrapperEl.appendChild(badge);
    }
    this.comboBadgeEl = badge;

    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.startLoop();
  },

  resize() {
    if (!this.canvas || !this.wrapperEl) return;
    const rect = this.wrapperEl.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  },

  reset() {
    this.streak = 0;
    this.particles = [];
    this.updateComboBadge(false);
  },

  setEnabled(val) {
    this.enabled = !!val;
    if (!this.enabled) {
      this.reset();
    }
  },

  /**
   * Called on every keypress from typing-engine.js
   * @param {Object} options - { isError, targetSpan }
   */
  onKey({ isError, targetSpan }) {
    if (!this.enabled) return;

    if (isError) {
      // Trigger error glitch & reset streak
      this.streak = 0;
      this.updateComboBadge(false);
      this.triggerGlitch();
      return;
    }

    this.streak++;
    if (this.streak > this.maxStreak) {
      this.maxStreak = this.streak;
    }

    this.updateComboBadge(true);

    // Get position relative to canvas wrapper
    let x = this.canvas.width / 2;
    let y = this.canvas.height / 2;

    if (targetSpan && this.wrapperEl) {
      const spanRect = targetSpan.getBoundingClientRect();
      const wrapRect = this.wrapperEl.getBoundingClientRect();
      x = spanRect.left - wrapRect.left + spanRect.width / 2;
      y = spanRect.top - wrapRect.top + spanRect.height / 2;
    }

    this.spawnParticles(x, y);

    // Milestone shake
    if (this.streak > 0 && this.streak % 25 === 0) {
      this.triggerShake();
    }
  },

  spawnParticles(x, y) {
    if (!this.ctx) return;

    // Palette shifts with streak
    let colors = ["#38bdf8", "#818cf8", "#c084fc"];
    if (this.streak >= 100) {
      colors = ["#ffe600", "#ff007f", "#00f0ff", "#39ff14"];
    } else if (this.streak >= 50) {
      colors = ["#f59e0b", "#ef4444", "#ec4899"];
    } else if (this.streak >= 25) {
      colors = ["#10b981", "#3b82f6", "#06b6d4"];
    }

    const count = Math.min(12, 5 + Math.floor(this.streak / 20));

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2, // slight upward bias
        size: 2.5 + Math.random() * 3,
        color,
        alpha: 1,
        decay: 0.025 + Math.random() * 0.035,
        gravity: 0.12,
      });
    }
  },

  updateComboBadge(active) {
    if (!this.comboBadgeEl) return;
    const textEl = document.getElementById("combo-hud-text");

    if (!active || this.streak < 10) {
      this.comboBadgeEl.classList.remove("active", "streak-godlike");
      return;
    }

    this.comboBadgeEl.classList.add("active");
    if (this.streak >= 100) {
      this.comboBadgeEl.classList.add("streak-godlike");
      if (textEl) textEl.textContent = `👑 GODLIKE x4 · ${this.streak}`;
    } else if (this.streak >= 60) {
      this.comboBadgeEl.classList.remove("streak-godlike");
      if (textEl) textEl.textContent = `⚡ HYPERDRIVE x3 · ${this.streak}`;
    } else if (this.streak >= 30) {
      this.comboBadgeEl.classList.remove("streak-godlike");
      if (textEl) textEl.textContent = `🔥 ON FIRE x2 · ${this.streak}`;
    } else {
      this.comboBadgeEl.classList.remove("streak-godlike");
      if (textEl) textEl.textContent = `COMBO · ${this.streak}`;
    }
  },

  triggerShake() {
    if (!this.wrapperEl) return;
    this.wrapperEl.classList.remove("screen-shake");
    void this.wrapperEl.offsetWidth; // trigger reflow
    this.wrapperEl.classList.add("screen-shake");
    setTimeout(() => {
      if (this.wrapperEl) this.wrapperEl.classList.remove("screen-shake");
    }, 300);
  },

  triggerGlitch() {
    if (!this.wrapperEl) return;
    this.wrapperEl.classList.remove("glitch-error");
    void this.wrapperEl.offsetWidth;
    this.wrapperEl.classList.add("glitch-error");
    setTimeout(() => {
      if (this.wrapperEl) this.wrapperEl.classList.remove("glitch-error");
    }, 220);
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
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  },
};
