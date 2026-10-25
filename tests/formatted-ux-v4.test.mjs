import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const root = path.resolve(import.meta.dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));
const canonical = {
  rows: ['rows', 'rowsM2'],
  columns: ['columns', 'columnsM2'],
  pages: ['time', 'owner', 'gaap', 'versions']
};

function fixture() {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'tests/fixtures/formatted-ux-v4.html'), 'utf8'), {
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
  window.fetch = (...args) => { network.push(args); throw new Error('The layout preview must never query real services.'); };
  const clock = FakeTimers.withGlobal(window).install({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  for (const script of window.document.querySelectorAll('script[src]')) {
    window.eval(fs.readFileSync(path.resolve(root, 'demo', script.getAttribute('src')), 'utf8'));
  }
  const el = id => window.document.getElementById(id);
  const click = id => { assert.ok(el(id), `Missing #${id}`); el(id).click(); };
  const state = () => plain(window.FormattedUxDemo.snapshot());
  const chip = id => window.document.querySelector(`.fx-chip-wrap[data-chip-id="${id}"]`);
  const zone = axis => window.document.querySelector(`[data-axis-zone="${axis}"]`);
  const button = id => window.document.querySelector(`[data-move-chip="${id}"]`);
  const domLayout = () => Object.fromEntries(Object.keys(canonical).map(axis => [axis, Array.from(zone(axis).querySelectorAll('.fx-chip-list .fx-chip-wrap'), node => node.dataset.chipId)]));
  const moveMenu = id => { assert.ok(button(id), `Missing move button for ${id}`); button(id).click(); assert.equal(el('fxChipMoveMenu').hidden, false); };
  const setAxis = axis => { el('fxChipAxis').value = axis; el('fxChipAxis').dispatchEvent(new window.Event('change', { bubbles: true })); };
  const picker = kind => window.document.querySelector(`[data-picker="${kind}"]`).click();
  const choose = value => { const input = el('fxItems').querySelector(`input[value="${value}"]`); assert.ok(input, `Missing selectable ${value}`); input.click(); };
  const configure = () => { click('fxBrowse'); click('fxPage'); click('fxSelectGrid'); click('fxExportGrid'); assert.equal(el('fxPivotDialog').open, true); };
  const finish = async () => { await clock.tickAsync(1000); assert.equal(state().ready, true); click('fxCancelConfig'); assert.equal(state().step, 3); };
  const create = async () => { click('fxCreate'); await finish(); };
  const transfer = (initial = {}) => {
    const values = new Map(Object.entries(initial));
    return { effectAllowed: 'all', dropEffect: 'none', setData: (type, value) => values.set(type, value), getData: type => values.get(type) || '', clearData: () => values.clear(), get types() { return [...values.keys()]; } };
  };
  const dragEvent = (node, type, dataTransfer) => {
    const event = new window.Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer }); node.dispatchEvent(event); return event;
  };
  const drag = (id, target) => {
    const source = chip(id), data = transfer();
    dragEvent(source, 'dragstart', data); dragEvent(target, 'dragover', data); dragEvent(target, 'drop', data); dragEvent(source, 'dragend', data);
  };
  const clean = () => { assert.deepEqual(errors, []); assert.deepEqual(network, []); };
  return { window, clock, el, click, state, chip, zone, button, domLayout, moveMenu, setAxis, picker, choose, configure, finish, create, transfer, dragEvent, drag, clean, close() { clock.uninstall(); window.close(); } };
}

test('V4 has eight uniquely identified movable chips and discloses its fixed-output layout preview', () => {
  const f = fixture(); try {
    const scripts = Array.from(f.window.document.querySelectorAll('script[src]'), script => script.getAttribute('src'));
    assert.ok(scripts.includes('../assets/formatted-ux-v4.js'));
    assert.equal(f.window.document.querySelector('link[rel="stylesheet"][href*="formatted-ux"]').getAttribute('href'), '../assets/formatted-ux-v4.css');
    f.configure(); assert.deepEqual(f.state().layout, canonical); assert.deepEqual(f.domLayout(), canonical);
    const wrappers = Array.from(f.window.document.querySelectorAll('.fx-chip-wrap[data-chip-id]'));
    assert.equal(wrappers.length, 8); assert.equal(new Set(wrappers.map(node => node.dataset.chipId)).size, 8);
    for (const node of wrappers) { assert.equal(node.draggable, true); assert.ok(f.button(node.dataset.chipId)); }
    assert.match(f.button('time').getAttribute('aria-label'), /Rearrange Time/i);
    assert.match(f.el('fxLayoutNote').textContent, /preview only/i);
    assert.match(f.el('fxLayoutNote').textContent, /Create Pivot uses the Budget Review layout/i);
    assert.equal(f.el('fxChipMoveMenu').hidden, true); f.clean();
  } finally { f.close(); }
});

test('Move controls append across axes and reorder earlier/later without mutating data selections', () => {
  const f = fixture(); try {
    f.configure(); const config = f.state().config;
    f.moveMenu('time'); assert.equal(f.el('fxChipAxis').value, 'pages');
    f.setAxis('rows');
    assert.deepEqual(f.state().layout.rows, ['rows', 'rowsM2', 'time']);
    assert.deepEqual(f.state().layout.pages, ['owner', 'gaap', 'versions']);
    assert.equal(f.el('fxChipLater').disabled, true);
    f.click('fxChipEarlier'); assert.deepEqual(f.state().layout.rows, ['rows', 'time', 'rowsM2']);
    f.click('fxChipEarlier'); assert.deepEqual(f.state().layout.rows, ['time', 'rows', 'rowsM2']);
    assert.equal(f.el('fxChipEarlier').disabled, true);
    f.click('fxChipLater'); assert.deepEqual(f.state().layout.rows, ['rows', 'time', 'rowsM2']);
    assert.deepEqual(f.domLayout(), f.state().layout); assert.deepEqual(f.state().config, config);
    f.click('fxChipMoveClose'); assert.equal(f.el('fxChipMoveMenu').hidden, true);
    assert.equal(f.window.document.activeElement, f.button('time'));
    f.moveMenu('owner'); assert.equal(f.button('owner').getAttribute('aria-expanded'), 'true');
    f.el('fxChipMoveMenu').dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    assert.equal(f.el('fxChipMoveMenu').hidden, true); assert.equal(f.el('fxPivotDialog').open, true);
    assert.equal(f.button('owner').getAttribute('aria-expanded'), 'false');
    assert.equal(f.window.document.activeElement, f.button('owner')); f.clean();
  } finally { f.close(); }
});

test('Internal drag-and-drop moves a chip across axes and inserts before a target chip', () => {
  const f = fixture(); try {
    f.configure(); const config = f.state().config;
    f.drag('time', f.zone('columns'));
    assert.deepEqual(f.state().layout.columns, ['columns', 'columnsM2', 'time']);
    assert.deepEqual(f.state().layout.pages, ['owner', 'gaap', 'versions']);
    f.drag('versions', f.chip('owner'));
    assert.deepEqual(f.state().layout.pages, ['versions', 'owner', 'gaap']);
    f.drag('columnsM2', f.chip('columns'));
    assert.deepEqual(f.state().layout.columns, ['columnsM2', 'columns', 'time']);
    const beforeSelfDrop = f.state().layout;
    f.drag('time', f.chip('time')); assert.deepEqual(f.state().layout, beforeSelfDrop, 'Dropping on the source chip is a no-op');
    assert.deepEqual(f.domLayout(), f.state().layout);
    assert.deepEqual(Object.values(f.state().layout).flat().sort(), Object.values(canonical).flat().sort());
    assert.deepEqual(f.state().config, config); f.clean();
  } finally { f.close(); }
});

test('External drops and drag payloads after dragend cannot rearrange internal chips', () => {
  const f = fixture(); try {
    f.configure();
    const external = f.transfer({ 'text/plain': 'time', 'application/x-a4s-chip': 'time', 'text/html': '<div data-chip-id="time">Time</div>' });
    f.dragEvent(f.zone('rows'), 'dragover', external); f.dragEvent(f.zone('rows'), 'drop', external);
    assert.deepEqual(f.state().layout, canonical);
    const internal = f.transfer();
    f.dragEvent(f.chip('owner'), 'dragstart', internal); f.dragEvent(f.chip('owner'), 'dragend', internal);
    f.dragEvent(f.zone('rows'), 'drop', internal); assert.deepEqual(f.state().layout, canonical);
    assert.deepEqual(f.domLayout(), canonical); f.clean();
  } finally { f.close(); }
});

test('Linked Time and Owner selections still work after their singular chips move', async () => {
  const f = fixture(); try {
    f.configure(); f.moveMenu('time'); f.setAxis('rows'); f.click('fxChipMoveClose');
    f.moveMenu('owner'); f.setAxis('columns'); f.click('fxChipMoveClose');
    assert.equal(f.window.document.querySelectorAll('[data-chip-id="time"]').length, 1);
    assert.equal(f.window.document.querySelectorAll('[data-chip-id="owner"]').length, 1);
    f.picker('time'); f.choose('Jun26'); f.picker('owner'); f.choose('product');
    assert.equal(f.state().config.time, 'Jun26'); assert.equal(f.state().config.owner, 'product');
    assert.match(f.el('fxModuleProof').textContent, /Jun26/); assert.match(f.el('fxModuleProof').textContent, /Alex Morgan/);
    assert.deepEqual(f.state().layout.rows, ['rows', 'rowsM2', 'time']);
    assert.deepEqual(f.state().layout.columns, ['columns', 'columnsM2', 'owner']);
    await f.create();
    assert.ok(f.state().report.moduleContexts.every(context => context.time === 'Jun26' && context.owner === 'product'));
    assert.deepEqual(f.state().layout, canonical); f.clean();
  } finally { f.close(); }
});

test('Create resets preview positions and produces the unchanged configured Budget Review report', async () => {
  const f = fixture(); try {
    f.configure(); f.picker('rows'); f.click('fxHierarchyToggle');
    f.el('fxLevels').querySelector('[data-level-only="1"]').click();
    const config = f.state().config;
    const expected = plain(f.window.FormattedUxData.build(config));
    f.moveMenu('rows'); f.setAxis('columns');
    assert.notDeepEqual(f.state().layout, canonical); assert.deepEqual(f.state().config, config);
    f.click('fxCreate'); assert.deepEqual(f.state().layout, canonical);
    assert.equal(f.el('fxChipMoveMenu').hidden, true); await f.finish();
    assert.deepEqual(f.state().report.rows, expected.rows); assert.deepEqual(f.state().report.columns, expected.columns);
    assert.equal(Object.hasOwn(f.state().report.config, 'layout'), false);
    assert.equal(f.el('fxOutputTable').querySelectorAll('tbody .fx-summary').length, 4);
    assert.equal(f.el('fxOutputTable').querySelectorAll('td[data-row][data-column="qtdActual"]').length, 4);
    f.click('fxRepivot'); assert.deepEqual(f.state().layout, canonical); assert.deepEqual(f.state().config.rows, config.rows);
    f.clean();
  } finally { f.close(); }
});

test('Reset layout preserves item choices while Cancel, Repivot and Restart restore canonical positions', async () => {
  const f = fixture(); try {
    f.configure(); f.picker('time'); f.choose('Jun26'); const configured = f.state().config;
    f.moveMenu('time'); f.setAxis('rows'); f.click('fxResetLayout');
    assert.deepEqual(f.state().layout, canonical); assert.deepEqual(f.state().config, configured);
    assert.equal(f.el('fxChipMoveMenu').hidden, true);
    await f.create(); const report = f.state().report;
    f.click('fxRepivot'); f.moveMenu('owner'); f.setAxis('columns'); f.click('fxCancelConfig');
    assert.deepEqual(f.state().layout, canonical); assert.deepEqual(f.state().report, report);
    f.click('fxRepivot'); assert.deepEqual(f.domLayout(), canonical);
    f.moveMenu('rowsM2'); f.setAxis('pages'); f.click('fxRestart');
    assert.deepEqual(f.state().layout, canonical); assert.deepEqual(f.domLayout(), canonical);
    assert.equal(f.state().report, null); assert.equal(f.el('fxChipMoveMenu').hidden, true); f.clean();
  } finally { f.close(); }
});

test('Busy and completed states disable movement and reject drag attempts until a fresh edit session', async () => {
  const f = fixture(); try {
    f.configure(); f.moveMenu('time'); f.setAxis('rows'); f.click('fxCreate');
    assert.equal(f.state().busy, true); assert.deepEqual(f.state().layout, canonical);
    const verifyLocked = () => {
      for (const id of Object.values(canonical).flat()) { assert.equal(f.chip(id).draggable, false); assert.equal(f.button(id).disabled, true); }
      for (const id of ['fxChipAxis', 'fxChipEarlier', 'fxChipLater', 'fxChipMoveClose']) assert.equal(f.el(id).disabled, true, `${id} must be disabled during creation or completion`);
      f.drag('time', f.zone('rows')); assert.deepEqual(f.state().layout, canonical);
    };
    verifyLocked(); await f.clock.tickAsync(1000);
    assert.equal(f.state().ready, true); verifyLocked();
    f.click('fxCancelConfig'); f.click('fxRepivot');
    assert.equal(f.state().ready, false);
    for (const id of Object.values(canonical).flat()) assert.equal(f.chip(id).draggable, true);
    f.moveMenu('time'); f.setAxis('columns'); assert.deepEqual(f.state().layout.columns, ['columns', 'columnsM2', 'time']);
    f.clean();
  } finally { f.close(); }
});
