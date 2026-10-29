/**
 * TypeScope — Adaptive Practice Mode
 * js/adaptive.js
 *
 * Generates short targeted practice exercises based on the user's actual
 * recurring typing errors, pulled from real completed sessions.
 *
 * Architecture:
 *   - Reads aggregated errorMap from localStorage sessions
 *   - Identifies the user's weakest characters (top 5 most mistyped)
 *   - Generates short practice sentences that emphasize those characters
 *   - Falls back to a curated general practice exercise when insufficient data exists
 *   - Renders a self-contained practice mode within the Advanced section:
 *     • "Generate Practice" button
 *     • A small passage display that plugs into the existing typing engine
 *     • OR a standalone mini-practice mode (separate from the main test)
 *
 * Design decision:
 *   This module generates practice PASSAGES, not a separate engine.
 *   When the user clicks "Start Practice", it navigates to the Typing Test
 *   section with a specially-generated passage pre-loaded.
 *   This reuses the full battle-tested engine without duplication.
 *
 * Related courses:
 *   JavaScript Essentials 1  - objects, arrays, functions
 *   JavaScript Essentials 2  - higher-order functions, string manipulation
 *   Introduction to Data Analytics Essentials - pattern detection, data-driven recommendations
 */

"use strict";

/* ─────────────────────────────────────────────────────────────────────────────
   1. WORD BANKS
   Curated words grouped by which letters/characters they emphasize.
   Used to build targeted practice sentences.
   ───────────────────────────────────────────────────────────────────────────── */

const CHAR_WORD_BANKS = {
  "a": ["always", "advanced", "adapt", "analyze", "abstract", "apparent", "accurate", "annual"],
  "b": ["balance", "begin", "based", "below", "between", "better", "build", "both"],
  "c": ["complete", "correct", "cycle", "create", "complex", "clear", "called", "count"],
  "d": ["decide", "develop", "define", "document", "dynamic", "derived", "detect", "different"],
  "e": ["every", "element", "essential", "evaluate", "extend", "event", "enable", "effective"],
  "f": ["first", "format", "full", "few", "for", "from", "find", "finally", "following"],
  "g": ["general", "good", "group", "great", "global", "given", "generate", "goal"],
  "h": ["here", "high", "have", "hold", "handle", "help", "horizontal", "historical"],
  "i": ["identify", "include", "instead", "instance", "initial", "interesting", "improve"],
  "j": ["just", "join", "job", "jump", "judge", "justify", "journal", "major"],
  "k": ["key", "kind", "keep", "known", "knowledge", "task", "risk", "link"],
  "l": ["level", "logic", "list", "long", "local", "library", "likely", "large"],
  "m": ["method", "more", "main", "modern", "module", "multiple", "make", "might"],
  "n": ["next", "name", "number", "known", "note", "normal", "unique", "function"],
  "o": ["object", "over", "only", "often", "output", "option", "order", "original"],
  "p": ["point", "process", "program", "produce", "pattern", "problem", "provide", "previous"],
  "q": ["quite", "quick", "quality", "question", "query", "sequence", "unique", "require"],
  "r": ["result", "return", "record", "read", "reach", "rather", "render", "real"],
  "s": ["system", "state", "simple", "show", "since", "string", "sort", "second"],
  "t": ["test", "type", "time", "total", "track", "through", "this", "then"],
  "u": ["use", "update", "under", "unique", "until", "user", "unit", "further"],
  "v": ["value", "valid", "version", "view", "variable", "via", "event", "solve"],
  "w": ["when", "with", "while", "word", "write", "which", "where", "work"],
  "x": ["exact", "extra", "example", "except", "explain", "text", "next", "execute"],
  "y": ["every", "easy", "very", "layer", "they", "key", "your", "yet"],
  "z": ["analyze", "organize", "zero", "size", "recognize", "zone", "realize", "optimize"],
  " ": ["the quick brown fox jumps over the lazy dog to reach the other side"],
  ".": ["etc.", "e.g.", "results.", "complete.", "correct.", "function.", "available.", "standard."],
  ",": ["first, second, and third", "short, clear, and fast", "loop, condition, and branch"],
  "'": ["don't", "can't", "it's", "won't", "you're", "isn't", "they're", "I've"],
  ";": ["a;b;c", "for;", "loop;", "increment;", "condition;", "update;"],
};

// Fallback general practice sentences (no specific error data needed)
const GENERAL_PRACTICE_SENTENCES = [
  "The quick brown fox jumps over the lazy dog near the tall oak trees by the river.",
  "Practice makes perfect; consistent effort is the key to improvement in any skill.",
  "Every good programmer starts by understanding the basics of logic and problem solving.",
  "Typing fast and accurately requires both muscle memory and focused attention to detail.",
  "Computer science blends mathematics, engineering, and creativity to solve complex problems.",
  "JavaScript powers interactive web applications that respond to user input in real time.",
  "Data analysis reveals patterns that help us make better, more informed decisions daily.",
  "Consistent daily practice will improve your typing speed by several words per minute.",
];

/* ─────────────────────────────────────────────────────────────────────────────
   2. PASSAGE GENERATION
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Aggregates errorMap data from sessions and returns the top weak characters.
 * @param {Array<Object>} sessions
 * @param {number} topN - how many top error chars to target
 * @returns {{ weakChars: string[], errorMap: Object, totalErrors: number }}
 */
function apGetWeakChars(sessions, topN = 5) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return { weakChars: [], errorMap: {}, totalErrors: 0 };
  }

  const combined = {};
  let totalErrors = 0;

  sessions.forEach((session) => {
    if (!session.errorMap || typeof session.errorMap !== "object") return;
    Object.entries(session.errorMap).forEach(([char, count]) => {
      const n = parseInt(count, 10);
      if (isNaN(n) || n <= 0) return;
      const k = char.length === 1 ? char.toLowerCase() : char;
      // Only track chars that have word banks (actually trainable)
      if (CHAR_WORD_BANKS[k]) {
        combined[k] = (combined[k] || 0) + n;
        totalErrors += n;
      }
    });
  });

  const sorted = Object.entries(combined)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([k]) => k);

  return { weakChars: sorted, errorMap: combined, totalErrors };
}

/**
 * Generates a targeted practice passage from a set of weak characters.
 * Mixes words from each weak character's word bank into a coherent sentence.
 *
 * @param {string[]} weakChars - e.g. ["e", "r", "t"]
 * @returns {{ text: string, title: string, difficulty: string, isAdaptive: boolean }}
 */
function apGeneratePassage(weakChars) {
  if (!weakChars || weakChars.length === 0) {
    // Fall back to a general practice sentence
    const idx = Math.floor(Math.random() * GENERAL_PRACTICE_SENTENCES.length);
    return {
      text: GENERAL_PRACTICE_SENTENCES[idx],
      title: "General Practice",
      difficulty: "intermediate",
      isAdaptive: false,
    };
  }

  // Build a word pool from all weak char banks, shuffled
  const wordPool = [];
  weakChars.forEach((ch) => {
    const bank = CHAR_WORD_BANKS[ch] || [];
    // Pick 3–4 random words from each bank
    const picks = shuffleArray([...bank]).slice(0, 4);
    wordPool.push(...picks);
  });

  if (wordPool.length === 0) {
    const idx = Math.floor(Math.random() * GENERAL_PRACTICE_SENTENCES.length);
    return {
      text: GENERAL_PRACTICE_SENTENCES[idx],
      title: "General Practice",
      difficulty: "intermediate",
      isAdaptive: false,
    };
  }

  // Shuffle word pool and build a sentence of 50–80 characters
  const shuffled = shuffleArray(wordPool);
  let sentence = "";
  for (const word of shuffled) {
    const candidate = sentence ? sentence + " " + word : word;
    if (candidate.length > 80) break;
    sentence = candidate;
  }

  // Ensure it ends cleanly
  if (!sentence) sentence = shuffled.slice(0, 6).join(" ");
  sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  if (!sentence.endsWith(".")) sentence += ".";

  // Title describes the focus characters
  const focusLabel = weakChars
    .slice(0, 3)
    .map((c) => (c === " " ? "Space" : c.toUpperCase()))
    .join(", ");

  return {
    text: sentence,
    title: `Adaptive Practice — Focus: ${focusLabel}`,
    difficulty: "intermediate",
    isAdaptive: true,
    targetChars: weakChars,
  };
}

/** Fisher-Yates shuffle. */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. ADAPTIVE MODULE — UI RENDERER
   ───────────────────────────────────────────────────────────────────────────── */

const AdaptiveModule = {

  /** The most recently generated practice passage object. */
  currentPassage: null,

  /**
   * Renders the Adaptive Practice panel into its container.
   * @param {string} containerId - element ID
   * @param {Array<Object>} sessions
   */
  render(containerId, sessions) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { weakChars, errorMap, totalErrors } = apGetWeakChars(sessions, 5);
    const hasData = weakChars.length > 0 && totalErrors >= 5;

    if (!hasData) {
      // Show "earn more data" state with a general practice button
      container.innerHTML = `
        <div class="adaptive-intro">
          <div class="adaptive-intro-icon" aria-hidden="true">🎯</div>
          <div class="adaptive-intro-content">
            <h3 class="adaptive-intro-title">Not enough error data yet</h3>
            <p class="adaptive-intro-desc">
              Complete ${Math.max(0, 3 - sessions.length)} more typing test${sessions.length < 3 ? "s" : ""} to unlock
              personalized adaptive practice recommendations. Meanwhile, try a general practice passage.
            </p>
            <button class="btn btn-secondary" id="adaptive-general-btn" type="button">
              📝 &nbsp;Try General Practice
            </button>
          </div>
        </div>
      `;
      const generalBtn = document.getElementById("adaptive-general-btn");
      if (generalBtn) {
        generalBtn.addEventListener("click", () => this._launchPractice([], sessions));
      }
      return;
    }

    // Show analysis results
    const topCharsHTML = weakChars
      .slice(0, 5)
      .map((ch, idx) => {
        const count = errorMap[ch] || 0;
        const label = ch === " " ? "Space" : ch.toUpperCase();
        return `<div class="adaptive-weak-key">
          <span class="adaptive-weak-rank">#${idx + 1}</span>
          <span class="adaptive-weak-pill">${label}</span>
          <span class="adaptive-weak-count">${count} error${count !== 1 ? "s" : ""}</span>
        </div>`;
      })
      .join("");

    container.innerHTML = `
      <div class="adaptive-analysis">
        <div class="adaptive-analysis-header">
          <div>
            <h3 class="adaptive-analysis-title">Your Weak Spots</h3>
            <p class="adaptive-analysis-desc">
              Based on ${sessions.length} session${sessions.length !== 1 ? "s" : ""} —
              these characters caused the most uncorrected errors:
            </p>
          </div>
          <span class="badge badge-info">${totalErrors} total errors tracked</span>
        </div>
        <div class="adaptive-weak-keys-row">${topCharsHTML}</div>
      </div>

      <div class="adaptive-actions">
        <button class="btn btn-primary" id="adaptive-start-btn" type="button">
          🎯 &nbsp;Generate &amp; Start Practice
        </button>
        <button class="btn btn-secondary" id="adaptive-preview-btn" type="button">
          👁 &nbsp;Preview Passage
        </button>
      </div>

      <div class="adaptive-preview-box" id="adaptive-preview-box" style="display:none;">
        <p class="adaptive-preview-label">Generated Passage Preview</p>
        <div class="adaptive-preview-text" id="adaptive-preview-text"></div>
        <button class="btn btn-primary btn-sm" id="adaptive-launch-btn" type="button" style="margin-top:var(--sp-3);">
          ⌨️ &nbsp;Start This Practice
        </button>
      </div>
    `;

    // Wire buttons
    const startBtn = document.getElementById("adaptive-start-btn");
    if (startBtn) {
      startBtn.addEventListener("click", () => this._launchPractice(weakChars, sessions));
    }

    const previewBtn = document.getElementById("adaptive-preview-btn");
    if (previewBtn) {
      previewBtn.addEventListener("click", () => this._previewPassage(weakChars));
    }

    const launchBtn = document.getElementById("adaptive-launch-btn");
    if (launchBtn) {
      launchBtn.addEventListener("click", () => {
        if (this.currentPassage) {
          this._startWithPassage(this.currentPassage);
        } else {
          this._launchPractice(weakChars, sessions);
        }
      });
    }
  },

  /**
   * Generates a passage, saves it as currentPassage, and shows a preview.
   * @param {string[]} weakChars
   */
  _previewPassage(weakChars) {
    const passage = apGeneratePassage(weakChars);
    this.currentPassage = passage;

    const box = document.getElementById("adaptive-preview-box");
    const textEl = document.getElementById("adaptive-preview-text");

    if (box) box.style.display = "block";
    if (textEl) textEl.textContent = passage.text;
  },

  /**
   * Generates a passage and immediately starts the typing test with it.
   * @param {string[]} weakChars
   * @param {Array<Object>} sessions - unused here but kept for future use
   */
  _launchPractice(weakChars, sessions) {
    const passage = apGeneratePassage(weakChars);
    this.currentPassage = passage;
    this._startWithPassage(passage);
  },

  /**
   * Injects a custom passage into the typing engine and navigates to the test.
   * Uses the engine's existing public API to override the passage after beginTest().
   *
   * @param {{ text: string, title: string, difficulty: string }} passage
   */
  _startWithPassage(passage) {
    // Store the custom passage for the engine to pick up
    AdaptiveModule._pendingPassage = passage;

    // Navigate to Typing Test section
    if (typeof navigateTo === "function") {
      navigateTo("typing-test");
    }

    // Give DOM a moment to show, then inject
    setTimeout(() => {
      // Trigger beginTest to reset the engine state
      if (typeof beginTest === "function") {
        beginTest();
      }

      // Override passage after a short delay so beginTest finishes first
      setTimeout(() => {
        this._injectPassage(passage);
      }, 100);
    }, 80);
  },

  /**
   * Directly injects a custom passage into the rendered passage display.
   * Bypasses getRandomPassage() to use the generated adaptive text.
   *
   * @param {{ text: string, title: string, difficulty: string }} passage
   */
  _injectPassage(passage) {
    // Update the passage title element
    const titleEl = document.getElementById("passage-title");
    if (titleEl) titleEl.textContent = passage.title;

    // Update difficulty badge
    const badgeEl = document.getElementById("passage-difficulty-badge");
    if (badgeEl) {
      badgeEl.textContent = "Adaptive";
      badgeEl.className = "badge badge-adaptive";
    }

    // Render characters into the passage display
    const display = document.getElementById("passage-display");
    if (display) {
      display.innerHTML = "";
      for (let i = 0; i < passage.text.length; i++) {
        const span = document.createElement("span");
        span.className = "char pending";
        span.dataset.idx = i;
        span.textContent = passage.text[i];
        display.appendChild(span);
      }
      // Set cursor on first char
      const first = display.querySelector(".char");
      if (first) first.classList.add("cursor");
    }

    // Override the engine's passage state directly so character matching works
    if (typeof EngineState !== "undefined") {
      EngineState.passage = {
        id: "adaptive_" + Date.now(),
        title: passage.title,
        text: passage.text,
        difficulty: passage.difficulty || "intermediate",
      };
      // Also reset typed text in case any stray chars landed
      EngineState.typedText = "";
      const inputEl = document.getElementById("typing-input");
      if (inputEl) {
        inputEl.value = "";
        inputEl.disabled = false;
      }
    }
  },
};
