import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const root = path.resolve(import.meta.dirname, '..');
function fixture(query = '', reducedMotion = false) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'demo/exports.html'), 'utf8'), {
    url: 'https://example.test/demo/exports.html' + query,
    runScripts: 'outside-only', pretendToBeVisual: true
  });
  const {window} = dom;
  window.matchMedia = () => ({matches: reducedMotion});
  const clock = FakeTimers.withGlobal(window).install();
  const played = [];
  window.HTMLMediaElement.prototype.play = function () {
    played.push(this.src);
    this.timer = window.setTimeout(() => this.dispatchEvent(new window.Event('ended')), 500);
    return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause = function () { window.clearTimeout(this.timer); };
  for (const script of window.document.scripts) {
    window.eval(script.src ? fs.readFileSync(path.resolve(root, 'demo', script.getAttribute('src')), 'utf8') : script.textContent + '\nwindow.player = demoPlayer;');
  }
  return {window, clock, played, document: window.document, player: window.player, close() { clock.uninstall(); window.close(); }};
}

test('Export Actions and Saved Views both show confirmation before the report, with user-paced progression', async () => {
  const f = fixture();
  try {
    await f.clock.tickAsync(0);
    const stage = () => f.document.getElementById('exportsStage');
    assert.equal(f.player.running, false);
    assert.deepEqual(f.played, []);
    assert.match(stage().textContent, /Export Actions.*Search exports.*Revenue Summary.*Run Selected Exports/s);
    assert.equal(f.document.getElementById('exportSearch').value, 'Revenue');
    assert.equal(f.document.querySelector('.ex-export-option input').checked, true);
    assert.equal(stage().querySelector('.ex-report'), null);
    f.player.play();
    for (let index = 0; index < 6; index++) {
      await f.clock.tickAsync(6000);
      assert.equal(f.player.index, index);
      assert.equal(stage().querySelectorAll('button:not(:disabled), input:not(:disabled), [contenteditable]').length, 0, 'Illustrations cannot collect inputs or perform export actions');
      assert.equal(f.document.querySelector('.demo-notes').textContent, f.window.ExportsData.steps[index].caption);
      if (index === 1 || index === 4) {
        const confirmation = stage().querySelector('.ex-confirm');
        assert.ok(confirmation);
        assert.equal(confirmation.querySelector('h3').textContent, index === 1 ? 'Confirm exports' : 'Confirm export');
        assert.match(confirmation.textContent, /Destination tab/);
        assert.match(confirmation.textContent, /Existing destination data and formulas can be replaced/);
        assert.match(confirmation.textContent, /Cancel to leave the workbook unchanged/);
        assert.equal(stage().querySelector('.ex-report'), null, 'Report remains absent during destination review');
      }
      if (index === 2) {
        assert.match(stage().querySelector('.ex-report').textContent, /Revenue Summary.*North.*\$72\.0M.*South.*\$48\.0M.*Total revenue.*\$120\.0M/s);
      }
      if (index === 3) {
        assert.match(stage().textContent, /Saved Views.*Financial Planning.*Operating Results.*Export View/s);
        assert.equal(stage().querySelector('.ex-report'), null);
      }
      if (index === 5) {
        assert.match(stage().querySelector('.ex-report').textContent, /Operating Results.*Revenue.*\$120\.0M.*Operating costs.*\$78\.0M.*Operating profit.*\$42\.0M/s);
      }
      if (index < 5) {
        assert.equal(f.player.awaitingNext, true);
        await f.clock.tickAsync(30000);
        assert.equal(f.player.index, index, 'Step waits for the visitor');
        f.document.getElementById('nextStepBtn').click();
        await f.clock.tickAsync(0);
      }
    }
    assert.equal(f.player.finished, true);
    assert.equal(f.played.length, 6);
    assert.equal(f.document.getElementById('nextWalkthrough').getAttribute('href'), '/demo/schedule.html');
    assert.equal(f.document.querySelector('.walkthrough-journey').hidden, false);
    f.player.restart();
    await f.clock.tickAsync(0);
    assert.equal(f.player.index, 0);
    assert.equal(stage().querySelector('.ex-report'), null);
    assert.equal(f.document.querySelector('.walkthrough-journey').hidden, true);
  } finally { f.close(); }
});

test('Export narration uses the approved voice and exactly matches its visible captions', async () => {
  const f = fixture();
  try {
    await f.clock.tickAsync(0);
    const spec = JSON.parse(fs.readFileSync(path.join(root, 'assets/exports-narration-v1.json')));
    assert.equal(spec.voice, 'en-US-AndrewMultilingualNeural');
    assert.equal(spec.rate, '-3%');
    assert.equal(spec.clips.length, 6);
    for (const [index, clip] of spec.clips.entries()) {
      assert.equal(clip.text, f.window.ExportsData.steps[index].caption);
      assert.equal(f.document.querySelectorAll('audio')[index].getAttribute('src'), 'audio/exports-v1/' + clip.file);
      assert.ok(fs.statSync(path.join(root, 'demo/audio/exports-v1', clip.file)).size > 10000);
    }
    const runtime = fs.readFileSync(path.join(root, 'assets/exports-v1.js'), 'utf8');
    assert.doesNotMatch(runtime, /fetch\(|XMLHttpRequest|localStorage|clipboard|speechSynthesis/);
  } finally { f.close(); }
});

test('Embedded export walkthrough remains silent and honors reduced motion', async () => {
  for (const reducedMotion of [false, true]) {
    const f = fixture('?embed=1', reducedMotion);
    try {
      await f.clock.tickAsync(35000);
      assert.deepEqual(f.played, []);
      assert.equal(f.player.muted, true);
      assert.equal(f.player.finished, !reducedMotion);
      assert.equal(f.player.index, reducedMotion ? 0 : 5);
      assert.equal(f.document.querySelector('.walkthrough-journey'), null);
      assert.equal(f.document.querySelectorAll('.walkthrough-next-action').length, 0);
    } finally { f.close(); }
  }
});
