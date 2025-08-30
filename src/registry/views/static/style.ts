export default `
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap");

  :root {
    /* New accent-based color system */
    --color-bg-default: #ffffff;
    --color-bg-muted: #f8fafc;
    --color-bg-alt: #f1f5f9;
    --color-bg-hover: #f3f0ff;

    --color-text-default: #22223b;
    --color-text-muted: #64748b;
    --color-text-inverse: #ffffff;

    --color-primary: #7c3aed;
    --color-primary-hover: #5f3dc4;
    /* Secondary accent for informational text (author names, etc.) */
    --color-info: #3b5bdb;

    --color-border-default: #e0e0e0;
    --color-border-muted: #d1d5db;
    --color-border-focus: #5f3dc4;

    --color-warning: #ffe066;
    --color-warning-text: #7c3aed;
    --color-danger: #ffd6d6;
    --color-danger-text: #c92a2a;
    --color-state-border: #e9ecef;

    /* Shadow definitions */
    --shadow-main: 0 2px 8px rgba(60, 60, 100, 0.04);
    --shadow-hover: 0 4px 16px rgba(95, 61, 196, 0.08);
  }

body {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  font-family: "Inter", "Helvetica Neue", Arial, sans-serif;
  background: var(--color-bg-muted);
  color: var(--color-text-default);
  line-height: 1.6;
}

h1,
h2,
h3 {
  color: var(--color-text-default);
  width: 100%;
  font-weight: 600;
  margin-bottom: 0.5em;
}

h1 {
  margin-top: 0;
  color: var(--color-text-default);
  border-bottom: 1px solid var(--color-border-default);
  font-size: 2.5rem;
  letter-spacing: -1px;
  padding-bottom: 0.3em;
}

a {
  color: var(--color-primary);
  text-decoration: none;
  transition: color 0.2s;
}
a:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
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

.code,
.preview {
  width: 100%;
  background: var(--color-bg-default);
  border-radius: 10px;
  box-shadow: var(--shadow-main);
  margin-bottom: 1.5em;
}

.preview {
  height: 600px;
  border: 1px solid var(--color-border-default);
}

.table {
  width: 100%;
}

.w-100 {
  width: 100%;
}

.row {
  background: var(--color-bg-default);
  border: 1px solid var(--color-border-default);
  border-radius: 12px;
  width: 100%;
  display: flex;
  padding: 14px 0px;
  box-sizing: border-box;
  margin-bottom: 8px;
  align-items: center;
  box-shadow: var(--shadow-main);
  transition:
    box-shadow 0.2s,
    border 0.2s;
}

.row.header {
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border-muted) !important;
  font-size: 1.1em;
  font-weight: 600;
  border-radius: 12px 12px 0 0;
  box-shadow: none;
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
  background: var(--color-bg-hover);
  box-shadow: var(--shadow-hover);
  border-color: var(--color-primary-hover);
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
textarea {
  height: 43px;
  font-family: "Inter", Arial, sans-serif;
  border: 1px solid var(--color-border-default);
  margin-bottom: 10px;
  font-size: 1.05rem;
  padding: 10px;
  border-radius: 8px;
  background: var(--color-bg-muted);
  box-sizing: border-box;
  transition: border 0.2s;
}
input[type="text"]:focus,
textarea:focus {
  border: 1.5px solid var(--color-primary);
  outline: none;
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

.author-filter {
  flex: 0 1 30%;
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
}

.states span,
.states .state {
  margin-right: 20px;
}

.states input {
  margin-right: 6px;
}

.details-state span {
  padding: 1px 8px;
  margin-left: 10px;
  font-size: 0.95em;
  font-weight: bold;
  color: var(--color-text-inverse);
  background: var(--color-primary);
  border-radius: 8px;
  white-space: nowrap;
}

.state {
  margin-right: 10px;
  font-size: 0.95em;
  font-weight: bold;
  color: var(--color-text-inverse);
  border-radius: 8px;
  white-space: nowrap;
  padding: 2px 8px;
}

.table .state {
  background: var(--color-primary);
  height: 20px;
}

.component-state-experimental,
.details-state .component-state-experimental,
.table .component-state-experimental {
  background: var(--color-warning);
  color: var(--color-warning-text);
  border: 1px solid var(--color-state-border);
}

.component-state-deprecated,
.details-state .component-state-deprecated,
.table .component-state-deprecated {
  background: var(--color-danger);
  color: var(--color-danger-text);
  border: 1px solid var(--color-state-border);
}

a.tab-link {
  color: var(--color-primary);
  font-weight: 500;
  padding: 0.1em 0.6em;
  border-radius: 8px;
  transition:
    background 0.2s,
    color 0.2s;
  font-size: 1.4rem;
  line-height: 1.2;
  vertical-align: middle;
  display: inline-block;
}

a.tab-link.selected {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  text-decoration: none;
  font-size: 1.5rem;
  line-height: 1.2;
}

.bold {
  font-weight: bold;
}

.hide {
  display: none !important;
}

.box {
  background: var(--color-bg-default);
  border-radius: 14px;
  box-shadow: var(--shadow-main);
  padding: 1.5em 1em;
  margin-bottom: 2em;
}

@media (max-width: 900px) {
  body {
    max-width: 100vw;
    padding: 0 0.5em;
  }
  .filters {
    flex-direction: column;
    gap: 0.5em;
  }
  .row {
    flex-direction: column;
    gap: 0.5em;
    padding: 10px 0;
  }
  .box {
    padding: 1em 0.5em;
      }
  }

  /* History loading states */
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
    border: 2px solid var(--color-border-muted);
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
    border-top: 1px solid var(--color-border-default);
    margin-top: 1em;
  }

  .loading-more::before {
    content: '';
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-border-muted);
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
  `;
