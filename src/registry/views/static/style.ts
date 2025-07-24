export default `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

body {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
  background: #f8fafc;
  color: #22223b;
  line-height: 1.6;
}

h1, h2, h3 {
  color: #5f3dc4;
  width: 100%;
  font-weight: 600;
  margin-bottom: 0.5em;
}

h1 {
  margin-top: 0;
  color: #22223b;
  border-bottom: 1px solid #e0e0e0;
  font-size: 2.5rem;
  letter-spacing: -1px;
  padding-bottom: 0.3em;
}

a {
  color: #5f3dc4;
  text-decoration: none;
  transition: color 0.2s;
}
a:hover {
  color: #7c3aed;
  text-decoration: underline;
}

#components-list a:hover {
  text-decoration: none;
}

p {
  margin-top: 0;
}

.back {
  width: 100%;
  margin-top: -20px;
  margin-bottom: 1.5em;
  display: block;
  color: #64748b;
  font-size: 0.95em;
}

.code,
.preview {
  width: 100%;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(60,60,100,0.04);
  margin-bottom: 1.5em;
}

.preview {
  height: 300px;
  border: 1px solid #e0e0e0;
}

.table {
  width: 100%;
}

.w-100 {
  width: 100%;
}

.row {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  width: 100%;
  display: flex;
  padding: 14px 0px;
  box-sizing: border-box;
  margin-bottom: 8px;
  align-items: center;
  box-shadow: 0 2px 8px rgba(60,60,100,0.04);
  transition: box-shadow 0.2s, border 0.2s;
}

.row.header {
  background: #f1f5f9;
  border: 1px solid #d1d5db !important;
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
  transition: box-shadow 0.2s, background 0.2s;
}

.componentRow:hover {
  background: #f3f0ff;
  box-shadow: 0 4px 16px rgba(95,61,196,0.08);
  border-color: #b197fc;
}

.componentRow .title .name {
  font-weight: bold;
  font-size: 1.15rem;
  margin: 0;
  width: 100%;
  color: #22223b;
}

.componentRow .release {
  font-size: 1rem;
  margin: 0;
  width: 100%;
  color: #5f3dc4;
}

.componentRow .title .description {
  padding: 0;
  font-size: 0.98rem;
  color: #64748b;
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
  color: #5f3dc4;
  font-weight: bold;
  margin-right: 10px;
}

input[type=text],
textarea {
  height: 43px;
  font-family: 'Inter', Arial, sans-serif;
  border: 1px solid #b197fc;
  margin-bottom: 10px;
  font-size: 1.05rem;
  padding: 10px;
  border-radius: 8px;
  background: #f8fafc;
  box-sizing: border-box;
  transition: border 0.2s;
}
input[type=text]:focus,
textarea:focus {
  border: 1.5px solid #7c3aed;
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
  color: #3b5bdb;
}

#href {
  height: 60px;
}

.states {
  width: 100%;
  margin-bottom: 30px;
  display: flex;
  align-items: center;
  gap: 1em;
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
  color: #fff;
  background: #5f3dc4;
  border-radius: 8px;
  white-space: nowrap;
}

.state {
  margin-right: 10px;
  font-size: 0.95em;
  font-weight: bold;
  color: #fff;
  border-radius: 8px;
  white-space: nowrap;
  padding: 2px 8px;
}

.table .state {
  background: #5f3dc4;
  height: 20px;
}

.component-state-experimental,
.details-state .component-state-experimental,
.table .component-state-experimental {
  background: #ffe066;
  color: #7c3aed;
  border: 1px solid #e9ecef;
}

.component-state-deprecated,
.details-state .component-state-deprecated,
.table .component-state-deprecated {
  background: #ffd6d6;
  color: #c92a2a;
  border: 1px solid #e9ecef;
}

a.tab-link {
  color: #5f3dc4;
  font-weight: 500;
  padding: 0.1em 0.6em;
  border-radius: 8px;
  transition: background 0.2s, color 0.2s;
  font-size: 1.4rem;
  line-height: 1.2;
  vertical-align: middle;
  display: inline-block;
}

a.tab-link.selected {
  background: #5f3dc4;
  color: #fff;
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
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(60,60,100,0.04);
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
`;
