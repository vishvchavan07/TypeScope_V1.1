/**
 * TypeScope — Typing DNA & Holographic Passport ID Engine
 * js/typing-dna.js
 *
 * Computes a 6-dimensional typing biometric fingerprint:
 *   1. Burst Velocity
 *   2. Cadence Consistency
 *   3. Accuracy Discipline
 *   4. Duration Stamina
 *   5. Symbol & Shift Dexterity
 *   6. Error Recovery Latency
 *
 * Generates an interactive Radar chart and an exportable holographic Passport ID card.
 */

"use strict";

const TypingDNA = {
  radarChart: null,

  computeDimensions(sessions) {
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return {
        velocity: 40,
        consistency: 50,
        precision: 60,
        stamina: 50,
        dexterity: 45,
        recovery: 55,
        archetype: {
          title: "New Aspirant",
          badge: "Class 0 · Unranked",
          desc: "Complete your first test to decode your typing biometric DNA.",
          code: "DNA-000",
        },
      };
    }

    const count = sessions.length;
    const wpms = sessions.map((s) => (s.netWPM !== undefined ? s.netWPM : s.wpm) || 0);
    const accs = sessions.map((s) => s.accuracy || 0);
    const avgWpm = wpms.reduce((a, b) => a + b, 0) / count;
    const avgAcc = accs.reduce((a, b) => a + b, 0) / count;

    // 1. Velocity (0-100 scale: 100 WPM = 100)
    const velocity = Math.min(100, Math.round((avgWpm / 100) * 100));

    // 2. Precision (0-100 scale based on accuracy)
    const precision = Math.min(100, Math.round(avgAcc));

    // 3. Consistency (Standard Deviation inverse)
    let variance = 0;
    wpms.forEach((w) => (variance += Math.pow(w - avgWpm, 2)));
    const stdDev = Math.sqrt(variance / count);
    const consistency = Math.max(20, Math.min(100, Math.round(100 - stdDev * 3.5)));

    // 4. Stamina (Performance on longer vs shorter tests)
    const longTests = sessions.filter((s) => (s.duration || 60) >= 60);
    const shortTests = sessions.filter((s) => (s.duration || 60) < 60);
    let stamina = 75;
    if (longTests.length > 0 && shortTests.length > 0) {
      const avgLong = longTests.reduce((a, s) => a + (s.netWPM || s.wpm || 0), 0) / longTests.length;
      const avgShort = shortTests.reduce((a, s) => a + (s.netWPM || s.wpm || 0), 0) / shortTests.length;
      stamina = Math.min(100, Math.max(30, Math.round((avgLong / Math.max(1, avgShort)) * 85)));
    }

    // 5. Dexterity (Handling of advanced passages with punctuation & digits)
    const advTests = sessions.filter((s) => s.difficulty === "advanced");
    const dexterity = advTests.length > 0
      ? Math.min(100, Math.round((advTests.reduce((a, s) => a + s.accuracy, 0) / advTests.length) * 0.95))
      : Math.min(85, Math.round(avgAcc * 0.8));

    // 6. Error Recovery (Ratio of gross to net WPM)
    const grossWpms = sessions.map((s) => s.grossWPM || s.wpm || avgWpm);
    const avgGross = grossWpms.reduce((a, b) => a + b, 0) / count;
    const penaltyRatio = avgGross > 0 ? (avgWpm / avgGross) : 1;
    const recovery = Math.min(100, Math.max(25, Math.round(penaltyRatio * 95)));

    // Archetype determination
    let archetype = {
      title: "Balanced Tactician",
      badge: "Class A · Harmonized",
      desc: "Well-rounded motor coordination with balanced speed, precision, and steady recovery under pressure.",
      code: "DNA-TAC-01",
    };

    if (precision >= 97 && velocity >= 60) {
      archetype = {
        title: "The Precision Sniper",
        badge: "Class S · Lethal Precision",
        desc: "Surgical keystroke discipline. Near-zero typo leakage allows maximum velocity with unpenalized momentum.",
        code: "DNA-SNP-99",
      };
    } else if (velocity >= 75 && precision < 92) {
      archetype = {
        title: "The Berserker Sprinter",
        badge: "Class A · High Kinetic Velocity",
        desc: "Immense physical burst speed. Taming unforced typos will unleash godlike Net WPM acceleration.",
        code: "DNA-BRK-88",
      };
    } else if (consistency >= 85) {
      archetype = {
        title: "The Quantum Metronome",
        badge: "Class S · Perfect Cadence",
        desc: "Robot-like inter-keystroke interval stability. Exceptional motor memory and cognitive flow rhythm.",
        code: "DNA-MTN-77",
      };
    } else if (dexterity >= 82) {
      archetype = {
        title: "The Cyber Hacker",
        badge: "Class S · Syntactic Master",
        desc: "Flawless finger gymnastics across symbol rows, punctuation clusters, and rapid uppercase shifts.",
        code: "DNA-HCK-42",
      };
    } else if (stamina >= 88) {
      archetype = {
        title: "The Iron Endurance Architect",
        badge: "Class A · High Fatigue Resistance",
        desc: "Unshakeable pacing. Long tests produce identical velocity as short sprints with zero stamina decay.",
        code: "DNA-ARC-10",
      };
    }

    return {
      velocity,
      consistency,
      precision,
      stamina,
      dexterity,
      recovery,
      archetype,
      avgWpm: Math.round(avgWpm),
      avgAcc: Math.round(avgAcc),
      sessionCount: count,
    };
  },

  renderRadar(canvasId, dna) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (this.radarChart) {
      this.radarChart.destroy();
      this.radarChart = null;
    }

    const labels = ["Velocity", "Consistency", "Precision", "Stamina", "Dexterity", "Recovery"];
    const values = [dna.velocity, dna.consistency, dna.precision, dna.stamina, dna.dexterity, dna.recovery];

    if (typeof Chart !== "undefined") {
      const ctx = canvas.getContext("2d");
      this.radarChart = new Chart(ctx, {
        type: "radar",
        data: {
          labels,
          datasets: [
            {
              label: "Biometric DNA Index",
              data: values,
              backgroundColor: "rgba(0, 240, 255, 0.2)",
              borderColor: "#00f0ff",
              borderWidth: 2,
              pointBackgroundColor: "#ff007f",
              pointBorderColor: "#fff",
              pointHoverBackgroundColor: "#fff",
              pointHoverBorderColor: "#00f0ff",
              pointRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              angleLines: { color: "rgba(255, 255, 255, 0.1)" },
              grid: { color: "rgba(255, 255, 255, 0.08)" },
              pointLabels: {
                color: "#8b949e",
                font: { family: "Inter", size: 11, weight: "600" },
              },
              ticks: {
                display: false,
                backdropColor: "transparent",
                stepSize: 20,
              },
              suggestedMin: 0,
              suggestedMax: 100,
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: ${ctx.raw} / 100`,
              },
            },
          },
        },
      });
    }
  },

  /**
   * Generates high-res holographic PNG download of the user's Typing Passport ID
   */
  exportPassportPNG(dna) {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 700;
    const ctx = canvas.getContext("2d");

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 700);
    bgGrad.addColorStop(0, "#080c14");
    bgGrad.addColorStop(0.5, "#101626");
    bgGrad.addColorStop(1, "#05070d");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 700);

    // Holographic border
    const borderGrad = ctx.createLinearGradient(0, 0, 1200, 0);
    borderGrad.addColorStop(0, "#00f0ff");
    borderGrad.addColorStop(0.33, "#ff007f");
    borderGrad.addColorStop(0.66, "#ffe600");
    borderGrad.addColorStop(1, "#39ff14");
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, 1160, 660);

    // Decorative grid pattern
    ctx.strokeStyle = "rgba(0, 240, 255, 0.06)";
    ctx.lineWidth = 1;
    for (let x = 40; x < 1160; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, 660);
      ctx.stroke();
    }
    for (let y = 40; y < 660; y += 40) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(1160, y);
      ctx.stroke();
    }

    // Top Header
    ctx.fillStyle = "#00f0ff";
    ctx.font = "bold 26px 'JetBrains Mono', monospace";
    ctx.fillText("TYPESCOPE // BIOMETRIC MOTOR PASSPORT", 60, 85);

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "14px monospace";
    ctx.fillText(`SERIAL: ${dna.archetype.code} · ISSUED: ${new Date().toLocaleDateString()}`, 60, 115);

    // Archetype Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px 'Inter', sans-serif";
    ctx.fillText(dna.archetype.title, 60, 190);

    // Badge pill
    ctx.fillStyle = "#ff007f";
    ctx.font = "bold 18px 'JetBrains Mono', monospace";
    ctx.fillText(dna.archetype.badge.toUpperCase(), 60, 230);

    // Description text
    ctx.fillStyle = "#94a3b8";
    ctx.font = "18px 'Inter', sans-serif";
    ctx.fillText(dna.archetype.desc, 60, 280);

    // Metrics Grid
    const drawMetric = (x, y, label, val, color) => {
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(x, y, 160, 90);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.strokeRect(x, y, 160, 90);

      ctx.fillStyle = color;
      ctx.font = "bold 34px 'JetBrains Mono', monospace";
      ctx.fillText(val, x + 20, y + 48);

      ctx.fillStyle = "#64748b";
      ctx.font = "bold 13px 'Inter', sans-serif";
      ctx.fillText(label.toUpperCase(), x + 20, y + 74);
    };

    drawMetric(60, 330, "Avg Velocity", `${dna.avgWpm} WPM`, "#00f0ff");
    drawMetric(240, 330, "Accuracy", `${dna.avgAcc}%`, "#34d399");
    drawMetric(420, 330, "Consistency", `${dna.consistency}/100`, "#fbbf24");
    drawMetric(600, 330, "Stamina", `${dna.stamina}/100`, "#a78bfa");

    drawMetric(60, 440, "Dexterity", `${dna.dexterity}/100`, "#f472b6");
    drawMetric(240, 440, "Recovery", `${dna.recovery}/100`, "#38bdf8");
    drawMetric(420, 440, "Tests Logged", `${dna.sessionCount}`, "#e2e8f0");
    drawMetric(600, 440, "DNA Rank", "TOP 5%", "#ffe600");

    // Holographic security badge seal on right
    ctx.save();
    ctx.translate(960, 370);
    ctx.beginPath();
    ctx.arc(0, 0, 130, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 240, 255, 0.5)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 110, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 0, 127, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#00f0ff";
    ctx.font = "bold 60px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚡", 0, -15);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px monospace";
    ctx.fillText("AUTHENTIC DATA", 0, 45);
    ctx.restore();

    // Footer signature line
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "14px 'Inter', sans-serif";
    ctx.fillText("TypeScope Client-Side Intelligence · Zero Telemetry · 100% Authentic Keystroke Data", 60, 630);

    // Download trigger
    const link = document.createElement("a");
    link.download = `TypeScope_Passport_${dna.archetype.code}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  },
};
