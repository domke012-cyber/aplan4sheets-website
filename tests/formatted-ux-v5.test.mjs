import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const root = path.resolve(import.meta.dirname, '..');
function fixture() {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'tests/fixtures/formatted-ux-v5.html'), 'utf8'), {
    url: 'https://example.test/demo/formatted-ux.html', runScripts: 'outside-only', pretendToBeVisual: true
  });
  const { window } = dom, errors = [];
  window.matchMedia = () => ({ matches: false });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLDialogElement.prototype.show = function () { this.open = true; };
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  window.addEventListener('error', event => errors.push(event.message));
  window.fetch = () => { throw new Error('No live service requests in a sample walkthrough.'); };
  const clock = FakeTimers.withGlobal(window).install();
  for (const script of window.document.querySelectorAll('script[src]')) {
    window.eval(fs.readFileSync(path.resolve(root, 'demo', script.getAttribute('src')), 'utf8'));
  }
  const el = id => window.document.getElementById(id);
  const click = id => el(id).click();
  const target = selector => {
    const actual = Array.from(window.document.querySelectorAll('.fx-next-action'));
    assert.equal(actual.length, selector ? 1 : 0, 'At most one next action, none while busy or complete');
    if (selector) {
      assert.equal(actual[0], window.document.querySelector(selector));
      assert.equal(Boolean(actual[0].disabled), false, 'Never guide to a disabled control');
      assert.ok(el(actual[0].getAttribute('aria-describedby')).textContent.trim());
    }
  };
  const configure = () => { click('fxBrowse'); click('fxDiscover'); click('fxSelectGrid'); click('fxExportGrid'); };
  return { window, clock, el, click, target, configure, async close() { await new Promise(resolve => setTimeout(resolve, 0)); assert.deepEqual(errors, []); clock.uninstall(); window.close(); } };
}

test('Guidance follows the actual app, category, discovery, selection and export actions', async () => {
  const f = fixture(); try {
    f.target('#fxNext'); f.click('fxNext'); f.target('#fxApp > summary');
    assert.equal(f.window.document.activeElement, f.el('fxApp').querySelector('summary'));
    f.el('fxApp').querySelector('summary').click(); await f.clock.tickAsync(0);
    f.target('#fxCategory > summary');
    f.el('fxCategory').querySelector('summary').click(); await f.clock.tickAsync(0);
    f.target('#fxDiscover'); f.click('fxDiscover'); f.target('#fxSelectGrid');
    f.click('fxSelectGrid'); f.target('#fxExportGrid');
    assert.match(f.el('fxUxGuideText').textContent, /Grid selected/);
    assert.equal(f.el('fxSelectGrid').hasAttribute('aria-describedby'), false);
    f.click('fxExportGrid'); f.target('[data-picker="rows"]');
    assert.equal(f.window.document.activeElement, f.window.document.querySelector('[data-picker="rows"]'));
  } finally { await f.close(); }
});

test('Configuration guides optional exploration, creation, Done, and an unprompted completed report', async () => {
  const f = fixture(); try {
    f.configure(); f.window.document.querySelector('[data-picker="rows"]').click();
    f.target('#fxHierarchyToggle'); f.click('fxHierarchyToggle'); f.target('#fxCreate');
    f.el('fxLevels').querySelector('[data-level-only="1"]').click(); f.target('#fxCreate');
    f.click('fxCreate'); f.target(null);
    assert.match(f.el('fxPivotGuideText').textContent, /Creating/);
    await f.clock.tickAsync(500); f.target('#fxCancelConfig');
    assert.match(f.el('fxPivotGuideText').textContent, /Choose Done/);
    f.click('fxCancelConfig'); f.target(null);
    assert.match(f.el('fxGuideLabel').textContent, /Complete/);
    assert.equal(f.window.FormattedUxDemo.snapshot().report.rows.length, 4);
    f.click('fxRepivot'); f.target('[data-picker="rows"]');
    f.click('fxCancelConfig'); f.target(null);
    f.click('fxRestart'); f.target('#fxNext');
  } finally { await f.close(); }
});

test('Search misses and collapsed ancestors never highlight a hidden descendant', async () => {
  const f = fixture(); try {
    f.click('fxBrowse');
    f.el('fxPageSearch').value = 'missing'; f.el('fxPageSearch').dispatchEvent(new f.window.Event('input'));
    f.target('#fxPageSearch'); assert.match(f.el('fxUxGuideText').textContent, /No matching page/);
    f.el('fxPageSearch').value = 'budget'; f.el('fxPageSearch').dispatchEvent(new f.window.Event('input'));
    f.target('#fxDiscover'); f.click('fxDiscover'); f.click('fxSelectGrid');
    f.el('fxCategory').open = false; await f.clock.tickAsync(0); f.target('#fxCategory > summary');
    f.el('fxApp').open = false; await f.clock.tickAsync(0); f.target('#fxApp > summary');
    f.click('fxCloseUx'); f.target('#fxNext');
  } finally { await f.close(); }
});

test('Empty selections and invalid sheet names point to a usable recovery control', async () => {
  const f = fixture(); try {
    f.configure(); f.window.document.querySelector('[data-picker="rows"]').click();
    f.click('fxSelectNone'); f.target('#fxSelectAll'); assert.equal(f.el('fxCreate').disabled, true);
    f.window.document.querySelector('[data-picker="time"]').click(); f.target('[data-picker="rows"]');
    f.window.document.querySelector('[data-picker="rows"]').click(); f.click('fxSelectAll');
    f.click('fxCustomName'); f.el('fxSheetName').value = 'Invalid/name';
    f.el('fxSheetName').dispatchEvent(new f.window.Event('input')); f.click('fxCreate');
    f.target('#fxSheetName'); assert.equal(f.window.FormattedUxDemo.snapshot().busy, false);
  } finally { await f.close(); }
});

test('Restart while creating clears pending completion and restores the first next action', async () => {
  const f = fixture(); try {
    f.configure(); f.click('fxCreate'); f.click('fxRestart'); await f.clock.tickAsync(1000);
    f.target('#fxNext'); assert.equal(f.el('fxPivotDialog').open, false);
    assert.equal(f.window.FormattedUxDemo.snapshot().report, null);
  } finally { await f.close(); }
});
