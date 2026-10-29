/**
 * TypeScope — Core Application Logic
 * js/app.js
 *
 * Handles: navigation, overview stats, session history table,
 * sorting & filtering, session details modal, interactive analytics dashboard,
 * charts integration, rule-based insights, CSV export, typing engine,
 * and user settings.
 *
 * Related courses:
 *   JavaScript Essentials 1  — variables, functions, DOM, events
 *   JavaScript Essentials 2  — modules/separation of concerns, storage, higher-order functions
 *   Introduction to Data Analytics Essentials — data integrity, aggregation, descriptive metrics,
 *   exploratory data analysis, trend visualization
 */

"use strict";

/* ─────────────────────────────────────────────────────────────────────────────
   1. CONSTANTS & APPLICATION STATE
   ───────────────────────────────────────────────────────────────────────────── */

/** All section IDs that the app can show/hide */
const SECTIONS = ["overview", "typing-test", "analytics", "history", "insights", "advanced", "settings"];

/**
 * Application state — single source of truth.
 */
const AppState = {
  currentSection: "overview",
  sessions: [],          // Loaded from storage layer on init
  historyFilter: {
    difficulty: "all",
    duration: "all",
    sort: "newest",
  },
  analyticsFilter: {
    dateRange: "all",
    difficulty: "all",
    duration: "all",
  },
  selectedSessionId: null, // Tracked when session details modal is open
  testDifficulty: "intermediate",
  testDuration: 60,      // seconds
  testInProgress: false,
};

/* ─────────────────────────────────────────────────────────────────────────────
   2. NAVIGATION
   Related: JavaScript Essentials 1 — DOM & Events
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Shows the requested section and hides all others.
 * Updates nav link active states and the breadcrumb.
 * @param {string} sectionId - one of SECTIONS
 */
function navigateTo(sectionId) {
  if (!SECTIONS.includes(sectionId)) {
    console.warn(`TypeScope: unknown section "${sectionId}"`);
    return;
  }

  AppState.currentSection = sectionId;

  // Show / hide sections
  SECTIONS.forEach((id) => {
    const el = document.getElementById(`section-${id}`);
    if (el) el.hidden = id !== sectionId;
  });

  // Update sidebar nav links
  document.querySelectorAll(".nav-link").forEach((link) => {
    const isActive = link.dataset.section === sectionId;
    link.classList.toggle("active", isActive);
    link.setAttribute("aria-current", isActive ? "page" : "false");
  });

  // Update breadcrumb
  const breadcrumb = document.getElementById("breadcrumb-section");
  if (breadcrumb) {
    breadcrumb.textContent = sectionLabel(sectionId);
  }

  // Refresh section-specific dynamic data
  if (sectionId === "history") {
    renderHistoryTable();
  } else if (sectionId === "overview") {
    renderOverviewCards();
    renderRecentSessions();
  } else if (sectionId === "analytics") {
    renderAnalytics();
  } else if (sectionId === "insights") {
    renderInsightsView();
  } else if (sectionId === "advanced") {
    renderAdvancedSection();
  }

  // Close mobile nav if open
  closeMobileNav();

  // Scroll to top of main content
  const main = document.getElementById("main-content");
  if (main) main.scrollTop = 0;
}

/** Returns a human-readable label for a section ID */
function sectionLabel(id) {
  const labels = {
    overview: "Overview",
    "typing-test": "Typing Test",
    analytics: "Analytics Lab",
    history: "Session History",
    insights: "Insights",
    advanced: "Advanced Features",
    settings: "Settings",
  };
  return labels[id] || id;
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. MOBILE NAV
   ───────────────────────────────────────────────────────────────────────────── */

function openMobileNav() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("nav-overlay");
  if (sidebar) sidebar.classList.add("open");
  if (overlay) overlay.classList.add("visible");
  document.body.classList.add("nav-open");
}

function closeMobileNav() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("nav-overlay");
  if (sidebar) sidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("visible");
  document.body.classList.remove("nav-open");
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. OVERVIEW SECTION
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Renders the four summary stat cards on the Overview.
 * Calculated strictly from real saved sessions (no fabricated data).
 * If no sessions exist, displays "—".
 */
function renderOverviewCards() {
  const stats = calculateOverviewStats(AppState.sessions);

  setCardValue("card-avg-wpm",  stats.avgNetWPM !== null ? stats.avgNetWPM : "—");
  setCardValue("card-avg-acc",  stats.avgAccuracy !== null ? `${stats.avgAccuracy}%` : "—");
  setCardValue("card-tests",    stats.totalTests > 0 ? stats.totalTests : "—");
  setCardValue("card-best-wpm", stats.bestNetWPM !== null ? stats.bestNetWPM : "—");

  // Overview WPM progression chart vs placeholder
  const placeholder = document.getElementById("overview-chart-placeholder");
  const wrapper     = document.getElementById("overview-chart-wrapper");
  if (placeholder && wrapper) {
    if (AppState.sessions.length === 0) {
      placeholder.style.display = "flex";
      wrapper.style.display = "none";
    } else {
      placeholder.style.display = "none";
      wrapper.style.display = "block";
      if (typeof ChartManager !== "undefined" && typeof ChartManager.renderOverviewChart === "function") {
        ChartManager.renderOverviewChart("chart-overview-wpm", AppState.sessions);
      }
    }
  }
}

/**
 * Sets the value text inside a stat card element.
 * @param {string} cardId
 * @param {string|number} value
 */
function setCardValue(cardId, value) {
  const el = document.getElementById(cardId);
  if (el) el.textContent = value;
}

/**
 * Renders the recent sessions table on the Overview.
 * Displays up to 5 most recent tests or an empty row if none exist.
 */
function renderRecentSessions() {
  const container = document.getElementById("recent-sessions-body");
  if (!container) return;

  const sessions = AppState.sessions.slice(0, 5); // latest 5 (sessions are newest first)

  if (sessions.length === 0) {
    container.innerHTML = `
      <tr class="empty-row">
        <td colspan="5">
          <div class="empty-state-inline">
            <span class="empty-icon">📋</span>
            <span>No sessions yet — complete a typing test to see results here.</span>
          </div>
        </td>
      </tr>`;
    return;
  }

  container.innerHTML = sessions
    .map(
      (s) => `
      <tr>
        <td>${formatDate(s.date)}</td>
        <td><strong>${s.netWPM !== undefined ? s.netWPM : s.wpm}</strong> WPM</td>
        <td>${s.accuracy}%</td>
        <td><span class="badge badge-${s.difficulty}">${capitalise(s.difficulty)}</span></td>
        <td>${s.duration}s</td>
      </tr>`
    )
    .join("");
}

/* ─────────────────────────────────────────────────────────────────────────────
   5b. ADVANCED FEATURES SECTION
   Renders Heatmap, Rhythm, and Adaptive Practice panels.
   Related: JS Essentials 2 - modules; Data Analytics - pattern detection
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Renders all three Advanced Features panels:
 *   1. Keyboard Error Heatmap
 *   2. Typing Rhythm Analysis
 *   3. Adaptive Practice Mode
 */
function renderAdvancedSection() {
  if (typeof HeatmapModule !== "undefined" && HeatmapModule.render) {
    HeatmapModule.render("heatmap-container", AppState.sessions);
  }
  _renderRhythmPanel();
  if (typeof AdaptiveModule !== "undefined" && AdaptiveModule.render) {
    AdaptiveModule.render("adaptive-container", AppState.sessions);
  }
}

/**
 * Renders the rhythm chart and stats for the selected session.
 * @param {string} [sessionId]
 */
function _renderRhythmPanel(sessionId) {
  if (typeof RhythmModule === "undefined" || !RhythmModule.renderChart) return;

  const select = document.getElementById("rhythm-session-select");
  const badge  = document.getElementById("rhythm-session-badge");

  const rhythmSessions = AppState.sessions.filter(
    (s) => Array.isArray(s.rhythmSnapshots) && s.rhythmSnapshots.length >= 2
  );

  if (select) {
    const prevVal = select.value;
    select.innerHTML = `<option value="__latest">Latest test (default)</option>`;
    rhythmSessions.forEach((s) => {
      const dt = formatDateTime(s.date);
      const label = `${dt.date} ${dt.time} — ${s.netWPM} WPM (${s.duration}s)`;
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = label;
      select.appendChild(opt);
    });
    if (prevVal && prevVal !== "__latest" && rhythmSessions.some((s) => s.id === prevVal)) {
      select.value = prevVal;
    }
  }

  const targetId = sessionId || (select ? select.value : "__latest");
  let snapshots = null;
  let sessionLabel = "No rhythm data yet";

  if (targetId === "__latest" || !targetId) {
    const latest = rhythmSessions[0];
    if (latest) {
      snapshots = latest.rhythmSnapshots;
      const dt = formatDateTime(latest.date);
      sessionLabel = `${dt.date} — ${latest.netWPM} WPM`;
    }
  } else {
    const found = AppState.sessions.find((s) => s.id === targetId);
    if (found) {
      snapshots = found.rhythmSnapshots;
      const dt = formatDateTime(found.date);
      sessionLabel = `${dt.date} — ${found.netWPM} WPM`;
    }
  }

  if (badge) badge.textContent = sessionLabel;
  RhythmModule.renderChart("chart-rhythm", snapshots || []);
  RhythmModule.renderStats("rhythm-stats-container", snapshots || []);
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. ANALYTICS LAB SECTION (Phase 4)
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Renders the full interactive Analytics Lab:
 * - Filtered dataset
 * - Key summary metrics & improvement rate
 * - 4 interactive charts (WPM progression, accuracy trend, difficulty comparison, error breakdown)
 * - Most frequent mistyped keys
 * - Rule-based data-driven insights preview
 */
function renderAnalytics() {
  if (typeof filterAnalyticsSessions !== "function") return;

  const filtered = filterAnalyticsSessions(AppState.sessions, AppState.analyticsFilter);
  const totalCount = AppState.sessions.length;
  const filteredCount = filtered.length;

  // 1. Filter badge and reset button
  const countBadge = document.getElementById("analytics-count-badge");
  const resetBtn   = document.getElementById("analytics-reset-btn");
  const isFiltered =
    AppState.analyticsFilter.dateRange !== "all" ||
    AppState.analyticsFilter.difficulty !== "all" ||
    AppState.analyticsFilter.duration !== "all";

  if (countBadge) {
    countBadge.textContent = isFiltered
      ? `Showing ${filteredCount} of ${totalCount}`
      : `${totalCount} ${totalCount === 1 ? "Session" : "Sessions"}`;
  }

  if (resetBtn) {
    resetBtn.style.display = isFiltered ? "inline-flex" : "none";
  }

  // 2. Summary stats calculation
  const summary = calcAnalyticsSummary(filtered);

  setCardValue("analytics-avg-wpm",     summary.avgNetWPM !== null ? `${summary.avgNetWPM} WPM` : "—");
  setCardValue("analytics-avg-acc",     summary.avgAccuracy !== null ? `${summary.avgAccuracy}%` : "—");
  setCardValue("analytics-best-wpm",    summary.bestNetWPM !== null ? `${summary.bestNetWPM} WPM` : "—");
  setCardValue("analytics-total-tests", summary.totalTests > 0 ? summary.totalTests : "—");

  const impEl   = document.getElementById("analytics-improvement");
  const impHint = document.getElementById("analytics-improvement-hint");
  if (impEl && impHint) {
    if (summary.improvement.hasEnoughData) {
      const isPositive = summary.improvement.diff >= 0;
      impEl.innerHTML = `<span style="color:${isPositive ? "var(--clr-accent-green)" : "var(--clr-accent-red)"}; font-weight:var(--fw-bold);">${isPositive ? "+" : ""}${summary.improvement.diff} WPM</span>`;
      impHint.textContent = `${isPositive ? "+" : ""}${summary.improvement.percentChange}% (${summary.improvement.duration}s tests)`;
    } else {
      impEl.textContent = "—";
      impHint.textContent = summary.improvement.message;
    }
  }

  // 3. Render 4 Charts via ChartManager
  if (typeof ChartManager !== "undefined") {
    ChartManager.renderWPMProgression("chart-wpm-progression", filtered);
    ChartManager.renderAccuracyTrend("chart-accuracy-trend", filtered);
    ChartManager.renderDifficultyComparison("chart-difficulty-wpm", calcSpeedByDifficulty(filtered));
    ChartManager.renderErrorBreakdown("chart-error-breakdown", calcErrorBreakdown(filtered));
  }

  // 4. Render Top Mistyped Characters List
  const topKeysList = document.getElementById("analytics-top-keys-list");
  if (topKeysList) {
    const errorInfo = calcErrorBreakdown(filtered);
    if (errorInfo.topKeys && errorInfo.topKeys.length > 0) {
      topKeysList.innerHTML = errorInfo.topKeys
        .map(
          (item, idx) => `
        <div class="key-stat-row">
          <div style="display:flex; align-items:center; gap:var(--sp-2);">
            <span style="color:var(--clr-text-muted); font-size:11px;">#${idx + 1}</span>
            <span class="key-pill">${item.key}</span>
          </div>
          <span style="color:var(--clr-accent-red); font-weight:var(--fw-semi);">${item.count} mistake${item.count === 1 ? "" : "s"}</span>
        </div>
      `
        )
        .join("");
    } else {
      topKeysList.innerHTML = `
        <div style="padding:var(--sp-3); color:var(--clr-text-muted); font-size:var(--fs-xs); text-align:center;">
          Zero mistyped keys recorded in this dataset!
        </div>
      `;
    }
  }

  // 5. Render Rule-Based Insights inside Analytics Lab
  const insightsContainer = document.getElementById("analytics-insights-container");
  if (insightsContainer && typeof generateRuleBasedInsights === "function") {
    renderInsightsCards(insightsContainer, generateRuleBasedInsights(filtered));
  }
}

/**
 * Resets Analytics filter criteria to defaults.
 */
function resetAnalyticsFilters() {
  AppState.analyticsFilter = {
    dateRange: "all",
    difficulty: "all",
    duration: "all",
  };

  const dateSel = document.getElementById("analytics-filter-date");
  const diffSel = document.getElementById("analytics-filter-difficulty");
  const durSel  = document.getElementById("analytics-filter-duration");

  if (dateSel) dateSel.value = "all";
  if (diffSel) diffSel.value = "all";
  if (durSel)  durSel.value  = "all";

  renderAnalytics();
}

/**
 * Exports currently filtered analytics sessions to CSV.
 */
function handleAnalyticsExportCSV() {
  if (typeof filterAnalyticsSessions !== "function" || typeof exportSessionsToCSV !== "function") return;

  const filtered = filterAnalyticsSessions(AppState.sessions, AppState.analyticsFilter);
  if (filtered.length === 0) {
    showNotification("No sessions match the current filter to export.", "error");
    return;
  }

  const ok = exportSessionsToCSV(filtered);
  if (ok) {
    showNotification(`Exported ${filtered.length} session${filtered.length === 1 ? "" : "s"} to CSV.`, "success");
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   6. INSIGHTS SECTION
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Renders the dedicated Insights section using real rule-based insights from InsightsEngine.
 */
function renderInsightsView() {
  const container = document.getElementById("insights-section-grid");
  const emptyState = document.getElementById("insights-empty-state");
  const personaCard = document.getElementById("insights-persona-card");
  const badgeEl = document.getElementById("insights-analyzed-badge");
  const timeEl = document.getElementById("insights-eval-time");
  const personaTitle = document.getElementById("insights-persona-title");
  const personaBadge = document.getElementById("insights-persona-badge");
  const personaDesc = document.getElementById("insights-persona-desc");
  const personaIcon = document.getElementById("insights-persona-icon");

  if (typeof InsightsEngine === "undefined" || !InsightsEngine.evaluate) {
    return;
  }

  const result = InsightsEngine.evaluate(AppState.sessions);

  // Update status bar badge & timestamp
  if (badgeEl) {
    badgeEl.textContent = `${result.totalSessions} Session${result.totalSessions === 1 ? "" : "s"} Analyzed`;
    badgeEl.className = result.totalSessions > 0 ? "badge badge-info" : "badge";
  }
  if (timeEl) {
    timeEl.textContent = `Last evaluated: ${result.evaluatedAt || "Just now"}`;
  }

  // Handle empty state (0 sessions)
  if (!result.hasData || result.totalSessions === 0) {
    if (emptyState) emptyState.style.display = "block";
    if (personaCard) personaCard.style.display = "none";
    if (container) {
      container.style.display = "none";
      container.innerHTML = "";
    }
    return;
  }

  // Active state: show persona card and grid, hide empty state
  if (emptyState) emptyState.style.display = "none";
  if (personaCard) personaCard.style.display = "block";
  if (container) container.style.display = "grid";

  // Update Persona banner
  if (result.profile) {
    if (personaTitle) personaTitle.textContent = `Typing Persona: ${result.profile.title}`;
    if (personaBadge) {
      personaBadge.textContent = result.profile.badge;
      const bText = result.profile.badge.toLowerCase();
      const bType = bText.includes("risk") || bText.includes("awaiting")
        ? "badge-warning"
        : bText.includes("virtuoso") || bText.includes("positive") || bText.includes("precision")
        ? "badge-success"
        : "badge-info";
      personaBadge.className = `badge ${bType}`;
    }
    if (personaDesc) personaDesc.textContent = result.profile.description;
    if (personaIcon) {
      const pTitle = result.profile.title.toLowerCase();
      let icon = "🧠";
      if (pTitle.includes("virtuoso")) icon = "👑";
      else if (pTitle.includes("methodical")) icon = "🎯";
      else if (pTitle.includes("sprinter")) icon = "⚡";
      else if (pTitle.includes("rising")) icon = "🚀";
      else if (pTitle.includes("baseline")) icon = "📊";
      personaIcon.textContent = icon;
    }
  }

  // Render Detailed Insights Cards
  if (container && Array.isArray(result.insights)) {
    container.innerHTML = result.insights
      .map((item) => {
        const badgeClass =
          item.badgeType === "success"
            ? "badge-success"
            : item.badgeType === "warning"
            ? "badge-warning"
            : item.badgeType === "danger"
            ? "badge-danger"
            : item.badgeType === "info"
            ? "badge-info"
            : "badge";

        const iconColor =
          item.badgeType === "success"
            ? "stat-icon-green"
            : item.badgeType === "warning"
            ? "stat-icon-amber"
            : item.badgeType === "danger"
            ? "stat-icon-red"
            : "stat-icon-blue";

        return `
        <div class="insight-detail-card" id="${escapeHtml(item.id)}">
          <div class="insight-detail-header">
            <div class="insight-header-left">
              <div class="insight-header-icon ${iconColor}" aria-hidden="true">${item.icon}</div>
              <div>
                <h3 class="insight-header-title">${escapeHtml(item.title)}</h3>
                <div class="insight-header-cat">${escapeHtml(item.category)}</div>
              </div>
            </div>
            <span class="badge ${badgeClass}">${escapeHtml(item.badge)}</span>
          </div>

          <div class="insight-obs-box">
            <div class="insight-block-label">Observation (Empirical Data)</div>
            <p class="insight-block-text">${escapeHtml(item.observation)}</p>
          </div>

          <div class="insight-block">
            <div class="insight-block-label">Diagnostic Conclusion</div>
            <p class="insight-block-text">${escapeHtml(item.conclusion)}</p>
          </div>

          <div class="insight-rec-box">
            <div class="insight-block-label">Actionable Practice Suggestion</div>
            <p class="insight-block-text">${escapeHtml(item.recommendation)}</p>
          </div>

          <div class="insight-data-footer">
            <span aria-hidden="true" style="margin-right:6px;">📊</span>
            <span>${escapeHtml(item.supportingData)}</span>
          </div>
        </div>
      `;
      })
      .join("");
  }

  // Render Next-Gen Typing DNA & Biometric Passport
  if (typeof TypingDNA !== "undefined") {
    const dna = TypingDNA.computeDimensions(AppState.sessions);
    TypingDNA.renderRadar("dna-radar-canvas", dna);

    const setField = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setField("dna-archetype-name", dna.archetype.title);
    setField("dna-archetype-text", dna.archetype.desc);
    setField("dna-badge-pill", dna.archetype.code);
    setField("dna-class-pill", dna.archetype.badge);

    setField("dna-stat-vel", dna.velocity);
    setField("dna-stat-acc", `${dna.precision}%`);
    setField("dna-stat-cns", dna.consistency);
    setField("dna-stat-stm", dna.stamina);
    setField("dna-stat-dex", dna.dexterity);
    setField("dna-stat-rec", dna.recovery);

    const exportBtn = document.getElementById("dna-export-passport-btn");
    if (exportBtn) {
      exportBtn.onclick = () => TypingDNA.exportPassportPNG(dna);
    }
  }
}

/**
 * Helper to populate an insights grid with card markup.
 * @param {HTMLElement} container
 * @param {Array<Object>} insights
 */
function renderInsightsCards(container, insights) {
  if (!container || !Array.isArray(insights)) return;
  container.innerHTML = insights
    .map(
      (item) => `
    <div class="insight-card">
      <div class="insight-card-top">
        <div class="insight-icon stat-icon-${item.badgeType === "success" ? "green" : item.badgeType === "warning" ? "amber" : "blue"}" aria-hidden="true">${item.icon}</div>
        <span class="badge badge-${item.badgeType}">${item.badge}</span>
      </div>
      <div>
        <h3 class="insight-title" style="margin-bottom:var(--sp-1); text-align:left;">${item.title}</h3>
        <p class="insight-desc" style="text-align:left;">${item.desc}</p>
      </div>
    </div>
  `
    )
    .join("");
}

/* ─────────────────────────────────────────────────────────────────────────────
   7. SESSION HISTORY SECTION
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Renders the full session history table with sorting, filtering,
 * and empty state handling.
 */
function renderHistoryTable() {
  const tableContainer = document.getElementById("history-table-container");
  const tableBody = document.getElementById("history-table-body");
  const emptyState = document.getElementById("history-empty-state");
  const filteredEmpty = document.getElementById("history-filtered-empty");
  const countBadge = document.getElementById("history-count-badge");
  const resetBtn = document.getElementById("history-reset-btn");
  const clearBtn = document.getElementById("history-clear-btn");

  if (!tableBody) return;

  const totalCount = AppState.sessions.length;

  if (clearBtn) {
    clearBtn.disabled = totalCount === 0;
  }

  // 1. Total empty state: No sessions at all in storage
  if (totalCount === 0) {
    if (tableContainer) tableContainer.style.display = "none";
    if (emptyState) emptyState.style.display = "flex";
    if (filteredEmpty) filteredEmpty.style.display = "none";
    if (countBadge) countBadge.textContent = "0 Sessions";
    if (resetBtn) resetBtn.style.display = "none";
    tableBody.innerHTML = "";
    return;
  }

  // 2. Filter and Sort
  const filtered = filterAndSortSessions(AppState.sessions, AppState.historyFilter);
  const isFiltered =
    AppState.historyFilter.difficulty !== "all" ||
    AppState.historyFilter.duration !== "all" ||
    AppState.historyFilter.sort !== "newest";

  if (resetBtn) {
    resetBtn.style.display = isFiltered ? "inline-flex" : "none";
  }

  if (countBadge) {
    countBadge.textContent = isFiltered
      ? `Showing ${filtered.length} of ${totalCount}`
      : `${totalCount} ${totalCount === 1 ? "Session" : "Sessions"}`;
  }

  // 3. Filtered empty state: Sessions exist, but none match criteria
  if (filtered.length === 0) {
    if (tableContainer) tableContainer.style.display = "none";
    if (emptyState) emptyState.style.display = "none";
    if (filteredEmpty) filteredEmpty.style.display = "flex";
    tableBody.innerHTML = "";
    return;
  }

  // 4. Data display state: Render rows
  if (tableContainer) tableContainer.style.display = "block";
  if (emptyState) emptyState.style.display = "none";
  if (filteredEmpty) filteredEmpty.style.display = "none";

  tableBody.innerHTML = filtered
    .map((s) => {
      const netWPM = s.netWPM !== undefined ? s.netWPM : s.wpm;
      const errors = s.errors !== undefined ? s.errors : s.uncorrectedErrors;
      const dt = formatDateTime(s.date);
      return `
        <tr data-session-id="${s.id}">
          <td>
            <span style="font-weight:var(--fw-medium); color:var(--clr-text-primary); display:block;">${dt.date}</span>
            <span style="font-size:var(--fs-xs); color:var(--clr-text-muted);">${dt.time}</span>
          </td>
          <td><strong style="color:var(--clr-accent-blue);">${netWPM}</strong> WPM</td>
          <td>${s.grossWPM} WPM</td>
          <td>
            <span style="font-weight:var(--fw-medium); color:${s.accuracy >= 95 ? "var(--clr-accent-green)" : s.accuracy >= 85 ? "var(--clr-accent-amber)" : "var(--clr-accent-red)"}">
              ${s.accuracy}%
            </span>
          </td>
          <td><span class="badge badge-${s.difficulty}">${capitalise(s.difficulty)}</span></td>
          <td>${s.duration}s <span style="font-size:var(--fs-xs); color:var(--clr-text-muted);">(${s.elapsedSeconds}s)</span></td>
          <td>${errors}</td>
          <td>
            <div class="table-actions-cell">
              <button class="table-btn" type="button" data-action="view" data-id="${s.id}" title="View session details">
                View
              </button>
              <button class="table-btn table-btn-danger" type="button" data-action="delete" data-id="${s.id}" title="Delete this session">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

/**
 * Resets history filter criteria to defaults.
 */
function resetHistoryFilters() {
  AppState.historyFilter = {
    difficulty: "all",
    duration: "all",
    sort: "newest",
  };

  const diffSelect = document.getElementById("history-filter-difficulty");
  const durSelect  = document.getElementById("history-filter-duration");
  const sortSelect = document.getElementById("history-filter-sort");

  if (diffSelect) diffSelect.value = "all";
  if (durSelect)  durSelect.value  = "all";
  if (sortSelect) sortSelect.value = "newest";

  renderHistoryTable();
}

/**
 * Deletes a session after confirmation.
 * @param {string} sessionId
 */
function handleDeleteSession(sessionId) {
  const confirmed = window.confirm("Are you sure you want to delete this session?");
  if (!confirmed) return;

  AppState.sessions = deleteSession(sessionId);

  renderOverviewCards();
  renderRecentSessions();
  renderHistoryTable();
  renderAnalytics();
  renderInsightsView();

  // If deleted from within the details modal, close it
  if (AppState.selectedSessionId === sessionId) {
    closeSessionModal();
  }

  showNotification("Session deleted.", "info");
}

/**
 * Clears all saved test history with user confirmation.
 */
function handleClearAllSessions() {
  if (AppState.sessions.length === 0) return;

  const confirmed = window.confirm(
    "Are you sure you want to delete all typing test sessions? This action cannot be undone."
  );
  if (!confirmed) return;

  AppState.sessions = clearAllSessions();

  renderOverviewCards();
  renderRecentSessions();
  renderHistoryTable();
  renderAnalytics();
  renderInsightsView();

  showNotification("All session history cleared.", "success");
}

/* ─────────────────────────────────────────────────────────────────────────────
   8. SESSION DETAILS MODAL
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Opens the session details modal and displays full performance metrics.
 * @param {string} sessionId
 */
function openSessionModal(sessionId) {
  const session = getSessionById(sessionId) || AppState.sessions.find((s) => s.id === sessionId);
  if (!session) return;

  AppState.selectedSessionId = session.id;

  const dt = formatDateTime(session.date);
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl("modal-date", `${dt.date} at ${dt.time}`);
  setEl("modal-passage-name", `Passage: ${session.passageTitle || "Typing Passage"}`);

  const diffBadge = document.getElementById("modal-difficulty");
  if (diffBadge) {
    diffBadge.className = `badge badge-${session.difficulty}`;
    diffBadge.textContent = capitalise(session.difficulty);
  }

  const reasonBadge = document.getElementById("modal-reason");
  if (reasonBadge) {
    reasonBadge.className = `badge ${session.reason === "completed" ? "badge-beginner" : "badge-intermediate"}`;
    reasonBadge.textContent = session.reason === "completed" ? "Passage Completed 🎉" : "Time Expired ⏱️";
  }

  const netWPM = session.netWPM !== undefined ? session.netWPM : session.wpm;
  const errors = session.errors !== undefined ? session.errors : session.uncorrectedErrors;

  setEl("modal-net-wpm",    `${netWPM} WPM`);
  setEl("modal-gross-wpm",  `${session.grossWPM} WPM`);
  setEl("modal-accuracy",   `${session.accuracy}%`);
  setEl("modal-duration",   `${session.duration}s`);
  setEl("modal-elapsed",    `${session.elapsedSeconds}s`);
  setEl("modal-keystrokes", session.totalCharsTyped);
  setEl("modal-correct",    session.correctChars);
  setEl("modal-incorrect",  session.incorrectChars);
  setEl("modal-errors",     errors);
  setEl("modal-id",         session.id);

  const modal = document.getElementById("session-modal");
  if (modal) {
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
  }

  // Mount VCR Keystroke Autopsy Replay
  if (typeof ReplayEngine !== "undefined") {
    ReplayEngine.mount("modal-replay-container", session);
  }
}

/**
 * Closes the session details modal.
 */
function closeSessionModal() {
  const modal = document.getElementById("session-modal");
  if (modal) {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }
  AppState.selectedSessionId = null;

  if (typeof ReplayEngine !== "undefined") {
    ReplayEngine.stop();
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   9. TYPING TEST SECTION & FINISH HANDLER
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Wires difficulty and duration dropdowns to the typing engine's public API.
 */
function setupTypingTestUI() {
  const difficultySelect = document.getElementById("difficulty-select");
  const durationSelect   = document.getElementById("duration-select");

  if (difficultySelect) {
    difficultySelect.value = AppState.testDifficulty;
    difficultySelect.addEventListener("change", (e) => {
      AppState.testDifficulty = e.target.value;
      if (typeof engineLoadDifficulty === "function") {
        engineLoadDifficulty(e.target.value);
      }
    });
  }

  if (durationSelect) {
    durationSelect.value = String(AppState.testDuration);
    durationSelect.addEventListener("change", (e) => {
      AppState.testDuration = parseInt(e.target.value, 10);
      if (typeof engineSetDuration === "function") {
        engineSetDuration(AppState.testDuration);
      }
    });
  }
}

/**
 * Receives the completed test results from the engine, persists via storage layer,
 * updates Overview, History, Analytics, and displays the results panel.
 *
 * @param {Object} results - as built by finishTest() in typing-engine.js
 */
function handleTestFinished(results) {
  // Save session with validation and deduplication
  const { sessions, added } = addSession(results);
  AppState.sessions = sessions;

  // Refresh dynamic views
  renderOverviewCards();
  renderRecentSessions();
  renderHistoryTable();
  renderAnalytics();
  renderInsightsView();

  // Show the results overlay in the Typing Test section
  renderResultsPanel(added || results);

  showNotification(
    results.reason === "completed"
      ? "✅ Passage completed! Great job!"
      : "⏱️ Time's up! Results saved.",
    "success"
  );
}

/**
 * Populates and displays the results panel overlay on the Typing Test section.
 * @param {Object} r - results object
 */
function renderResultsPanel(r) {
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  const netWPM = r.netWPM !== undefined ? r.netWPM : r.wpm;
  const errors = r.errors !== undefined ? r.errors : r.uncorrectedErrors;

  setEl("result-net-wpm",    netWPM);
  setEl("result-gross-wpm",  r.grossWPM);
  setEl("result-accuracy",   `${r.accuracy}%`);
  setEl("result-errors",     errors);
  setEl("result-keystrokes", r.totalCharsTyped);
  setEl("result-time",       `${r.elapsedSeconds}s`);
  setEl("result-difficulty", capitalise(r.difficulty));
  setEl("result-reason",
    r.reason === "completed" ? "Passage Completed 🎉" : "Time Expired ⏱️"
  );

  // Show the panel
  const panel = document.getElementById("results-panel");
  if (panel) panel.hidden = false;
  const passageCard = document.getElementById("passage-card-wrapper");
  if (passageCard) passageCard.hidden = true;
}

/* ─────────────────────────────────────────────────────────────────────────────
   10. SETTINGS SECTION
   ───────────────────────────────────────────────────────────────────────────── */

/** Saves settings from the form to localStorage. */
function saveSettings() {
  const themeSel      = document.getElementById("setting-theme");
  const fontSel       = document.getElementById("setting-font");
  const soundToggle   = document.getElementById("setting-sound");
  const soundProfile  = document.getElementById("setting-sound-profile");
  const powerToggle   = document.getElementById("setting-power-mode");
  const ghostToggle   = document.getElementById("setting-ghost-racer");

  const settings = {
    theme:        themeSel      ? themeSel.value      : "dark",
    font:         fontSel       ? fontSel.value       : "inter",
    sound:        soundToggle   ? soundToggle.checked : false,
    soundProfile: soundProfile  ? soundProfile.value  : "thock",
    powerMode:    powerToggle   ? powerToggle.checked : true,
    ghostRacer:   ghostToggle   ? ghostToggle.checked : true,
  };

  try {
    localStorage.setItem("typescope_settings", JSON.stringify(settings));
    showNotification("Settings saved successfully!", "success");
  } catch (e) {
    showNotification("Could not save settings.", "error");
  }

  applySettings(settings);
}

/** Loads saved settings from localStorage and applies them. */
function loadAndApplySettings() {
  try {
    const raw = localStorage.getItem("typescope_settings");
    if (!raw) return;
    const settings = JSON.parse(raw);
    applySettings(settings);

    // Restore UI controls
    const themeSel     = document.getElementById("setting-theme");
    const fontSel      = document.getElementById("setting-font");
    const soundToggle  = document.getElementById("setting-sound");
    const soundProfile = document.getElementById("setting-sound-profile");
    const powerToggle  = document.getElementById("setting-power-mode");
    const ghostToggle  = document.getElementById("setting-ghost-racer");

    if (themeSel  && settings.theme) themeSel.value = settings.theme;
    if (fontSel   && settings.font)  fontSel.value  = settings.font;
    if (soundToggle && typeof settings.sound === "boolean") {
      soundToggle.checked = settings.sound;
    }
    if (soundProfile && settings.soundProfile) soundProfile.value = settings.soundProfile;
    if (powerToggle && settings.powerMode !== undefined) powerToggle.checked = !!settings.powerMode;
    if (ghostToggle && settings.ghostRacer !== undefined) ghostToggle.checked = !!settings.ghostRacer;
  } catch (e) {
    console.warn("TypeScope: could not restore settings.", e);
  }
}

/**
 * Applies theme and font settings to the document root and next-gen engines.
 * @param {Object} settings
 */
function applySettings(settings) {
  if (settings.theme) {
    document.documentElement.dataset.theme = settings.theme;
  }
  if (settings.font) {
    document.documentElement.dataset.font = settings.font;
  }
  if (typeof PowerMode !== "undefined" && settings.powerMode !== undefined) {
    PowerMode.setEnabled(settings.powerMode);
  }
  if (typeof EngineState !== "undefined" && settings.ghostRacer !== undefined) {
    EngineState.ghostEnabled = !!settings.ghostRacer;
    const testGhostToggle = document.getElementById("ghost-toggle");
    if (testGhostToggle) testGhostToggle.checked = !!settings.ghostRacer;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   NEXT-GEN POWER-USER HELPERS & DISPATCHERS
   ───────────────────────────────────────────────────────────────────────────── */

function switchTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const themeSel = document.getElementById("setting-theme");
  if (themeSel) themeSel.value = theme;
  try {
    const raw = localStorage.getItem("typescope_settings");
    const s = raw ? JSON.parse(raw) : {};
    s.theme = theme;
    localStorage.setItem("typescope_settings", JSON.stringify(s));
  } catch {}
  showNotification(`Theme set to ${capitalise(theme)}`, "info");
}

const THEME_LIST = ["dark", "cyberpunk", "tokyo-night", "paperwhite", "aurora", "light"];
function cycleThemes() {
  const current = document.documentElement.dataset.theme || "dark";
  const nextIdx = (THEME_LIST.indexOf(current) + 1) % THEME_LIST.length;
  switchTheme(THEME_LIST[nextIdx]);
}

window.typescopeZenMode = false;
function toggleZenMode() {
  window.typescopeZenMode = !window.typescopeZenMode;
  const zenBtns = [document.getElementById("topbar-zen-btn"), document.getElementById("zen-toggle-btn")];
  zenBtns.forEach((b) => {
    if (b) b.classList.toggle("zen-btn-active", window.typescopeZenMode);
  });
  if (typeof EngineState !== "undefined" && EngineState.status === "running") {
    document.body.classList.toggle("zen-mode-active", window.typescopeZenMode);
  }
  showNotification(`Zen Hyper-Focus ${window.typescopeZenMode ? "Enabled" : "Disabled"}`, "info");
}

function togglePowerMode() {
  if (typeof PowerMode === "undefined") return;
  PowerMode.setEnabled(!PowerMode.enabled);
  const toggle = document.getElementById("setting-power-mode");
  if (toggle) toggle.checked = PowerMode.enabled;
  showNotification(`Power Mode ${PowerMode.enabled ? "Active" : "Disabled"}`, "info");
}

function toggleGhostRacer() {
  if (typeof EngineState === "undefined") return;
  EngineState.ghostEnabled = !EngineState.ghostEnabled;
  const t1 = document.getElementById("ghost-toggle");
  const t2 = document.getElementById("setting-ghost-racer");
  if (t1) t1.checked = EngineState.ghostEnabled;
  if (t2) t2.checked = EngineState.ghostEnabled;
  showNotification(`Ghost Pace Hologram ${EngineState.ghostEnabled ? "Active" : "Disabled"}`, "info");
}

function toggle3DKeyboard() {
  if (typeof HeatmapModule === "undefined") return;
  HeatmapModule.isIsometric = !HeatmapModule.isIsometric;
  HeatmapModule.render("heatmap-container", AppState.sessions);
  showNotification(`Keyboard 3D Isometric View ${HeatmapModule.isIsometric ? "On" : "Off"}`, "info");
}

function setTestDuration(seconds) {
  const sel = document.getElementById("duration-select");
  if (sel) {
    sel.value = seconds;
    sel.dispatchEvent(new Event("change"));
  }
  showNotification(`Duration set to ${seconds}s`, "info");
}

function setTestDifficulty(diff) {
  const sel = document.getElementById("difficulty-select");
  if (sel) {
    sel.value = diff;
    sel.dispatchEvent(new Event("change"));
  }
  showNotification(`Difficulty set to ${capitalise(diff)}`, "info");
}

function setSoundProfile(profile) {
  try {
    const raw = localStorage.getItem("typescope_settings");
    const s = raw ? JSON.parse(raw) : {};
    s.soundProfile = profile;
    localStorage.setItem("typescope_settings", JSON.stringify(s));
    const sel = document.getElementById("setting-sound-profile");
    if (sel) sel.value = profile;
    showNotification(`Acoustic Profile: ${capitalise(profile)}`, "info");
  } catch {}
}

function toggleSoundFX() {
  const toggle = document.getElementById("setting-sound");
  if (toggle) {
    toggle.checked = !toggle.checked;
    const saveBtn = document.getElementById("settings-save-btn");
    if (saveBtn) saveBtn.click();
    showNotification(`Sound Effects ${toggle.checked ? "Enabled" : "Muted"}`, "info");
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   11. NOTIFICATION TOAST
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Displays a brief toast notification at the bottom of the screen.
 * @param {string} message
 * @param {"success"|"error"|"info"} type
 */
function showNotification(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = message;

  container.appendChild(toast);

  // Trigger enter animation
  requestAnimationFrame(() => toast.classList.add("toast-visible"));

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/* ─────────────────────────────────────────────────────────────────────────────
   12. UTILITY FUNCTIONS
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Formats an ISO date string to a readable locale date.
 * @param {string} isoString
 * @returns {string}
 */
function formatDate(isoString) {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

/**
 * Formats an ISO date string to readable date and time components.
 * @param {string} isoString
 * @returns {{ date: string, time: string }}
 */
function formatDateTime(isoString) {
  if (!isoString) return { date: "—", time: "—" };
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { date: isoString, time: "" };
    const date = d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const time = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { date, time };
  } catch {
    return { date: isoString, time: "" };
  }
}

/**
 * Capitalises the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
function capitalise(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Escapes HTML special characters for safe string interpolation.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== "string") return str !== undefined && str !== null ? String(str) : "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ─────────────────────────────────────────────────────────────────────────────
   13. EVENT WIRING
   ───────────────────────────────────────────────────────────────────────────── */

/** Attaches all global event listeners after the DOM has loaded. */
function wireEvents() {
  // ── Sidebar nav links
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.dataset.section;
      if (target) navigateTo(target);
    });
  });

  // ── Mobile hamburger
  const hamburger = document.getElementById("hamburger-btn");
  if (hamburger) hamburger.addEventListener("click", openMobileNav);

  // ── Overlay click to close mobile nav
  const overlay = document.getElementById("nav-overlay");
  if (overlay) overlay.addEventListener("click", closeMobileNav);

  // ── "Start Typing Test" button on Overview
  const heroBtn = document.getElementById("hero-start-btn");
  if (heroBtn) heroBtn.addEventListener("click", () => navigateTo("typing-test"));

  // ── Analytics Filter controls
  const anaDateSel = document.getElementById("analytics-filter-date");
  if (anaDateSel) {
    anaDateSel.addEventListener("change", (e) => {
      AppState.analyticsFilter.dateRange = e.target.value;
      renderAnalytics();
    });
  }

  const anaDiffSel = document.getElementById("analytics-filter-difficulty");
  if (anaDiffSel) {
    anaDiffSel.addEventListener("change", (e) => {
      AppState.analyticsFilter.difficulty = e.target.value;
      renderAnalytics();
    });
  }

  const anaDurSel = document.getElementById("analytics-filter-duration");
  if (anaDurSel) {
    anaDurSel.addEventListener("change", (e) => {
      AppState.analyticsFilter.duration = e.target.value;
      renderAnalytics();
    });
  }

  // ── Analytics Reset Filter button
  const anaResetBtn = document.getElementById("analytics-reset-btn");
  if (anaResetBtn) anaResetBtn.addEventListener("click", resetAnalyticsFilters);

  // ── Analytics Export CSV button
  const anaExportBtn = document.getElementById("analytics-export-csv-btn");
  if (anaExportBtn) anaExportBtn.addEventListener("click", handleAnalyticsExportCSV);

  // ── History Filter controls
  const diffSelect = document.getElementById("history-filter-difficulty");
  if (diffSelect) {
    diffSelect.addEventListener("change", (e) => {
      AppState.historyFilter.difficulty = e.target.value;
      renderHistoryTable();
    });
  }

  const durSelect = document.getElementById("history-filter-duration");
  if (durSelect) {
    durSelect.addEventListener("change", (e) => {
      AppState.historyFilter.duration = e.target.value;
      renderHistoryTable();
    });
  }

  const sortSelect = document.getElementById("history-filter-sort");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      AppState.historyFilter.sort = e.target.value;
      renderHistoryTable();
    });
  }

  // ── History Reset Filter buttons
  const resetBtn = document.getElementById("history-reset-btn");
  if (resetBtn) resetBtn.addEventListener("click", resetHistoryFilters);

  const emptyResetBtn = document.getElementById("history-empty-reset-btn");
  if (emptyResetBtn) emptyResetBtn.addEventListener("click", resetHistoryFilters);

  // ── History "Take your first test" button
  const takeTestBtn = document.getElementById("history-take-test-btn");
  if (takeTestBtn) takeTestBtn.addEventListener("click", () => navigateTo("typing-test"));

  // ── History "Clear All" button
  const histClearBtn = document.getElementById("history-clear-btn");
  if (histClearBtn) histClearBtn.addEventListener("click", handleClearAllSessions);

  // ── History table action buttons (event delegation)
  const tableBody = document.getElementById("history-table-body");
  if (tableBody) {
    tableBody.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === "view")   openSessionModal(id);
      if (action === "delete") handleDeleteSession(id);
    });
  }

  // ── Session Details Modal events
  const modalCloseBtn = document.getElementById("modal-close-btn");
  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeSessionModal);

  const modalFooterCloseBtn = document.getElementById("modal-footer-close-btn");
  if (modalFooterCloseBtn) modalFooterCloseBtn.addEventListener("click", closeSessionModal);

  const modalBackdrop = document.getElementById("session-modal");
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) closeSessionModal();
    });
  }

  const modalDeleteBtn = document.getElementById("modal-delete-btn");
  if (modalDeleteBtn) {
    modalDeleteBtn.addEventListener("click", () => {
      if (AppState.selectedSessionId) {
        handleDeleteSession(AppState.selectedSessionId);
      }
    });
  }

  // ── Settings save button
  const saveBtn = document.getElementById("settings-save-btn");
  if (saveBtn) saveBtn.addEventListener("click", saveSettings);

  // ── Settings clear data button
  const clearBtn = document.getElementById("settings-clear-btn");
  if (clearBtn) clearBtn.addEventListener("click", handleClearAllSessions);

  // ── Insights Section buttons
  const insightsRecalcBtn = document.getElementById("insights-recalculate-btn");
  if (insightsRecalcBtn) {
    insightsRecalcBtn.addEventListener("click", () => {
      renderInsightsView();
      showNotification("Smart Insights recalculated from latest session records.", "info");
    });
  }

  const insightsTakeTestBtn = document.getElementById("insights-take-test-btn");
  if (insightsTakeTestBtn) {
    insightsTakeTestBtn.addEventListener("click", () => navigateTo("typing-test"));
  }

  // ── Advanced Features: Heatmap refresh
  const heatmapRefreshBtn = document.getElementById("heatmap-refresh-btn");
  if (heatmapRefreshBtn) {
    heatmapRefreshBtn.addEventListener("click", () => {
      if (typeof HeatmapModule !== "undefined" && HeatmapModule.render) {
        HeatmapModule.render("heatmap-container", AppState.sessions);
        showNotification("Heatmap refreshed.", "info");
      }
    });
  }

  // ── Advanced Features: Rhythm session picker
  const rhythmSelect = document.getElementById("rhythm-session-select");
  if (rhythmSelect) {
    rhythmSelect.addEventListener("change", (e) => {
      _renderRhythmPanel(e.target.value);
    });
  }

  // ── Advanced Features: Adaptive refresh
  const adaptiveRefreshBtn = document.getElementById("adaptive-refresh-btn");
  if (adaptiveRefreshBtn) {
    adaptiveRefreshBtn.addEventListener("click", () => {
      if (typeof AdaptiveModule !== "undefined" && AdaptiveModule.render) {
        AdaptiveModule.render("adaptive-container", AppState.sessions);
        showNotification("Adaptive practice panel updated.", "info");
      }
    });
  }

  // ── Next-Gen Topbar Buttons
  const topbarCmdBtn = document.getElementById("topbar-cmd-btn");
  if (topbarCmdBtn) topbarCmdBtn.addEventListener("click", () => {
    if (typeof CommandPalette !== "undefined") CommandPalette.toggle();
  });

  const topbarZenBtn = document.getElementById("topbar-zen-btn");
  if (topbarZenBtn) topbarZenBtn.addEventListener("click", toggleZenMode);

  const zenToggleBtn = document.getElementById("zen-toggle-btn");
  if (zenToggleBtn) zenToggleBtn.addEventListener("click", toggleZenMode);

  const themeCycleBtn = document.getElementById("topbar-theme-cycle-btn");
  if (themeCycleBtn) themeCycleBtn.addEventListener("click", cycleThemes);

  // ── Ghost Racer toggle in test controls
  const ghostToggle = document.getElementById("ghost-toggle");
  if (ghostToggle) {
    ghostToggle.addEventListener("change", (e) => {
      if (typeof EngineState !== "undefined") {
        EngineState.ghostEnabled = e.target.checked;
        const setToggle = document.getElementById("setting-ghost-racer");
        if (setToggle) setToggle.checked = e.target.checked;
      }
    });
  }

  // ── Keyboard shortcuts: Escape closes modal & nav; 'Z' toggles Zen mode
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSessionModal();
      closeMobileNav();
      if (window.typescopeZenMode) toggleZenMode();
    } else if (
      e.key.toLowerCase() === "z" &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      document.activeElement.tagName !== "INPUT" &&
      document.activeElement.tagName !== "TEXTAREA"
    ) {
      toggleZenMode();
    }
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   14. INITIALISATION
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Main entry point — runs once the DOM is fully loaded.
 */
function init() {
  // Load persisted sessions safely from storage layer
  AppState.sessions = loadSessions();

  // Initialize Next-Gen UI/UX Engines
  if (typeof CommandPalette !== "undefined") CommandPalette.init();
  if (typeof PowerMode !== "undefined") PowerMode.init("passage-card-wrapper");
  if (typeof CadenceSeismograph !== "undefined") CadenceSeismograph.init("seismograph-canvas");

  // Wire all global event listeners
  wireEvents();

  // Restore user settings
  loadAndApplySettings();

  // Render dynamic content on Overview, History, Analytics, and Insights
  renderOverviewCards();
  renderRecentSessions();
  renderHistoryTable();
  renderAnalytics();
  renderInsightsView();

  // Wire difficulty / duration dropdowns to the engine public API
  setupTypingTestUI();

  // Initialise typing engine with completion callback
  if (typeof initEngine === "function") {
    initEngine(handleTestFinished);
  }

  // Navigate to default section
  navigateTo("overview");

  console.log("TypeScope v1.1 initialized successfully with Next-Gen UI/UX Engines.");
}

// Bootstrap on DOMContentLoaded
document.addEventListener("DOMContentLoaded", init);
