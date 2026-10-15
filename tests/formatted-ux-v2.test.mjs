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
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/formatted-ux-data-v2.js'), 'utf8'), context);
const D = context.window.FormattedUxData;
const additive = ['qtdActual', 'qtdForecast', 'qtdVariance', 'qtdPyActual', 'qtdGrowth', 'ytdActual', 'ytdBudget', 'ytdVariance'];

function fixture() {
  // The historic v2 HTML is intentionally frozen: v3 changes the actual
  // connector shell, not the financial/source-style guarantees covered here.
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'tests/fixtures/formatted-ux-v2.html'), 'utf8'), {
    url: 'https://example.test/demo/formatted-ux.html', runScripts: 'outside-only', pretendToBeVisual: true
  });
  const { window } = dom, errors = [];
  window.matchMedia = () => ({ matches: false });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event('close')); };
  window.console.error = (...args) => errors.push(args.join(' '));
  window.addEventListener('error', event => errors.push(event.message));
  window.fetch = () => { throw new Error('Reference-style demo must not query a real service.'); };
  const clock = FakeTimers.withGlobal(window).install({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  for (const script of window.document.querySelectorAll('script[src]')) {
    window.eval(fs.readFileSync(path.resolve(root, 'demo', script.getAttribute('src')), 'utf8'));
  }
  const el = id => window.document.getElementById(id);
  const click = id => { assert.ok(el(id), `Missing #${id}`); el(id).click(); };
  const state = () => plain(window.FormattedUxDemo.snapshot());
  const picker = kind => window.document.querySelector(`[data-picker="${kind}"]`).click();
  const choose = value => { const item = el('fxItems').querySelector(`input[value="${value}"]`); assert.ok(item, `Missing ${value}`); item.click(); };
  const input = (id, value) => { el(id).value = value; el(id).dispatchEvent(new window.Event('input', { bubbles: true })); };
  const configure = () => { click('fxOpenPage'); click('fxSelectGrid'); click('fxExportGrid'); assert.equal(state().step, 2); };
  const create = async () => { click('fxCreate'); await clock.tickAsync(500); click('fxDone'); assert.equal(state().step, 3); };
  const cells = id => Array.from(el(id).querySelectorAll('td[data-row][data-column]'), cell => ({ row: cell.dataset.row, column: cell.dataset.column, value: cell.dataset.value, format: cell.dataset.format, text: cell.textContent.trim(), classes: Array.from(cell.classList).filter(name => /^fx-(favorable|unfavorable|number|percent)/.test(name)).sort() }));
  return { window, clock, errors, el, click, state, picker, choose, input, configure, create, cells, close() { clock.uninstall(); window.close(); } };
}

test('V2 models the reference QTD, prior-year and YTD groups with fictional hierarchical detail', () => {
  assert.deepEqual(plain(D.periods), ['Sep26', 'Jun26']);
  assert.deepEqual(plain(D.columns.map(column => column.id)), ['qtdActual', 'qtdForecast', 'qtdVariance', 'qtdAttainment', 'qtdPyActual', 'qtdGrowth', 'qtdGrowthPercent', 'ytdActual', 'ytdBudget', 'ytdVariance', 'ytdAttainment']);
  assert.equal(D.hierarchy.filter(row => row.parent === null).length, 1);
  assert.equal(D.hierarchy.filter(row => row.level === 1).length, 4);
  assert.equal(D.hierarchy.filter(row => row.level === 2).length, 17);
  assert.equal(new Set(D.hierarchy.map(row => row.id)).size, 22);
  assert.equal(D.defaults().time, 'Sep26');
  for (const row of D.hierarchy.filter(row => row.parent)) {
    const parent = D.hierarchy.find(candidate => candidate.id === row.parent);
    assert.ok(parent); assert.equal(parent.level + 1, row.level);
  }
});

test('V2 amounts reconcile through accounts, categories and owner children without summing percentages', () => {
  for (const time of D.periods) {
    const reports = D.owners.map(owner => D.build({ ...D.defaults(), owner: owner.id, time }));
    const aggregate = reports[0], children = reports.slice(1);
    for (const report of reports) {
      for (const parent of report.rows.filter(row => row.level < 2)) {
        const childRows = report.rows.filter(row => row.parent === parent.id);
        for (const field of additive) assert.equal(childRows.reduce((sum, row) => sum + row.values[field], 0), parent.values[field], `${report.owner}/${time}/${parent.id}/${field}`);
      }
      for (const row of report.rows) {
        const v = row.values;
        for (const field of additive) assert.equal(Math.abs(v[field] % 1000), 0, `${row.id}/${field} fits displayed thousands`);
        assert.equal(v.qtdVariance, v.qtdActual - v.qtdForecast);
        assert.equal(v.qtdGrowth, v.qtdActual - v.qtdPyActual);
        assert.equal(v.ytdVariance, v.ytdActual - v.ytdBudget);
        assert.equal(v.qtdAttainment, v.qtdForecast === 0 ? null : v.qtdActual / v.qtdForecast);
        assert.equal(v.qtdGrowthPercent, v.qtdPyActual === 0 ? null : v.qtdGrowth / v.qtdPyActual);
        assert.equal(v.ytdAttainment, v.ytdBudget === 0 ? null : v.ytdActual / v.ytdBudget);
      }
    }
    for (const row of aggregate.rows) for (const field of additive) {
      assert.equal(children.reduce((sum, report) => sum + report.rows.find(candidate => candidate.id === row.id).values[field], 0), row.values[field], `${time}/${row.id}/${field} owner rollup`);
    }
  }
});

test('Sep YTD contains Q1–Q3 and Jun YTD contains Q1–Q2 rather than a scaled current quarter', () => {
  for (const owner of D.owners) {
    const june = D.build({ ...D.defaults(), owner: owner.id, time: 'Jun26' });
    const september = D.build({ ...D.defaults(), owner: owner.id, time: 'Sep26' });
    for (const row of september.rows) {
      assert.equal(row.values.ytdActual, june.rows.find(candidate => candidate.id === row.id).values.ytdActual + row.values.qtdActual, `${owner.id}/${row.id}`);
    }
  }
  const june = D.build({ ...D.defaults(), time: 'Jun26' }).rows.find(row => row.id === 'salaries').values;
  const september = D.build(D.defaults()).rows.find(row => row.id === 'salaries').values;
  assert.equal(june.qtdActual, 7510000); assert.equal(september.qtdActual, 7680000);
  assert.equal(september.qtdForecast, 7890000); assert.equal(september.qtdPyActual, 7050000);
  assert.equal(june.ytdActual, 7240000 + 7510000); assert.equal(september.ytdActual, 7240000 + 7510000 + 7680000);
  assert.equal(june.ytdBudget, 14980000); assert.equal(september.ytdBudget, 22800000);
  assert.notEqual(september.ytdActual, september.qtdActual * 3);
});

test('Reference-style money uses dollar thousands with minus signs and zero denominators remain blank rates', () => {
  assert.equal(D.format(1234000, D.columns[0].format), '$1,234');
  assert.equal(D.format(-1234000, D.columns[0].format), '-$1,234');
  assert.equal(D.format(-.125, 'percent'), '-12.5%');
  assert.equal(D.format(null, 'percent'), '-');
  assert.equal(D.varianceClass(-1000), 'fx-favorable');
  assert.equal(D.varianceClass(1000), 'fx-unfavorable');
  assert.equal(D.varianceClass(.9, 'attainment'), 'fx-favorable');
  assert.equal(D.varianceClass(1.1, 'attainment'), 'fx-unfavorable');
  assert.equal(D.varianceClass(1, 'attainment'), '');
  for (const owner of D.owners) for (const time of D.periods) {
    const zero = D.build({ ...D.defaults(), owner: owner.id, time }).rows.find(row => row.id === 'capitalizedSoftware').values;
    for (const field of ['qtdAttainment', 'qtdGrowthPercent', 'ytdAttainment']) assert.equal(zero[field], null);
  }
  for (const invalid of [{ rows: [] }, { columns: [] }, { owner: 'unknown' }, { time: 'FY27' }, { rows: ['unknown'] }, { columns: ['unknown'] }, { sheetName: 'bad/name' }]) assert.throws(() => D.build({ ...D.defaults(), ...invalid }));
});

test('V2 source styles use white body cells and foreground-only variance colors with orange emphasis headers', () => {
  const css = fs.readFileSync(path.join(root, 'assets/formatted-ux-v2.css'), 'utf8');
  const dom = new JSDOM('<style>' + css.replace(/@import[^;]+;/g, '') + '</style>');
  try {
    const rules = Array.from(dom.window.document.styleSheets[0].cssRules).filter(rule => rule.selectorText);
    for (const kind of ['favorable', 'unfavorable']) {
      const color = rules.find(rule => rule.selectorText.includes(`tbody td.fx-${kind}`));
      assert.ok(color); assert.equal(color.style.getPropertyValue('background'), '#fff');
      assert.equal(color.style.getPropertyValue('color'), `var(--fx-${kind}-text)`);
    }
    const body = rules.find(rule => rule.selectorText.split(',').map(selector => selector.trim()).includes('.fx-data-table tbody td'));
    assert.equal(body.style.getPropertyValue('background'), '#fff'); assert.equal(body.style.getPropertyValue('color'), '#000');
    for (const id of ['qtdForecast', 'ytdActual']) {
      const column = D.columns.find(candidate => candidate.id === id);
      const header = rules.find(rule => rule.selectorText.includes('th.' + column.className) && rule.style.getPropertyValue('color') === 'var(--fx-selected-fg)');
      assert.ok(header, `${id} has an explicit orange-on-blue v2 header override`);
      assert.equal(header.style.getPropertyValue('background'), 'var(--fx-header-bg)');
    }
    const spacer = rules.find(rule => rule.selectorText.includes('td.fx-spacer'));
    assert.equal(spacer.style.getPropertyValue('width'), '12px'); assert.equal(spacer.style.getPropertyValue('background'), '#fff');
  } finally { dom.window.close(); }
});

test('The archived v2 page loads v2 assets and preserves explicit grid selection and asynchronous create gating', async () => {
  const f = fixture(); try {
    const scripts = Array.from(f.window.document.querySelectorAll('script[src]'), script => script.getAttribute('src'));
    assert.ok(scripts.includes('../assets/formatted-ux-data-v2.js')); assert.ok(scripts.includes('../assets/formatted-ux-v2.js'));
    assert.ok(!scripts.includes('../assets/formatted-ux-data-v1.js'));
    f.click('fxOpenPage'); assert.equal(f.el('fxExportGrid').disabled, true);
    f.click('fxSelectGrid'); f.click('fxExportGrid'); assert.equal(f.state().step, 2);
    assert.match(f.el('fxColumnsCount').textContent, /11\s*\/\s*11/);
    f.click('fxCreate'); assert.equal(f.state().busy, true); assert.equal(f.state().report, null);
    await f.clock.tickAsync(200); assert.equal(f.state().report, null);
    await f.clock.tickAsync(300); assert.equal(f.state().step, 2); assert.equal(f.el('fxDone').hidden, false);
    f.click('fxDone'); assert.equal(f.state().step, 3); assert.equal(f.state().report.time, 'Sep26');
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Hierarchy-only selection and linked filters preserve one owner and period across both module regions', async () => {
  const f = fixture(); try {
    f.configure(); f.picker('rows'); f.click('fxHierarchyToggle');
    f.el('fxLevels').querySelector('[data-level-only="1"]').click(); f.click('fxApplyPicker');
    assert.deepEqual([...f.state().config.rows].sort(), plain(D.hierarchy.filter(row => row.level === 1).map(row => row.id)).sort());
    f.picker('time'); f.choose('Jun26'); f.click('fxApplyPicker');
    f.picker('owner'); f.choose('operations'); f.click('fxApplyPicker');
    await f.create(); const report = f.state().report;
    assert.equal(report.rows.length, 4);
    assert.ok(report.moduleContexts.every(module => module.owner === 'operations' && module.time === 'Jun26'));
    assert.equal(report.moduleContexts.length, 2);
    assert.equal(f.el('fxOutputTable').querySelectorAll('tbody .fx-summary').length, 4);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Source-to-Sheet parity retains grouped columns, blank section headings, subtotals and bottom Total Expense', async () => {
  const f = fixture(); try {
    f.configure(); await f.create();
    const source = f.cells('fxCompareTable'), sheet = f.cells('fxOutputTable');
    assert.deepEqual(sheet, source); assert.ok(sheet.length > 0);
    const financial = sheet.filter(cell => cell.column !== 'comment');
    assert.equal(financial.length, 22 * 11);
    assert.equal(new Set(financial.map(cell => cell.row + '/' + cell.column)).size, financial.length, 'Category heading does not duplicate numeric subtotal values');
    for (const id of ['fxSourceTable', 'fxOutputTable', 'fxCompareTable']) {
      const table = f.el(id), headings = table.querySelectorAll('tbody .fx-section-heading');
      assert.equal(headings.length, 4); assert.equal(table.querySelectorAll('tbody .fx-summary').length, 4);
      for (const heading of headings) assert.equal(heading.querySelectorAll('td[data-value]').length, 0, 'Section headings are labels, not duplicate financial rows');
      assert.match(table.querySelector('tbody tr:last-child').textContent, /Total Expense/i);
      assert.equal(table.querySelectorAll('thead .fx-spacer').length, 3);
      assert.ok(table.querySelector('th[data-column="qtdForecast"]'));
      assert.ok(table.querySelector('th[data-column="ytdActual"]'));
    }
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Conditional foreground styles affect only QTD variance and attainment, with raw values available in the formula bar', async () => {
  const f = fixture(); try {
    f.configure(); await f.create();
    const styled = Array.from(f.el('fxOutputTable').querySelectorAll('td.fx-favorable,td.fx-unfavorable'));
    assert.ok(styled.length > 0);
    assert.ok(styled.every(cell => ['qtdVariance', 'qtdAttainment'].includes(cell.dataset.column)));
    for (const cell of styled) {
      const value = Number(cell.dataset.value), kind = cell.dataset.column === 'qtdAttainment' ? 'attainment' : 'variance';
      assert.ok(cell.classList.contains(D.varianceClass(value, kind)));
    }
    const salary = f.el('fxOutputTable').querySelector('td[data-row="salaries"][data-column="qtdActual"]');
    salary.querySelector('button').click();
    assert.match(f.el('fxFormula').textContent, /7680000/);
    assert.equal(f.el('fxCell').textContent, 'C9', 'Blank section heading occupies physical row 8');
    assert.equal(f.el('fxOutputTable').querySelector('td[data-row="salaries"][data-column="ytdActual"] button').dataset.address, 'L9', 'Formula coordinates include both inter-group spacer columns');
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Column subsets, formatting-off and source comparison retain exactly the same financial snapshot', async () => {
  const f = fixture(); try {
    f.configure(); f.picker('columns'); f.click('fxSelectNone');
    assert.equal(f.el('fxApplyPicker').disabled, true);
    for (const id of ['qtdActual', 'qtdVariance', 'ytdActual']) f.choose(id);
    f.click('fxApplyPicker'); await f.create(); const report = f.state().report;
    assert.deepEqual(report.columns.map(column => column.id), ['qtdActual', 'qtdVariance', 'ytdActual']);
    assert.equal(f.el('fxOutputTable').querySelectorAll('thead .fx-spacer').length, 2, 'A subset only inserts its visible group boundary and commentary separator');
    assert.deepEqual(f.cells('fxOutputTable'), f.cells('fxCompareTable'));
    f.click('fxRepivot'); f.el('fxFormatting').click(); await f.create();
    assert.deepEqual(f.state().report.rows, report.rows);
    assert.equal(f.el('fxOutputTable').querySelectorAll('td.fx-favorable,td.fx-unfavorable').length, 0);
    assert.ok(f.el('fxCompareTable').querySelectorAll('td.fx-favorable,td.fx-unfavorable').length > 0);
    assert.deepEqual(f.cells('fxOutputTable').map(({ classes, ...value }) => value), f.cells('fxCompareTable').map(({ classes, ...value }) => value));
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Repivot cancel, stable refresh and pending-work restart never overwrite the committed configuration unexpectedly', async () => {
  const f = fixture(); try {
    f.configure(); await f.create(); const committed = f.state().report;
    f.click('fxRepivot'); f.picker('owner'); f.choose('commercial'); f.click('fxApplyPicker');
    f.click('fxCancelConfig'); assert.deepEqual(f.state().report, committed);
    f.click('fxRefresh'); await f.clock.tickAsync(500); assert.deepEqual(f.state().report, committed);
    f.click('fxRepivot'); f.click('fxCreate'); await f.clock.tickAsync(100); f.click('fxRestart');
    await f.clock.tickAsync(1000); assert.equal(f.state().report, null); assert.equal(f.state().busy, false); assert.equal(f.state().step, 0);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Expanding the report area hides and restores navigation without changing any data or configuration', async () => {
  const f = fixture(); try {
    f.configure(); await f.create(); const state = f.state(), content = f.el('fxOutputTable').innerHTML;
    const workspace = f.window.document.querySelector('.fx-workspace');
    assert.equal(workspace.classList.contains('expanded'), false);
    f.click('fxExpand');
    assert.equal(workspace.classList.contains('expanded'), true);
    assert.equal(f.el('fxExpand').getAttribute('aria-pressed'), 'true');
    assert.equal(f.el('fxExpand').textContent, 'Show UX navigation');
    assert.deepEqual(f.state(), state); assert.equal(f.el('fxOutputTable').innerHTML, content);
    f.click('fxExpand');
    assert.equal(workspace.classList.contains('expanded'), false);
    assert.equal(f.el('fxExpand').getAttribute('aria-pressed'), 'false');
    assert.equal(f.el('fxExpand').textContent, 'Expand report area');
    assert.deepEqual(f.state(), state); assert.equal(f.el('fxOutputTable').innerHTML, content);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Invalid names cannot create output through either create control, and valid text is safely escaped', async () => {
  const f = fixture(); try {
    f.configure(); f.input('fxSheetName', '');
    assert.equal(f.el('fxCreate').disabled, true);
    f.click('fxNext'); assert.equal(f.state().busy, false); assert.equal(f.state().report, null);
    f.input('fxSheetName', 'Bad/Name'); f.click('fxCreate');
    assert.equal(f.state().busy, false); assert.equal(f.state().report, null); assert.match(f.el('fxStatus').textContent, /sheet name/i);
    const safeName = '<img src=x onerror=alert(1)>';
    f.input('fxSheetName', safeName); await f.create();
    assert.equal(f.el('fxOutputTable').querySelector('img'), null);
    assert.ok(f.el('fxOutputTable').textContent.includes(safeName));
    assert.ok(f.el('fxTabName').textContent.includes(safeName));
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Search, empty-selection guards and Escape remain usable with the larger hierarchy', () => {
  const f = fixture(); try {
    f.configure(); const original = f.state().config; f.picker('rows');
    f.click('fxSelectNone'); assert.equal(f.el('fxApplyPicker').disabled, true);
    f.click('fxCancelPicker'); assert.deepEqual(f.state().config, original);
    f.picker('rows'); f.input('fxItemSearch', 'salar');
    assert.ok(f.el('fxItems').textContent.toLowerCase().includes('salary') || f.el('fxItems').textContent.toLowerCase().includes('salaries'));
    f.el('fxPicker').dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    assert.equal(f.el('fxPicker').open, false); assert.deepEqual(f.state().config, original);
    assert.equal(f.window.document.activeElement.dataset.picker, 'rows');
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
