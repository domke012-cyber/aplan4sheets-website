import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const root = path.resolve(import.meta.dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));
const context = { window: {} };
for (const file of ['budget-review-data-v2.js', 'formatted-ux-data-v1.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets', file), 'utf8'), context);
}
const D = context.window.FormattedUxData;
const additive = ['forecast', 'budget', 'variance'];

function fixture() {
  // Keep the prior shell as a regression fixture while the live demo advances.
  // The stable v2 control IDs are exercised with the original v1 assets.
  const html = fs.readFileSync(path.join(root, 'tests/fixtures/formatted-ux-v2.html'), 'utf8')
    .replaceAll('formatted-ux-data-v2.js', 'formatted-ux-data-v1.js')
    .replaceAll('formatted-ux-v2.js', 'formatted-ux-v1.js')
    .replaceAll('formatted-ux-v2.css', 'formatted-ux-v1.css');
  const dom = new JSDOM(html, {
    url: 'https://example.test/demo/formatted-ux.html', runScripts: 'outside-only', pretendToBeVisual: true
  });
  const { window } = dom, errors = [];
  window.matchMedia = () => ({ matches: false });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event('close')); };
  window.console.error = (...args) => errors.push(args.join(' '));
  window.addEventListener('error', event => errors.push(event.message));
  window.fetch = () => { throw new Error('The fictional workflow must not query an external service.'); };
  const clock = FakeTimers.withGlobal(window).install({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  if (!window.document.querySelector('script[src$="budget-review-data-v2.js"]')) {
    window.eval(fs.readFileSync(path.join(root, 'assets/budget-review-data-v2.js'), 'utf8'));
  }
  for (const script of window.document.querySelectorAll('script[src]')) {
    window.eval(fs.readFileSync(path.resolve(root, 'demo', script.getAttribute('src')), 'utf8'));
  }
  const el = id => window.document.getElementById(id);
  const click = id => { assert.ok(el(id), `Missing #${id}`); el(id).click(); };
  const state = () => plain(window.FormattedUxDemo.snapshot());
  const input = (id, value) => { el(id).value = value; el(id).dispatchEvent(new window.Event('input', { bubbles: true })); };
  const picker = kind => { const button = window.document.querySelector(`[data-picker="${kind}"]`); assert.ok(button); button.click(); };
  const choose = value => { const item = el('fxItems').querySelector(`input[value="${value}"]`); assert.ok(item, `Missing item ${value}`); item.click(); };
  const configure = () => { click('fxOpenPage'); click('fxSelectGrid'); click('fxExportGrid'); assert.equal(state().step, 2); };
  const create = async () => { click('fxCreate'); await clock.tickAsync(500); click('fxDone'); assert.equal(state().step, 3); };
  const cells = id => Array.from(el(id).querySelectorAll('[data-row][data-column]'), cell => ({ row: cell.dataset.row, column: cell.dataset.column, value: cell.dataset.value, format: cell.dataset.format, text: cell.textContent.trim(), classes: Array.from(cell.classList).filter(name => /^fx-(favorable|unfavorable|number|percent)/.test(name)).sort() }));
  return { window, clock, errors, el, click, state, input, picker, choose, configure, create, cells, close() { clock.uninstall(); window.close(); } };
}

test('Formatted UX fixture has a proper expense and executive-owner parent hierarchy', () => {
  assert.equal(D.hierarchy.filter(row => row.parent === null).length, 1);
  assert.equal(D.hierarchy[0].id, 'opex');
  assert.equal(D.hierarchy.filter(row => row.level === 1).length, 5);
  assert.equal(D.hierarchy.filter(row => row.level === 2).length, 13);
  assert.equal(new Set(D.hierarchy.map(row => row.id)).size, D.hierarchy.length);
  for (const row of D.hierarchy.filter(row => row.parent)) {
    const parent = D.hierarchy.find(candidate => candidate.id === row.parent);
    assert.ok(parent, `${row.id} has a known parent`);
    assert.equal(parent.level + 1, row.level);
  }
  assert.deepEqual(plain(D.descendants('opex')).sort(), plain(D.hierarchy.filter(row => row.parent).map(row => row.id)).sort());
  assert.equal(D.owners.filter(owner => owner.parent === null).length, 1);
  assert.equal(D.owners.filter(owner => owner.parent === 'all').length, 3);
});

test('Account, category and root totals reconcile for every owner and period without double counting', () => {
  for (const owner of D.owners) for (const time of D.periods) {
    const report = D.build({ ...D.defaults(), owner: owner.id, time });
    for (const parent of report.rows.filter(row => row.level < 2)) {
      const children = report.rows.filter(row => row.parent === parent.id);
      for (const measure of additive) {
        assert.equal(children.reduce((sum, row) => sum + row.values[measure], 0), parent.values[measure], `${owner.id}/${time}/${parent.id}/${measure}`);
      }
    }
    for (const row of report.rows) {
      assert.equal(row.values.variance, row.values.budget - row.values.forecast);
      assert.equal(row.values.percent, row.values.budget === 0 ? null : row.values.variance / row.values.budget);
    }
    const leaves = report.rows.filter(row => row.level === 2);
    for (const measure of additive) {
      assert.equal(leaves.reduce((sum, row) => sum + row.values[measure], 0), report.root.values[measure]);
    }
    const categoriesOnly = D.build({ ...report.config, rows: D.hierarchy.filter(row => row.level === 1).map(row => row.id) });
    assert.deepEqual(plain(categoriesOnly.root), plain(report.root));
    assert.equal(categoriesOnly.rows.length, 5);
    assert.deepEqual(plain(report.moduleContexts), [{ module: 'Budget Review', owner: owner.id, time }, { module: 'Owner Notes', owner: owner.id, time }]);
  }
});

test('Every account and summary aggregates consistently across executive-owner children', () => {
  for (const time of D.periods) {
    const aggregate = D.build({ ...D.defaults(), time });
    const children = D.owners.filter(owner => owner.parent === 'all').map(owner => D.build({ ...D.defaults(), owner: owner.id, time }));
    for (const row of aggregate.rows) for (const measure of additive) {
      const sum = children.reduce((total, report) => total + report.rows.find(candidate => candidate.id === row.id).values[measure], 0);
      assert.equal(sum, row.values[measure], `${time}/${row.id}/${measure}`);
    }
  }
});

test('Fixture formatting and validation distinguish amounts, rates and favorable expense variance', () => {
  assert.equal(D.format(41500000, 'number'), '41,500');
  assert.equal(D.format(-300000, 'number'), '(300)');
  assert.equal(D.format(-.043478, 'percent'), '(4.3%)');
  assert.equal(D.format(null, 'percent'), '—');
  assert.equal(D.varianceClass(300000), 'fx-favorable');
  assert.equal(D.varianceClass(-300000), 'fx-unfavorable');
  assert.equal(D.varianceClass(0), '');
  for (const changed of [{ rows: [] }, { columns: [] }, { rows: ['unknown'] }, { columns: ['unknown'] }, { rows: ['opex', 'opex'] }, { columns: ['budget', 'budget'] }, { owner: 'unknown' }, { time: 'FY99' }, { sheetName: '' }, { sheetName: 'Bad/Name' }]) {
    assert.throws(() => D.build({ ...D.defaults(), ...changed }));
  }
});

test('UX navigation requires a selected grid, preserves source identity and creates only after explicit action', async () => {
  const f = fixture(); try {
    assert.equal(f.state().step, 0); assert.equal(f.state().report, null);
    f.click('fxOpenPage');
    assert.equal(f.state().step, 1); assert.equal(f.state().selected, false);
    assert.equal(f.el('fxExportGrid').disabled, true);
    f.click('fxExportGrid'); assert.equal(f.state().step, 1);
    f.click('fxSelectGrid'); assert.equal(f.state().selected, true);
    assert.equal(f.el('fxSelectGrid').getAttribute('aria-pressed'), 'true');
    assert.equal(f.el('fxExportGrid').disabled, false);
    f.click('fxClearGrid'); assert.equal(f.state().selected, false); assert.equal(f.el('fxExportGrid').disabled, true);
    f.click('fxSelectGrid'); f.click('fxExportGrid');
    assert.equal(f.state().step, 2); assert.equal(f.state().report, null);
    assert.match(f.el('fxConfigTitle').textContent, /Budget Review by Exec Owner/);
    f.click('fxCreate'); assert.equal(f.state().busy, true); assert.equal(f.state().report, null);
    await f.clock.tickAsync(200); assert.equal(f.state().report, null);
    await f.clock.tickAsync(300);
    assert.equal(f.state().busy, false); assert.equal(f.state().step, 2); assert.equal(f.el('fxDone').hidden, false);
    f.click('fxDone'); assert.equal(f.state().step, 3); assert.ok(f.state().report);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Hierarchy Only This selects exactly a level and cancel discards draft item changes', () => {
  const f = fixture(); try {
    f.configure(); const original = f.state().config;
    f.picker('rows'); assert.equal(f.el('fxPicker').open, true);
    f.click('fxHierarchyToggle'); assert.equal(f.el('fxLevels').hidden, false);
    f.el('fxLevels').querySelector('[data-level-only="1"]').click();
    const selected = Array.from(f.el('fxItems').querySelectorAll('input:checked'), input => input.value);
    const categories = plain(D.hierarchy.filter(row => row.level === 1).map(row => row.id));
    assert.deepEqual(selected.sort(), [...categories].sort());
    assert.deepEqual(f.state().config, original, 'Picker choices are not committed until Apply');
    f.click('fxCancelPicker'); assert.deepEqual(f.state().config, original);
    f.picker('rows'); f.click('fxHierarchyToggle'); f.el('fxLevels').querySelector('[data-level-only="1"]').click(); f.click('fxApplyPicker');
    assert.equal(f.el('fxPicker').open, false); assert.deepEqual([...f.state().config.rows].sort(), [...categories].sort());
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('One Time and Executive Owner selection automatically drives both financial and commentary modules', async () => {
  const f = fixture(); try {
    f.configure();
    f.picker('time'); f.choose('FY26'); f.click('fxApplyPicker');
    f.picker('owner');
    assert.equal(f.el('fxItems').querySelectorAll('input[type="radio"]').length, 4);
    f.choose('product'); assert.equal(f.el('fxItems').querySelectorAll('input:checked').length, 1); f.click('fxApplyPicker');
    assert.equal(f.state().config.time, 'FY26'); assert.equal(f.state().config.owner, 'product');
    assert.match(f.el('fxModuleProof').textContent, /FY26/); assert.match(f.el('fxModuleProof').textContent, /Alex Morgan/);
    await f.create();
    const report = f.state().report;
    assert.deepEqual(report.moduleContexts.map(module => ({ owner: module.owner, time: module.time })), [{ owner: 'product', time: 'FY26' }, { owner: 'product', time: 'FY26' }]);
    assert.ok(report.rows.filter(row => row.comment).every(row => /Alex Morgan plan · FY26:/.test(row.comment)));
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Empty row or column selections cannot be committed, and invalid sheet names cannot create output', () => {
  const f = fixture(); try {
    f.configure(); const original = f.state().config;
    for (const kind of ['rows', 'columns']) {
      f.picker(kind); f.click('fxSelectNone');
      assert.equal(f.el('fxApplyPicker').disabled, true);
      f.click('fxApplyPicker');
      assert.equal(f.el('fxPicker').open, true); assert.deepEqual(f.state().config, original);
      f.click('fxCancelPicker');
    }
    f.input('fxSheetName', ''); assert.equal(f.el('fxCreate').disabled, true);
    f.click('fxCreate'); assert.equal(f.state().report, null);
    f.input('fxSheetName', 'Invalid/Name'); f.click('fxCreate');
    assert.equal(f.state().busy, false); assert.equal(f.state().report, null);
    assert.match(f.el('fxStatus').textContent, /sheet name/i);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Checking a hierarchy parent selects its descendants and collapsing does not change the selection', () => {
  const f = fixture(); try {
    f.configure(); f.picker('rows'); f.click('fxSelectNone'); f.choose('people');
    const expected = ['people', ...plain(D.descendants('people'))].sort();
    assert.deepEqual(Array.from(f.el('fxItems').querySelectorAll('input:checked'), item => item.value).sort(), expected);
    assert.equal(f.el('fxItems').querySelector('input[value="opex"]').indeterminate, true);
    f.el('fxItems').querySelector('[data-expand="people"]').click();
    assert.equal(f.el('fxItems').querySelector('[data-expand="people"]').getAttribute('aria-expanded'), 'false');
    assert.equal(f.el('fxItems').querySelector('input[value="6100"]'), null);
    f.click('fxApplyPicker');
    assert.deepEqual([...f.state().config.rows].sort(), expected);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Exported selected values, number formats and conditional styles match the source comparison', async () => {
  const f = fixture(); try {
    f.configure(); await f.create();
    const sheet = f.cells('fxOutputTable'), source = f.cells('fxCompareTable');
    assert.ok(sheet.length > 0); assert.deepEqual(sheet, source);
    assert.ok(sheet.some(cell => cell.format === 'percent'));
    assert.ok(sheet.some(cell => cell.classes.includes('fx-favorable')));
    assert.ok(sheet.some(cell => cell.classes.includes('fx-unfavorable')));
    assert.ok(f.el('fxOutputTable').querySelector('.fx-forecast-header'));
    assert.ok(f.el('fxOutputTable').querySelector('.fx-selected-header'));
    assert.match(f.el('fxParity').textContent, /format/i);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Turning source formatting off changes presentation, never the selected financial values', async () => {
  const f = fixture(); try {
    f.configure(); await f.create(); const initialReport = f.state().report;
    f.click('fxRepivot'); f.el('fxFormatting').click();
    assert.equal(f.state().config.formatting, false);
    await f.create();
    assert.deepEqual(f.state().report.rows, initialReport.rows);
    assert.deepEqual(f.state().report.columns, initialReport.columns);
    assert.equal(f.el('fxOutputTable').querySelectorAll('.fx-favorable,.fx-unfavorable').length, 0);
    assert.ok(f.el('fxCompareTable').querySelectorAll('.fx-favorable,.fx-unfavorable').length > 0, 'Source comparison retains source styles');
    assert.deepEqual(f.cells('fxOutputTable').map(({ classes, ...cell }) => cell), f.cells('fxCompareTable').map(({ classes, ...cell }) => cell));
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Repivot cancel preserves the committed report and refresh rereads the stable fixture', async () => {
  const f = fixture(); try {
    f.configure(); await f.create(); const committed = f.state().report, html = f.el('fxOutputTable').innerHTML;
    f.click('fxRepivot'); f.picker('owner'); f.choose('commercial'); f.click('fxApplyPicker');
    assert.equal(f.state().config.owner, 'commercial'); assert.deepEqual(f.state().report, committed);
    f.click('fxCancelConfig'); assert.equal(f.state().step, 3); assert.deepEqual(f.state().report, committed);
    assert.equal(f.el('fxOutputTable').innerHTML, html);
    f.click('fxRefresh'); assert.equal(f.state().busy, true);
    await f.clock.tickAsync(500); assert.equal(f.state().busy, false);
    assert.deepEqual(f.state().report, committed); assert.equal(f.el('fxOutputTable').innerHTML, html);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Restart cancels a pending create and prevents a late completion from restoring output', async () => {
  const f = fixture(); try {
    f.configure(); f.click('fxCreate'); await f.clock.tickAsync(100); f.click('fxRestart');
    assert.equal(f.state().step, 0); assert.equal(f.state().busy, false); assert.equal(f.state().report, null);
    await f.clock.tickAsync(1000);
    assert.equal(f.state().step, 0); assert.equal(f.state().report, null); assert.equal(f.el('fxDone').hidden, true);
    assert.equal(f.el('fxOutput').hidden, true); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Page and item searches are functional, while Escape safely cancels the item dialog', () => {
  const f = fixture(); try {
    f.input('fxPageSearch', 'no-such-page'); assert.equal(f.el('fxNoPages').hidden, false);
    assert.equal(f.el('fxApp').hidden, true);
    f.input('fxPageSearch', 'budget'); assert.equal(f.el('fxNoPages').hidden, true); assert.equal(f.el('fxApp').hidden, false);
    f.configure(); const config = f.state().config; f.picker('rows');
    f.input('fxItemSearch', 'cloud');
    const visible = Array.from(f.el('fxItems').querySelectorAll('li')).filter(item => !item.hidden);
    assert.ok(visible.some(item => /Cloud infrastructure/.test(item.textContent)));
    assert.ok(!visible.some(item => /Recruiting/.test(item.textContent)), 'Unrelated account is hidden by search');
    f.el('fxPicker').dispatchEvent(new f.window.Event('cancel', { cancelable: true }));
    assert.equal(f.el('fxPicker').open, false); assert.deepEqual(f.state().config, config);
    assert.equal(f.window.document.activeElement.dataset.picker, 'rows', 'Escape restores focus to the item-selector opener');
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
