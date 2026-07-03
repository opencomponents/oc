export default `
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");

:root {
  /* Brand accent (consistent across themes) */
  --color-primary: #6366f1;
  --color-primary-dark: #4f46e5;
  --color-primary-light: #818cf8;
  --color-secondary: #0891b2;
  --color-accent: #d97706;

  --gradient-primary: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);

  /* Spacing / radius scale */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-full: 999px;

  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
}

/* Dark theme (default) */
:root, [data-theme="dark"] {
  --color-bg-primary: #0b0e14;
  --color-bg-secondary: #11151d;
  --color-bg-card: #11151d;
  --color-bg-elevated: #161c26;
  --color-bg-glass: rgba(255, 255, 255, 0.04);
  --color-bg-hover: rgba(255, 255, 255, 0.035);

  --color-text-primary: #e6edf3;
  --color-text-secondary: #aeb6c2;
  --color-text-muted: #7d8693;

  --color-border: #222a37;
  --color-border-hover: #323c4d;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px -2px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 12px 28px -6px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 4px 16px -2px rgba(99, 102, 241, 0.4);

  --color-text-inverse: #ffffff;

  --tint-strength: 0.16;
  --tint-border: 0.32;
  --badge-text-lightness: 78%;
}

/* Light theme */
[data-theme="light"] {
  --color-bg-primary: #fbfcfd;
  --color-bg-secondary: #f4f6f8;
  --color-bg-card: #ffffff;
  --color-bg-elevated: #ffffff;
  --color-bg-glass: rgba(255, 255, 255, 0.7);
  --color-bg-hover: rgba(15, 23, 42, 0.025);

  --color-text-primary: #1f2328;
  --color-text-secondary: #4a535e;
  --color-text-muted: #6a737d;

  --color-border: #e2e6ea;
  --color-border-hover: #cdd3da;

  --shadow-sm: 0 1px 2px 0 rgba(15, 23, 42, 0.05);
  --shadow-md: 0 4px 12px -2px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 12px 28px -6px rgba(15, 23, 42, 0.12);
  --shadow-glow: 0 4px 16px -2px rgba(99, 102, 241, 0.25);

  --color-text-inverse: #ffffff;

  --tint-strength: 0.1;
  --tint-border: 0.28;
  --badge-text-lightness: 38%;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

@media (prefers-reduced-motion: no-preference) {
  @view-transition {
    navigation: auto;
  }
}

body {
  font-family: var(--font-sans);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  line-height: 1.6;
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  font-size: 15px;
}

.container {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* ── Header ─────────────────────────────────────────── */
.header {
  background: color-mix(in srgb, var(--color-bg-primary) 80%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 0;
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: 1.0rem;
  letter-spacing: -0.01em;
  transition: color 0.15s ease;
  margin-top: 0;
}

.logo:hover {
  color: var(--color-text-primary);
  text-decoration: none;
}

.logo-icon {
  color: #fff;
  width: 30px;
  height: 30px;
  background: var(--gradient-primary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  box-shadow: var(--shadow-sm);
}

.logo img {
  width: 30px;
  height: 30px;
  border-radius: 8px;
}

/* Theme Toggle Button */
.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.85rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
  font-family: inherit;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
  cursor: pointer;
}

.theme-toggle:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-primary);
  background: var(--color-bg-elevated);
}

.theme-toggle-icon {
  font-size: 1rem;
  line-height: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
}

.theme-toggle:hover .theme-toggle-icon { color: var(--color-text-primary); }
.theme-toggle-icon svg { display: block; }

/* ── Typography ─────────────────────────────────────── */
h1, h2, h3 {
  color: var(--color-text-primary);
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-bottom: 0.4em;
}

h1 {
  font-size: 2rem;
  font-weight: 680;
  margin-bottom: 0.5rem;
  line-height: 1.2;
}

h2 {
  font-size: 1.2rem;
  font-weight: 600;
}

h3 {
  font-size: 1.05rem;
  font-weight: 600;
}

/* Focus styles for accessibility */
*:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
*:focus:not(:focus-visible) { outline: none; }
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

a {
  color: var(--color-primary-light);
  text-decoration: none;
  transition: color 0.15s ease;
  border-radius: 4px;
}
a:hover { color: var(--color-primary); text-decoration: underline; }
a:focus { color: var(--color-primary); }

[data-theme="light"] a { color: var(--color-primary-dark); }

#components-list a:hover { text-decoration: none; }

p { margin-top: 0; }

.back {
  width: 100%;
  margin-bottom: 1.5em;
  display: block;
  color: var(--color-text-muted);
  font-size: 0.9em;
}

/* ── Hero ───────────────────────────────────────────── */
.hero {
  padding: 2.5rem 0 1.5rem;
  position: relative;
}

.hero h1 { text-align: left; }

.component-title {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 1.85rem;
  letter-spacing: -0.01em;
}

.component-description {
  color: var(--color-text-secondary);
  max-width: 70ch;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.version-selector {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0.75rem 0;
}

.version-label {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 500;
}

/* ── Stats badge ────────────────────────────────────── */
.stats-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.5rem 0.9rem;
  margin: 1rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  max-width: fit-content;
}

.stats-badge .chart-icon {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
}

.stats-badge .chart-bar { width: 3px; border-radius: 2px; }
.stats-badge .chart-bar:nth-child(1) { height: 8px; background: var(--color-primary-light); }
.stats-badge .chart-bar:nth-child(2) { height: 12px; background: var(--color-primary); }
.stats-badge .chart-bar:nth-child(3) { height: 16px; background: var(--color-primary-dark); }

.stats-badge .badge-text {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
}

/* ── Main layout ────────────────────────────────────── */
.main-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 1.75rem;
  padding: 1rem 0 3rem;
  align-items: start;
}

.sidebar {
  display: grid;
  gap: 1.25rem;
  align-content: start;
  position: sticky;
  top: 5rem;
}

/* ── Tabs ───────────────────────────────────────────── */
#menuList {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 1.5rem !important;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

#menuList::-webkit-scrollbar { display: none; height: 0; }

a.tab-link {
  color: var(--color-text-secondary);
  font-weight: 500;
  padding: 0.6rem 0.9rem;
  border-radius: 0;
  transition: color 0.15s ease, border-color 0.15s ease;
  font-size: 0.9rem;
  line-height: 1.2;
  display: inline-block;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  white-space: nowrap;
}

a.tab-link:hover {
  color: var(--color-text-primary);
  background: transparent;
  text-decoration: none;
}

a.tab-link.selected {
  color: var(--color-primary-light);
  background: transparent;
  text-decoration: none;
  border-bottom-color: var(--color-primary);
}

[data-theme="light"] a.tab-link.selected { color: var(--color-primary-dark); }

/* ── Cards / sections ───────────────────────────────── */
.content-section {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.section-header {
  padding: 1rem 1.5rem;
  background: var(--color-bg-glass);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-light);
  flex-shrink: 0;
}

.section-icon svg { width: 18px; height: 18px; display: block; }

[data-theme="light"] .section-icon { color: var(--color-primary); }

.section-content { padding: 1.5rem; }

.box {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 1.25rem;
  margin-bottom: 1.5em;
}

/* ── Info cards (sidebar) ───────────────────────────── */
.info-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.25rem 1.35rem;
}

.info-card .section-title {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  font-weight: 600;
  margin-bottom: 1rem !important;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-card .section-title svg { width: 15px; height: 15px; color: var(--color-text-muted); }

.info-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.875rem;
}

.info-item:last-child { border-bottom: none; padding-bottom: 0; }
.info-item:first-of-type { padding-top: 0; }

.info-label {
  font-weight: 500;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.info-value {
  color: var(--color-text-primary);
  text-align: right;
  word-break: break-word;
  font-weight: 450;
}

.info-value a { word-break: break-all; }

/* ── List / table rows ──────────────────────────────── */
#components-list.box,
#components-history.box,
#components-templates.box,
#components-dependencies.box,
#components-plugins.box {
  padding: 0;
  overflow: hidden;
}

.row {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-border);
  border-radius: 0;
  width: 100%;
  display: flex;
  padding: 0.9rem 1.25rem;
  box-sizing: border-box;
  margin-bottom: 0;
  align-items: center;
  box-shadow: none;
  transition: background 0.12s ease;
  gap: 0.5rem;
}

.row:last-child { border-bottom: none; }

.row.header {
  background: var(--color-bg-glass);
  border: none;
  border-bottom: 1px solid var(--color-border) !important;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-radius: 0;
  box-shadow: none;
  color: var(--color-text-muted);
}

.row.header div {
  font-weight: 600;
  margin: 0;
  align-self: center;
}

.row.double { min-height: 56px; }
.row div { word-wrap: break-word; }
.row span { padding-right: 10px; }

/* clickable component rows (anchors that wrap an entire row) */
#components-list > a,
#components-history a,
#components-dependencies > a {
  display: block;
  color: inherit;
}

.componentRow { transition: background 0.12s ease; }

.componentRow:hover {
  background: var(--color-bg-hover);
  box-shadow: none;
  border-color: var(--color-border);
  transform: none;
}

#components-list > a:focus-visible,
#components-history a:focus-visible,
#components-dependencies > a:focus-visible {
  outline: none;
}

#components-list > a:focus-visible .componentRow,
#components-history a:focus-visible .componentRow,
#components-dependencies > a:focus-visible .componentRow {
  background: var(--color-bg-hover);
  box-shadow: inset 2px 0 0 var(--color-primary);
}

.componentRow .title .name {
  font-weight: 600;
  font-size: 0.95rem;
  margin: 0;
  width: 100%;
  color: var(--color-text-primary);
  letter-spacing: -0.005em;
}

.componentRow:hover .title .name { color: var(--color-primary-light); }
[data-theme="light"] .componentRow:hover .title .name { color: var(--color-primary-dark); }

.componentRow .release {
  font-size: 0.9rem;
  margin: 0;
  width: 100%;
  color: var(--color-text-secondary);
}

.componentRow .release a { color: var(--color-primary-light); }
[data-theme="light"] .componentRow .release a { color: var(--color-primary-dark); }

.componentRow .title .description {
  padding: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-top: 0.15rem;
  line-height: 1.45;
}

.row > * {
  flex: 0 1 9%;
  padding: 0 0.35rem;
  align-self: center;
  font-size: 0.875rem;
}

.row > *:last-child { padding-right: 0; }
.row > *:first-child { padding-left: 0; }

.release,
.title,
.filters > * {
  flex: 1 0;
}

.title {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.author {
  flex: 0 1 15%;
  word-break: break-word;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.date { color: var(--color-text-muted); font-size: 0.85rem; }
.activity { color: var(--color-text-secondary); font-size: 0.85rem; }

/* ── Filters ────────────────────────────────────────── */
.filters {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0;
  padding: 1.25rem 1.25rem 0.75rem;
}

.filters input {
  color: var(--color-text-primary);
  background-color: var(--color-bg-secondary);
  margin-bottom: 0;
}

#author-filter { flex: 0 1 30%; }

.states {
  width: 100%;
  margin: 0;
  padding: 0 1.25rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--color-border);
}

.states > span {
  color: var(--color-text-muted);
  font-weight: 500;
  font-size: 0.8rem;
}

.states input { margin-right: 6px; }

/* ── List results meta bar ──────────────────────────── */
.list-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 1.25rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

#results-count { color: var(--color-text-secondary); }

/* ── Component URL copy group ───────────────────────── */
.url-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.url-input-group #href {
  flex: 1;
  margin-bottom: 0;
  padding: 0.7rem 0.9rem;
}

.url-input-group .copy-href {
  flex-shrink: 0;
  white-space: nowrap;
}

.copy-href.copied {
  color: color-mix(in srgb, #10b981 70%, var(--color-text-primary));
  border-color: color-mix(in srgb, #10b981 var(--tint-border), transparent);
  background: color-mix(in srgb, #10b981 var(--tint-strength), transparent);
}

/* ── Forms ──────────────────────────────────────────── */
input[type="text"],
input[type="number"],
textarea,
select {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 0.9rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  margin-bottom: 10px;
  box-sizing: border-box;
}

input[type="text"]:focus,
input[type="number"]:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}

input::placeholder { color: var(--color-text-muted); }

select {
  cursor: pointer;
  padding-right: 2rem;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237d8693' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.7rem center;
}

#versions { margin-left: 0; min-width: 160px; margin-bottom: 0; }

.w-100 { width: 100%; }
.table { width: 100%; }

/* ── Buttons ────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.15s ease;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
  line-height: 1.2;
}

.btn-primary { background: var(--color-primary); color: #fff; }
.btn-primary:hover {
  background: var(--color-primary-dark);
  color: #fff;
  text-decoration: none;
  box-shadow: var(--shadow-glow);
}

.btn-secondary {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}
.btn-secondary:hover {
  border-color: var(--color-border-hover);
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  text-decoration: none;
}

/* ── Fields ─────────────────────────────────────────── */
.field { width: 100%; margin-bottom: 1em; }

.field p,
.field span,
.field a {
  margin: 0;
  font-weight: 500;
}

.field p {
  color: var(--color-text-muted);
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.4rem;
}

#href {
  height: auto;
  font-family: var(--font-mono) !important;
  font-size: 0.825rem !important;
}

/* ── Checkbox ───────────────────────────────────────── */
.checkbox-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  user-select: none;
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.checkbox-custom {
  position: relative;
  width: 18px;
  height: 18px;
  background: var(--color-bg-secondary);
  border: 1.5px solid var(--color-border-hover);
  border-radius: 5px;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.checkbox-input:checked + .checkbox-custom {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.checkbox-input:focus-visible + .checkbox-custom {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.checkbox-icon {
  width: 11px;
  height: 11px;
  stroke: #fff;
  stroke-width: 2.5;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0;
  transform: scale(0.7);
  transition: all 0.15s ease;
}

.checkbox-input:checked + .checkbox-custom .checkbox-icon {
  opacity: 1;
  transform: scale(1);
}

.checkbox-wrapper:hover .checkbox-custom { border-color: var(--color-primary-light); }

/* ── State badges ───────────────────────────────────── */
.state,
.state-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.18rem 0.55rem;
  border-radius: var(--radius-full);
  white-space: nowrap;
  transition: none;
  border: 1px solid transparent;
  box-shadow: none;
  text-transform: capitalize;
  letter-spacing: 0.01em;
  line-height: 1.4;
}

.state-badge { margin-left: 0.6rem; }
.state { margin-right: 0; }

.state-badge:hover { transform: none; box-shadow: none; }

.mobile-compact { display: none; }

/* Tinted, flat state badges (per-state hue) */
.component-state-experimental {
  background: color-mix(in srgb, #f59e0b var(--tint-strength), transparent);
  color: color-mix(in srgb, #f59e0b var(--badge-text-lightness), var(--color-text-primary));
  border-color: color-mix(in srgb, #f59e0b var(--tint-border), transparent);
}
.component-state-deprecated {
  background: color-mix(in srgb, #ef4444 var(--tint-strength), transparent);
  color: color-mix(in srgb, #ef4444 var(--badge-text-lightness), var(--color-text-primary));
  border-color: color-mix(in srgb, #ef4444 var(--tint-border), transparent);
}
.component-state-stable {
  background: color-mix(in srgb, #10b981 var(--tint-strength), transparent);
  color: color-mix(in srgb, #10b981 var(--badge-text-lightness), var(--color-text-primary));
  border-color: color-mix(in srgb, #10b981 var(--tint-border), transparent);
}
.component-state-beta {
  background: color-mix(in srgb, #3b82f6 var(--tint-strength), transparent);
  color: color-mix(in srgb, #3b82f6 var(--badge-text-lightness), var(--color-text-primary));
  border-color: color-mix(in srgb, #3b82f6 var(--tint-border), transparent);
}
.component-state-alpha {
  background: color-mix(in srgb, #8b5cf6 var(--tint-strength), transparent);
  color: color-mix(in srgb, #8b5cf6 var(--badge-text-lightness), var(--color-text-primary));
  border-color: color-mix(in srgb, #8b5cf6 var(--tint-border), transparent);
}

.bold { font-weight: 600; }
.hide { display: none !important; }

/* ── Breadcrumb ─────────────────────────────────────── */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.breadcrumb a { color: var(--color-text-muted); font-weight: 500; }
.breadcrumb a:hover { color: var(--color-primary); text-decoration: none; }

/* ── Parameters ─────────────────────────────────────── */
.parameter-grid { display: grid; gap: 1rem; }

.parameter-item {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.1rem 1.25rem;
  transition: border-color 0.15s ease;
}

.parameter-item:hover { border-color: var(--color-border-hover); box-shadow: none; }

.parameter-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.65rem;
  flex-wrap: wrap;
}

.parameter-name {
  font-weight: 600;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: 0.9rem;
}

.parameter-type {
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  padding: 0.12rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 500;
}

.parameter-required {
  background: color-mix(in srgb, var(--color-accent) var(--tint-strength), transparent);
  color: color-mix(in srgb, var(--color-accent) var(--badge-text-lightness), var(--color-text-primary));
  border-color: color-mix(in srgb, var(--color-accent) var(--tint-border), transparent);
}

.parameter-description {
  color: var(--color-text-secondary);
  margin-bottom: 0.65rem;
  line-height: 1.5;
  font-size: 0.875rem;
}

.parameter-description strong { color: var(--color-text-primary); font-weight: 600; }

.parameter-input {
  width: 100%;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  padding: 0.55rem 0.8rem;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  margin-bottom: 0;
}

.parameter-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}

/* ── Preview ────────────────────────────────────────── */
.preview-section {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
  margin-top: 1.5rem;
}

.preview-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.5rem;
  background: var(--color-bg-glass);
  border-bottom: 1px solid var(--color-border);
  gap: 1rem;
  flex-wrap: wrap;
}

.preview-buttons { display: flex; gap: 0.6rem; }

.preview-iframe,
.preview iframe {
  width: 100%;
  height: 500px;
  border: none;
  background: #fff;
  display: block;
}

.code,
.preview {
  width: 100%;
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  box-shadow: none;
  margin-bottom: 1.5em;
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.preview { height: 500px; }

/* ── Collapsible ────────────────────────────────────── */
.collapsible-header {
  cursor: pointer;
  user-select: none;
  position: relative;
  transition: background 0.15s ease;
}

.collapsible-header:hover { background: var(--color-bg-hover); }

.collapse-toggle {
  position: absolute;
  right: 1.25rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.4rem;
  border-radius: var(--radius-sm);
  transition: color 0.15s ease, background 0.15s ease;
}

.collapse-toggle:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }

.collapse-icon { transition: transform 0.2s ease; display: inline-block; }

.collapsible-content { overflow: hidden; transition: all 0.25s ease; }

.collapsible-content.collapsed { max-height: 0; padding-top: 0; padding-bottom: 0; opacity: 0; }
.collapsible-content.expanded { max-height: 2000px; opacity: 1; }

.collapsible-header.collapsed .collapse-icon { transform: rotate(-90deg); }

/* ── Loading / empty / error ────────────────────────── */
.loader { text-align: center; padding: 2em; color: var(--color-text-muted); }

.empty-state {
  text-align: center;
  padding: 2.5em 2em;
  color: var(--color-text-muted);
  margin: 0;
}

.loader p { margin: 0; }

.loader::before {
  content: '';
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 0.6em;
  vertical-align: middle;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-more {
  text-align: center;
  padding: 1em 2em;
  color: var(--color-text-muted);
  font-size: 0.85em;
  border-top: 1px solid var(--color-border);
}

.loading-more::before {
  content: '';
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 0.5em;
  vertical-align: middle;
}

/* ── Components pagination ──────────────────────────── */
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--color-border);
}

.pagination-top {
  border-top: none;
  border-bottom: 1px solid var(--color-border);
}

.pagination-btn {
  min-width: 2.25rem;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.pagination-btn:hover:not([disabled]):not(.active) {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-border-hover);
}

.pagination-btn.active {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
  cursor: default;
}

.pagination-btn[disabled] {
  opacity: 0.45;
  cursor: not-allowed;
}

.pagination-ellipsis {
  padding: 0 0.25rem;
  color: var(--color-text-muted);
  user-select: none;
}

#history-error {
  text-align: center;
  padding: 1.5em 2em;
  color: color-mix(in srgb, #ef4444 70%, var(--color-text-primary));
  background-color: color-mix(in srgb, #ef4444 var(--tint-strength), transparent);
  border: 1px solid color-mix(in srgb, #ef4444 var(--tint-border), transparent);
  border-radius: var(--radius-md);
  margin: 1em;
}

#history-error p { margin: 0; }

/* ── Footer ─────────────────────────────────────────── */
.social {
  width: 100%;
  margin-top: 0;
  padding: 2rem 0 2.5rem;
  text-align: center;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

/* ── Scrollbar ──────────────────────────────────────── */
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-border-hover); border-radius: 5px; border: 2px solid var(--color-bg-primary); }
::-webkit-scrollbar-thumb:hover { background: var(--color-text-muted); }

/* ── Animations ─────────────────────────────────────── */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 1024px) {
  .container { padding: 0 1.25rem; }
  h1 { font-size: 1.75rem; }
  .main-content { grid-template-columns: 1fr; gap: 1.25rem; }
  .sidebar { order: -1; position: static; }
  .info-item { display: flex; justify-content: space-between; }
  .collapsible-content { max-height: 0; padding-top: 0; padding-bottom: 0; opacity: 0; }
  .collapsible-header.collapsed .collapse-icon { transform: rotate(-90deg); }
}

@media (max-width: 900px) {
  .container { padding: 0 1rem; }
  .main-content { padding: 0.5rem 0 2rem; gap: 1rem; }
  .filters { flex-direction: column; gap: 0.5em; }
  #author-filter { flex: 1 0; }

  .row.header { display: none; }

  .componentRow {
    flex-direction: column !important;
    align-items: flex-start !important;
    padding: 1rem 1.25rem !important;
    gap: 0.6rem !important;
    text-align: left !important;
  }

  .componentRow > .author,
  .componentRow > .date,
  .componentRow > .activity,
  .componentRow > div:not(.title):not(.state):not(.mobile-compact) {
    display: none !important;
  }

  .mobile-compact { display: block !important; width: 100%; }

  .mobile-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    width: 100%;
  }

  .mobile-meta span {
    background: var(--color-bg-secondary);
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .mobile-author { color: var(--color-text-secondary) !important; }
  .mobile-version { color: var(--color-text-primary) !important; font-weight: 600; }
  .mobile-date { color: var(--color-text-muted) !important; }
  .mobile-activity { color: var(--color-text-secondary) !important; }
  .mobile-size { color: var(--color-text-secondary) !important; }

  .componentRow .title { text-align: left !important; width: 100%; }
  .componentRow .title .name { text-align: left !important; }
  .componentRow .title .description { text-align: left !important; }

  .box, .info-card, .section-content { }
  .section-content { padding: 1.25rem; }

  .sidebar .info-item { flex-direction: column; align-items: flex-start; gap: 0.3rem; }
  .sidebar .info-label { min-width: auto; font-weight: 600; }
  .sidebar .info-value { text-align: left; margin-left: 0; }

  h1 { font-size: 1.6rem; }
  .component-title { font-size: 1.5rem; }
  .preview-controls { flex-direction: column; align-items: stretch; }
  .preview-buttons { justify-content: stretch; }
  .preview-buttons .btn { flex: 1; justify-content: center; }
}
  `;
