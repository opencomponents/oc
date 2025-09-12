export default `
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");

:root {
  /* Primary brand colors (consistent across themes) */
  --color-primary: #6366f1;
  --color-primary-dark: #4f46e5;
  --color-primary-light: #818cf8;
  --color-secondary: #06b6d4;
  --color-accent: #f59e0b;

  --gradient-primary: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  --gradient-secondary: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  --gradient-accent: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);

  /* Legacy color mappings for backward compatibility */
  --color-warning: #ffe066;
  --color-warning-text: #7c3aed;
  --color-danger: #ffd6d6;
  --color-danger-text: #c92a2a;
  --color-state-border: #e9ecef;
}

/* Dark theme (default) */
:root, [data-theme="dark"] {
  --color-bg-primary: #0f0f23;
  --color-bg-secondary: #1a1a2e;
  --color-bg-card: #16213e;
  --color-bg-glass: rgba(255, 255, 255, 0.05);

  --color-text-primary: #ffffff;
  --color-text-secondary: #b4b4b8; /* Improved contrast from #a1a1aa */
  --color-text-muted: #8a8a95;     /* Improved contrast from #71717a */

  --color-border: rgba(255, 255, 255, 0.1);
  --color-border-hover: rgba(255, 255, 255, 0.2);

  --gradient-card: rgba(255,255,255,0.03); /* Simplified from gradient */

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-glow: 0 0 20px rgba(99, 102, 241, 0.3);

  /* Dark theme text inverse (for buttons, etc) */
  --color-text-inverse: #ffffff;
}

/* Light theme */
[data-theme="light"] {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-bg-card: #ffffff;
  --color-bg-glass: rgba(255, 255, 255, 0.8);

  --color-text-primary: #1e293b;
  --color-text-secondary: #475569;  /* Improved contrast from #64748b */
  --color-text-muted: #64748b;      /* Improved contrast from #94a3b8 */

  --color-border: rgba(0, 0, 0, 0.1);
  --color-border-hover: rgba(0, 0, 0, 0.15);

  --gradient-card: rgba(0,0,0,0.02); /* Simplified from gradient */

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-glow: 0 0 20px rgba(99, 102, 241, 0.2);

  /* Light theme text inverse (for buttons, etc) */
  --color-text-inverse: #ffffff;
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
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  line-height: 1.6;
  min-height: 100vh;
  overflow-x: hidden;
}

/* Animated background - Dark theme */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background:
    radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(6, 182, 212, 0.05) 0%, transparent 50%);
  z-index: -1;
  transition: opacity 0.3s ease;
}

/* Animated background - Light theme */
[data-theme="light"] body::before {
  background:
    radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(6, 182, 212, 0.02) 0%, transparent 50%);
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* Header */
.header {
  background: var(--color-bg-glass);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: var(--color-text-primary);
  font-weight: 700;
  font-size: 1.25rem;
  transition: all 0.3s ease;
}

.logo:hover {
  color: var(--color-primary-light);
  transform: translateY(-1px);
}

.logo-icon {
  color: #fff;
  width: 32px;
  height: 32px;
  background: var(--gradient-primary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.1rem;
}

.logo img {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

/* Theme Toggle Button */
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--color-bg-glass);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.3s ease;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.theme-toggle:hover {
  border-color: var(--color-border-hover);
  background: var(--color-bg-card);
  transform: translateY(-1px);
}

.theme-toggle-icon {
  font-size: 1.1rem;
  transition: transform 0.3s ease;
}

.theme-toggle:hover .theme-toggle-icon {
  transform: rotate(180deg);
}

h1, h2, h3 {
  color: var(--color-text-primary);
  font-weight: 600;
  margin-bottom: 0.5em;
}

h1 {
  font-size: 3.5rem;
  font-weight: 700;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1rem;
  text-align: center;
}

h2 {
  font-size: 1.5rem;      /* Increased from 1.25rem */
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.75em;
}

h3 {
  font-size: 1.25rem;     /* Increased from 1.1rem */
  font-weight: 600;
}

/* Focus styles for accessibility */
*:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

*:focus:not(:focus-visible) {
  outline: none;
}

*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

a {
  color: var(--color-text-primary);
  text-decoration: none;
  transition: color 0.3s ease;
  border-radius: 4px; /* For better focus outline */
}
a:hover {
  color: var(--color-primary);
  text-decoration: underline;
}
a:focus {
  color: var(--color-primary);
}

#components-list a:hover {
  text-decoration: none;
}

p {
  margin-top: 0;
}

.logo {
  margin-top: 10px;
}

.back {
  width: 100%;
  margin-top: -20px;
  margin-bottom: 1.5em;
  display: block;
  color: var(--color-text-muted);
  font-size: 0.95em;
}

/* Content Sections */
.content-section {
  background: var(--color-bg-card);
  border-radius: 16px;
  border: 1px solid var(--color-border);
  overflow: hidden;
  transition: all 0.3s ease;
  margin-bottom: 2rem;
}

.content-section:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-lg);
}

.section-header {
  padding: 1.5rem 2rem;
  background: var(--gradient-card);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-icon {
  font-size: 1.25rem;
  /* Removed gradient background, border-radius, and container styling */
  /* Now just using emoji directly for better accessibility */
}

.section-content {
  padding: 2rem;
}

.code,
.preview {
  width: 100%;
  background: var(--color-bg-card);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  margin-bottom: 1.5em;
  border: 1px solid var(--color-border);
}

.preview {
  height: 500px;
}

.preview iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
  border-radius: 0 0 16px 16px;
}

.table {
  width: 100%;
}

.w-100 {
  width: 100%;
}

.row {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  width: 100%;
  display: flex;
  padding: 14px 0px;
  box-sizing: border-box;
  margin-bottom: 8px;
  align-items: center;
  box-shadow: var(--shadow-md);
  transition: all 0.3s ease;
}

.row.header {
  background: var(--gradient-card);
  border: 1px solid var(--color-border) !important;
  font-size: 1.1em;
  font-weight: 600;
  border-radius: 12px 12px 0 0;
  box-shadow: none;
  color: var(--color-text-primary);
}

.row.header div {
  font-weight: bold;
  margin: 0;
  align-self: flex-start;
}

.row.double {
  min-height: 60px;
}

.row div {
  word-wrap: break-word;
}

.row span {
  padding-right: 10px;
}

.componentRow {
  transition:
    box-shadow 0.2s,
    background 0.2s;
}

.componentRow:hover {
  background: var(--color-bg-glass);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.componentRow .title .name {
  font-weight: bold;
  font-size: 1.15rem;
  margin: 0;
  width: 100%;
  color: var(--color-text-default);
}

.componentRow .release {
  font-size: 1rem;
  margin: 0;
  width: 100%;
  color: var(--color-text-default);
}

.componentRow .title .description {
  padding: 0;
  font-size: 0.98rem;
  color: var(--color-text-muted);
}

.social {
  width: 100%;
  margin-top: 20px;
  text-align: center;
}

.field {
  width: 100%;
  margin-bottom: 1em;
}

.field p,
.field span,
.field a {
  margin: 0;
  font-weight: 500;
}

.field p {
  color: var(--color-primary);
  font-weight: bold;
  margin-right: 10px;
}

input[type="text"],
textarea,
select {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-family: inherit;
  font-size: 1rem;
  transition: all 0.3s ease;
  margin-bottom: 10px;
  box-sizing: border-box;
}

input[type="text"]:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.btn-primary {
  background: var(--gradient-primary);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-glow);
}

.btn-secondary {
  background: var(--color-bg-glass);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  border-color: var(--color-border-hover);
  background: var(--color-bg-secondary);
}

.filters {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 1em;
  margin-bottom: 0.5em;
}

.row > * {
  flex: 0 1 8%;
  padding: 0px 5px;
  align-self: center;
}

.row > *:last-child {
  padding-right: 10px;
}

.row > *:first-child {
  padding-left: 10px;
}

.release,
.title,
.filters > * {
  flex: 1 0;
}

.title {
  display: flex;
  flex-direction: column;
}

.filters input {
  color: #0f0f23;
  background-color: #eee;
}

#author-filter {
  flex: 0 1 30%;
}

@media (min-width: 1024px) {
  margin-left: 15px;
}

.parameter {
  flex: 1 0;
  max-width: 25%;
  align-self: flex-start;
}

.parameter-description {
  flex: 1 0;
  max-width: 70%;
}

.author {
  flex: 0 1 15%;
  word-break: break-all;
  color: var(--color-info);
}

#href {
  height: 60px;
}

.states {
  width: 100%;
  margin-bottom: 30px;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.states > span {
  color: var(--color-text-secondary);
  font-weight: 500;
  font-size: 0.875rem;
}

.states input {
  margin-right: 6px;
}

/* Custom Checkbox Styling */
.checkbox-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s ease;
}

.checkbox-wrapper:hover {
  transform: translateY(-1px);
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.checkbox-custom {
  position: relative;
  width: 20px;
  height: 20px;
  background: var(--color-bg-card);
  border: 2px solid var(--color-border);
  border-radius: 6px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.checkbox-input:checked + .checkbox-custom {
  background: var(--gradient-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.checkbox-input:focus + .checkbox-custom {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.checkbox-icon {
  width: 12px;
  height: 12px;
  stroke: white;
  stroke-width: 2;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s ease;
}

.checkbox-input:checked + .checkbox-custom .checkbox-icon {
  opacity: 1;
  transform: scale(1);
}

.checkbox-wrapper:hover .checkbox-custom {
  border-color: var(--color-border-hover);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
}

.checkbox-wrapper:hover .checkbox-input:checked + .checkbox-custom {
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2), 0 2px 8px rgba(99, 102, 241, 0.3);
}

/* Removed old details-state styling - now using state-badge class */

#versions {
  margin-left: 10px;
}

/* Updated state styling to use modern badge design */
.state {
  display: inline-flex;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.375rem 0.75rem;
  border-radius: 12px;
  white-space: nowrap;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  backdrop-filter: blur(10px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-right: 10px;
}

.table .state {
  /* Remove the old background and height - now using component-state classes */
}

/* Enhanced State Badge Styling - moved to component state section */

/* Component State Badge Styling */
.state-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.375rem 0.75rem;
  border-radius: 12px;
  white-space: nowrap;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  backdrop-filter: blur(10px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-left: 0.75rem;
}

/* Mobile compact view - hidden on desktop */
.mobile-compact {
  display: none;
}

.state-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Experimental state - warm orange/yellow like in the image */
.component-state-experimental {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: #92400e;
  border: 1px solid rgba(245, 158, 11, 0.3);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
}

.component-state-experimental:hover {
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

/* Deprecated state - red */
.component-state-deprecated {
  background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
  color: #991b1b;
  border: 1px solid rgba(239, 68, 68, 0.3);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
}

.component-state-deprecated:hover {
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* Stable state - green */
.component-state-stable {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #064e3b;
  border: 1px solid rgba(16, 185, 129, 0.3);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
}

.component-state-stable:hover {
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* Beta state - blue */
.component-state-beta {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #1e3a8a;
  border: 1px solid rgba(59, 130, 246, 0.3);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.component-state-beta:hover {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* Alpha state - purple */
.component-state-alpha {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: #4c1d95;
  border: 1px solid rgba(139, 92, 246, 0.3);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);
}

.component-state-alpha:hover {
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

a.tab-link {
  color: var(--color-primary-light);
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-size: 1rem;
  line-height: 1.2;
  vertical-align: middle;
  display: inline-block;
  border: 1px solid transparent;
}

a.tab-link:hover {
  background: var(--color-bg-glass);
  border-color: var(--color-border);
}

a.tab-link.selected {
  background: var(--gradient-primary);
  color: white;
  text-decoration: none;
  border-color: var(--color-primary);
}

.bold {
  font-weight: bold;
}

.hide {
  display: none !important;
}

.box {
  background: var(--color-bg-card);
  border-radius: 12px; /* Reduced from 16px */
  border: 1px solid var(--color-border);
  padding: 1.5em 2em;
  margin-bottom: 2em;
  transition: all 0.3s ease;
  /* Removed default shadow */
}

.box:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-md); /* Only on hover */
  transform: translateY(-1px); /* Reduced from -2px */
}

/* Hero Section */
.hero {
  padding: 3rem 0;
  text-align: center;
  position: relative;
}

/* Info Cards */
.info-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px; /* Reduced from 16px */
  padding: 1.5rem;
  transition: all 0.3s ease;
  margin-bottom: 1.5rem;
  /* Removed default shadow */
}

.info-card:hover {
  border-color: var(--color-border-hover);
  transform: translateY(-1px); /* Reduced from -2px */
  box-shadow: var(--shadow-md); /* Reduced from shadow-lg */
}

.info-item {
  display: flow;
  align-items: start;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-border);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 500;
  color: var(--color-text-secondary);
  min-width: 100px;
}

.info-value {
  color: var(--color-text-primary);
  text-align: right;
  flex: 1;
  margin-left: 1rem;
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--gradient-primary);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--gradient-secondary);
}

/* Main Content Layout */
.main-content {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 2rem;
  padding: 2rem 0;
}

.sidebar {
  display: grid;
  gap: 1.5rem;
  align-content: start;
}

/* Collapsible Sections */
.collapsible-section {
  transition: all 0.3s ease;
}

.collapsible-header {
  cursor: pointer;
  user-select: none;
  position: relative;
  transition: all 0.3s ease;
}

.collapsible-header:hover {
  background: var(--color-bg-glass);
}

.collapse-toggle {
  position: absolute;
  right: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.collapse-toggle:hover {
  background: var(--color-bg-glass);
  color: var(--color-text-primary);
}

.collapse-icon {
  transition: transform 0.3s ease;
  display: inline-block;
}

.collapsible-content {
  overflow: hidden;
  transition: all 0.3s ease;
}

.collapsible-content.collapsed {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
}

.collapsible-content.expanded {
  max-height: 2000px;
  opacity: 1;
}

.collapsible-header.collapsed .collapse-icon {
  transform: rotate(-90deg);
}

/* Responsive */
@media (max-width: 1024px) {

  .info-item {
    display: flex;
    justify-content: space-between;
  }

  .container {
    padding: 0 1rem;
  }

  h1 {
    font-size: 2.5rem;
  }

  .main-content {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .sidebar {
    order: -1;
  }

  /* Mobile collapsible sections - collapsed by default */
  .collapsible-content {
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
    opacity: 0;
  }

  .collapsible-header.collapsed .collapse-icon {
    transform: rotate(-90deg);
  }
}

@media (max-width: 900px) {
  .container {
    padding: 0 1rem;
  }

  .main-content {
    padding: 1rem 0;
    gap: 1rem;
  }

  .filters {
    flex-direction: column;
    gap: 0.5em;
  }

  /* Mobile responsive components list */
  .row.header {
    display: none; /* Hide desktop table header on mobile */
  }

  .componentRow {
    flex-direction: column !important;
    align-items: center !important;
    padding: 1rem !important;
    gap: 0.75rem !important;
    text-align: center !important;
  }

  /* Hide desktop table columns on mobile */
  .componentRow > .author,
  .componentRow > .date,
  .componentRow > .activity,
  .componentRow > div:not(.title):not(.state):not(.mobile-compact) {
    display: none !important;
  }

  /* Show mobile compact view */
  .mobile-compact {
    display: block !important;
    width: 100%;
  }

  .mobile-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    width: 100%;
  }

  .mobile-meta span {
    background: var(--color-bg-glass);
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    font-size: 0.8rem;
    font-weight: 500;
  }

  .mobile-author {
    color: var(--color-primary) !important;
  }

  .mobile-version {
    color: var(--color-text-primary) !important;
    font-weight: 600;
  }

  .mobile-date {
    color: var(--color-text-muted) !important;
  }

  .mobile-activity {
    color: var(--color-accent) !important;
  }

  .mobile-size {
    color: var(--color-secondary) !important;
  }

  /* Center the title section on mobile */
  .componentRow .title {
    text-align: center !important;
    width: 100%;
  }

  .componentRow .title .name {
    text-align: center !important;
  }

  .componentRow .title .description {
    text-align: center !important;
  }

  .box, .info-card, .section-content {
    padding: 1.5rem 1rem;
  }

  .sidebar .info-card {
    padding: 1rem;
  }

  .sidebar .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .sidebar .info-label {
    min-width: auto;
    font-weight: 600;
  }

  .sidebar .info-value {
    text-align: left;
    margin-left: 0;
  }

  h1 {
    font-size: 2rem;
  }
}

/* Loading states */
.loader {
  text-align: center;
  padding: 2em;
  color: var(--color-text-muted);
}

.loader p {
  margin: 0;
  font-style: italic;
}

.loader::before {
  content: '';
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5em;
  vertical-align: middle;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-more {
  text-align: center;
  padding: 1em 2em;
  color: var(--color-text-muted);
  font-style: italic;
  font-size: 0.9em;
  border-top: 1px solid var(--color-border);
  margin-top: 1em;
}

.loading-more::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5em;
  vertical-align: middle;
}

#history-error {
  text-align: center;
  padding: 2em;
  color: var(--color-danger-text);
  background-color: var(--color-danger);
  border: 1px solid var(--color-state-border);
  border-radius: 6px;
  margin: 1em 0;
}

#history-error p {
  margin: 0;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.breadcrumb a {
  color: var(--color-primary-light);
  text-decoration: none;
  transition: color 0.3s ease;
}

.breadcrumb a:hover {
  color: var(--color-primary);
}

/* Parameters */
.parameter-grid {
  display: grid;
  gap: 1.5rem;
}

.parameter-item {
  background: var(--color-bg-glass);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.parameter-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.1);
}

.parameter-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.parameter-name {
  font-weight: 600;
  color: var(--color-text-primary);
}

.parameter-type {
  background: var(--color-secondary);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px; /* Reduced from 20px */
  font-size: 0.75rem;
  font-weight: 500;
}

.parameter-required {
  background: var(--color-accent);
}

.parameter-description {
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
  line-height: 1.5;
}

.parameter-input {
  width: 100%;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-family: inherit;
  transition: all 0.3s ease;
}

.parameter-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* Preview Section */
.preview-section {
  background: var(--color-bg-card);
  border-radius: 16px;
  border: 1px solid var(--color-border);
  overflow: hidden;
  margin-top: 2rem;
}

.preview-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: var(--color-bg-glass);
  border-bottom: 1px solid var(--color-border);
}

.preview-buttons {
  display: flex;
  gap: 0.75rem;
}

.preview-iframe {
  width: 100%;
  height: 500px;
  border: none;
  background: white;
}

.back {
  width: 100%;
  margin-top: -20px;
  margin-bottom: 1.5em;
  display: block;
  color: var(--color-text-muted);
  font-size: 0.95em;
}

/* Stats Badge */
.stats-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 0.75rem 1.25rem;
  margin: 1.5rem auto 0;
  box-shadow: var(--shadow-md);
  transition: all 0.3s ease;
  max-width: fit-content;
}

.stats-badge:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-lg);
  transform: translateY(-1px);
}

.stats-badge .chart-icon {
  display: flex;
  align-items: center;
  gap: 2px;
}

.stats-badge .chart-bar {
  width: 4px;
  border-radius: 2px;
  background: var(--gradient-primary);
}

.stats-badge .chart-bar:nth-child(1) {
  height: 12px;
  background: #10b981; /* green */
}

.stats-badge .chart-bar:nth-child(2) {
  height: 16px;
  background: #ef4444; /* red */
}

.stats-badge .chart-bar:nth-child(3) {
  height: 20px;
  background: #3b82f6; /* blue */
}

.stats-badge .badge-text {
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}
  `;
