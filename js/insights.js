/**
 * TypeScope — Smart Performance Insights & Intelligence Engine
 * js/insights.js
 *
 * Evaluates real completed typing sessions to identify:
 *   1. WPM progression trends over time
 *   2. Speed vs. Accuracy trade-offs
 *   3. Cadence consistency & variance (Standard Deviation / Coefficient of Variation)
 *   4. Performance differences across test durations (Stamina & Fatigue analysis)
 *   5. Performance gaps across passage difficulties
 *   6. Frequent error categories and recurring mistyped keys
 *
 * Strict Data Integrity & Privacy Principles:
 *   • Never fabricates sample data or fake user results.
 *   • Explicitly distinguishes objective observations from data-backed conclusions.
 *   • Never claims improvement from a single session.
 *   • Clearly states when the sample size is insufficient.
 *   • Analyzes entirely locally on the client without external network calls.
 *
 * Related courses:
 *   JavaScript Essentials 1  — math functions, objects, DOM manipulation
 *   JavaScript Essentials 2  — higher-order functions, modular architecture, array reduction
 *   Introduction to Data Analytics Essentials — statistical analysis, trend deduction,
 *   variance measurement, evidence-based recommendations
 */

"use strict";

const InsightsEngine = {
  /**
   * Main entry point: Evaluates all saved sessions and returns a complete insights package.
   *
   * @param {Array<Object>} sessions - all sessions from localStorage
   * @returns {Object} insights package containing profile, summary, and rules list
   */
  evaluate(sessions) {
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return {
        hasData: false,
        totalSessions: 0,
        profile: {
          title: "New Aspirant",
          badge: "Awaiting Tests",
          description: "Complete your first typing test to unlock automated pattern analysis and personalized performance intelligence.",
        },
        insights: [],
      };
    }

    // Sort chronologically (oldest to newest) for trend detection
    const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));

    const wpmTrend     = this.analyzeWpmTrend(sorted);
    const speedAcc     = this.analyzeSpeedAccuracyTradeoff(sorted);
    const consistency  = this.analyzeConsistency(sorted);
    const durationComp = this.analyzeDurationPerformance(sorted);
    const diffComp     = this.analyzeDifficultyGap(sorted);
    const errorPattern = this.analyzeFrequentErrors(sorted);

    const insights = [
      wpmTrend,
      speedAcc,
      consistency,
      durationComp,
      diffComp,
      errorPattern,
    ];

    const profile = this.determineTypingProfile(sorted, {
      wpmTrend,
      speedAcc,
      consistency,
    });

    return {
      hasData: true,
      totalSessions: sorted.length,
      evaluatedAt: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
      profile,
      insights,
    };
  },

  /**
   * Rule 1: WPM Trend & Velocity Trajectory
   * Compares comparable sessions of the same duration.
   */
  analyzeWpmTrend(sessions) {
    if (sessions.length < 2) {
      return {
        id: "rule-wpm-trend",
        title: "WPM Progression & Velocity",
        icon: "📈",
        category: "Speed Trend",
        badge: "Single Test Baseline",
        badgeType: "neutral",
        isSufficient: false,
        observation: `Baseline test recorded at ${sessions[0].netWPM || sessions[0].wpm} Net WPM (${sessions[0].duration}s duration, ${capitalise(sessions[0].difficulty)}). Sample size: N=1.`,
        conclusion: "A single session establishes a starting point, but cannot demonstrate a trend, acceleration, or regression.",
        recommendation: "Complete at least one additional test of the same duration to begin tracking your velocity trajectory.",
        supportingData: "Requires at least 2 comparable sessions with matching duration.",
      };
    }

    // Group by duration to compare equivalent tests
    const durGroups = {};
    sessions.forEach((s) => {
      const d = s.duration || 60;
      if (!durGroups[d]) durGroups[d] = [];
      durGroups[d].push(s);
    });

    // Find the duration group with the most sessions
    let bestDur = null;
    let maxCount = 0;
    for (const d in durGroups) {
      if (durGroups[d].length > maxCount) {
        maxCount = durGroups[d].length;
        bestDur = d;
      }
    }

    const group = durGroups[bestDur];
    if (group.length < 2) {
      return {
        id: "rule-wpm-trend",
        title: "WPM Progression & Velocity",
        icon: "📈",
        category: "Speed Trend",
        badge: "Varied Durations",
        badgeType: "neutral",
        isSufficient: false,
        observation: `You have completed ${sessions.length} tests, but each test had a different duration (${Object.keys(durGroups).join("s, ")}s).`,
        conclusion: "Comparing speed across mismatched durations (e.g. 30s sprint vs 120s endurance) would compromise data integrity.",
        recommendation: "Take another test matching one of your previous test durations to enable an apples-to-apples comparison.",
        supportingData: `Sample sizes: ${Object.entries(durGroups).map(([d, l]) => `${d}s (N=${l.length})`).join(", ")}.`,
      };
    }

    const earliest = group[0];
    const latest   = group[group.length - 1];
    const earliestWpm = earliest.netWPM !== undefined ? earliest.netWPM : earliest.wpm;
    const latestWpm   = latest.netWPM !== undefined ? latest.netWPM : latest.wpm;
    const delta = Math.round((latestWpm - earliestWpm) * 10) / 10;
    const pctChange = earliestWpm > 0 ? Math.round(((delta / earliestWpm) * 100) * 10) / 10 : 0;

    if (delta > 2) {
      return {
        id: "rule-wpm-trend",
        title: "WPM Progression & Velocity",
        icon: "📈",
        category: "Speed Trend",
        badge: `+${delta} WPM Gain`,
        badgeType: "success",
        isSufficient: true,
        observation: `Across ${group.length} comparable ${bestDur}s sessions, your Net WPM rose from ${earliestWpm} to ${latestWpm} WPM (a +${delta} WPM shift, +${pctChange}%).`,
        conclusion: "Upward Velocity Trend: We observe a measurable increase in keystroke speed across comparable test lengths. This observation aligns with developing familiarity and finger transition speed.",
        recommendation: "Continue with this test length to consolidate your gains, or challenge your muscle memory with slightly longer 60s/120s passages.",
        supportingData: `Duration: ${bestDur}s · Sample: N=${group.length} · Baseline: ${earliestWpm} WPM · Current: ${latestWpm} WPM.`,
      };
    } else if (delta < -2) {
      return {
        id: "rule-wpm-trend",
        title: "WPM Progression & Velocity",
        icon: "📉",
        category: "Speed Trend",
        badge: `${delta} WPM Dip`,
        badgeType: "warning",
        isSufficient: true,
        observation: `Across ${group.length} comparable ${bestDur}s sessions, your latest Net WPM (${latestWpm}) was lower than your earlier baseline (${earliestWpm} WPM), representing a ${delta} WPM drop (${pctChange}%).`,
        conclusion: "Pace Regression Observed: Net speed has dipped between your earlier and recent comparable runs. This pattern is commonly linked to fatigue, distraction, or rushing.",
        recommendation: "Take a 2-minute physical break to relax hand tension, then perform a calm, deliberate run focusing purely on smooth rhythm.",
        supportingData: `Duration: ${bestDur}s · Sample: N=${group.length} · Delta: ${delta} WPM.`,
      };
    } else {
      return {
        id: "rule-wpm-trend",
        title: "WPM Progression & Velocity",
        icon: "⚖️",
        category: "Speed Trend",
        badge: "Steady Cadence",
        badgeType: "info",
        isSufficient: true,
        observation: `Net WPM has remained stable within ±2 WPM (earliest: ${earliestWpm} WPM, latest: ${latestWpm} WPM) across ${group.length} tests of ${bestDur}s.`,
        conclusion: "Velocity Plateau: Your typing pace has reached an established equilibrium point with minimal drift.",
        recommendation: "To break through this plateau, attempt brief 30s burst tests where you consciously push finger speed slightly outside your comfort zone.",
        supportingData: `Duration: ${bestDur}s · Sample: N=${group.length} · Net variance: ${delta} WPM.`,
      };
    }
  },

  /**
   * Rule 2: Speed vs. Accuracy Trade-off
   * Identifies whether rushing is harming precision or if high precision allows speed acceleration.
   */
  analyzeSpeedAccuracyTradeoff(sessions) {
    if (sessions.length < 2) {
      const single = sessions[0];
      return {
        id: "rule-speed-accuracy",
        title: "Speed vs. Accuracy Trade-off",
        icon: "🎯",
        category: "Precision Analysis",
        badge: `${single.accuracy}% Accuracy`,
        badgeType: single.accuracy >= 95 ? "success" : "warning",
        isSufficient: false,
        observation: `Single test recorded: ${single.accuracy}% accuracy at ${single.netWPM || single.wpm} Net WPM with ${single.errors || 0} uncorrected errors.`,
        conclusion: "Evaluating whether speed gains compromise accuracy requires multi-session trend data.",
        recommendation: "Complete additional tests to analyze how adjustments in your typing tempo affect your error rates.",
        supportingData: "Sample size: N=1. Multi-session comparison required.",
      };
    }

    const firstHalf = sessions.slice(0, Math.ceil(sessions.length / 2));
    const secondHalf = sessions.slice(Math.ceil(sessions.length / 2));

    const avg = (arr, key) => arr.reduce((acc, s) => acc + (s[key] || 0), 0) / arr.length;

    const earlierWpm = Math.round(avg(firstHalf, "wpm") * 10) / 10;
    const earlierAcc = Math.round(avg(firstHalf, "accuracy") * 10) / 10;
    const recentWpm  = Math.round(avg(secondHalf, "wpm") * 10) / 10;
    const recentAcc  = Math.round(avg(secondHalf, "accuracy") * 10) / 10;

    const wpmDiff = Math.round((recentWpm - earlierWpm) * 10) / 10;
    const accDiff = Math.round((recentAcc - earlierAcc) * 10) / 10;

    // Condition A: Speed up, Accuracy down (Classic rushing penalty)
    if (wpmDiff > 1.5 && accDiff < -2) {
      return {
        id: "rule-speed-accuracy",
        title: "Speed vs. Accuracy Trade-off",
        icon: "⚠️",
        category: "Precision Analysis",
        badge: "Accuracy Trade-off",
        badgeType: "warning",
        isSufficient: true,
        observation: `Recent tests show higher Net WPM (+${wpmDiff} WPM from ${earlierWpm} to ${recentWpm}), but accuracy decreased by ${accDiff}% (from ${earlierAcc}% down to ${recentAcc}%).`,
        conclusion: "Rushing Penalty: Pushing for raw speed appears to be introducing mistakes. Because the standard formula penalizes uncorrected errors by deducting 1 WPM per mistake per minute, precision losses offset your raw speed.",
        recommendation: "Scale back your speed by ~5% until accuracy returns to 96%+. Smooth, error-free typing always yields a higher Net WPM than hurried typing with corrections.",
        supportingData: `Sample: N=${sessions.length} · Earlier Avg: ${earlierWpm} WPM / ${earlierAcc}% · Recent Avg: ${recentWpm} WPM / ${recentAcc}%.`,
      };
    }

    // Condition B: Both Speed and Accuracy improving (Synergy)
    if (wpmDiff >= 1.5 && accDiff >= 0) {
      return {
        id: "rule-speed-accuracy",
        title: "Speed vs. Accuracy Trade-off",
        icon: "✨",
        category: "Precision Analysis",
        badge: "Synchronized Growth",
        badgeType: "success",
        isSufficient: true,
        observation: `Both Net WPM (+${wpmDiff} WPM) and Accuracy (+${accDiff}%) have trended upward between your earlier (avg ${earlierWpm} WPM, ${earlierAcc}%) and recent tests (avg ${recentWpm} WPM, ${recentAcc}%).`,
        conclusion: "Positive Skill Consolidation: You are acquiring velocity without sacrificing precision—the gold standard of touch typing improvement.",
        recommendation: "Maintain this habit. You are ready to introduce harder texts in the Advanced tier or tackle longer durations.",
        supportingData: `Sample: N=${sessions.length} · WPM Δ: +${wpmDiff} · Accuracy Δ: +${accDiff}%.`,
      };
    }

    // Condition C: High Accuracy Ceiling (>97%) with room for velocity
    const overallAcc = Math.round(avg(sessions, "accuracy") * 10) / 10;
    if (overallAcc >= 97) {
      return {
        id: "rule-speed-accuracy",
        title: "Speed vs. Accuracy Trade-off",
        icon: "🎯",
        category: "Precision Analysis",
        badge: `${overallAcc}% High Accuracy`,
        badgeType: "success",
        isSufficient: true,
        observation: `Overall accuracy is exceptionally high at ${overallAcc}% across ${sessions.length} completed sessions.`,
        conclusion: "Accuracy Buffer Available: Because your error rate is under 3%, you are in an optimal position to increase your finger velocity without risking heavy error deductions.",
        recommendation: "Consciously test a slightly brisker rhythm. Even if accuracy dips slightly to 95–96%, your Net WPM will likely experience a net gain.",
        supportingData: `Sample: N=${sessions.length} · Overall Accuracy: ${overallAcc}%.`,
      };
    }

    // Condition D: General precision guidance
    return {
      id: "rule-speed-accuracy",
      title: "Speed vs. Accuracy Trade-off",
      icon: "🎯",
      category: "Precision Analysis",
      badge: `${overallAcc}% Balanced`,
      badgeType: "info",
      isSufficient: true,
      observation: `Across ${sessions.length} sessions, average accuracy is ${overallAcc}% and Net WPM is ${recentWpm} WPM.`,
      conclusion: "Balanced Profile: Your speed and precision maintain a normal correlation without severe divergence.",
      recommendation: "Strive to keep uncorrected errors under 2 per test. Consistent rhythm prevents error cascading.",
      supportingData: `Sample: N=${sessions.length} · Accuracy: ${overallAcc}% · Average Net WPM: ${recentWpm}.`,
    };
  },

  /**
   * Rule 3: Consistency & Pace Variance
   * Computes Mean, Standard Deviation (σ), and Coefficient of Variation (CV).
   */
  analyzeConsistency(sessions) {
    if (sessions.length < 3) {
      return {
        id: "rule-consistency",
        title: "Cadence Consistency & Variance",
        icon: "🏅",
        category: "Consistency",
        badge: "Needs 3+ Tests",
        badgeType: "neutral",
        isSufficient: false,
        observation: `Currently evaluated on N=${sessions.length} session${sessions.length === 1 ? "" : "s"}.`,
        conclusion: "Calculating statistical variance and standard deviation requires a sample size of at least 3 sessions.",
        recommendation: `Complete ${3 - sessions.length} more test${3 - sessions.length === 1 ? "" : "s"} to unlock your consistency index.`,
        supportingData: "Statistical standard deviation requires N >= 3 samples.",
      };
    }

    const wpms = sessions.map((s) => (s.netWPM !== undefined ? s.netWPM : s.wpm) || 0);
    const mean = wpms.reduce((a, b) => a + b, 0) / wpms.length;

    // Standard deviation formula: sqrt( sum( (x - mean)^2 ) / N )
    const variance = wpms.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / wpms.length;
    const stdDev = Math.round(Math.sqrt(variance) * 10) / 10;
    const cv = mean > 0 ? Math.round(((stdDev / mean) * 100) * 10) / 10 : 0; // Coefficient of Variation

    if (cv <= 7) {
      return {
        id: "rule-consistency",
        title: "Cadence Consistency & Variance",
        icon: "🏅",
        category: "Consistency",
        badge: "High Stability",
        badgeType: "success",
        isSufficient: true,
        observation: `Across ${sessions.length} tests, your Net WPM averaged ${Math.round(mean * 10) / 10} WPM with a standard deviation of only ±${stdDev} WPM (Coefficient of Variation: ${cv}%).`,
        conclusion: "Exceptional Rhythmic Stability: Your speed varies very little between tests. This suggests reliable muscle memory and minimal performance degradation under pressure.",
        recommendation: "Stability is the foundation for speed breakthroughs. You have achieved high consistency; now focus on gently nudging your target speed upward.",
        supportingData: `Sample: N=${sessions.length} · Mean: ${Math.round(mean * 10) / 10} WPM · Std Dev (σ): ±${stdDev} · CV: ${cv}%.`,
      };
    } else if (cv <= 15) {
      return {
        id: "rule-consistency",
        title: "Cadence Consistency & Variance",
        icon: "🏅",
        category: "Consistency",
        badge: "Moderate Variance",
        badgeType: "info",
        isSufficient: true,
        observation: `Your typing speed has a standard deviation of ±${stdDev} WPM on a mean of ${Math.round(mean * 10) / 10} WPM (Coefficient of Variation: ${cv}%).`,
        conclusion: "Expected Variance: Your typing rhythm exhibits a normal amount of variation based on passage difficulty, hand warm-up, and focus.",
        recommendation: "Focus on maintaining an even, rhythmic cadence across sentences instead of sprinting through easy words and stalling on difficult ones.",
        supportingData: `Sample: N=${sessions.length} · Std Dev: ±${stdDev} WPM · CV: ${cv}%.`,
      };
    } else {
      return {
        id: "rule-consistency",
        title: "Cadence Consistency & Variance",
        icon: "⚡",
        category: "Consistency",
        badge: "High Fluctuations",
        badgeType: "warning",
        isSufficient: true,
        observation: `High speed fluctuation detected: Standard deviation is ±${stdDev} WPM on a mean of ${Math.round(mean * 10) / 10} WPM (Coefficient of Variation: ${cv}%). Max speed was ${Math.max(...wpms)} WPM vs minimum ${Math.min(...wpms)} WPM.`,
        conclusion: "Erratic Pacing: Significant spread between sessions. This often indicates varying physical posture, distraction, or inconsistent recovery from mistakes.",
        recommendation: "Try typing with a metronome effect: aim for constant character frequency. When an error occurs, pause for a split second rather than spamming Backspace.",
        supportingData: `Sample: N=${sessions.length} · Range: ${Math.min(...wpms)} – ${Math.max(...wpms)} WPM · Std Dev: ±${stdDev}.`,
      };
    }
  },

  /**
   * Rule 4: Performance Across Test Durations (Stamina Analysis)
   * Evaluates if speed or accuracy drops significantly on longer tests (30s vs 60s vs 120s).
   */
  analyzeDurationPerformance(sessions) {
    const durGroups = {};
    sessions.forEach((s) => {
      const d = s.duration || 60;
      if (!durGroups[d]) durGroups[d] = [];
      durGroups[d].push(s);
    });

    const activeDurs = Object.keys(durGroups).map(Number).sort((a, b) => a - b);

    if (activeDurs.length < 2) {
      const singleDur = activeDurs[0] || 60;
      return {
        id: "rule-duration-stamina",
        title: "Duration Stamina & Fatigue",
        icon: "⏱️",
        category: "Duration Analysis",
        badge: `Only ${singleDur}s Tested`,
        badgeType: "neutral",
        isSufficient: false,
        observation: `All ${sessions.length} saved sessions were completed in the ${singleDur}s test duration.`,
        conclusion: "Insufficient cross-duration data: Stamina retention and duration-based fatigue cannot be measured without comparing multiple test lengths.",
        recommendation: `Try completing tests in the other duration tiers (${[30, 60, 120].filter((d) => d !== singleDur).join("s and ")}s) to analyze your endurance profile.`,
        supportingData: `Evaluated duration: ${singleDur}s (N=${sessions.length}).`,
      };
    }

    const durStats = {};
    activeDurs.forEach((d) => {
      const list = durGroups[d];
      const avgWpm = list.reduce((acc, s) => acc + ((s.netWPM !== undefined ? s.netWPM : s.wpm) || 0), 0) / list.length;
      const avgAcc = list.reduce((acc, s) => acc + (s.accuracy || 0), 0) / list.length;
      durStats[d] = {
        count: list.length,
        avgWpm: Math.round(avgWpm * 10) / 10,
        avgAcc: Math.round(avgAcc * 10) / 10,
      };
    });

    const shortest = activeDurs[0];
    const longest  = activeDurs[activeDurs.length - 1];
    const diff = Math.round((durStats[shortest].avgWpm - durStats[longest].avgWpm) * 10) / 10;
    const pctDiff = durStats[shortest].avgWpm > 0
      ? Math.round(((diff / durStats[shortest].avgWpm) * 100) * 10) / 10
      : 0;

    if (diff > 4) {
      return {
        id: "rule-duration-stamina",
        title: "Duration Stamina & Fatigue",
        icon: "⏱️",
        category: "Duration Analysis",
        badge: `-${diff} WPM on Long Tests`,
        badgeType: "warning",
        isSufficient: true,
        observation: `Speed is higher in shorter tests (${durStats[shortest].avgWpm} WPM on ${shortest}s, N=${durStats[shortest].count}) compared to longer tests (${durStats[longest].avgWpm} WPM on ${longest}s, N=${durStats[longest].count}), showing a ${diff} WPM drop (${pctDiff}%).`,
        conclusion: "Endurance Degradation: Performance decreases as test duration increases. This pattern frequently reflects physical finger fatigue, wrist strain, or diminishing cognitive focus over extended intervals.",
        recommendation: "Build stamina by doing progressive 60s and 120s sessions. Check your ergonomics: ensure elbows are at 90 degrees and wrists are hovering rather than resting on the desk.",
        supportingData: `${shortest}s: ${durStats[shortest].avgWpm} WPM (N=${durStats[shortest].count}) vs ${longest}s: ${durStats[longest].avgWpm} WPM (N=${durStats[longest].count}).`,
      };
    } else {
      return {
        id: "rule-duration-stamina",
        title: "Duration Stamina & Fatigue",
        icon: "⏱️",
        category: "Duration Analysis",
        badge: "Stamina Retained",
        badgeType: "success",
        isSufficient: true,
        observation: `Pace remains balanced across durations: ${shortest}s tests average ${durStats[shortest].avgWpm} WPM (N=${durStats[shortest].count}) vs ${longest}s tests at ${durStats[longest].avgWpm} WPM (N=${durStats[longest].count}) — a difference of only ${Math.abs(diff)} WPM.`,
        conclusion: "High Endurance: Your velocity does not deteriorate significantly over longer typing durations. You maintain consistent concentration.",
        recommendation: "Maintain your posture and pacing. You are well suited for extended typing sessions and long-form coding.",
        supportingData: `${shortest}s (N=${durStats[shortest].count}): ${durStats[shortest].avgWpm} WPM · ${longest}s (N=${durStats[longest].count}): ${durStats[longest].avgWpm} WPM.`,
      };
    }
  },

  /**
   * Rule 5: Performance Across Passage Difficulty
   * Compares Beginner vs Intermediate vs Advanced performance.
   */
  analyzeDifficultyGap(sessions) {
    const diffGroups = {
      beginner: [],
      intermediate: [],
      advanced: [],
    };

    sessions.forEach((s) => {
      const diff = s.difficulty || "intermediate";
      if (diffGroups[diff]) diffGroups[diff].push(s);
    });

    const activeTiers = Object.keys(diffGroups).filter((t) => diffGroups[t].length > 0);

    if (activeTiers.length < 2) {
      const single = activeTiers[0] || "intermediate";
      return {
        id: "rule-difficulty-gap",
        title: "Passage Complexity & Difficulty",
        icon: "📚",
        category: "Complexity Analysis",
        badge: `Only ${capitalise(single)}`,
        badgeType: "neutral",
        isSufficient: false,
        observation: `All ${sessions.length} tests were conducted in the ${capitalise(single)} tier.`,
        conclusion: "Cross-tier complexity gap cannot be evaluated because you have only completed tests within a single difficulty tier.",
        recommendation: `Take tests in the ${["beginner", "intermediate", "advanced"].filter((t) => t !== single).map(capitalise).join(" or ")} tiers to measure how text complexity influences your rhythm.`,
        supportingData: `Tier: ${capitalise(single)} · Tests: N=${sessions.length}.`,
      };
    }

    const tierStats = {};
    activeTiers.forEach((t) => {
      const list = diffGroups[t];
      const avgWpm = list.reduce((acc, s) => acc + ((s.netWPM !== undefined ? s.netWPM : s.wpm) || 0), 0) / list.length;
      const avgAcc = list.reduce((acc, s) => acc + (s.accuracy || 0), 0) / list.length;
      tierStats[t] = {
        count: list.length,
        avgWpm: Math.round(avgWpm * 10) / 10,
        avgAcc: Math.round(avgAcc * 10) / 10,
      };
    });

    // Check gap between highest tier and lowest tier
    const sortedByWpm = [...activeTiers].sort((a, b) => tierStats[b].avgWpm - tierStats[a].avgWpm);
    const topTier = sortedByWpm[0];
    const lowestTier = sortedByWpm[sortedByWpm.length - 1];
    const delta = Math.round((tierStats[topTier].avgWpm - tierStats[lowestTier].avgWpm) * 10) / 10;

    if (delta > 6) {
      return {
        id: "rule-difficulty-gap",
        title: "Passage Complexity & Difficulty",
        icon: "📚",
        category: "Complexity Analysis",
        badge: `${capitalise(lowestTier)} Practice Needed`,
        badgeType: "warning",
        isSufficient: true,
        observation: `Noticeable complexity drop: You average ${tierStats[topTier].avgWpm} WPM on ${capitalise(topTier)} (N=${tierStats[topTier].count}), but drop to ${tierStats[lowestTier].avgWpm} WPM on ${capitalise(lowestTier)} (N=${tierStats[lowestTier].count}), a ${delta} WPM gap.`,
        conclusion: "Complexity Sensitivity: Passages with richer syntax, punctuation, or technical vocabulary reduce your keystroke flow.",
        recommendation: `Dedicate practice sessions specifically to ${capitalise(lowestTier)} passages to build automaticity with special symbols, uppercase keys, and less common letter pairs.`,
        supportingData: `${capitalise(topTier)}: ${tierStats[topTier].avgWpm} WPM (N=${tierStats[topTier].count}) vs ${capitalise(lowestTier)}: ${tierStats[lowestTier].avgWpm} WPM (N=${tierStats[lowestTier].count}).`,
      };
    } else {
      return {
        id: "rule-difficulty-gap",
        title: "Passage Complexity & Difficulty",
        icon: "📚",
        category: "Complexity Analysis",
        badge: "Tier Versatile",
        badgeType: "success",
        isSufficient: true,
        observation: `Versatile velocity across tiers: ${activeTiers.map((t) => `${capitalise(t)}: ${tierStats[t].avgWpm} WPM (N=${tierStats[t].count})`).join(" · ")}. Spread is within ${delta} WPM.`,
        conclusion: "High Syntactic Adaptability: Your finger transitions handle complex technical vocabulary and punctuation symbols almost as easily as simple words.",
        recommendation: "Keep challenging yourself with Advanced passages to prepare for fast real-world coding and technical writing.",
        supportingData: `Evaluated across ${activeTiers.length} difficulty tiers: ${activeTiers.map(capitalise).join(", ")}.`,
      };
    }
  },

  /**
   * Rule 6: Frequent Error Types & Character Patterns
   * Evaluates categories (letters, punctuation, digits, spaces) and top mistyped keys.
   */
  analyzeFrequentErrors(sessions) {
    if (typeof calcErrorBreakdown !== "function") {
      return {
        id: "rule-error-patterns",
        title: "Error Categorization & Character Patterns",
        icon: "🔥",
        category: "Error Patterns",
        badge: "Awaiting Data",
        badgeType: "neutral",
        isSufficient: false,
        observation: "Error analysis module unavailable.",
        conclusion: "Cannot evaluate error patterns.",
        recommendation: "Check system integrity.",
        supportingData: "",
      };
    }

    const errorData = calcErrorBreakdown(sessions);
    const totalMistakes = errorData.totalErrors || 0;

    if (totalMistakes === 0) {
      return {
        id: "rule-error-patterns",
        title: "Error Categorization & Character Patterns",
        icon: "✨",
        category: "Error Patterns",
        badge: "Zero Errors Logged",
        badgeType: "success",
        isSufficient: true,
        observation: `Zero uncorrected mistakes logged across all ${sessions.length} completed sessions.`,
        conclusion: "Clean Input Stream: Your typing input exhibits flawless accuracy without uncorrected discrepancies remaining at test conclusion.",
        recommendation: "Maintain this clean technique. You can safely increase target speed without penalty risk.",
        supportingData: `Sample: N=${sessions.length} · Total Errors: 0.`,
      };
    }

    const cats = errorData.categories;
    const catEntries = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const topCat = catEntries[0];
    const topCatName = topCat[0];
    const topCatCount = topCat[1];
    const topCatPct = totalMistakes > 0 ? Math.round((topCatCount / totalMistakes) * 100) : 0;

    const worstKey = errorData.topKeys && errorData.topKeys.length > 0 ? errorData.topKeys[0] : null;

    return {
      id: "rule-error-patterns",
      title: "Error Categorization & Character Patterns",
      icon: "🔥",
      category: "Error Patterns",
      badge: `${capitalise(topCatName)} Dominant (${topCatPct}%)`,
      badgeType: "warning",
      isSufficient: true,
      observation: `${capitalise(topCatName)} account for ${topCatPct}% of your mistakes (${topCatCount} of ${totalMistakes} recorded errors across ${sessions.length} tests).${worstKey ? ` The most frequently mistyped character was '${worstKey.key}' (${worstKey.count} occurrences).` : ""}`,
      conclusion: `Targeted Mistake Cluster: Errors are not randomly distributed; they concentrate heavily in ${topCatName}. This commonly signals inconsistent finger reach or awkward wrist positioning on specific keyboard rows.`,
      recommendation: `Perform targeted isolated drills focusing on ${topCatName} rows. Take a moment to position your index fingers firmly on the home-row bumps (F and J) before each test.`,
      supportingData: `Categories: ${catEntries.map(([c, n]) => `${capitalise(c)}: ${n}`).join(", ")} · Worst Key: '${worstKey ? worstKey.key : "none"}'.`,
    };
  },

  /**
   * Evaluates aggregate metrics and returns a cohesive Typing Persona / Profile.
   */
  determineTypingProfile(sessions, evaluatedRules) {
    const count = sessions.length;
    if (count === 0) {
      return {
        title: "New Aspirant",
        badge: "Awaiting Tests",
        description: "Complete your first typing test to unlock automated pattern analysis and personalized performance intelligence.",
      };
    }

    const wpms = sessions.map((s) => (s.netWPM !== undefined ? s.netWPM : s.wpm) || 0);
    const accs = sessions.map((s) => s.accuracy || 0);
    const avgWpm = wpms.reduce((a, b) => a + b, 0) / count;
    const avgAcc = accs.reduce((a, b) => a + b, 0) / count;

    if (count === 1) {
      return {
        title: "Baseline Typist",
        badge: "1 Test Recorded",
        description: `Baseline established at ${Math.round(avgWpm)} Net WPM and ${Math.round(avgAcc)}% accuracy. Complete 2+ tests of equal duration to track cadence and stamina profiles.`,
      };
    }

    if (avgAcc >= 97 && avgWpm >= 50) {
      return {
        title: "Precision Virtuoso",
        badge: "Elite Precision & Velocity",
        description: `High Net WPM (${Math.round(avgWpm)} WPM) backed by exceptional ${Math.round(avgAcc)}% accuracy. You exhibit professional touch-typing mastery across passages.`,
      };
    } else if (avgAcc >= 97) {
      return {
        title: "Methodical Typist",
        badge: "High Precision First",
        description: `Outstanding precision at ${Math.round(avgAcc)}% average accuracy. Your foundation is rock solid; you can safely push for higher velocity.`,
      };
    } else if (avgWpm >= 50 && avgAcc < 90) {
      return {
        title: "Speed Sprinter",
        badge: "High Velocity, Accuracy Risk",
        description: `Rapid keystroke flow (${Math.round(avgWpm)} WPM), but uncorrected mistakes (${Math.round(avgAcc)}% accuracy) incur penalties that suppress your potential Net WPM.`,
      };
    } else if (evaluatedRules.wpmTrend && evaluatedRules.wpmTrend.badgeType === "success") {
      return {
        title: "Rising Performer",
        badge: "Positive Trajectory",
        description: `Active upward momentum: Net WPM is accelerating with disciplined precision across your recent comparable sessions.`,
      };
    } else {
      return {
        title: "Balanced Typist",
        badge: "Steady Technique",
        description: `Consistent cadence averaging ${Math.round(avgWpm)} Net WPM and ${Math.round(avgAcc)}% accuracy across ${count} sessions.`,
      };
    }
  },
};
