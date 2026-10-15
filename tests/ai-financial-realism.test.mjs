import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const root = path.resolve(import.meta.dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));

function fixture() {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'demo/llm-agent.html'), 'utf8'), {
    url:'https://example.test/demo/llm-agent.html',runScripts:'outside-only',pretendToBeVisual:true
  });
  const { window } = dom, errors = [];
  window.matchMedia = () => ({matches:false});
  window.console.error = (...args) => errors.push(args.join(' '));
  window.fetch = () => { throw new Error('The fictional analysis must not query a service.'); };
  const clock = FakeTimers.withGlobal(window).install({
    toFake:['setTimeout','clearTimeout','setInterval','clearInterval','Date','performance','requestAnimationFrame','cancelAnimationFrame']
  });
  window.HTMLMediaElement.prototype.play = function () {
    this._timer = window.setTimeout(() => this.dispatchEvent(new window.Event('ended')), 500);
    return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause = function () { window.clearTimeout(this._timer); };
  for (const script of window.document.querySelectorAll('script')) {
    window.eval(script.src
      ? fs.readFileSync(path.resolve(root,'demo',script.getAttribute('src')),'utf8')
      : script.textContent+(script.textContent.includes('demoPlayer.mount()')?'\nwindow.testPlayer=demoPlayer;':''));
  }
  return {window,clock,errors,player:window.testPlayer,api:window.AIRealismDemo,
    el:id=>window.document.getElementById(id),
    close(){clock.uninstall();window.close();}};
}

test('AI snapshot reconciles every financial subtotal and signed EBITDA bridge', async () => {
  const f = fixture(); try {
    await f.clock.tickAsync(0);
    const a = f.api.analysis, s = f.api.snapshot;
    assert.equal(a.snapshotId,s.id);
    for (const version of ['actual','budget']) {
      assert.equal(a.revenue[version],s.revenues.reduce((total,row)=>total+row[version],0));
      assert.equal(a.opex[version],s.departments.reduce((total,row)=>total+row[version],0));
      assert.equal(a.grossProfit[version],a.revenue[version]-a.cogs[version]);
      assert.equal(a.ebitda[version],a.grossProfit[version]-a.opex[version]);
    }
    assert.equal(a.opex.actual,5600000);
    assert.equal(a.opex.budget,5200000);
    assert.equal(a.ebitda.actual,2700000);
    assert.equal(a.ebitda.variance,0);
    assert.equal(a.bridge.reduce((sum,row)=>sum+row.impact,0),a.ebitda.variance);
    assert.equal(a.largestOverrun.id,'marketing');
    assert.equal(a.largestOverrun.variance,300000);
    assert.equal(a.largestOverrun.percent,0.25);
  } finally {f.close();}
});

test('All financial values are derived; zero denominators return no misleading percent', async () => {
  const f = fixture(); try {
    await f.clock.tickAsync(0);
    const snapshot = plain(f.api.snapshot);
    snapshot.departments[0].actual+=12345;
    snapshot.departments[0].budget=0;
    const before=plain(snapshot),a=f.api.analyse(snapshot);
    assert.equal(a.departments[0].percent,null);
    assert.equal(a.opex.actual,5612345);
    assert.equal(a.opex.budget,3500000);
    assert.equal(a.ebitda.actual,2687655);
    assert.equal(a.bridge.reduce((sum,row)=>sum+row.impact,0),a.ebitda.variance);
    assert.deepEqual(snapshot,before,'Analysis does not alter its source snapshot');
  } finally {f.close();}
});

test('Source sheet displays the same reconciled values, units, references and formulas', async () => {
  const f=fixture(); try {
    await f.clock.tickAsync(0);
    assert.equal(f.el('gridTable').dataset.snapshot,f.api.snapshot.id);
    assert.equal(f.el('cell-10-2').textContent,'5.60');
    assert.equal(f.el('cell-18-2').textContent,'5.60');
    assert.equal(f.el('cell-15-4').textContent,'0.30');
    assert.equal(f.el('cell-15-5').textContent,'25.0%');
    assert.equal(f.el('cell-11-4').textContent,'0.00');
    assert.equal(f.el('cell-10-2').dataset.formula,'=SUM(B14:B17)');
    assert.equal(f.el('cell-11-2').dataset.formula,'=B9-B10');
    assert.match(f.el('gridTable').textContent,/USD millions/);
    assert.match(f.el('gridTable').textContent,/3 Apr 2026/);
    assert.match(f.el('gridTable').textContent,/Actual − Budget; expenses shown positive/);
    assert.match(f.el('gridTable').textContent,/MKT comment \(unverified\)/);
  } finally {f.close();}
});

test('Narrative and sample export derive the same amounts and separate evidence from hypotheses', async () => {
  const f=fixture(); try {
    await f.clock.tickAsync(0);f.player.play();await f.clock.tickAsync(300000);
    assert.equal(f.player.finished,true);
    const narrative=f.el('chatMessages').textContent,output=f.el('gridTable').textContent;
    assert.match(narrative,/Revenue is \$0\.60M above budget: SaaS \$0\.40M and services \$0\.20M/);
    assert.match(narrative,/Marketing is the largest department overrun at \$0\.30M \(25\.0%\)/);
    assert.match(narrative,/EBITDA is \$2\.70M, \$0\.00M versus budget/);
    assert.match(narrative,/not a verified cause/);
    assert.match(narrative,/summary does not establish causality/);
    assert.match(narrative,/Variance Analysis!A5:F18/);
    assert.match(narrative,/Variance Analysis!A21:B22/);
    assert.match(output,/Marketing overrun\$0\.30M/);
    assert.match(output,/Total Opex increase\$0\.40M/);
    assert.match(output,/EBITDA vs budget\$0\.00M/);
    assert.ok(!narrative.includes('enterprise expansion'));
    assert.ok(!output.includes('$0.50M'));
    assert.deepEqual(f.errors,[]);
  } finally {f.close();}
});

test('A paused review does not export; a manual click is explicit and idempotent', async () => {
  const f=fixture(); try {
    await f.clock.tickAsync(0);f.player.cancel();f.player.scene(4);await f.clock.tickAsync(0);
    assert.equal(f.api.getExportState(),null);
    const source=f.el('gridTable').innerHTML;
    await f.clock.tickAsync(10000);
    assert.equal(f.el('gridTable').innerHTML,source);
    assert.equal(f.api.getExportState(),null);
    f.el('reviewedExport').click();
    assert.deepEqual(plain(f.api.getExportState()),{snapshotId:f.api.snapshot.id,mode:'manual'});
    assert.match(f.el('reviewMode').textContent,/explicitly requested this browser-only sample export/);
    assert.equal(f.el('reviewedExport').disabled,true);
    const result=f.el('gridTable').innerHTML;f.el('reviewedExport').click();
    assert.equal(f.el('gridTable').innerHTML,result);
    assert.deepEqual(f.errors,[]);
  } finally {f.close();}
});

test('Guided-tour review is clearly simulated and restart cancels pending approval', async () => {
  const f=fixture(); try {
    await f.clock.tickAsync(0);f.player.cancel();f.player.scene(4);f.player.play();
    await f.clock.tickAsync(2000);
    assert.equal(f.api.getExportState().mode,'guided-tour');
    assert.match(f.el('reviewMode').textContent,/reviewer approval is simulated/);
    assert.match(f.el('sheetCallout').textContent,/no Google file or model changed/);
    f.player.restart();f.player.pause();await f.clock.tickAsync(0);
    assert.equal(f.api.getExportState(),null);
    assert.ok(f.el('gridTable').querySelector('[data-source-row="opex"]'));
    f.player.cancel();f.player.scene(4);await f.clock.tickAsync(0);
    f.player.restart();f.player.pause();await f.clock.tickAsync(10000);
    assert.equal(f.api.getExportState(),null);
    assert.equal(f.el('reviewedExport'),null);
    assert.deepEqual(f.errors,[]);
  } finally {f.close();}
});
