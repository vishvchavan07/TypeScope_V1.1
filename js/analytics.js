/**
 * TypeScope — Analytics Intelligence & Data Processing
 * js/analytics.js
 *
 * Dedicated analytics engine for computing trends, statistical aggregates,
 * pace improvements, error patterns, rule-based insights, and CSV exports
 * derived strictly from the user's real saved typing sessions.
 *
 * Related courses:
 *   JavaScript Essentials 1  — array manipulation, functions, math
 *   JavaScript Essentials 2  — higher-order functions (filter, map, reduce), modules
 *   Introduction to Data Analytics Essentials — exploratory data analysis, aggregation,
 *   data transformation, trend detection, descriptive statistics
 */

"use strict";

/**
 * Filters sessions for the Analytics Lab view based on date range,
 * difficulty, and duration.
 *
 * @param {Array<Object>} sessions - all sessions from storage
 * @param {Object} filters
 * @param {string} [filters.dateRange="all"] - 'all' | 'today' | '7days' | '30days'
 * @param {string} [filters.difficulty="all"] - 'all' | 'beginner' | 'intermediate' | 'advanced'
 * @param {string} [filters.duration="all"] - 'all' | '30' | '60' | '120'
 * @returns {Array<Object>} filtered sessions sorted chronologically (oldest to newest)
 */
function filterAnalyticsSessions(sessions, filters = {}) {
  if (!Array.isArray(sessions)) return [];

  const {
    dateRange = "all",
    difficulty = "all",
    duration = "all",
  } = filters;

  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const filtered = sessions.filter((s) => {
    // 1. Difficulty filter
    if (difficulty !== "all" && s.difficulty !== difficulty) {
      return false;
    }

    // 2. Duration filter
    if (duration !== "all" && String(s.duration) !== String(duration)) {
      return false;
    }

    // 3. Date range filter
    const sessionTime = new Date(s.date).getTime();
    if (isNaN(sessionTime)) return true; // keep if invalid date fallback

    if (dateRange === "today") {
      return sessionTime >= startOfToday.getTime();
    } else if (dateRange === "7days") {
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      return sessionTime >= sevenDaysAgo;
    } else if (dateRange === "30days") {
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      return sessionTime >= thirtyDaysAgo;
    }

    return true; // "all"
  });

  // Sort chronologically (oldest to newest) for time-series charts & trends
  return filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Computes high-level summary metrics across the filtered dataset.
 *
 * @param {Array<Object>} sessions
 * @returns {Object} summary metrics
 */
function calcAnalyticsSummary(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return {
      totalTests: 0,
      avgNetWPM: null,
      avgGrossWPM: null,
      avgAccuracy: null,
      bestNetWPM: null,
      totalKeystrokes: 0,
      totalErrors: 0,
      improvement: calcImprovement([]),
    };
  }

  const count = sessions.length;
  const netWpms = sessions.map((s) => (s.netWPM !== undefined ? s.netWPM : s.wpm) || 0);
  const grossWpms = sessions.map((s) => s.grossWPM || 0);
  const accs = sessions.map((s) => s.accuracy || 0);

  const sumNetWpm   = netWpms.reduce((acc, v) => acc + v, 0);
  const sumGrossWpm = grossWpms.reduce((acc, v) => acc + v, 0);
  const sumAcc      = accs.reduce((acc, v) => acc + v, 0);

  const totalKeystrokes = sessions.reduce((acc, s) => acc + (s.totalCharsTyped || 0), 0);
  const totalErrors = sessions.reduce((acc, s) => {
    const err = s.errors !== undefined ? s.errors : s.uncorrectedErrors;
    return acc + (err || 0);
  }, 0);

  return {
    totalTests: count,
    avgNetWPM: Math.round((sumNetWpm / count) * 10) / 10,
    avgGrossWPM: Math.round((sumGrossWpm / count) * 10) / 10,
    avgAccuracy: Math.round((sumAcc / count) * 10) / 10,
    bestNetWPM: Math.round(Math.max(...netWpms) * 10) / 10,
    totalKeystrokes,
    totalErrors,
    improvement: calcImprovement(sessions),
  };
}

/**
 * Calculates improvement between the earliest and latest comparable sessions.
 * Compares sessions of equivalent duration to maintain data integrity.
 * Never claims improvement based on only one session.
 *
 * @param {Array<Object>} sessions - chronologically sorted sessions
 * @returns {Object} improvement details
 */
function calcImprovement(sessions) {
  if (!Array.isArray(sessions) || sessions.length < 2) {
    return {
      hasEnoughData: false,
      reason: sessions && sessions.length === 1 ? "one_session" : "no_data",
      diff: 0,
      percentChange: 0,
      duration: null,
      earliest: null,
      latest: null,
      message: sessions && sessions.length === 1
        ? "Baseline test recorded. Complete a 2nd test with the same duration to track improvement."
        : "Complete at least 2 comparable tests to calculate improvement.",
    };
  }

  // Group sessions by duration to compare equivalent tests
  const durationGroups = {};
  sessions.forEach((s) => {
    const dur = s.duration || 60;
    if (!durationGroups[dur]) durationGroups[dur] = [];
    durationGroups[dur].push(s);
  });

  // Find the duration group with the most sessions that has at least 2 sessions
  let bestGroup = null;
  let maxCount = 0;
  for (const dur in durationGroups) {
    if (durationGroups[dur].length >= 2 && durationGroups[dur].length > maxCount) {
      maxCount = durationGroups[dur].length;
      bestGroup = durationGroups[dur];
    }
  }

  if (!bestGroup || bestGroup.length < 2) {
    return {
      hasEnoughData: false,
      reason: "different_durations",
      diff: 0,
      percentChange: 0,
      duration: null,
      earliest: null,
      latest: null,
      message: "Multiple tests found, but across different test durations. Complete another test with matching duration.",
    };
  }

  // Sort group chronologically
  bestGroup.sort((a, b) => new Date(a.date) - new Date(b.date));

  const earliest = bestGroup[0];
  const latest   = bestGroup[bestGroup.length - 1];

  const earliestWpm = earliest.netWPM !== undefined ? earliest.netWPM : earliest.wpm;
  const latestWpm   = latest.netWPM !== undefined ? latest.netWPM : latest.wpm;

  const diff = latestWpm - earliestWpm;
  const percentChange = earliestWpm > 0
    ? ((diff / earliestWpm) * 100)
    : 0;

  return {
    hasEnoughData: true,
    reason: "ok",
    diff: Math.round(diff * 10) / 10,
    percentChange: Math.round(percentChange * 10) / 10,
    duration: earliest.duration,
    earliest,
    latest,
    message: diff >= 0
      ? `+${Math.round(diff * 10) / 10} WPM (${diff >= 0 ? "+" : ""}${Math.round(percentChange)}%) over ${bestGroup.length} tests (${earliest.duration}s)`
      : `${Math.round(diff * 10) / 10} WPM (${Math.round(percentChange)}%) over ${bestGroup.length} tests (${earliest.duration}s)`,
  };
}

/**
 * Computes average speed and test counts broken down by difficulty tier.
 *
 * @param {Array<Object>} sessions
 * @returns {Object} statistics for beginner, intermediate, advanced
 */
function calcSpeedByDifficulty(sessions) {
  const result = {
    beginner:     { avgNetWPM: 0, avgGrossWPM: 0, avgAccuracy: 0, count: 0 },
    intermediate: { avgNetWPM: 0, avgGrossWPM: 0, avgAccuracy: 0, count: 0 },
    advanced:     { avgNetWPM: 0, avgGrossWPM: 0, avgAccuracy: 0, count: 0 },
  };

  if (!Array.isArray(sessions) || sessions.length === 0) return result;

  const tiers = {
    beginner: [],
    intermediate: [],
    advanced: [],
  };

  sessions.forEach((s) => {
    const diff = s.difficulty || "intermediate";
    if (tiers[diff]) {
      tiers[diff].push(s);
    }
  });

  for (const tier in tiers) {
    const list = tiers[tier];
    if (list.length > 0) {
      const sumNet = list.reduce((acc, s) => acc + ((s.netWPM !== undefined ? s.netWPM : s.wpm) || 0), 0);
      const sumGross = list.reduce((acc, s) => acc + (s.grossWPM || 0), 0);
      const sumAcc = list.reduce((acc, s) => acc + (s.accuracy || 0), 0);

      result[tier] = {
        avgNetWPM: Math.round((sumNet / list.length) * 10) / 10,
        avgGrossWPM: Math.round((sumGross / list.length) * 10) / 10,
        avgAccuracy: Math.round((sumAcc / list.length) * 10) / 10,
        count: list.length,
      };
    }
  }

  return result;
}

/**
 * Aggregates error categories and top mistyped characters.
 *
 * @param {Array<Object>} sessions
 * @returns {Object} error distribution and top mistyped keys
 */
function calcErrorBreakdown(sessions) {
  const categories = {
    letters: 0,
    punctuation: 0,
    digits: 0,
    spaces: 0,
    other: 0,
  };

  const keyMap = {};
  let totalErrorsRecorded = 0;

  if (Array.isArray(sessions)) {
    sessions.forEach((s) => {
      // 1. Tally categories
      if (s.errorCategories && typeof s.errorCategories === "object") {
        for (const cat in categories) {
          const count = Number(s.errorCategories[cat]) || 0;
          categories[cat] += count;
          totalErrorsRecorded += count;
        }
      } else {
        // Fallback for sessions prior to errorCategory tracking
        const err = s.errors !== undefined ? s.errors : s.uncorrectedErrors;
        if (err > 0) {
          categories.letters += err;
          totalErrorsRecorded += err;
        }
      }

      // 2. Tally individual mistyped keys
      if (s.errorMap && typeof s.errorMap === "object") {
        for (const key in s.errorMap) {
          keyMap[key] = (keyMap[key] || 0) + Number(s.errorMap[key]);
        }
      }
    });
  }

  // Sort top mistyped keys
  const topKeys = Object.entries(keyMap)
    .map(([key, count]) => ({
      key: key === " " ? "Space" : key,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    categories,
    totalErrors: totalErrorsRecorded,
    topKeys,
  };
}

/**
 * Generates rule-based, data-driven insights from the user's actual sessions.
 * Never invents sample statistics or fabricates patterns.
 * Explicitly indicates when there is insufficient data.
 *
 * @param {Array<Object>} sessions - all or filtered sessions
 * @returns {Array<Object>} list of actionable insights
 */
function generateRuleBasedInsights(sessions) {
  const insights = [];

  // Case 0: Empty dataset
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return [
      {
        id: "speed-empty",
        icon: "⚡",
        title: "Speed Progression",
        badge: "Awaiting Tests",
        badgeType: "neutral",
        desc: "Complete your first typing test to start tracking Net WPM, speed trajectories, and personal best records.",
      },
      {
        id: "accuracy-empty",
        icon: "🎯",
        title: "Accuracy Patterns",
        badge: "Awaiting Tests",
        badgeType: "neutral",
        desc: "Key precision and error rates will be analyzed here once typing sessions are completed.",
      },
      {
        id: "difficulty-empty",
        icon: "📚",
        title: "Difficulty Tier Comparison",
        badge: "Awaiting Tests",
        badgeType: "neutral",
        desc: "Compare your typing performance across Beginner, Intermediate, and Advanced texts to discover your comfort zone.",
      },
      {
        id: "consistency-empty",
        icon: "🏅",
        title: "Consistency & Rhythm",
        badge: "Awaiting Tests",
        badgeType: "neutral",
        desc: "Variance in keystroke cadence and error frequency will be calculated from multiple comparable tests.",
      },
    ];
  }

  const count = sessions.length;
  const netWpms = sessions.map((s) => (s.netWPM !== undefined ? s.netWPM : s.wpm) || 0);
  const accs = sessions.map((s) => s.accuracy || 0);
  const avgWpm = netWpms.reduce((a, b) => a + b, 0) / count;
  const avgAcc = accs.reduce((a, b) => a + b, 0) / count;
  const bestWpm = Math.max(...netWpms);

  // ── Insight 1: Speed & Improvement
  const improvement = calcImprovement(sessions);
  if (improvement.hasEnoughData) {
    if (improvement.diff > 2) {
      insights.push({
        id: "speed-gain",
        icon: "📈",
        title: "Positive Speed Trajectory",
        badge: `+${improvement.diff} WPM`,
        badgeType: "success",
        desc: `Your Net WPM improved by ${improvement.diff} WPM (${improvement.percentChange > 0 ? "+" : ""}${improvement.percentChange}%) between your earliest (${improvement.earliest.netWPM} WPM) and latest (${improvement.latest.netWPM} WPM) comparable ${improvement.duration}s tests.`,
      });
    } else if (improvement.diff < -2) {
      insights.push({
        id: "speed-dip",
        icon: "📉",
        title: "Speed Dip Observed",
        badge: `${improvement.diff} WPM`,
        badgeType: "warning",
        desc: `Your latest comparable test was ${Math.abs(improvement.diff)} WPM lower than your earlier baseline. Ensure you take brief hand rests between tests to avoid cognitive fatigue.`,
      });
    } else {
      insights.push({
        id: "speed-steady",
        icon: "⚖️",
        title: "Stable Cadence",
        badge: "Consistent",
        badgeType: "info",
        desc: `Your speed is remarkably consistent around ${Math.round(avgWpm)} WPM with less than 2 WPM drift across comparable ${improvement.duration}s sessions.`,
      });
    }
  } else {
    insights.push({
      id: "speed-baseline",
      icon: "⚡",
      title: "Speed Baseline Established",
      badge: `${Math.round(bestWpm)} WPM Best`,
      badgeType: "info",
      desc: improvement.message,
    });
  }

  // ── Insight 2: Accuracy Precision
  if (avgAcc >= 97) {
    insights.push({
      id: "acc-high",
      icon: "🎯",
      title: "Master Precision",
      badge: `${Math.round(avgAcc)}% Avg`,
      badgeType: "success",
      desc: `Your average accuracy is ${Math.round(avgAcc * 10) / 10}%. You make very few mistakes, meaning you can safely push for higher typing speed without error penalties.`,
    });
  } else if (avgAcc < 90) {
    insights.push({
      id: "acc-low",
      icon: "⚠️",
      title: "Prioritize Keystroke Accuracy",
      badge: `${Math.round(avgAcc)}% Avg`,
      badgeType: "warning",
      desc: `Your average accuracy is ${Math.round(avgAcc * 10) / 10}%. Uncorrected errors heavily penalize your Net WPM (1 mistake = 1 WPM penalty per minute). Slow down slightly to raise precision above 95%.`,
    });
  } else {
    insights.push({
      id: "acc-solid",
      icon: "🎯",
      title: "Solid Precision",
      badge: `${Math.round(avgAcc)}% Avg`,
      badgeType: "info",
      desc: `Your accuracy is well-balanced at ${Math.round(avgAcc * 10) / 10}%. Working towards 98%+ will minimize backspacing and maximize net flow.`,
    });
  }

  // ── Insight 3: Difficulty Breakdown
  const diffStats = calcSpeedByDifficulty(sessions);
  const activeTiers = Object.keys(diffStats).filter((tier) => diffStats[tier].count > 0);

  if (activeTiers.length > 1) {
    const sortedTiers = activeTiers.sort((a, b) => diffStats[b].avgNetWPM - diffStats[a].avgNetWPM);
    const topTier = sortedTiers[0];
    const topAvg = diffStats[topTier].avgNetWPM;
    const lowerTier = sortedTiers[sortedTiers.length - 1];
    const lowerAvg = diffStats[lowerTier].avgNetWPM;

    insights.push({
      id: "diff-multi",
      icon: "📚",
      title: "Tier Adaptability",
      badge: `${capitalise(topTier)} Lead`,
      badgeType: "info",
      desc: `You type fastest on ${capitalise(topTier)} (${topAvg} WPM) and average ${lowerAvg} WPM on ${capitalise(lowerTier)} (${Math.round((topAvg - lowerAvg) * 10) / 10} WPM delta). Complex vocabulary slightly reduces velocity.`,
    });
  } else if (activeTiers.length === 1) {
    const singleTier = activeTiers[0];
    insights.push({
      id: "diff-single",
      icon: "📚",
      title: "Single Difficulty Tracked",
      badge: capitalise(singleTier),
      badgeType: "neutral",
      desc: `All ${count} recorded sessions are in the ${capitalise(singleTier)} tier (${diffStats[singleTier].avgNetWPM} WPM). Try other difficulty levels to test your versatility on complex symbols and words.`,
    });
  }

  // ── Insight 4: Mistyped Keys & Category Focus
  const errorInfo = calcErrorBreakdown(sessions);
  if (errorInfo.totalErrors > 0 && errorInfo.topKeys.length > 0) {
    const worstKey = errorInfo.topKeys[0];
    const topCats = Object.entries(errorInfo.categories)
      .sort((a, b) => b[1] - a[1])
      .filter((entry) => entry[1] > 0);

    const primaryCat = topCats.length > 0 ? topCats[0][0] : "general";

    insights.push({
      id: "error-focus",
      icon: "🔥",
      title: "Recurring Mistake Keys",
      badge: `Key: '${worstKey.key}'`,
      badgeType: "warning",
      desc: `The key '${worstKey.key}' was mistyped ${worstKey.count} time${worstKey.count === 1 ? "" : "s"}. ${capitalise(primaryCat)} account for the largest proportion of total errors across your sessions.`,
    });
  } else {
    insights.push({
      id: "error-clean",
      icon: "✨",
      title: "Clean Keystrokes",
      badge: "Zero Errors",
      badgeType: "success",
      desc: "No significant uncorrected mistake clusters detected across your completed sessions.",
    });
  }

  return insights;
}

/**
 * Generates and triggers download of a standardized CSV export of sessions.
 * Implements standard RFC 4180 CSV escaping for quotes, commas, and line breaks.
 *
 * @param {Array<Object>} sessions - sessions to export
 * @param {string} [filename] - optional file name
 * @returns {boolean} true if export initiated, false if empty
 */
function exportSessionsToCSV(sessions, filename) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return false;
  }

  const headers = [
    "Session ID",
    "Date",
    "Time",
    "Difficulty",
    "Duration (s)",
    "Elapsed (s)",
    "Net WPM",
    "Gross WPM",
    "Accuracy (%)",
    "Total Keystrokes",
    "Correct Characters",
    "Incorrect Characters",
    "Errors",
    "Completion Reason",
    "Passage Title",
  ];

  /** RFC 4180 escaping with formula injection safeguard */
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return "";
    let str = String(value);
    // Prevent spreadsheet formula injection (=, +, -, @)
    if (/^[=+\-@]/.test(str)) {
      str = "'" + str;
    }
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = sessions.map((s) => {
    const d = new Date(s.date);
    const dateStr = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : s.date;
    const timeStr = !isNaN(d.getTime()) ? d.toTimeString().split(" ")[0] : "";
    const netWPM  = s.netWPM !== undefined ? s.netWPM : s.wpm;
    const errors  = s.errors !== undefined ? s.errors : s.uncorrectedErrors;

    return [
      escapeCSV(s.id),
      escapeCSV(dateStr),
      escapeCSV(timeStr),
      escapeCSV(s.difficulty),
      escapeCSV(s.duration),
      escapeCSV(s.elapsedSeconds),
      escapeCSV(netWPM),
      escapeCSV(s.grossWPM),
      escapeCSV(s.accuracy),
      escapeCSV(s.totalCharsTyped),
      escapeCSV(s.correctChars),
      escapeCSV(s.incorrectChars),
      escapeCSV(errors),
      escapeCSV(s.reason),
      escapeCSV(s.passageTitle || "Typing Passage"),
    ].join(",");
  });

  // Include UTF-8 Byte Order Mark (\uFEFF) for Microsoft Excel compatibility
  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const name = filename || `typescope_sessions_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
