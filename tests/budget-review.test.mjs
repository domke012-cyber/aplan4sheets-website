import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';
const root = path.resolve(import.meta.dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/budget-review-data-v1.js'), 'utf8'), context);
const D = context.window.BudgetReviewData;
const config = (version = 'FY27 Budget', rows = D.categories.map(r => r.id)) => ({ version, rows, columns: [...D.recommendedColumns], merge: true });
const plain = value => JSON.parse(JSON.stringify(value));

test('One dataset reconciles exported rows, totals, chart and version changes', () => {
  for (const [version, expected] of [['FY27 Budget', 41700000], ['Q4 Forecast', 41500000]]) {
    const report = D.buildReport(config(version)), chart = D.chartData(report);
    assert.equal(chart.prior, 37800000); assert.equal(chart.current, expected);
    assert.equal(chart.difference, expected - 37800000);
    for (const i of [0, 1, 2]) assert.equal(report.total.values[i], report.rows.reduce((sum, r) => sum + r.values[i], 0));
    assert.ok(Math.abs(report.total.values[3] - chart.difference / chart.prior) < 1e-12);
    assert.equal(chart.rows.reduce((sum, r) => sum + r.current, 0), chart.current);
  }
});
test('Filtered-row totals recalculate percent from numerator and denominator', () => {
  const report = D.buildReport(config('FY27 Budget', ['software', 'travel']));
  assert.equal(report.total.values[0], 7200000); assert.equal(report.total.values[1], 8250000);
  assert.ok(Math.abs(report.total.values[3] - 1050000 / 7200000) < 1e-12);
  assert.notEqual(report.total.values[3], report.rows.reduce((sum, r) => sum + r.values[3], 0) / 2);
  assert.equal(D.format(D.buildReport(config()).rows.find(r=>r.id==='facilities').values[3], 'percent'), '6.3%');
});
test('Reports are independent snapshots and invalid combinations fail closed', () => {
  const c = config(), report = D.buildReport(c); c.version = 'Q4 Forecast'; c.rows.pop(); c.columns.pop();
  assert.equal(report.version, 'FY27 Budget'); assert.equal(report.rows.length, 5); assert.equal(report.columns.length, 4);
  for (const bad of [{version:'Actuals'}, {rows:[]}, {columns:[]}, {rows:['unknown']}, {columns:['FY30|version']}, {rows:['people','people']}, {columns:['FY26|forecast','FY26|forecast']}]) assert.throws(() => D.buildReport({...config(),...bad}));
  assert.equal(D.chartData(D.buildReport({...config(),columns:['FY27|version']})), null);
});

function fixture() {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'demo/budget-review.html'), 'utf8'), { url: 'https://example.test/demo/budget-review.html', runScripts: 'outside-only', pretendToBeVisual: true });
  const {window} = dom, errors = [], events = [];
  window.matchMedia = () => ({ matches: false });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.console.error = (...args) => errors.push(args.join(' '));
  window.addEventListener('aplan:demo-event', event => events.push(plain(event.detail)));
  window.fetch = () => { throw Error('Demo must not call an external collector'); };
  window.navigator.sendBeacon = () => { throw Error('Demo must not send tracking'); };
  window.HTMLMediaElement.prototype.play = function(){ return Promise.resolve(); };
  window.HTMLMediaElement.prototype.pause = function(){};
  const clock = FakeTimers.withGlobal(window).install({toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance','requestAnimationFrame','cancelAnimationFrame']});
  for (const script of window.document.querySelectorAll('script')) {
    const source = script.src ? fs.readFileSync(path.resolve(root, 'demo', script.getAttribute('src')), 'utf8') : script.textContent + '\nwindow.testPlayer = demoPlayer;';
    window.eval(source);
  }
  const el = id => window.document.getElementById(id), click = id => el(id).click();
  const state = () => plain(window.BudgetReviewDemo.app.getState());
  const set = (id, value, type='change') => { el(id).value = value; el(id).dispatchEvent(new window.Event(type)); };
  const prepare = async () => { await clock.tickAsync(0); click('configureBtn'); click('recommendedBtn'); click('applySelections'); click('executeBtn'); await clock.tickAsync(800); click('chartBtn'); };
  return {window,el,click,set,state,clock,errors,events,player:window.testPlayer,prepare,close(){clock.uninstall();window.close();}};
}
test('Version changes preserve the exported sheet and chart until explicit refresh', async () => {
  const f = fixture(); try {
    await f.prepare(); const before = f.el('reportTable').innerHTML;
    assert.equal(f.state().report.total.values[1], 41700000);
    f.set('versionSelect', 'Q4 Forecast');
    assert.equal(f.state().dirty, true); assert.equal(f.el('reportTable').innerHTML, before);
    assert.match(f.el('chartSummary').textContent, /FY27 Budget/);
    f.click('refreshBtn'); assert.equal(f.state().busy, true);
    await f.clock.tickAsync(800);
    assert.equal(f.state().dirty, false); assert.equal(f.state().report.total.values[1], 41500000);
    assert.match(f.el('chartSummary').textContent, /Q4 Forecast.*\$41.50M/);
    f.click('slideBtn'); assert.match(f.el('slideHeadline').textContent, /\$41.50M.*\$3.70M.*9.8%/);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('Staged selections cancel without changing the saved config or output', async () => {
  const f = fixture(); try {
    await f.prepare(); const before = plain(f.state());
    f.click('configureBtn'); f.click('hideAll'); assert.equal(f.el('applySelections').disabled, true);
    f.click('cancelDialog'); assert.deepEqual(f.state(), before);
    f.click('configureBtn'); f.click('rowsMode'); f.el('selectionChoices').querySelector('input[data-selection="people"]').click();
    f.click('applySelections'); assert.equal(f.state().config.rows.length, 4); assert.equal(f.state().report.rows.length, 5);
    f.click('refreshBtn'); await f.clock.tickAsync(800);
    assert.equal(f.state().report.rows.length, 4); assert.equal(f.state().report.total.values[1], 15300000);
    assert.equal(f.el('reportTable').querySelector('th[colspan="3"]').textContent, 'FY27');
  } finally { f.close(); }
});
test('Show/Hide affects searched matches; leaf headers toggle only their exact tuple', async () => {
  const f = fixture(); try {
    await f.clock.tickAsync(0); f.click('configureBtn'); f.set('selectionSearch', 'FY26', 'input'); f.click('hideAll');
    assert.match(f.el('selectionCount').textContent, /4 of 8/);
    f.el('selectionPreview').querySelector('[data-column="FY26|forecast"]').click();
    assert.match(f.el('selectionCount').textContent, /5 of 8/);
    f.click('applySelections'); assert.deepEqual(f.state().config.columns, ['FY26|forecast','FY27|forecast','FY27|version','FY27|yoy','FY27|percent']);
    f.click('configureBtn'); f.click('rowsMode'); f.click('hideAll');
    assert.equal(f.el('applySelections').disabled, true); assert.match(f.el('selectionPreview').textContent, /Choose at least one expense category/);
    f.click('cancelDialog');
  } finally { f.close(); }
});
test('Restart invalidates pending retrieval and manual interaction unlocks canceled work', async () => {
  const f = fixture(); try {
    await f.clock.tickAsync(0); f.click('executeBtn'); assert.equal(f.state().busy, true);
    f.click('sheetTab'); assert.equal(f.state().busy, false); await f.clock.tickAsync(1000);
    assert.equal(f.state().report, null);
    f.click('executeBtn'); f.player.restart(); f.player.pause(); await f.clock.tickAsync(1000);
    assert.equal(f.state().report, null); assert.equal(f.state().busy, false); assert.equal(f.state().config.columns.length, 8);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('Chapter jump establishes prerequisites; exploration pauses the tour', async () => {
  const f = fixture(); try {
    await f.clock.tickAsync(0); f.set('chapter', '5'); await f.clock.tickAsync(0);
    assert.equal(f.state().pane, 'slide'); assert.equal(f.state().report.total.values[1], 41500000);
    f.click('configureBtn'); assert.equal(f.player.running, false); assert.equal(f.player.jobs.size, 0);
    await f.clock.tickAsync(100000); assert.equal(f.state().report.total.values[1], 41500000);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('Tabs have keyboard navigation and disabled panes cannot be selected', async () => {
  const f = fixture(); try {
    await f.prepare(); f.el('chartTab').focus();
    f.el('chartTab').dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
    assert.equal(f.window.document.activeElement.id, 'slideTab'); assert.equal(f.state().pane, 'slide');
    f.el('slideTab').dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Home',bubbles:true}));
    assert.equal(f.state().pane, 'sheet');
  } finally { f.close(); }
});
test('Typing into the selection search pauses the tour before it can replace user choices', async () => {
  const f = fixture(); try {
    await f.clock.tickAsync(0); f.set('chapter','1'); await f.clock.tickAsync(0);
    f.set('selectionSearch','FY26','input'); assert.equal(f.player.running,false);
    await f.clock.tickAsync(100000); assert.match(f.el('selectionCount').textContent,/8 of 8/);
    f.click('applySelections'); assert.equal(f.state().config.columns.length,8); assert.deepEqual(f.errors,[]);
  } finally {f.close();}
});
test('Local telemetry carries only allowlisted fictional fields, no external collection', async () => {
  const f = fixture(); try {
    await f.prepare(); f.set('versionSelect', 'Q4 Forecast'); f.click('refreshBtn'); await f.clock.tickAsync(800); f.click('slideBtn');
    const allowed = ['event','demo','version','columns','rows','chapter','percent'];
    for (const event of f.events) { assert.equal(event.demo,'budget-review'); assert.ok(Object.keys(event).every(k=>allowed.includes(k))); assert.ok(!JSON.stringify(event).includes('@')); }
    assert.ok(f.events.some(e=>e.event==='pivot_complete')); assert.ok(f.events.some(e=>e.event==='chart_create')); assert.ok(f.events.some(e=>e.event==='slide_preview'));
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('Homepage/gallery use static CSS; flagship is linked and indexed as a simulation', () => {
  for (const file of ['index.html','demos.html']) {
    const html = fs.readFileSync(path.join(root,file),'utf8');
    assert.ok(!html.includes('cdn.tailwindcss.com')); assert.match(html,/\/assets\/site-v1.css/); assert.match(html,/\/demo\/budget-review.html/);
  }
  const html = fs.readFileSync(path.join(root,'demo/budget-review.html'),'utf8');
  assert.match(html,/Interactive simulation/); assert.ok(!html.includes('VideoObject'));
  assert.match(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'),/https:\/\/aplan4sheets.com\/demo\/budget-review.html/);
  assert.ok(fs.statSync(path.join(root,'assets/site-v1.css')).size>5000);
});
