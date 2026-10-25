import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const legacyDemos = ['pivot', 'discovery', 'multi-module', 'ux-formatting', 'schedule', 'setup', 'oauth-setup', 'marketplace-install', 'nested-selections'];

// Run the real scene functions without media or wall-clock waits. The existing
// demos.test.mjs separately exercises the complete player/pause/audio lifecycle.
function createDemo(name) {
  const html = fs.readFileSync(path.join(root, 'demo', name + '.html'), 'utf8');
  const dom = new JSDOM(html, { url: `https://example.test/demo/${name}.html`, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  const previews = [];
  window.matchMedia = () => ({ matches: false });
  class SceneHarness {
    constructor(config) { Object.assign(this, config); window.sceneHarness = this; }
    mount() { this.reset(); }
    wait() {
      const preview = window.document.querySelector('.discovery-pivot-preview');
      if (preview) previews.push(preview.textContent);
      return Promise.resolve();
    }
    typeText(element, text) { element.textContent = text; return Promise.resolve(); }
  }
  window.DemoPlayer = SceneHarness;
  for (const script of window.document.querySelectorAll('script')) {
    const src = script.getAttribute('src');
    if (/demo-player(?:-v2)?\.js$/.test(src || '')) continue;
    if (src) window.eval(fs.readFileSync(path.resolve(root, 'demo', src), 'utf8'));
    else window.eval(script.textContent);
  }
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return {
    window, document: window.document, previews,
    async run() { for (const action of window.sceneHarness.actions) await action(); },
    close() { window.close(); }
  };
}

function row(document, index) {
  return [...document.querySelectorAll('#gridTable tbody tr')].find(tr => tr.querySelector('.row-header')?.textContent === String(index));
}
function value(document, r, c) { return row(document, r).cells[c + 1].textContent; }
function numeric(text) { return Number(text.replace(/,/g, '').replace(/^\((.*)\)$/, '-$1')); }

test('All legacy walkthroughs opt into the versioned realistic shell without replacing layout checkpoints', () => {
  for (const name of legacyDemos) {
    const html = fs.readFileSync(path.join(root, 'demo', name + '.html'), 'utf8');
    assert.match(html, /demo-responsive-v2\.css/, name);
    assert.match(html, /demo-realism-v3\.css/, name);
    assert.match(html, /demo-realism-v3\.js" defer/, name);
  }
});

test('Shell is visibly illustrative, has spreadsheet chrome, and selected cells update the formula bar', async () => {
  const d = createDemo('pivot');
  try {
    await d.run();
    assert.equal(d.document.querySelectorAll('.demo-simulation-label').length, 1);
    assert.match(d.document.querySelector('.demo-simulation-label').textContent, /Fictional sample data.*No live connection/);
    assert.match(d.document.querySelector('.sheet-menu-preview').textContent, /Extensions/);
    assert.equal(d.document.querySelectorAll('.sheet-format-preview').length, 1);
    assert.ok(d.document.querySelector('.doc-icon svg'));
    const cell = row(d.document, 10).cells[4]; // D10: Q2 Gross Margin
    cell.dataset.formula = '=D7+D9';
    cell.click();
    assert.equal(d.document.getElementById('cellRef').textContent, 'D10');
    assert.equal(d.document.getElementById('formulaText').textContent, '=D7+D9');
    assert.ok(cell.classList.contains('demo-selected-cell'));
  } finally { d.close(); }
});

test('Pivot dimensions, selection counts, headers, coordinates and data-cell count agree', async () => {
  const d = createDemo('pivot');
  try {
    await d.run();
    assert.match(d.document.getElementById('colsDims').textContent, /Time5\/24/);
    assert.doesNotMatch(d.document.getElementById('colsDims').textContent, /Versions/);
    assert.match(d.document.getElementById('pagesDims').textContent, /FY26 Open Forecast/);
    assert.match(d.document.getElementById('rowsDims').textContent, /6\/48/);
    assert.equal(value(d.document, 6, 2), 'Q1 FY26');
    assert.equal(value(d.document, 6, 6), 'FY26 Total');
    assert.equal(value(d.document, 2, 1), 'Versions');
    assert.equal(value(d.document, 7, 0), ''); // Reserved column A
    assert.equal(d.document.querySelectorAll('#gridTable td.num').length, 30);
    assert.match(d.document.getElementById('pivotDetail').textContent, /30 data cells/);
    assert.equal(value(d.document, 10, 3), '10,087,000');
    assert.equal(d.document.getElementById('cellRef').textContent, 'D10');
    for (let r = 7; r <= 12; r++) {
      const quarters = [2, 3, 4, 5].map(c => numeric(value(d.document, r, c)));
      assert.equal(quarters.reduce((a, b) => a + b, 0), numeric(value(d.document, r, 6)), `Row ${r} totals reconcile`);
    }
  } finally { d.close(); }
});

test('Discovery visibly reviews automatically linked context and reports its actual output size', async () => {
  const d = createDemo('discovery');
  try {
    await d.run();
    assert.ok(d.previews.some(text => /Time · Sep 26/.test(text) && /Executive Owner · Avery Morgan/.test(text) && /linked automatically/.test(text)));
    assert.match(d.document.getElementById('sidebarContent').textContent, /8 rows × 9 data columns/);
    assert.equal(value(d.document, 2, 2), 'Sep 26');
    assert.equal(value(d.document, 3, 2), 'Avery Morgan');
    assert.equal(value(d.document, 6, 10), 'Comment');
    assert.equal(value(d.document, 7, 1), 'Salaries');
    assert.equal(value(d.document, 14, 1), 'Controllable Total');
    assert.equal(value(d.document, 7, 3), '990,000');
    assert.equal(d.document.getElementById('cellRef').textContent, 'D7');
    assert.doesNotMatch(d.document.body.textContent, /Kyle Triplett|Matt Baird|Lisa Horner|Loaded in 1\.4s|26 rows × 17/);
  } finally { d.close(); }
});

test('UX formatting applies hierarchy to labels without restyling row numbers or column A', async () => {
  const d = createDemo('ux-formatting');
  try {
    await d.run();
    const detail = d.document.getElementById('row3');
    assert.equal(detail.cells[0].className, 'row-header');
    assert.equal(detail.cells[0].textContent, '7');
    assert.equal(detail.cells[1].className, 'sheet-gutter');
    assert.equal(detail.cells[2].className, 'ux-detail');
    assert.match(detail.cells[2].textContent, /Existing subscriptions/);
    assert.equal(d.document.getElementById('row15').cells[2].className, 'ux-total');
    assert.equal(value(d.document, 19, 1), 'Gross Profit');
    assert.equal(d.document.getElementById('cellRef').textContent, 'B19');
    for (const cell of d.document.querySelectorAll('#gridTable .row-header')) assert.doesNotMatch(cell.className, /ux-/);
    assert.match(d.document.body.textContent, /Chart · Preview only/);
  } finally { d.close(); }
});

test('Combined report retains shared context and headcount/variance totals reconcile', async () => {
  const d = createDemo('multi-module');
  try {
    await d.run();
    assert.equal(value(d.document, 2, 2), 'Sep 26');
    assert.equal(value(d.document, 3, 2), 'FY26 Open Forecast');
    assert.match(d.document.body.textContent, /Shared page filters linked automatically/);
    assert.equal(d.document.querySelectorAll('#gridTable td.secondary').length, 8);
    assert.equal(value(d.document, 14, 1), 'All Executive Owners');
    for (let r = 7; r <= 14; r++) {
      assert.equal(numeric(value(d.document, r, 2)) + numeric(value(d.document, r, 3)) + numeric(value(d.document, r, 4)), numeric(value(d.document, r, 5)));
    }
    for (const c of [2, 3, 4, 5, 7]) {
      const total = Array.from({ length: 7 }, (_, i) => numeric(value(d.document, i + 7, c).replace('—', '0'))).reduce((a, b) => a + b, 0);
      assert.equal(total, numeric(value(d.document, 14, c)));
    }
    assert.equal(value(d.document, 8, 7), '-2');
    assert.equal(d.document.getElementById('cellRef').textContent, 'H8');
  } finally { d.close(); }
});

test('Schedule uses owner-scoped approximate timing and visibly updates a reconciled fictional report', async () => {
  const d = createDemo('schedule');
  try {
    const before = value(d.document, 7, 2);
    await d.run();
    assert.equal(before, '58,740,000');
    assert.equal(value(d.document, 7, 2), '58,800,000');
    assert.equal(value(d.document, 11, 2), '13,635,000');
    assert.match(d.document.body.textContent, /saved owner's access/);
    assert.match(d.document.body.textContent, /approximately one hour later/);
    assert.match(d.document.body.textContent, /approximately 8:00 AM/);
    const source = fs.readFileSync(path.join(root, 'demo/schedule.html'), 'utf8');
    assert.doesNotMatch(source, /Starting at/);
    assert.match(source, /Schedule Name/);
    assert.match(source, /demo\.owner@example\.invalid/);
  } finally { d.close(); }
});
