/**
 * TypeScope — Metric Calculations
 * js/metrics.js
 *
 * All metric formulas are defined ONCE here and used by typing-engine.js.
 * No formula is duplicated elsewhere. Every function is documented with its
 * exact definition so it can be explained at a viva.
 *
 * FORMULA REFERENCE
 * ─────────────────
 * Gross WPM
 *   = (totalCharsTyped / 5) / elapsedMinutes
 *   Rationale: 5 chars = 1 "standard word" (industry convention).
 *   totalCharsTyped = every character the user pressed EXCEPT Backspace.
 *
 * Net WPM
 *   = grossWPM − (uncorrectedErrors / elapsedMinutes)
 *   Rationale: penalises mistakes that remain in the final typed string.
 *   uncorrectedErrors = characters in the typed string that do not match
 *   the corresponding target character (position-wise comparison).
 *   Net WPM is floored at 0.
 *
 * Accuracy
 *   = (correctChars / evaluatedChars) × 100
 *   correctChars   = number of positions where typed[i] === target[i]
 *   evaluatedChars = min(typed.length, target.length)
 *                    (extra chars beyond the passage end are NOT counted
 *                    because the engine stops accepting input at that point)
 *   Returns 100 when evaluatedChars === 0 (no input yet).
 *
 * Related: Introduction to Data Analytics Essentials — descriptive metrics
 *
 * EDGE CASES
 * ──────────
 *   • elapsedMinutes === 0  → all WPM values return 0 (no division by zero)
 *   • evaluatedChars === 0  → accuracy returns 100
 *   • Backspace key strokes are NOT counted in totalCharsTyped
 *   • Corrected mistakes improve accuracy (they no longer appear in typed string)
 *   • Extra characters: the engine stops at passage length, so over-typing
 *     is not possible in normal use; guard is included for safety.
 */

"use strict";

/* ─────────────────────────────────────────────────────────────────────────────
   1. GROSS WPM
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Calculates Gross WPM.
 * Gross WPM = (totalCharsTyped / 5) / elapsedMinutes
 *
 * @param {number} totalCharsTyped - count of every character key pressed
 *                                   (Backspace strokes excluded)
 * @param {number} elapsedSeconds  - seconds since first keystroke
 * @returns {number} gross WPM, rounded to 1 decimal place; 0 if no time elapsed
 */
function calcGrossWPM(totalCharsTyped, elapsedSeconds) {
  if (elapsedSeconds <= 0 || totalCharsTyped <= 0) return 0;
  const elapsedMinutes = elapsedSeconds / 60;
  const raw = (totalCharsTyped / 5) / elapsedMinutes;
  return Math.round(raw * 10) / 10;   // 1 decimal place
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. UNCORRECTED ERRORS
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Counts positions where typed[i] !== target[i].
 * Only positions up to min(typed.length, target.length) are compared.
 *
 * @param {string} typedText  - current value of the typing input
 * @param {string} targetText - the original passage text
 * @returns {number} number of incorrect characters still in the typed string
 */
function countUncorrectedErrors(typedText, targetText) {
  const len = Math.min(typedText.length, targetText.length);
  let errors = 0;
  for (let i = 0; i < len; i++) {
    if (typedText[i] !== targetText[i]) errors++;
  }
  return errors;
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. NET WPM
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Calculates Net WPM.
 * Net WPM = grossWPM − (uncorrectedErrors / elapsedMinutes), floored at 0.
 *
 * @param {number} grossWPM         - result from calcGrossWPM()
 * @param {number} uncorrectedErrors - result from countUncorrectedErrors()
 * @param {number} elapsedSeconds   - seconds since first keystroke
 * @returns {number} net WPM, rounded to 1 decimal place; 0 if no time elapsed
 */
function calcNetWPM(grossWPM, uncorrectedErrors, elapsedSeconds) {
  if (elapsedSeconds <= 0) return 0;
  const elapsedMinutes = elapsedSeconds / 60;
  const penalty = uncorrectedErrors / elapsedMinutes;
  const net = Math.max(0, grossWPM - penalty);
  return Math.round(net * 10) / 10;
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. ACCURACY
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Calculates accuracy as a percentage.
 * accuracy = (correctChars / evaluatedChars) × 100
 *
 * correctChars   = positions where typed[i] === target[i]
 * evaluatedChars = min(typed.length, target.length)
 * Returns 100 when no characters have been typed yet.
 *
 * @param {string} typedText  - current typed value
 * @param {string} targetText - the passage
 * @returns {number} accuracy 0–100, rounded to 1 decimal place
 */
function calcAccuracy(typedText, targetText) {
  const evaluatedChars = Math.min(typedText.length, targetText.length);
  if (evaluatedChars === 0) return 100;

  let correct = 0;
  for (let i = 0; i < evaluatedChars; i++) {
    if (typedText[i] === targetText[i]) correct++;
  }
  const raw = (correct / evaluatedChars) * 100;
  return Math.round(raw * 10) / 10;
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. BUNDLE — returns all metrics in one call
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Computes all metrics from the current engine snapshot.
 * Centralising this in one function ensures every caller gets
 * a consistent, simultaneously-calculated set of numbers.
 *
 * @param {Object} snap
 * @param {string} snap.typedText
 * @param {string} snap.targetText
 * @param {number} snap.totalCharsTyped  - char presses excluding Backspace
 * @param {number} snap.elapsedSeconds
 * @returns {{ grossWPM, netWPM, accuracy, uncorrectedErrors, correctChars, incorrectChars, evaluatedChars }}
 */
function calcAllMetrics(snap) {
  const { typedText, targetText, totalCharsTyped, elapsedSeconds } = snap;

  const grossWPM          = calcGrossWPM(totalCharsTyped, elapsedSeconds);
  const uncorrectedErrors = countUncorrectedErrors(typedText, targetText);
  const netWPM            = calcNetWPM(grossWPM, uncorrectedErrors, elapsedSeconds);
  const accuracy          = calcAccuracy(typedText, targetText);

  const evaluatedChars    = Math.min(typedText.length, targetText.length);
  let correctChars = 0;
  for (let i = 0; i < evaluatedChars; i++) {
    if (typedText[i] === targetText[i]) correctChars++;
  }
  const incorrectChars    = evaluatedChars - correctChars;

  return { grossWPM, netWPM, accuracy, uncorrectedErrors, correctChars, incorrectChars, evaluatedChars };
}
