/**
 * TypeScope — Spotlight Command Palette (Cmd + K)
 * js/cmd-palette.js
 *
 * Full keyboard-driven power-user spotlight overlay:
 *   • Quick search with instantaneous filtering
 *   • Direct action dispatching across navigation, test parameters, themes, soundpacks, and data
 *   • Fully accessible with keyboard navigation (Up, Down, Enter, Escape)
 */

"use strict";

const CommandPalette = {
  isOpen: false,
  backdropEl: null,
  inputEl: null,
  listEl: null,
  selectedIndex: 0,
  filteredCommands: [],

  commands: [
    // Navigation
    { id: "nav-overview", title: "Go to Overview", desc: "View key metrics and recent sessions", category: "Navigation", icon: "🏠", action: () => navigateTo("overview") },
    { id: "nav-test", title: "Go to Typing Test", desc: "Take a touch-typing speed & accuracy test", category: "Navigation", icon: "⌨️", action: () => navigateTo("typing-test") },
    { id: "nav-analytics", title: "Go to Analytics Lab", desc: "Inspect charts, trends, and progression", category: "Navigation", icon: "📊", action: () => navigateTo("analytics") },
    { id: "nav-history", title: "Go to Session History", desc: "Browse, filter, and inspect past test logs", category: "Navigation", icon: "📋", action: () => navigateTo("history") },
    { id: "nav-insights", title: "Go to Smart Insights", desc: "Rule-based diagnostics and Typing DNA", category: "Navigation", icon: "💡", action: () => navigateTo("insights") },
    { id: "nav-advanced", title: "Go to Advanced Features", desc: "Heatmap, rhythm curves, adaptive drills", category: "Navigation", icon: "🔬", action: () => navigateTo("advanced") },
    { id: "nav-settings", title: "Go to Settings", desc: "Configure themes, soundpacks, and data", category: "Navigation", icon: "⚙️", action: () => navigateTo("settings") },

    // Test Controls
    { id: "test-start", title: "Start / Restart Test", desc: "Begin a new typing session immediately", category: "Test Controls", icon: "▶️", action: () => { navigateTo("typing-test"); const btn = document.getElementById("start-test-btn"); if (btn) btn.click(); } },
    { id: "test-dur-30", title: "Set Duration: 30 Seconds", desc: "Quick sprint duration", category: "Test Controls", icon: "⏱️", action: () => setTestDuration(30) },
    { id: "test-dur-60", title: "Set Duration: 60 Seconds", desc: "Standard benchmark duration", category: "Test Controls", icon: "⏱️", action: () => setTestDuration(60) },
    { id: "test-dur-120", title: "Set Duration: 120 Seconds", desc: "Endurance stamina duration", category: "Test Controls", icon: "⏱️", action: () => setTestDuration(120) },
    { id: "test-diff-beg", title: "Set Difficulty: Beginner", desc: "Simple sentences and common vocabulary", category: "Test Controls", icon: "🟢", action: () => setTestDifficulty("beginner") },
    { id: "test-diff-int", title: "Set Difficulty: Intermediate", desc: "Standard text with mixed punctuation", category: "Test Controls", icon: "🟡", action: () => setTestDifficulty("intermediate") },
    { id: "test-diff-adv", title: "Set Difficulty: Advanced", desc: "Complex vocabulary and code syntax", category: "Test Controls", icon: "🔴", action: () => setTestDifficulty("advanced") },
    { id: "test-zen", title: "Toggle Zen Hyper-Focus", desc: "Dim all UI and isolate the active passage", category: "Test Controls", icon: "🧘", action: () => toggleZenMode() },

    // Visual Themes
    { id: "theme-dark", title: "Theme: Dark Midnight", desc: "Deep onyx & indigo palette", category: "Themes", icon: "🌙", action: () => switchTheme("dark") },
    { id: "theme-cyberpunk", title: "Theme: Cyberpunk 2077 Neon", desc: "Electric cyan, hot magenta, dark matrix", category: "Themes", icon: "⚡", action: () => switchTheme("cyberpunk") },
    { id: "theme-tokyo", title: "Theme: Tokyo Night", desc: "Deep midnight indigo with soft pastels", category: "Themes", icon: "🌸", action: () => switchTheme("tokyo-night") },
    { id: "theme-paperwhite", title: "Theme: Paperwhite E-Ink", desc: "Editorial cream & monochrome serif typography", category: "Themes", icon: "📜", action: () => switchTheme("paperwhite") },
    { id: "theme-aurora", title: "Theme: Aurora Glassmorphism", desc: "Frosted acrylic panels & glowing cyan mesh", category: "Themes", icon: "🌌", action: () => switchTheme("aurora") },
    { id: "theme-light", title: "Theme: Light Studio", desc: "Clean, high-contrast light workspace", category: "Themes", icon: "☀️", action: () => switchTheme("light") },

    // Audio & Soundpacks
    { id: "sound-thock", title: "Sound: Thocky Mechanical", desc: "Deep lubricated tactile switch acoustic", category: "Audio", icon: "🔊", action: () => setSoundProfile("thock") },
    { id: "sound-buckling", title: "Sound: IBM Model M Buckling Spring", desc: "Vintage metallic click & tactile clack", category: "Audio", icon: "🔊", action: () => setSoundProfile("buckling") },
    { id: "sound-synth", title: "Sound: Cyberpunk Synth Pitch", desc: "Melodic synthesizer scaling with typing velocity", category: "Audio", icon: "🔊", action: () => setSoundProfile("synth") },
    { id: "sound-bubble", title: "Sound: Lo-Fi Soft Bubble", desc: "Gentle ASMR water-drop pops", category: "Audio", icon: "🔊", action: () => setSoundProfile("bubble") },
    { id: "sound-toggle", title: "Toggle Audio Mute / Unmute", desc: "Enable or disable typing sound effects", category: "Audio", icon: "🎵", action: () => toggleSoundFX() },

    // Next-Gen Features
    { id: "fx-power", title: "Toggle Power Mode Particles", desc: "Explosive spark canvas and streak multipliers", category: "Visual FX", icon: "💥", action: () => togglePowerMode() },
    { id: "fx-ghost", title: "Toggle Ghost Racer Hologram", desc: "Live shadow pace car racing against your cursor", category: "Visual FX", icon: "🏎️", action: () => toggleGhostRacer() },
    { id: "fx-3d", title: "Toggle 3D Isometric Keyboard", desc: "Perspective depth and error topography elevation", category: "Visual FX", icon: "🧊", action: () => toggle3DKeyboard() },

    // Data Management
    { id: "data-export", title: "Export All Sessions to CSV", desc: "Download RFC 4180 spreadsheet file", category: "Data", icon: "📥", action: () => { const btn = document.getElementById("export-csv-btn"); if (btn) btn.click(); else if (typeof exportSessionsCSV === "function") exportSessionsCSV(); } },
    { id: "data-passport", title: "Generate Typing Passport ID", desc: "Open radar archetype ID card for export", category: "Data", icon: "🪪", action: () => { navigateTo("insights"); const el = document.getElementById("dna-passport-section"); if (el) el.scrollIntoView({ behavior: "smooth" }); } },
  ],

  init() {
    this._createDOM();
    this._bindEvents();
  },

  _createDOM() {
    let backdrop = document.getElementById("cmd-palette-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "cmd-palette-backdrop";
      backdrop.className = "cmd-palette-backdrop";
      backdrop.innerHTML = `
        <div class="cmd-palette-modal" role="dialog" aria-modal="true" aria-label="Command Palette">
          <div class="cmd-palette-input-wrap">
            <span class="cmd-palette-icon">⚡</span>
            <input type="text" id="cmd-palette-input" class="cmd-palette-input" placeholder="Type a command or jump to feature..." autocomplete="off" />
            <kbd class="cmd-palette-kbd">ESC</kbd>
          </div>
          <ul class="cmd-palette-list" id="cmd-palette-list" role="listbox"></ul>
          <div class="cmd-palette-footer">
            <span>Use <kbd class="cmd-palette-kbd">↑</kbd> <kbd class="cmd-palette-kbd">↓</kbd> to navigate</span>
            <span>Press <kbd class="cmd-palette-kbd">ENTER</kbd> to execute</span>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
    }
    this.backdropEl = backdrop;
    this.inputEl = document.getElementById("cmd-palette-input");
    this.listEl = document.getElementById("cmd-palette-list");
  },

  _bindEvents() {
    // Global hotkey: Cmd+K or Ctrl+K
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.toggle();
      } else if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });

    // Backdrop click outside to close
    this.backdropEl.addEventListener("click", (e) => {
      if (e.target === this.backdropEl) {
        this.close();
      }
    });

    // Input typing & navigation
    this.inputEl.addEventListener("input", () => {
      this.filter(this.inputEl.value);
    });

    this.inputEl.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.selectNext();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.selectPrev();
      } else if (e.key === "Enter") {
        e.preventDefault();
        this.executeSelected();
      }
    });
  },

  open() {
    this.isOpen = true;
    this.backdropEl.classList.add("active");
    this.inputEl.value = "";
    this.filter("");
    setTimeout(() => this.inputEl.focus(), 50);
  },

  close() {
    this.isOpen = false;
    this.backdropEl.classList.remove("active");
    this.inputEl.blur();
  },

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  },

  filter(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      this.filteredCommands = [...this.commands];
    } else {
      this.filteredCommands = this.commands.filter((cmd) => {
        return (
          cmd.title.toLowerCase().includes(q) ||
          cmd.desc.toLowerCase().includes(q) ||
          cmd.category.toLowerCase().includes(q)
        );
      });
    }

    this.selectedIndex = 0;
    this.renderList();
  },

  renderList() {
    if (!this.listEl) return;

    if (this.filteredCommands.length === 0) {
      this.listEl.innerHTML = `
        <div style="padding:var(--sp-6); text-align:center; color:var(--clr-text-muted);">
          No matching commands found.
        </div>
      `;
      return;
    }

    let html = "";
    let lastCat = null;

    this.filteredCommands.forEach((cmd, idx) => {
      if (cmd.category !== lastCat) {
        html += `<div class="cmd-palette-category">${cmd.category}</div>`;
        lastCat = cmd.category;
      }

      const isSel = idx === this.selectedIndex;
      html += `
        <li class="cmd-palette-item ${isSel ? "selected" : ""}" data-index="${idx}" role="option" aria-selected="${isSel}">
          <span class="cmd-palette-item-icon">${cmd.icon}</span>
          <div style="flex:1;">
            <div class="cmd-palette-item-title">${cmd.title}</div>
            <div class="cmd-palette-item-desc">${cmd.desc}</div>
          </div>
          <kbd class="cmd-palette-kbd">↵</kbd>
        </li>
      `;
    });

    this.listEl.innerHTML = html;

    // Attach click listeners to list items
    this.listEl.querySelectorAll(".cmd-palette-item").forEach((item) => {
      item.addEventListener("click", () => {
        const idx = parseInt(item.dataset.index, 10);
        this.selectedIndex = idx;
        this.executeSelected();
      });
    });

    // Auto-scroll selected into view
    const selEl = this.listEl.querySelector(".cmd-palette-item.selected");
    if (selEl) selEl.scrollIntoView({ block: "nearest" });
  },

  selectNext() {
    if (this.filteredCommands.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
    this.renderList();
  },

  selectPrev() {
    if (this.filteredCommands.length === 0) return;
    this.selectedIndex = (this.selectedIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
    this.renderList();
  },

  executeSelected() {
    const cmd = this.filteredCommands[this.selectedIndex];
    if (cmd && typeof cmd.action === "function") {
      this.close();
      cmd.action();
    }
  },
};
