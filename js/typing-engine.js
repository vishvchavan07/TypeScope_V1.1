/**
 * TypeScope — Typing Engine
 * js/typing-engine.js
 *
 * Manages the complete lifecycle of one typing test session:
 *   IDLE → RUNNING → FINISHED
 *
 * Responsibilities:
 *   • Load a passage and render it as character spans
 *   • Start the countdown timer on the FIRST real keystroke
 *   • Route keyboard input through character comparison
 *   • Update the passage display (correct / incorrect / cursor highlights)
 *   • Tick live metrics every 500 ms via the metrics module
 *   • Finish the test automatically on time-up or passage completion
 *   • Emit results to the UI layer (app.js) via a callback
 *   • Prevent double-starts and ghost timers
 *
 * Depends on (must be loaded before this file):
 *   data/passages.js   — getRandomPassage()
 *   js/metrics.js      — calcAllMetrics()
 *
 * Related courses:
 *   JavaScript Essentials 1 — DOM, events, functions, arrays
 *   JavaScript Essentials 2 — closures, setTimeout/setInterval, higher-order fns
 */

"use strict";

/* ─────────────────────────────────────────────────────────────────────────────
   SOUND EFFECTS HELPER (Web Audio API Synthesizer)
   Pure client-side zero-dependency audio synthesizer.
   Only active if "Sound Effects" is enabled in Settings.
   ───────────────────────────────────────────────────────────────────────────── */
const SoundFX = {
  ctx: null,
  getAudioContext() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  },
  isEnabled() {
    try {
      const raw = localStorage.getItem("typescope_settings");
      if (!raw) return false;
      const s = JSON.parse(raw);
      return !!s.sound;
    } catch {
      return false;
    }
  },
  playKey(isError) {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      if (isError) {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(160, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(700, now);
        gain.gain.setValueAtTime(0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.start(now);
        osc.stop(now + 0.035);
      }
    } catch {}
  },
  playCompletion() {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const startTime = ctx.currentTime + idx * 0.08;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.06, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
        osc.start(startTime);
        osc.stop(startTime + 0.15);
      });
    } catch {}
  },
};

/* ─────────────────────────────────────────────────────────────────────────────
   1. ENGINE STATE
   One plain object. All test-session variables live here so the engine can
   be fully reset without reloading the page.
   ───────────────────────────────────────────────────────────────────────────── */
const EngineState = {
  /** "idle" | "running" | "finished" */
  status: "idle",

  /** The passage object currently loaded { id, title, text } */
  passage: null,

  /** Characters the user has typed so far (plain string, no markup) */
  typedText: "",

  /**
   * Count of character keys pressed, excluding Backspace.
   * Used by calcGrossWPM() as per the standard formula.
   */
  totalCharsTyped: 0,

  /** Unix timestamp (ms) of the first real keystroke; null before start */
  startTime: null,

  /** Seconds that have elapsed since startTime */
  elapsedSeconds: 0,

  /** Remaining seconds; initialised from the UI duration selector */
  remainingSeconds: 60,

  /** Total allowed seconds for this test */
  durationSeconds: 60,

  /** setInterval handle for the countdown tick */
  countdownInterval: null,

  /** setInterval handle for the metrics update (runs every 500 ms) */
  metricsInterval: null,

  /** Map of expected characters to count of times mistyped */
  errorMap: {},

  /** Aggregated error category counts */
  errorCategories: { letters: 0, punctuation: 0, digits: 0, spaces: 0, other: 0 },

  /** Callback invoked when the test finishes: fn(results) */
  onFinish: null,
};

/* ─────────────────────────────────────────────────────────────────────────────
   2. DOM REFERENCES (resolved once in initEngine)
   ───────────────────────────────────────────────────────────────────────────── */
let DOM = {
  passageDisplay: null,   // #passage-display  — rendered character spans
  passageTitle:   null,   // #passage-title
  difficultyBadge: null,  // #passage-difficulty-badge
  typingInput:    null,   // #typing-input  (invisible <textarea>)
  timerDisplay:   null,   // #timer-display
  liveWPM:        null,   // #live-wpm
  liveAccuracy:   null,   // #live-accuracy
  liveKeystrokes: null,   // #live-keystrokes
  liveErrors:     null,   // #live-errors
  startBtn:       null,   // #start-test-btn
  restartBtn:     null,   // #restart-btn (added in Phase 2 HTML)
};

/* ─────────────────────────────────────────────────────────────────────────────
   3. INITIALISE ENGINE
   Called once from app.js after the DOM is ready.
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Resolves DOM references, loads an initial passage preview, and wires
 * the keyboard input handler to the invisible textarea.
 *
 * @param {Function} onFinishCallback - fn(results) called when the test ends.
 *   results = { grossWPM, netWPM, accuracy, uncorrectedErrors,
 *               elapsedSeconds, difficulty, passage }
 */
function initEngine(onFinishCallback) {
  DOM.passageDisplay  = document.getElementById("passage-display");
  DOM.passageTitle    = document.getElementById("passage-title");
  DOM.difficultyBadge = document.getElementById("passage-difficulty-badge");
  DOM.typingInput     = document.getElementById("typing-input");
  DOM.timerDisplay    = document.getElementById("timer-display");
  DOM.liveWPM         = document.getElementById("live-wpm");
  DOM.liveAccuracy    = document.getElementById("live-accuracy");
  DOM.liveKeystrokes  = document.getElementById("live-keystrokes");
  DOM.liveErrors      = document.getElementById("live-errors");
  DOM.startBtn        = document.getElementById("start-test-btn");
  DOM.restartBtn      = document.getElementById("restart-btn");

  EngineState.onFinish = onFinishCallback || function() {};

  // Wire the invisible input — this is the only keyboard source
  if (DOM.typingInput) {
    DOM.typingInput.addEventListener("input", onInput);
    // Prevent default on Tab so it doesn't move focus
    DOM.typingInput.addEventListener("keydown", onKeyDown);
  }

  // Start button → begin a fresh test
  if (DOM.startBtn) {
    DOM.startBtn.addEventListener("click", beginTest);
  }

  // Restart button (rendered by results screen in HTML)
  if (DOM.restartBtn) {
    DOM.restartBtn.addEventListener("click", beginTest);
  }

  // Try Again button — replays the EXACT SAME passage
  const tryAgainBtn = document.getElementById("try-again-btn");
  if (tryAgainBtn) {
    tryAgainBtn.addEventListener("click", () => {
      const savedPassage = EngineState.passage; // keep reference before reset
      beginTest();                               // resets state & loads new passage
      // Override with the saved passage
      if (savedPassage) {
        EngineState.passage = savedPassage;
        if (DOM.passageTitle)    DOM.passageTitle.textContent = savedPassage.title;
        renderPassage(savedPassage.text);
      }
    });
  }

  // Clicking the passage display focuses the hidden input (mobile-friendly)
  if (DOM.passageDisplay) {
    DOM.passageDisplay.addEventListener("click", focusInput);
  }

  // Load the initial passage preview in idle state
  loadPassage("intermediate");
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. LOAD A PASSAGE
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Selects a random passage for the given difficulty, stores it in
 * EngineState, and renders it as a series of <span> elements.
 * Each span gets class "char" and one of: "pending" | "correct" | "incorrect".
 *
 * @param {string} difficulty - "beginner" | "intermediate" | "advanced"
 */
function loadPassage(difficulty) {
  const passage = getRandomPassage(difficulty);
  EngineState.passage = passage;

  // Update title and badge
  if (DOM.passageTitle)    DOM.passageTitle.textContent = passage.title;
  if (DOM.difficultyBadge) {
    DOM.difficultyBadge.textContent = capitaliseFirst(difficulty);
    DOM.difficultyBadge.className   = `badge badge-${difficulty}`;
  }

  // Render each character as a span
  renderPassage(passage.text);
}

/**
 * Converts the passage string into individual character <span> elements
 * inside #passage-display. The first span gets the "cursor" class.
 *
 * @param {string} text
 */
function renderPassage(text) {
  if (!DOM.passageDisplay) return;

  DOM.passageDisplay.innerHTML = "";
  for (let i = 0; i < text.length; i++) {
    const span = document.createElement("span");
    span.className   = "char pending";
    span.dataset.idx = i;
    // Spaces need special handling so they are still visible as gaps
    span.textContent = text[i];
    DOM.passageDisplay.appendChild(span);
  }

  // Set cursor on the first character
  const first = DOM.passageDisplay.querySelector(".char");
  if (first) first.classList.add("cursor");
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. BEGIN / RESET TEST
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Starts a fresh test. Clears any in-progress state, resets counters,
 * loads a new passage, and prepares the UI for typing.
 * Guards against double-start by checking status.
 */
function beginTest() {
  // Stop any lingering timers from a previous run
  stopAllTimers();

  // Determine settings from the dropdowns
  const difficultyEl = document.getElementById("difficulty-select");
  const durationEl   = document.getElementById("duration-select");
  const difficulty   = difficultyEl ? difficultyEl.value : "intermediate";
  const duration     = durationEl   ? parseInt(durationEl.value, 10) : 60;

  // Reset engine state
  EngineState.status          = "idle"; // becomes "running" on first keystroke
  EngineState.typedText       = "";
  EngineState.totalCharsTyped = 0;
  EngineState.startTime       = null;
  EngineState.elapsedSeconds  = 0;
  EngineState.remainingSeconds = duration;
  EngineState.durationSeconds  = duration;
  EngineState.countdownInterval = null;
  EngineState.metricsInterval   = null;
  EngineState.errorMap          = {};
  EngineState.errorCategories   = { letters: 0, punctuation: 0, digits: 0, spaces: 0, other: 0 };

  // Reset rhythm tracking for this new test
  if (typeof RhythmModule !== "undefined" && RhythmModule.reset) {
    RhythmModule.reset();
  }

  // Load a new passage
  loadPassage(difficulty);

  // Reset live metric displays
  setLiveMetrics({ grossWPM: "—", netWPM: "—", accuracy: "—", uncorrectedErrors: "—" });
  updateTimerDOM(duration);

  // Hide results panel, show passage card
  showResultsPanel(false);

  // Enable and clear the typing input
  const input = DOM.typingInput;
  if (input) {
    input.value    = "";
    input.disabled = false;
    input.removeAttribute("tabindex");
    // Focus after a short delay so the passage is rendered first
    setTimeout(focusInput, 80);
  }

  // Update start button label
  if (DOM.startBtn) {
    DOM.startBtn.textContent = "⟳  New Test";
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   6. KEYBOARD INPUT HANDLERS
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Handles the `input` event on the invisible textarea.
 * This fires after the browser has already updated the textarea value,
 * so we read the full new value and diff it against the target.
 */
function onInput() {
  if (EngineState.status === "finished") return;

  const input     = DOM.typingInput;
  const target    = EngineState.passage ? EngineState.passage.text : "";
  const newTyped  = input.value;

  // ── Guard: don't allow typing beyond the passage length
  if (newTyped.length > target.length) {
    input.value = newTyped.slice(0, target.length);
    return;
  }

  // ── Count character presses and track mistakes
  if (newTyped.length > EngineState.typedText.length) {
    const prevLen = EngineState.typedText.length;
    const addedCount = newTyped.length - prevLen;
    EngineState.totalCharsTyped += addedCount;

    // Track errors on newly typed characters
    let hasError = false;
    for (let i = prevLen; i < newTyped.length; i++) {
      if (i < target.length && newTyped[i] !== target[i]) {
        hasError = true;
        const expected = target[i];
        EngineState.errorMap[expected] = (EngineState.errorMap[expected] || 0) + 1;

        if (expected === " ") {
          EngineState.errorCategories.spaces++;
        } else if (/[a-zA-Z]/.test(expected)) {
          EngineState.errorCategories.letters++;
        } else if (/[0-9]/.test(expected)) {
          EngineState.errorCategories.digits++;
        } else if (/[.,\/#!$%\^&\*;:{}=\-_`~()?"'<>@+]/.test(expected)) {
          EngineState.errorCategories.punctuation++;
        } else {
          EngineState.errorCategories.other++;
        }
      }
    }
    SoundFX.playKey(hasError);
  }

  EngineState.typedText = newTyped;

  // ── Start the clock on the very first real keystroke
  if (EngineState.status === "idle" && newTyped.length > 0) {
    startTimers();
  }

  // ── Update character highlights in the passage display
  updateCharHighlights();

  // ── Refresh metrics immediately (in addition to the 500 ms ticker)
  if (EngineState.status === "running") {
    refreshMetrics();
  }

  // ── Detect passage completion (all chars typed)
  if (newTyped.length === target.length && EngineState.status === "running") {
    finishTest("completed");
  }
}

/**
 * Handles keydown to intercept Tab (prevent focus jump).
 * Backspace behaviour is handled naturally by the browser (the textarea
 * value shrinks) and caught by onInput().
 */
function onKeyDown(e) {
  if (e.key === "Tab") {
    e.preventDefault();
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   7. CHARACTER HIGHLIGHTING
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Iterates over every character span and assigns the appropriate CSS class:
 *   "correct"   — typed[i] === target[i]
 *   "incorrect" — typed[i] !== target[i]  (includes spaces)
 *   "pending"   — not yet reached
 *   "cursor"    — applied additionally to the next character to type
 *
 * Called after every input event for real-time visual feedback.
 */
function updateCharHighlights() {
  if (!DOM.passageDisplay) return;

  const typed  = EngineState.typedText;
  const spans  = DOM.passageDisplay.querySelectorAll(".char");
  const len    = spans.length;

  for (let i = 0; i < len; i++) {
    const span = spans[i];
    // Reset all state classes first
    span.classList.remove("correct", "incorrect", "pending", "cursor");

    if (i < typed.length) {
      // Already typed
      span.classList.add(typed[i] === EngineState.passage.text[i] ? "correct" : "incorrect");
    } else if (i === typed.length) {
      // Current cursor position
      span.classList.add("pending", "cursor");
    } else {
      // Not yet reached
      span.classList.add("pending");
    }
  }

  // Auto-scroll the cursor into view inside the passage display
  const cursorSpan = DOM.passageDisplay.querySelector(".cursor");
  if (cursorSpan) {
    cursorSpan.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   8. TIMERS
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Starts the countdown interval and the metrics-refresh interval.
 * Guards: will not start if already running.
 */
function startTimers() {
  if (EngineState.status === "running") return; // already started — no double-start
  EngineState.status    = "running";
  EngineState.startTime = Date.now();

  // ── Countdown tick — runs every 1 second
  EngineState.countdownInterval = setInterval(() => {
    EngineState.elapsedSeconds = Math.round((Date.now() - EngineState.startTime) / 1000);
    EngineState.remainingSeconds = Math.max(
      0,
      EngineState.durationSeconds - EngineState.elapsedSeconds
    );
    updateTimerDOM(EngineState.remainingSeconds);

    // ── Rhythm snapshot every 5 seconds
    if (
      EngineState.elapsedSeconds > 0 &&
      EngineState.elapsedSeconds % 5 === 0 &&
      typeof RhythmModule !== "undefined" &&
      RhythmModule.recordSnapshot
    ) {
      // Compute correctChars for this snapshot
      const typed = EngineState.typedText;
      const target = EngineState.passage ? EngineState.passage.text : "";
      let correctCount = 0;
      for (let ci = 0; ci < typed.length && ci < target.length; ci++) {
        if (typed[ci] === target[ci]) correctCount++;
      }
      const uncorrected = typed.length - correctCount;
      RhythmModule.recordSnapshot({
        elapsedSeconds: EngineState.elapsedSeconds,
        totalCharsTyped: EngineState.totalCharsTyped,
        correctChars: correctCount,
        uncorrectedErrors: Math.max(0, uncorrected),
      });
    }

    if (EngineState.remainingSeconds <= 0) {
      finishTest("timeout");
    }
  }, 1000);

  // ── Metrics tick — runs every 500 ms for smooth live updates
  EngineState.metricsInterval = setInterval(() => {
    if (EngineState.status === "running") refreshMetrics();
  }, 500);
}

/** Clears both intervals safely. */
function stopAllTimers() {
  if (EngineState.countdownInterval !== null) {
    clearInterval(EngineState.countdownInterval);
    EngineState.countdownInterval = null;
  }
  if (EngineState.metricsInterval !== null) {
    clearInterval(EngineState.metricsInterval);
    EngineState.metricsInterval = null;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   9. LIVE METRIC REFRESH
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Computes the current elapsed time and calls calcAllMetrics(),
 * then pushes the results to the four live metric DOM elements.
 * Uses Date.now() for accuracy — avoids drift from setInterval.
 */
function refreshMetrics() {
  if (!EngineState.startTime) return;

  // Authoritative elapsed time from wall clock, not the interval counter
  const elapsed = (Date.now() - EngineState.startTime) / 1000;
  EngineState.elapsedSeconds = elapsed;

  const metrics = calcAllMetrics({
    typedText:       EngineState.typedText,
    targetText:      EngineState.passage ? EngineState.passage.text : "",
    totalCharsTyped: EngineState.totalCharsTyped,
    elapsedSeconds:  elapsed,
  });

  setLiveMetrics({
    grossWPM:         metrics.grossWPM,
    netWPM:           metrics.netWPM,     // shown as WPM label
    accuracy:         `${metrics.accuracy}%`,
    uncorrectedErrors: metrics.uncorrectedErrors,
  });

  // Also update keystrokes counter (totalCharsTyped displayed as-is)
  if (DOM.liveKeystrokes) {
    DOM.liveKeystrokes.textContent = EngineState.totalCharsTyped;
  }
}

/**
 * Pushes a set of metric values to the four live metric DOM cards.
 * Accepts string or number for each field.
 *
 * @param {{ grossWPM, netWPM, accuracy, uncorrectedErrors }} values
 */
function setLiveMetrics(values) {
  if (DOM.liveWPM)      DOM.liveWPM.textContent      = values.netWPM   !== undefined ? values.netWPM   : "—";
  if (DOM.liveAccuracy) DOM.liveAccuracy.textContent  = values.accuracy !== undefined ? values.accuracy : "—";
  if (DOM.liveErrors)   DOM.liveErrors.textContent    = values.uncorrectedErrors !== undefined ? values.uncorrectedErrors : "—";
}

/* ─────────────────────────────────────────────────────────────────────────────
   10. FINISH TEST
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Ends the current test.
 * @param {"timeout"|"completed"} reason
 */
function finishTest(reason) {
  if (EngineState.status === "finished") return; // idempotent
  EngineState.status = "finished";

  stopAllTimers();
  SoundFX.playCompletion();

  // Freeze the input — no more typing
  if (DOM.typingInput) {
    DOM.typingInput.disabled = true;
    DOM.typingInput.blur();
  }

  // Final authoritative elapsed time
  const elapsed = EngineState.startTime
    ? (Date.now() - EngineState.startTime) / 1000
    : 0;
  EngineState.elapsedSeconds = elapsed;

  // Compute final metrics
  const metrics = calcAllMetrics({
    typedText:       EngineState.typedText,
    targetText:      EngineState.passage ? EngineState.passage.text : "",
    totalCharsTyped: EngineState.totalCharsTyped,
    elapsedSeconds:  elapsed,
  });

  // Determine difficulty from the dropdown
  const difficultyEl = document.getElementById("difficulty-select");
  const difficulty   = difficultyEl ? difficultyEl.value : "intermediate";

  // Build the result object — saved to localStorage and displayed
  const results = {
    id:                `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    date:              new Date().toISOString(),
    wpm:               metrics.netWPM,
    netWPM:            metrics.netWPM,
    grossWPM:          metrics.grossWPM,
    accuracy:          metrics.accuracy,
    errors:            metrics.uncorrectedErrors,
    uncorrectedErrors: metrics.uncorrectedErrors,
    correctChars:      metrics.correctChars,
    incorrectChars:    metrics.incorrectChars,
    totalCharsTyped:   EngineState.totalCharsTyped,
    elapsedSeconds:    Math.round(elapsed),
    duration:          EngineState.durationSeconds,
    difficulty:        difficulty,
    reason:            reason,
    passageId:         EngineState.passage ? EngineState.passage.id : "unknown",
    passageTitle:      EngineState.passage ? EngineState.passage.title : "Typing Passage",
    errorCategories:   { ...EngineState.errorCategories },
    errorMap:          { ...EngineState.errorMap },
    rhythmSnapshots:   (typeof RhythmModule !== "undefined" && RhythmModule.getSnapshots)
                         ? RhythmModule.getSnapshots()
                         : [],
  };

  // Invoke the app-level callback so app.js can save and display results
  if (typeof EngineState.onFinish === "function") {
    EngineState.onFinish(results);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   11. UI HELPERS
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Formats seconds as MM:SS and writes to the timer display element.
 * @param {number} seconds
 */
function updateTimerDOM(seconds) {
  if (!DOM.timerDisplay) return;
  const s   = Math.max(0, Math.ceil(seconds));
  const mm  = Math.floor(s / 60).toString().padStart(2, "0");
  const ss  = (s % 60).toString().padStart(2, "0");
  DOM.timerDisplay.textContent = `${mm}:${ss}`;
  // Pulse red when 10 seconds or fewer remain
  DOM.timerDisplay.classList.toggle("timer-warning", s <= 10 && s > 0);
}

/**
 * Shows or hides the results panel overlay on the Typing Test section.
 * @param {boolean} show
 */
function showResultsPanel(show) {
  const panel = document.getElementById("results-panel");
  if (panel) panel.hidden = !show;
  const passageCard = document.getElementById("passage-card-wrapper");
  if (passageCard) passageCard.hidden = show;
}

/** Focuses the invisible textarea so keyboard events are captured. */
function focusInput() {
  if (DOM.typingInput && !DOM.typingInput.disabled) {
    DOM.typingInput.focus({ preventScroll: true });
  }
}

/** Capitalises the first letter of a string. */
function capitaliseFirst(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

/* ─────────────────────────────────────────────────────────────────────────────
   12. PUBLIC API
   Exposed for app.js to call.
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Called by app.js when the difficulty dropdown changes during idle.
 * Does nothing if a test is running (to avoid disrupting mid-test).
 * @param {string} difficulty
 */
function engineLoadDifficulty(difficulty) {
  if (EngineState.status !== "idle") return;
  loadPassage(difficulty);
}

/**
 * Called by app.js when the duration dropdown changes during idle.
 * @param {number} seconds
 */
function engineSetDuration(seconds) {
  if (EngineState.status !== "idle") return;
  EngineState.durationSeconds  = seconds;
  EngineState.remainingSeconds = seconds;
  updateTimerDOM(seconds);
}
