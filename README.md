# TypeScope — Typing Performance Analytics & Intelligence System

[![Platform](https://img.shields.io/badge/Platform-Vanilla%20HTML5%20%7C%20CSS3%20%7C%20ES6%2B-blue)](#technologies-used)
[![Course Alignment](https://img.shields.io/badge/Courses-JS%20Essentials%201%20%26%202%20%7C%20Data%20Analytics-brightgreen)](#academic-context)
[![Data Privacy](https://img.shields.io/badge/Privacy-100%25%20Local%20%7C%20Zero%20Telemetry-orange)](#data-storage--privacy)
[![License](https://img.shields.io/badge/License-Academic%20SIP%20Project-lightgrey)](#academic-context)

**TypeScope** is a client-side typing performance analytics and intelligence platform built as a **Summer Internship Project (SIP)** for the **Computer Engineering** curriculum (S.Y. B.Tech). It measures keystroke dynamics, tracks longitudinal progress, renders interactive diagnostic visualizations, and generates evidence-based performance insights derived strictly from authentic user typing data.

---

## 1. Project Overview

Modern typing tests often provide only instantaneous WPM scores without actionable diagnostic feedback. **TypeScope** bridges this gap by functioning as a diagnostic test laboratory:

- **Touch-Typing Engine:** Low-latency keystroke capture with real-time accuracy highlighting, dynamic cursor positioning, and countdown timers.
- **Persistent Analytics Dashboard:** Long-term storage of session metrics in the browser's `localStorage` without external server infrastructure.
- **Multidimensional Visualizations:** Progression charts, accuracy trajectories, difficulty comparison bars, and error breakdown distributions powered by Chart.js with native HTML5 Canvas fallbacks.
- **Smart Insights Engine:** Explainable, rule-based intelligence analyzing speed-accuracy trade-offs, cadence variance (Standard Deviation and Coefficient of Variation), duration stamina, and mistake clusters.
- **Export & Portability:** RFC 4180-compliant CSV export with formula injection defense and UTF-8 BOM encoding for Excel compatibility.

---

## 2. Key Features

### ⌨️ Live Typing Engine
- 10+ curriculum-aligned passages categorized into **Beginner**, **Intermediate**, and **Advanced** difficulty tiers.
- Configurable test durations: **30 seconds**, **60 seconds**, and **120 seconds**.
- Keystroke timer starts strictly on the user's first typed character to prevent countdown penalty.
- Character-level DOM highlighting for correct characters, incorrect characters, untyped text, and active cursor positioning.
- Natural support for spaces, punctuation, digits, backspace correction, and repeated characters.
- Keyboard-accessible controls and Web Audio API synthesized mechanical keyboard feedback (toggleable in Settings).
- Real-time live HUD showing remaining time, live gross WPM, live net WPM, accuracy %, keystroke count, and uncorrected errors.

### 📋 Session History & Management
- Every completed test persists immediately with complete metadata (timestamp, duration, elapsed time, difficulty, gross WPM, net WPM, accuracy, errors, character counts, passage title, and error map).
- Sortable by date (newest/oldest), net WPM (highest/lowest), accuracy, and test duration.
- Filterable by difficulty and duration tiers.
- Detailed Session Modal displaying granular keystroke distribution, net vs. gross speed delta, and mistyped keys.
- Safe individual session deletion and clear-all action with confirmation dialogs.

### 📊 Interactive Analytics Lab
- **Summary KPI Cards:** Filtered average Net WPM, average Accuracy %, Personal-Best Net WPM, completed test count, and baseline pace improvement percentage.
- **WPM Progression Chart:** Net WPM trendline with underlying Gross WPM dashed ceiling.
- **Accuracy Trend Chart:** Precision percentage line across historical attempts.
- **Speed by Difficulty:** Comparative bar visualization showing average velocity across Beginner, Intermediate, and Advanced tiers.
- **Error Categorization & Mistake Patterns:** Doughnut/bar distribution of mistakes across letters, punctuation, digits, and spaces, alongside top recurring mistyped characters.
- **Defensive Rendering:** Native HTML5 2D Canvas fallbacks if external CDN libraries are unreachable or offline.

### 💡 Smart Insights & Intelligence Engine
- **Explainability Standard:** Every insight explicitly segregates **Empirical Observation** (exact metrics, sample count $N$) from **Diagnostic Conclusion** and **Actionable Practice Suggestion**.
- **WPM Trajectory Analysis:** Apples-to-apples comparison between tests of equal duration to detect true velocity acceleration or fatigue dips.
- **Speed-Accuracy Trade-off:** Detects when rushing sacrifices accuracy versus when velocity consolidates into true mastery.
- **Cadence Consistency & Variance:** Calculates Mean ($\mu$), Standard Deviation ($\sigma$), and Coefficient of Variation ($CV = \frac{\sigma}{\mu} \times 100\%$).
- **Stamina Degradation:** Evaluates performance degradation across 30s, 60s, and 120s duration tiers.
- **Difficulty Gap:** Diagnoses syntax/punctuation bottlenecks when moving to advanced passages.
- **Typing Persona Classifier:** Synthesizes overall metrics into profiles such as *Precision Virtuoso*, *Methodical Typist*, *Speed Sprinter*, *Rising Performer*, or *Balanced Typist*.

---

## 3. Technologies Used

- **Markup:** Semantic HTML5 (`<main>`, `<section>`, `<header>`, `<aside>`, `<nav>`, `<table>`, `<canvas>`)
- **Styling:** Vanilla CSS3 with CSS custom properties (design tokens), flexbox, grid, and dark glassmorphic styling (no Tailwind or heavy CSS frameworks).
- **Logic:** Vanilla ECMAScript 6+ (modules, closures, functional array methods, higher-order functions).
- **Visualizations:** Chart.js 4.4.7 with native HTML5 Canvas fallback renderers.
- **Audio:** Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`) for synthesized feedback.
- **Storage:** Web Storage API (`localStorage`) with JSON sanitization and validation.
- **Architecture:** 100% frontend-only client architecture. Zero backend servers, zero databases, zero cloud dependencies, and zero third-party telemetry.

---

## 4. Folder Structure

```
SIP PROJECT/
│
├── index.html              # Main application shell & view markup
├── README.md               # Project documentation & demonstration guide
│
├── css/
│   ├── styles.css          # Design system, CSS variables, component styling
│   └── responsive.css      # Responsive media queries (desktop, tablet, mobile)
│
├── data/
│   └── passages.js         # Curated passages categorized by difficulty tier
│
└── js/
    ├── metrics.js          # Authoritative typing metric formulas (WPM, Acc, Errors)
    ├── storage.js          # localStorage layer, schema validator, deduplication
    ├── analytics.js        # Data aggregation, date filtering, CSV export engine
    ├── charts.js           # ChartManager (Chart.js integration + Canvas fallbacks)
    ├── insights.js         # InsightsEngine (statistical models, rules, personas)
    ├── typing-engine.js    # Keystroke capture, timer lifecycle, Web Audio sound
    └── app.js              # State coordinator, view router, and event wiring
```

---

## 5. Metric Definitions & Formulas

All mathematical formulas in TypeScope follow standard typing analytics specifications and can be readily explained during a project viva:

### 1. Gross Words Per Minute (Gross WPM)
Measures the raw physical keystroke throughput regardless of mistakes:
$$\text{Gross WPM} = \frac{\text{Total Keystrokes} / 5}{\text{Elapsed Minutes}}$$
- Standard industry convention defines **5 characters** as one standard word.
- Backspace keystrokes are **excluded** from raw keystroke count.

### 2. Uncorrected Errors ($E$)
Counts character positions where the user's typed string does not match the reference target text at the moment of test completion:
$$E = \sum_{i=0}^{L-1} [\text{typed}[i] \neq \text{target}[i]]$$
Mistakes corrected by backspacing during the test do not count as uncorrected errors.

### 3. Net Words Per Minute (Net WPM)
The standard measure of useful typing speed, penalizing uncorrected mistakes:
$$\text{Net WPM} = \max\left(0, \text{Gross WPM} - \frac{E}{\text{Elapsed Minutes}}\right)$$
Net WPM is floored at $0$ so negative values are mathematically impossible.

### 4. Accuracy Percentage
Measures keystroke precision over the evaluated length of the passage:
$$\text{Accuracy} = \left(\frac{\text{Correct Characters}}{\text{Evaluated Characters}}\right) \times 100\%$$
- If no characters have been typed yet, Accuracy defaults to $100\%$.

### 5. Cadence Consistency & Variance
Measures rhythm stability across sessions:
$$\mu = \frac{1}{N}\sum_{i=1}^N \text{WPM}_i, \quad \sigma = \sqrt{\frac{1}{N}\sum_{i=1}^N (\text{WPM}_i - \mu)^2}, \quad CV = \left(\frac{\sigma}{\mu}\right) \times 100\%$$
- $CV \le 8\%$: High consistency / metronome rhythm.
- $CV > 18\%$: Erratic pacing or irregular mistake recovery.

---

## 6. Data Storage & Privacy

TypeScope is committed to absolute user privacy and client data sovereignty:
1. **Local Isolation:** All test history and settings reside strictly in the browser's `localStorage` under keys `typescope_sessions` and `typescope_settings`.
2. **Zero Remote Transmission:** No data, keystrokes, IP addresses, or analytics are ever transmitted over the network.
3. **Data Integrity & Validation:** Every loaded record is validated through `sanitizeSession()` in `js/storage.js` to guard against missing fields, negative values, or malformed JSON.
4. **Deduplication:** Prevents accidental double-saving if a test finishes rapidly or triggers multiple events.
5. **CSV Security:** Exported CSV files include formula injection safeguards (escaping strings starting with `=`, `+`, `-`, `@`) and UTF-8 BOM encoding for spreadsheet applications.

---

## 7. How to Run the Project

Because TypeScope is built using vanilla web technologies, it requires **no Node.js build step, no npm install, and no backend server**.

### Option A: Direct Browser Launch
1. Clone or download the repository folder to your machine.
2. Double-click `index.html` or open it directly in any modern web browser (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari).
3. The application will initialize immediately.

### Option B: Local HTTP Server (Recommended for Chart.js CDN caching)
You can run a lightweight local HTTP server using Python or VS Code Live Server:

```bash
# Using Python 3:
python3 -m http.server 8080

# Then navigate to:
http://localhost:8080
```

---

## 8. College Demonstration Walkthrough (Viva Guide)

To demonstrate the full breadth of TypeScope during an evaluation or viva, follow this step-by-step workflow:

1. **Dashboard Overview:**
   - Open the app. Point out the dark navy dashboard, summary cards, and navigation drawer.
   - Show that with zero sessions, empty states provide clean onboarding instructions without broken graphics.
2. **Complete a Real Typing Test:**
   - Navigate to **Typing Test**. Select **Beginner** difficulty and **30s** duration.
   - Click **Start Test** or begin typing. Point out that the timer only starts on the first real keystroke.
   - Type a few words correctly and intentionally make one error. Show the real-time green/red character highlight and the live WPM / Accuracy HUD.
   - Let the 30s timer expire or finish the passage. Point out the **Results Modal** showing Net WPM, Gross WPM, Accuracy, and duration.
3. **Session History & Inspection:**
   - Navigate to **Session History**. Show the newly recorded test row in the data table.
   - Click **View** on the session to open the granular details modal.
   - Demonstrate sorting (by WPM or date) and difficulty filtering.
4. **Analytics Lab:**
   - Navigate to **Analytics Lab**. Point out the 4 live charts: WPM Progression, Accuracy Trend, Speed by Difficulty, and Error Breakdown.
   - Demonstrate the **Export to CSV** button. Show that the generated file opens neatly in Excel or Google Sheets.
5. **Smart Insights & Intelligence:**
   - Navigate to **Insights**. Show the **Typing Persona** banner and the 6 detailed cards.
   - Highlight how the engine clearly separates **Observation (Empirical Data)** from **Diagnostic Conclusion** and **Actionable Practice Suggestion**.
   - Show the statistical footer containing sample size ($N$), $\Delta$ WPM, and standard deviation.
   - Click **⟳ Recalculate Insights** to show the reactive update and notification toast.
6. **Settings & Customization:**
   - Navigate to **Settings**. Toggle **Sound Effects** ON and click **Save Settings**.
   - Return to the typing test and type a few keys to demonstrate the synthesized Web Audio feedback.
   - Show that the theme and font preferences persist across page refreshes.

---

## 9. Academic Context

- **Program:** S.Y. B.Tech in Computer Engineering
- **Project Title:** TypeScope — Typing Performance Analytics & Intelligence System
- **Aligned Courses:**
  - *JavaScript Essentials 1* (DOM manipulation, event listeners, functions, objects)
  - *JavaScript Essentials 2* (ES6 modules, functional array processing, Web Audio API, defensive programming)
  - *Introduction to Data Analytics Essentials* (descriptive statistics, trend detection, data visualization, explainable heuristics)
- **Academic Year:** 2025–2026

---

## 10. Limitations & Future Scope

- **Browser Storage Limit:** Uses browser `localStorage` (typically $\approx 5\text{MB}$ capacity), which easily accommodates thousands of test records.
- **Single-Device Scope:** Because it avoids servers for absolute privacy, session history is tied to the specific browser instance (mitigated by CSV export and import portability).
- **Physical Keyboard Requirement:** Designed primarily for physical desktop/laptop keyboards where touch-typing metrics are valid (virtual mobile keyboards do not reflect standard touch-typing ergonomics).
