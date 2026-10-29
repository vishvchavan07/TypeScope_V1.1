/**
 * TypeScope — Session Storage & Data Management
 * js/storage.js
 *
 * Dedicated storage layer for TypeScope typing test sessions.
 * Handles persistence to localStorage, data sanitisation, schema migration,
 * filtering, sorting, and statistical aggregations.
 *
 * Related courses:
 *   JavaScript Essentials 1  — arrays, objects, functions
 *   JavaScript Essentials 2  — localStorage, higher-order functions (filter, map, reduce, sort)
 *   Introduction to Data Analytics Essentials — data integrity, aggregation, descriptive metrics
 */

"use strict";

const STORAGE_KEY = "typescope_sessions";

/**
 * Validates and sanitises a session object.
 * Handles missing, older schema, or malformed entries safely.
 *
 * @param {Object} raw - raw session object from storage or engine
 * @returns {Object|null} sanitised session object, or null if completely unrecoverable
 */
function sanitizeSession(raw) {
  if (!raw || typeof raw !== "object") return null;

  // Safe ID
  const id = typeof raw.id === "string" && raw.id.trim()
    ? raw.id.trim()
    : `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Safe Date
  let date = raw.date;
  const parsedDate = date ? new Date(date) : null;
  if (!parsedDate || isNaN(parsedDate.getTime())) {
    date = new Date().toISOString();
  } else {
    date = parsedDate.toISOString();
  }

  // Safe Numbers with fallback guards
  const num = (v, fallback = 0) => {
    const n = parseFloat(v);
    return isNaN(n) ? fallback : Math.max(0, n);
  };

  const grossWPM = num(raw.grossWPM, num(raw.wpm, 0));
  const netWPM = num(raw.netWPM !== undefined ? raw.netWPM : raw.wpm, grossWPM);
  const accuracy = Math.min(100, Math.max(0, num(raw.accuracy, 100)));
  const totalCharsTyped = Math.round(num(raw.totalCharsTyped, 0));
  const elapsedSeconds = Math.round(num(raw.elapsedSeconds, num(raw.duration, 60)));
  const duration = Math.round(num(raw.duration, 60));

  const errors = Math.round(num(raw.errors !== undefined ? raw.errors : raw.uncorrectedErrors, 0));
  
  // Safe correct & incorrect chars
  let correctChars = raw.correctChars !== undefined
    ? Math.round(num(raw.correctChars, 0))
    : Math.max(0, Math.round(totalCharsTyped * (accuracy / 100)));
  let incorrectChars = raw.incorrectChars !== undefined
    ? Math.round(num(raw.incorrectChars, 0))
    : Math.max(0, totalCharsTyped - correctChars);

  // Safe Difficulty
  const validDifficulties = ["beginner", "intermediate", "advanced"];
  const difficulty = validDifficulties.includes(raw.difficulty)
    ? raw.difficulty
    : "intermediate";

  // Safe Reason
  const reason = raw.reason === "timeout" ? "timeout" : "completed";

  // Safe Passage Meta
  const passageId = typeof raw.passageId === "string" ? raw.passageId : "unknown";
  const passageTitle = typeof raw.passageTitle === "string" && raw.passageTitle.trim()
    ? raw.passageTitle.trim()
    : "Typing Passage";

  // Safe Error Categories
  const defaultErrorCats = { letters: 0, punctuation: 0, digits: 0, spaces: 0, other: 0 };
  const rawCats = raw.errorCategories && typeof raw.errorCategories === "object" ? raw.errorCategories : null;
  const errorCategories = rawCats
    ? {
        letters:     Math.round(num(rawCats.letters, 0)),
        punctuation: Math.round(num(rawCats.punctuation, 0)),
        digits:      Math.round(num(rawCats.digits, 0)),
        spaces:      Math.round(num(rawCats.spaces, 0)),
        other:       Math.round(num(rawCats.other, 0)),
      }
    : (errors > 0
        ? { letters: errors, punctuation: 0, digits: 0, spaces: 0, other: 0 }
        : defaultErrorCats);

  const errorMap = (raw.errorMap && typeof raw.errorMap === "object")
    ? { ...raw.errorMap }
    : {};

  // Safe rhythm snapshots — stored as-is; validated as array of objects
  const rhythmSnapshots = Array.isArray(raw.rhythmSnapshots)
    ? raw.rhythmSnapshots.filter(
        (s) => s && typeof s === "object" && typeof s.elapsedSeconds === "number"
      )
    : [];

  return {
    id,
    date,
    wpm: Math.round(netWPM * 10) / 10,
    netWPM: Math.round(netWPM * 10) / 10,
    grossWPM: Math.round(grossWPM * 10) / 10,
    accuracy: Math.round(accuracy * 10) / 10,
    errors,
    uncorrectedErrors: errors,
    correctChars,
    incorrectChars,
    totalCharsTyped,
    elapsedSeconds,
    duration,
    difficulty,
    reason,
    passageId,
    passageTitle,
    errorCategories,
    errorMap,
    rhythmSnapshots,
  };
}

/**
 * Loads all sessions from localStorage safely.
 * Returns an empty array if storage is empty, corrupted, or unavailable.
 *
 * @returns {Array<Object>}
 */
function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Sanitise and filter valid entries
    return parsed
      .map(sanitizeSession)
      .filter((s) => s !== null);
  } catch (err) {
    console.warn("TypeScope Storage: Failed to load sessions, initializing empty.", err);
    return [];
  }
}

/**
 * Persists an array of sessions to localStorage.
 *
 * @param {Array<Object>} sessions
 * @returns {boolean} true if successful, false otherwise
 */
function saveSessions(sessions) {
  try {
    const cleanList = Array.isArray(sessions)
      ? sessions.map(sanitizeSession).filter(Boolean)
      : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
    return true;
  } catch (err) {
    console.error("TypeScope Storage: Failed to save sessions.", err);
    return false;
  }
}

/**
 * Adds a new completed test session with duplicate detection.
 * Avoids double-saves if called rapidly for the same completion.
 *
 * @param {Object} sessionData
 * @returns {{ sessions: Array<Object>, added: Object|null }}
 */
function addSession(sessionData) {
  const current = loadSessions();
  const sanitized = sanitizeSession(sessionData);

  if (!sanitized) {
    console.warn("TypeScope Storage: Invalid session data dropped.", sessionData);
    return { sessions: current, added: null };
  }

  // Deduplication check: same id OR test saved within 2 seconds with identical metrics
  const isDuplicate = current.some((existing) => {
    if (existing.id === sanitized.id) return true;
    const timeDiff = Math.abs(new Date(existing.date) - new Date(sanitized.date));
    return (
      timeDiff < 2000 &&
      existing.netWPM === sanitized.netWPM &&
      existing.accuracy === sanitized.accuracy &&
      existing.totalCharsTyped === sanitized.totalCharsTyped
    );
  });

  if (isDuplicate) {
    console.info("TypeScope Storage: Duplicate session ignored.", sanitized.id);
    return { sessions: current, added: null };
  }

  const updated = [sanitized, ...current]; // newest first in memory
  saveSessions(updated);
  return { sessions: updated, added: sanitized };
}

/**
 * Deletes a single session by its unique ID.
 *
 * @param {string} sessionId
 * @returns {Array<Object>} updated sessions array
 */
function deleteSession(sessionId) {
  if (!sessionId) return loadSessions();
  const current = loadSessions();
  const updated = current.filter((s) => s.id !== sessionId);
  saveSessions(updated);
  return updated;
}

/**
 * Clears all saved session data from localStorage.
 *
 * @returns {Array<Object>} empty array
 */
function clearAllSessions() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("TypeScope Storage: Could not clear sessions.", err);
  }
  return [];
}

/**
 * Filters and sorts sessions based on criteria.
 *
 * @param {Array<Object>} sessions - list of sessions
 * @param {Object} criteria
 * @param {string} [criteria.difficulty="all"] - 'all' | 'beginner' | 'intermediate' | 'advanced'
 * @param {string} [criteria.duration="all"] - 'all' | '30' | '60' | '120'
 * @param {string} [criteria.sort="newest"] - 'newest' | 'oldest' | 'wpm-high' | 'wpm-low' | 'acc-high' | 'acc-low' | 'dur-high' | 'dur-low'
 * @returns {Array<Object>} filtered and sorted sessions
 */
function filterAndSortSessions(sessions, criteria = {}) {
  if (!Array.isArray(sessions)) return [];

  const {
    difficulty = "all",
    duration = "all",
    sort = "newest",
  } = criteria;

  // 1. Filter by Difficulty
  let result = sessions.filter((s) => {
    if (difficulty !== "all" && s.difficulty !== difficulty) {
      return false;
    }
    // 2. Filter by Duration
    if (duration !== "all" && String(s.duration) !== String(duration)) {
      return false;
    }
    return true;
  });

  // 3. Sort
  result.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return new Date(a.date) - new Date(b.date);
      case "wpm-high":
        return (b.netWPM || b.wpm) - (a.netWPM || a.wpm);
      case "wpm-low":
        return (a.netWPM || a.wpm) - (b.netWPM || b.wpm);
      case "acc-high":
        return b.accuracy - a.accuracy;
      case "acc-low":
        return a.accuracy - b.accuracy;
      case "dur-high":
        return b.duration - a.duration;
      case "dur-low":
        return a.duration - b.duration;
      case "newest":
      default:
        return new Date(b.date) - new Date(a.date);
    }
  });

  return result;
}

/**
 * Retrieves a session by its unique ID.
 *
 * @param {string} id
 * @returns {Object|null}
 */
function getSessionById(id) {
  if (!id) return null;
  const sessions = loadSessions();
  return sessions.find((s) => s.id === id) || null;
}

/**
 * Calculates summary overview metrics purely from real saved sessions.
 * Returns null for averages/bests if no sessions exist.
 *
 * @param {Array<Object>} sessions
 * @returns {{ totalTests: number, avgNetWPM: number|null, avgAccuracy: number|null, bestNetWPM: number|null }}
 */
function calculateOverviewStats(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return {
      totalTests: 0,
      avgNetWPM: null,
      avgAccuracy: null,
      bestNetWPM: null,
    };
  }

  const wpms = sessions.map((s) => (s.netWPM !== undefined ? s.netWPM : s.wpm) || 0);
  const accs = sessions.map((s) => s.accuracy || 0);

  const sumWpm = wpms.reduce((acc, v) => acc + v, 0);
  const sumAcc = accs.reduce((acc, v) => acc + v, 0);

  return {
    totalTests: sessions.length,
    avgNetWPM: Math.round(sumWpm / sessions.length),
    avgAccuracy: Math.round(sumAcc / sessions.length),
    bestNetWPM: Math.round(Math.max(...wpms)),
  };
}
