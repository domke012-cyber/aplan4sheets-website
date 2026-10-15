import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const root = path.resolve(import.meta.dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));

// JSDOM verifies the workflow state machine, not screen geometry. The actual
// connector/reference screenshot comparison and modal sizing are browser QA.
function fixture() {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'tests/fixtures/formatted-ux-v3.html'), 'utf8'), {
    url: 'https://example.test/demo/formatted-ux.html', runScripts: 'outside-only', pretendToBeVisual: true
  });
  const { window } = dom, errors = [], network = [];
  window.matchMedia = () => ({ matches: false });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLDialogElement.prototype.show = function () { this.open = true; };
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event('close')); };
  window.console.error = (...args) => errors.push(args.join(' '));
  window.addEventListener('error', event => errors.push(event.message));
  window.fetch = (...args) => { network.push(args); throw new Error('The connector-shaped demo must never query a real service.'); };
  const clock = FakeTimers.withGlobal(window).install({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  for (const script of window.document.querySelectorAll('script[src]')) {
    window.eval(fs.readFileSync(path.resolve(root, 'demo', script.getAttribute('src')), 'utf8'));
  }
  const el = id => window.document.getElementById(id);
  const click = id => { assert.ok(el(id), `Missing #${id}`); el(id).click(); };
  const state = () => plain(window.FormattedUxDemo.snapshot());
  const input = (id, value) => { el(id).value = value; el(id).dispatchEvent(new window.Event('input', { bubbles: true })); };
  const picker = kind => {
    const button = window.document.querySelector(`[data-picker="${kind}"]`);
    assert.ok(button, `Missing ${kind} dimension chip`); button.click();
  };
  const choose = value => {
    const item = el('fxItems').querySelector(`input[value="${value}"]`);
    assert.ok(item, `Missing ${value} item`); item.click();
  };
  const browse = () => { click('fxBrowse'); assert.equal(el('fxUxDialog').open, true); };
  const configure = () => {
    browse(); click('fxPage'); click('fxSelectGrid'); click('fxExportGrid');
    assert.equal(el('fxPivotDialog').open, true); assert.equal(state().step, 2);
  };
  const create = async () => {
    click('fxCreate'); await clock.tickAsync(1000);
    assert.equal(state().ready, true); click('fxCancelConfig');
    assert.equal(state().step, 3); assert.equal(el('fxPivotDialog').open, false);
  };
  const cancel = id => el(id).dispatchEvent(new window.Event('cancel', { cancelable: true }));
  const cells = id => Array.from(el(id).querySelectorAll('td[data-row][data-column]'), cell => ({
    row: cell.dataset.row, column: cell.dataset.column, value: cell.dataset.value,
    format: cell.dataset.format, text: cell.textContent.trim(),
    classes: Array.from(cell.classList).filter(name => /^fx-(favorable|unfavorable|number|percent)/.test(name)).sort()
  }));
  const clean = () => { assert.deepEqual(errors, []); assert.deepEqual(network, []); };
  return { window, clock, errors, network, el, click, state, input, picker, choose, browse, configure, create, cancel, cells, clean, close() { clock.uninstall(); window.close(); } };
}

test('V3 loads connector-shaped dialogs and an inline item selector without an invented Apply Selection popup', () => {
  const f = fixture(); try {
    const scripts = Array.from(f.window.document.querySelectorAll('script[src]'), script => script.getAttribute('src'));
    assert.ok(scripts.includes('../assets/formatted-ux-v3.js'));
    assert.ok(scripts.includes('../assets/formatted-ux-data-v2.js'), 'The already-audited fictional financial snapshot is reused');
    assert.equal(f.el('fxUxDialog').tagName, 'DIALOG');
    assert.equal(f.el('fxPivotDialog').tagName, 'DIALOG');
    assert.notEqual(f.el('fxPicker').tagName, 'DIALOG');
    assert.equal(f.el('fxApplyPicker'), null);
    assert.equal(f.el('fxCancelPicker'), null);
    assert.equal(f.el('fxPicker').closest('#fxPivotDialog'), f.el('fxPivotDialog'));
    assert.equal(f.el('fxUxDialog').open, false); assert.equal(f.el('fxPivotDialog').open, false);
    assert.equal(f.state().report, null); f.clean();
  } finally { f.close(); }
});

test('Browse UX dialog has functional search, close, reopen and directory refresh', () => {
  const f = fixture(); try {
    f.browse(); f.input('fxPageSearch', 'no-such-page');
    assert.equal(f.el('fxNoPages').hidden, false); assert.equal(f.el('fxApp').hidden, true);
    f.input('fxPageSearch', 'budget');
    assert.equal(f.el('fxNoPages').hidden, true); assert.equal(f.el('fxApp').hidden, false);
    f.click('fxRefreshDirectory');
    assert.equal(f.el('fxUxDialog').open, true); assert.equal(f.state().report, null);
    f.click('fxCloseUx'); assert.equal(f.el('fxUxDialog').open, false);
    f.browse(); f.cancel('fxUxDialog'); assert.equal(f.el('fxUxDialog').open, false);
    assert.equal(f.window.document.activeElement, f.el('fxBrowse'));
    f.clean();
  } finally { f.close(); }
});

test('UX discovery previews are schema-only, and a selected combined grid is required before Configure Pivot', () => {
  const f = fixture(); try {
    f.browse(); f.click('fxPage');
    assert.equal(f.el('fxExportGrid').disabled, true);
    f.click('fxExportGrid'); assert.equal(f.el('fxPivotDialog').open, false);
    f.click('fxDiscover');
    const preview = f.el('fxSourceTable');
    assert.ok(preview.querySelectorAll('thead th').length > 0);
    assert.equal(preview.querySelectorAll('[data-value]').length, 0, 'A discovery preview is not a fetched financial snapshot');
    assert.ok(Array.from(preview.querySelectorAll('tbody td')).every(cell => cell.textContent.trim() === ''));
    assert.doesNotMatch(preview.textContent, /\$[\d,]+/);
    f.click('fxSelectGrid'); assert.equal(f.state().selected, true);
    assert.equal(f.el('fxExportGrid').disabled, false);
    f.click('fxExportGrid'); assert.equal(f.el('fxPivotDialog').open, true);
    assert.equal(f.el('fxUxDialog').open, false);
    f.clean();
  } finally { f.close(); }
});

test('Clicking the thumbnail body selects the same combined grid as its heading button', () => {
  const f = fixture(); try {
    f.browse(); f.click('fxPage');
    assert.equal(f.state().selected, false);
    const blankCell = f.el('fxSourceTable').querySelector('tbody td');
    assert.ok(blankCell); blankCell.click();
    assert.equal(f.state().selected, true);
    assert.equal(f.el('fxSelectGrid').getAttribute('aria-pressed'), 'true');
    assert.equal(f.el('fxExportGrid').disabled, false);
    f.click('fxClearGrid'); assert.equal(f.state().selected, false);
    assert.equal(f.el('fxExportGrid').disabled, true);
    f.click('fxSelectGrid'); assert.equal(f.state().selected, true);
    f.click('fxExportGrid'); assert.equal(f.el('fxPivotDialog').open, true);
    f.clean();
  } finally { f.close(); }
});

test('Inline hierarchy checks immediately edit the configuration but never create a Sheet', () => {
  const f = fixture(); try {
    f.configure(); f.picker('rows');
    f.click('fxSelectNone'); assert.deepEqual(f.state().config.rows, []);
    assert.equal(f.el('fxCreate').disabled, true);
    f.choose('headcount');
    const expected = ['headcount', ...plain(f.window.FormattedUxData.descendants('headcount'))].sort();
    assert.deepEqual([...f.state().config.rows].sort(), expected);
    assert.equal(f.state().report, null); assert.equal(f.el('fxCreate').disabled, false);
    assert.equal(f.el('fxItems').querySelector('input[value="opex"]').indeterminate, true);
    f.click('fxHierarchyToggle');
    f.el('fxLevels').querySelector('[data-level-only="1"]').click();
    assert.deepEqual([...f.state().config.rows].sort(), ['headcount', 'controllable', 'nonControllable', 'otherSpend'].sort());
    f.click('fxSelectDefault');
    assert.deepEqual(f.state().config.rows, plain(f.window.FormattedUxData.defaults().rows));
    f.clean();
  } finally { f.close(); }
});

test('Hierarchy level buttons expose all, none and exact-level state through aria-pressed', () => {
  const f = fixture(); try {
    f.configure(); f.picker('rows'); f.click('fxHierarchyToggle');
    const levelButton = (action, level) => f.el('fxLevels').querySelector(`[data-level-${action}="${level}"]`);
    const pressed = (action, level) => levelButton(action, level).getAttribute('aria-pressed');
    for (const level of [0, 1, 2]) {
      assert.equal(pressed('add', level), 'true');
      assert.equal(pressed('remove', level), 'false');
      assert.equal(pressed('only', level), 'false');
    }
    f.click('fxSelectNone');
    for (const level of [0, 1, 2]) assert.equal(pressed('remove', level), 'true');
    levelButton('only', 1).click();
    assert.equal(pressed('only', 1), 'true'); assert.equal(pressed('add', 1), 'true');
    assert.equal(pressed('remove', 0), 'true'); assert.equal(pressed('remove', 2), 'true');
    assert.equal(levelButton('only', 1).classList.contains('active'), true);
    levelButton('add', 0).click();
    assert.equal(pressed('only', 1), 'false', 'Adding a second level clears the exact-level indicator');
    assert.equal(pressed('add', 0), 'true'); assert.equal(pressed('add', 1), 'true');
    levelButton('remove', 1).click();
    assert.equal(pressed('only', 0), 'true'); assert.deepEqual(f.state().config.rows, ['opex']);
    f.clean();
  } finally { f.close(); }
});

test('Inline Time and Executive Owner each remain a single shared value for both module regions', async () => {
  const f = fixture(); try {
    f.configure(); f.picker('time'); f.choose('Jun26');
    assert.equal(f.state().config.time, 'Jun26');
    f.picker('owner'); f.choose('operations');
    assert.equal(f.state().config.owner, 'operations');
    assert.equal(f.el('fxItems').querySelectorAll('input:checked').length, 1);
    assert.ok(f.el('fxItems').textContent.includes('All Executive Owners'));
    assert.match(f.el('fxModuleProof').textContent, /Jun26/);
    assert.match(f.el('fxModuleProof').textContent, /Casey Rivera/);
    await f.create();
    assert.equal(f.state().report.moduleContexts.length, 2);
    assert.ok(f.state().report.moduleContexts.every(module => module.time === 'Jun26' && module.owner === 'operations'));
    f.clean();
  } finally { f.close(); }
});

test('Time hierarchy uses nonselectable year and quarter navigation groups with only two valid month choices', async () => {
  const f = fixture(); try {
    f.configure(); f.picker('time');
    const items = f.el('fxItems');
    assert.deepEqual(Array.from(items.querySelectorAll('input'), input => input.value), ['Jun26', 'Sep26']);
    assert.deepEqual(Array.from(items.querySelectorAll('.fx-tree-group'), group => group.textContent.trim()), ['FY26', 'Q2 FY26', 'Q3 FY26']);
    for (const id of ['FY26', 'Q2FY26', 'Q3FY26']) assert.equal(items.querySelector(`input[value="${id}"]`), null);
    assert.match(f.el('fxPickerCount').textContent, /1 of 2 selected/);
    assert.match(f.el('fxPickerHelp').textContent, /navigation groups/);
    items.querySelector('[data-expand="FY26"]').click();
    assert.equal(items.querySelectorAll('input').length, 0);
    assert.equal(f.state().config.time, 'Sep26', 'Collapsing the calendar must not change the selected period');
    items.querySelector('[data-expand="FY26"]').click();
    f.choose('Jun26'); assert.equal(f.state().config.time, 'Jun26');
    f.input('fxItemSearch', 'Sep');
    assert.deepEqual(Array.from(items.querySelectorAll('.fx-tree-group'), group => group.textContent.trim()), ['FY26', 'Q3 FY26']);
    assert.equal(items.querySelector('input[value="Jun26"]'), null);
    assert.ok(items.querySelector('input[value="Sep26"]'));
    assert.equal(f.state().config.time, 'Jun26', 'Searching only changes visibility, not the shared filter');
    f.input('fxItemSearch', ''); await f.create();
    assert.ok(f.state().report.moduleContexts.every(module => module.time === 'Jun26'));
    f.clean();
  } finally { f.close(); }
});

test('Create keeps the actual progress/completion pattern: disabled Create remains, Cancel becomes Done', async () => {
  const f = fixture(); try {
    f.configure(); f.click('fxCreate');
    assert.equal(f.state().busy, true); assert.equal(f.state().report, null);
    assert.equal(f.el('fxCreate').disabled, true);
    await f.clock.tickAsync(100); assert.equal(f.state().report, null);
    await f.clock.tickAsync(900);
    assert.equal(f.state().busy, false); assert.equal(f.state().ready, true);
    assert.equal(f.el('fxCreate').disabled, true); assert.equal(f.el('fxCreate').hidden, false);
    assert.match(f.el('fxCancelConfig').textContent, /Done/i);
    assert.equal(f.el('fxPivotDialog').open, true);
    const complete = f.state().report;
    f.click('fxCreate'); assert.deepEqual(f.state().report, complete);
    f.click('fxCancelConfig');
    assert.equal(f.el('fxPivotDialog').open, false); assert.equal(f.state().step, 3);
    assert.deepEqual(f.state().report, complete); f.clean();
  } finally { f.close(); }
});

test('Config cancel and close discard inline edits while preserving the committed report', async () => {
  const f = fixture(); try {
    f.configure(); await f.create(); const committed = f.state().report;
    f.click('fxRepivot'); f.picker('owner'); f.choose('commercial');
    assert.equal(f.state().config.owner, 'commercial'); assert.deepEqual(f.state().report, committed);
    f.click('fxCancelConfig');
    assert.equal(f.el('fxPivotDialog').open, false); assert.deepEqual(f.state().report, committed);
    assert.deepEqual(f.state().config, committed.config);
    f.click('fxRepivot'); f.picker('time'); f.choose('Jun26'); f.click('fxClosePivot');
    assert.equal(f.el('fxPivotDialog').open, false); assert.deepEqual(f.state().config, committed.config);
    f.click('fxRepivot'); f.picker('rows'); f.click('fxSelectNone'); f.cancel('fxPivotDialog');
    assert.equal(f.el('fxPivotDialog').open, false); assert.deepEqual(f.state().config, committed.config);
    f.clean();
  } finally { f.close(); }
});

test('Source comparison remains separate from schema discovery and matches the committed exported snapshot', async () => {
  const f = fixture(); try {
    f.configure(); await f.create();
    assert.deepEqual(f.cells('fxOutputTable'), f.cells('fxCompareTable'));
    assert.equal(f.cells('fxOutputTable').filter(cell => cell.column !== 'comment').length, 22 * 11);
    assert.equal(f.el('fxCompareTable').closest('details').open, false, 'Source comparison is an explicit optional reveal');
    assert.equal(f.el('fxSourceTable').querySelectorAll('[data-value]').length, 0);
    assert.equal(f.el('fxOutputTable').querySelectorAll('tbody .fx-section-heading').length, 4);
    assert.match(f.el('fxOutputTable').querySelector('tbody tr:last-child').textContent, /Total Expense/);
    const salary = f.el('fxOutputTable').querySelector('td[data-row="salaries"][data-column="ytdActual"] button');
    salary.click(); assert.equal(f.el('fxCell').textContent, 'L9');
    assert.match(f.el('fxFormula').textContent, /22430000/);
    f.clean();
  } finally { f.close(); }
});

test('Column changes preserve financial parity and dashboard settings never strip the source formatting', async () => {
  const f = fixture(); try {
    f.configure(); f.picker('columns'); f.click('fxSelectNone');
    assert.equal(f.el('fxCreate').disabled, true);
    for (const id of ['qtdActual', 'qtdVariance', 'ytdActual']) f.choose(id);
    assert.deepEqual(f.state().config.columns, ['qtdActual', 'qtdVariance', 'ytdActual']);
    await f.create(); const report = f.state().report;
    assert.deepEqual(report.columns.map(column => column.id), ['qtdActual', 'qtdVariance', 'ytdActual']);
    assert.deepEqual(f.cells('fxOutputTable'), f.cells('fxCompareTable'));
    f.click('fxRepivot'); f.el('fxFormatting').click();
    for (const id of ['fxAutoFitRows', 'fxFreezeHeaders', 'fxHideGridlines']) assert.equal(f.el(id).checked, false);
    await f.create();
    assert.deepEqual(f.state().report.rows, report.rows);
    assert.ok(f.el('fxOutputTable').querySelectorAll('td.fx-favorable,td.fx-unfavorable').length > 0);
    assert.ok(f.el('fxCompareTable').querySelectorAll('td.fx-favorable,td.fx-unfavorable').length > 0);
    assert.ok(f.el('fxOutputTable').querySelector('.fx-financial-header'));
    assert.deepEqual(f.cells('fxOutputTable'), f.cells('fxCompareTable'));
    f.clean();
  } finally { f.close(); }
});

test('Hide zeros retains rows with commentary and refresh preserves that saved all-data-cell rule', async () => {
  const f = fixture(); try {
    f.configure();
    if (!f.el('fxHideZeros').checked) f.el('fxHideZeros').click();
    await f.create();
    assert.ok(f.el('fxOutputTable').querySelector('tbody tr[data-row="capitalizedSoftware"]'), 'Nonempty commentary means this is not an all-zero/blank data row');
    const committed = f.state().report;
    f.click('fxRefresh'); await f.clock.tickAsync(1000);
    assert.deepEqual(f.state().report, committed);
    assert.ok(f.el('fxOutputTable').querySelector('tbody tr[data-row="capitalizedSoftware"]'));
    f.click('fxRepivot'); assert.equal(f.el('fxHideZeros').checked, true);
    f.clean();
  } finally { f.close(); }
});

test('Hide zeros removes an actually empty data row without recalculating its source subtotal', async () => {
  const f = fixture(); try {
    // Inject only an empty comment in the local test fixture. Every original
    // published sample account has commentary, including its zero-valued row.
    const build = f.window.FormattedUxData.build;
    f.window.FormattedUxData.build = config => {
      const result = build(config);
      result.rows.find(row => row.id === 'capitalizedSoftware').comment = '';
      return result;
    };
    f.configure();
    const expected = plain(f.window.FormattedUxData.build(f.state().config)).rows.find(row => row.id === 'nonControllable').values;
    f.el('fxHideZeros').click(); await f.create();
    assert.equal(f.el('fxOutputTable').querySelector('tbody tr[data-row="capitalizedSoftware"]'), null);
    assert.deepEqual(f.state().report.rows.find(row => row.id === 'nonControllable').values, expected);
    assert.deepEqual(f.cells('fxOutputTable'), f.cells('fxCompareTable'));
    f.clean();
  } finally { f.close(); }
});

test('Individual dashboard settings and Keep formatting persist through Create, Refresh and Repivot', async () => {
  const f = fixture(); try {
    f.configure(); f.el('fxAutoFitRows').click();
    assert.equal(f.el('fxFormatting').indeterminate, true);
    assert.equal(f.el('fxDashboardState').textContent, 'Custom');
    if (!f.el('fxKeepFormatting').checked) f.el('fxKeepFormatting').click();
    for (const id of ['fxMergeHeaders', 'fxGroupSetup', 'fxGroupHierarchy']) assert.equal(f.el(id).disabled, true, 'Reference-only options must not pretend to execute');
    await f.create();
    assert.equal(f.state().report.config.dashboard.autoFitRows, false);
    assert.equal(f.state().report.config.dashboard.freezeHeaders, true);
    assert.equal(f.state().report.config.keepFormatting, true);
    assert.equal(f.el('fxOutputTable').classList.contains('fx-auto-fit'), false);
    assert.equal(f.el('fxOutputTable').classList.contains('fx-freeze-headers'), true);
    const saved = f.state().report;
    f.click('fxRefresh'); await f.clock.tickAsync(1000); assert.deepEqual(f.state().report, saved);
    f.click('fxRepivot');
    assert.equal(f.el('fxAutoFitRows').checked, false); assert.equal(f.el('fxFreezeHeaders').checked, true);
    assert.equal(f.el('fxKeepFormatting').checked, true);
    f.clean();
  } finally { f.close(); }
});

test('Custom Sheet Name is opt-in; blank falls back, invalid names block, and literal text is escaped', async () => {
  const f = fixture(); try {
    f.configure();
    assert.equal(f.el('fxCustomName').checked, false);
    assert.equal(f.state().config.sheetName, 'Budget Review');
    f.el('fxCustomName').click(); f.input('fxSheetName', '');
    assert.equal(f.el('fxCreate').disabled, false);
    await f.create(); assert.equal(f.state().report.config.sheetName, 'Budget Review');
    const defaultReport = f.state().report;
    f.click('fxRepivot');
    f.input('fxSheetName', 'Bad/Name'); f.click('fxCreate');
    assert.equal(f.state().busy, false); assert.deepEqual(f.state().report, defaultReport);
    assert.match(f.el('fxStatus').textContent, /sheet name/i);
    const literal = '<img src=x onerror=alert(1)>';
    f.input('fxSheetName', literal); await f.create();
    assert.equal(f.el('fxOutputTable').querySelector('img'), null);
    assert.ok(f.el('fxOutputTable').textContent.includes(literal));
    assert.ok(f.el('fxTabName').textContent.includes(literal));
    f.clean();
  } finally { f.close(); }
});

test('Selection search preserves edits and keyboard focus within the inline hierarchy', () => {
  const f = fixture(); try {
    f.configure(); f.picker('rows'); f.input('fxItemSearch', 'salar');
    assert.ok(f.el('fxItems').querySelector('input[value="salaries"]'));
    assert.equal(f.el('fxItems').querySelector('input[value="software"]'), null);
    const salary = f.el('fxItems').querySelector('input[value="salaries"]');
    salary.focus(); salary.click();
    assert.equal(f.window.document.activeElement.value, 'salaries');
    assert.ok(!f.state().config.rows.includes('salaries'));
    f.input('fxItemSearch', '');
    assert.equal(f.el('fxItems').querySelector('input[value="salaries"]').checked, false);
    f.clean();
  } finally { f.close(); }
});

test('Restart cancels pending creation, closes both dialogs and clears local output', async () => {
  const f = fixture(); try {
    f.configure(); f.click('fxCreate'); await f.clock.tickAsync(100);
    f.click('fxRestart'); await f.clock.tickAsync(1000);
    assert.equal(f.state().report, null); assert.equal(f.state().busy, false); assert.equal(f.state().ready, false);
    assert.equal(f.el('fxUxDialog').open, false); assert.equal(f.el('fxPivotDialog').open, false);
    assert.equal(f.state().step, 0); assert.equal(f.state().selected, false);
    assert.equal(f.el('fxOutputTable').querySelectorAll('td[data-value]').length, 0);
    f.clean();
  } finally { f.close(); }
});
