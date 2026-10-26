import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const root = path.resolve(import.meta.dirname, '..');
const demos = fs.readdirSync(path.join(root, 'demo')).filter(name => name.endsWith('.html') && name !== 'formatted-ux.html');
function fixture(file) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'demo', file), 'utf8'), { url: 'https://example.test/demo/' + file, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom, errors = [], played = [];
  window.matchMedia = () => ({ matches: false });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  window.console.error = (...args) => errors.push(args.join(' '));
  const clock = FakeTimers.withGlobal(window).install();
  window.HTMLMediaElement.prototype.play = function () {
    played.push(this.getAttribute('src'));
    this._timer = window.setTimeout(() => this.dispatchEvent(new window.Event('ended')), 500);
    return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause = function () { window.clearTimeout(this._timer); };
  for (const script of window.document.querySelectorAll('script')) {
    window.eval(script.src ? fs.readFileSync(path.resolve(root, 'demo', script.getAttribute('src')), 'utf8') : script.textContent + (script.textContent.includes('demoPlayer.mount()') ? '\nwindow.testPlayer=demoPlayer;' : ''));
  }
  const document = window.document;
  return { window, document, clock, played, errors, player: window.testPlayer, click: id => document.getElementById(id).click(), close() { clock.uninstall(); window.close(); } };
}

for (const file of demos) test(file + ': each narrated step waits for one clear next action and reaches completion', async () => {
  const f = fixture(file);
  try {
    await f.clock.tickAsync(0);
    assert.deepEqual(f.played, [], 'No audio before interaction');
    assert.equal(f.document.querySelector('.walkthrough-next-action').id, 'playBtn');
    assert.equal(f.player.autoAdvance, false);
    f.click('playBtn');
    for (let i = 0; i < f.player.scenes.length; i++) {
      await f.clock.tickAsync(35000);
      assert.equal(f.player.index, i, 'Never advances without the visitor');
      assert.equal(f.player.running, false);
      const cues = [...f.document.querySelectorAll('.walkthrough-next-action')];
      if (i + 1 === f.player.scenes.length) {
        assert.equal(f.player.finished, true); assert.equal(cues.length, 0);
      } else {
        assert.equal(f.player.awaitingNext, true);
        assert.equal(cues.length, 1); assert.ok(cues[0].hasAttribute('data-tour-next'));
        assert.equal(cues[0].disabled, false); assert.equal(cues[0].hidden, false);
        const dialog = f.document.querySelector('dialog[open]');
        if (dialog) assert.ok(dialog.contains(cues[0]), 'Next remains reachable inside the modal');
        cues[0].click(); cues[0].click(); // A fast double click cannot skip a scene.
      }
    }
    assert.equal(f.played.length, f.player.scenes.length);
    assert.equal(f.player.jobs.size, 0); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Replay, mute, motion preference, automatic playback and Restart work at a step boundary', async () => {
  const f = fixture('oauth-setup.html');
  try {
    await f.clock.tickAsync(0);
    f.document.querySelector('[data-tour-motion]').click();
    f.click('playBtn'); await f.clock.tickAsync(35000);
    const count = f.played.length;
    f.document.querySelector('[data-tour-replay]').click(); await f.clock.tickAsync(1000);
    assert.equal(f.played.length, count + 1); assert.equal(f.player.index, 0); assert.equal(f.player.awaitingNext, true);
    f.document.getElementById('muteBtn').click();
    f.document.querySelector('[data-tour-auto]').click(); await f.clock.tickAsync(300000);
    assert.equal(f.player.finished, true); assert.equal(f.played.length, count + 1, 'Muted playback remains silent');
    f.player.restart(); await f.clock.tickAsync(0);
    assert.equal(f.player.index, 0); assert.equal(f.player.autoAdvance, true);
    assert.ok(f.document.body.classList.contains('walkthrough-motion-paused'));
    assert.equal(f.document.querySelectorAll('.walkthrough-next-action').length, 0);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Manual budget exploration points to valid actions in dialogs, during creation, and after filter changes', async () => {
  const f = fixture('budget-review.html');
  const cue = () => f.document.querySelector('.walkthrough-next-action')?.id;
  try {
    await f.clock.tickAsync(0);
    f.click('browseUx'); assert.equal(cue(), 'useUxGrid');
    f.click('useUxGrid'); assert.equal(cue(), 'applySelections');
    f.click('hideAll'); assert.equal(cue(), 'showAll');
    f.click('recommendedBtn'); f.click('applySelections'); assert.equal(cue(), 'executeBtn');
    f.click('executeBtn'); assert.equal(cue(), undefined);
    await f.clock.tickAsync(800); assert.equal(cue(), 'chartBtn');
    f.click('chartBtn'); assert.equal(cue(), 'slideBtn');
    f.click('slideBtn'); assert.equal(cue(), undefined);
    const version = f.document.getElementById('versionSelect'); version.value = 'Q4 Forecast'; version.dispatchEvent(new f.window.Event('change', { bubbles: true }));
    assert.equal(cue(), 'refreshBtn');
    f.click('refreshBtn'); await f.clock.tickAsync(800); assert.equal(cue(), undefined);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('All eleven walkthroughs use the approved Andrew voice and matching public scripts', () => {
  const spec = JSON.parse(fs.readFileSync(path.join(root, 'assets/walkthrough-narration-v4.json')));
  assert.equal(spec.voice, 'en-US-AndrewMultilingualNeural'); assert.equal(spec.rate, '-3%');
  const context = { window: {} };
  for (const file of ['demo-narration.js', 'budget-review-data-v2.js']) vm.runInNewContext(fs.readFileSync(path.join(root, 'assets', file), 'utf8'), context);
  const expected = Object.entries(context.window.DemoNarration).flatMap(([slug, captions]) => captions.map((text, i) => ({ file: `${slug}-${i + 1}.mp3`, text })));
  expected.push(...context.window.BudgetReviewData.scenes.map((s, i) => ({ file: `budget-review-${i + 1}.mp3`, text: s.caption })));
  assert.deepEqual(spec.clips, JSON.parse(JSON.stringify(expected)));
  for (const file of demos.filter(file => file !== 'oauth-client.html')) {
    const dom = new JSDOM(fs.readFileSync(path.join(root, 'demo', file), 'utf8'));
    assert.ok(dom.window.document.querySelector('script[src="../assets/demo-player-v2.js"]'));
    for (const audio of dom.window.document.querySelectorAll('audio')) {
      const src = audio.getAttribute('src'); assert.match(src, /^audio\/v4\//);
      assert.ok(fs.existsSync(path.join(root, 'demo', src)));
    }
    dom.window.close();
  }
  assert.equal(expected.length, 63);
});

test('Manual selections cue Restart instead of a disabled Play control, and Replay clears an audio failure', async () => {
  const f = fixture('nested-selections.html');
  try {
    await f.clock.tickAsync(0);
    const clip = f.player.clips[0], play = clip.play;
    clip.play = () => Promise.reject(new Error('Temporary playback failure'));
    f.click('playBtn'); await f.clock.tickAsync(1000);
    assert.match(f.player.status.textContent, /Audio unavailable/);
    clip.play = play; f.document.querySelector('[data-tour-replay]').click(); await f.clock.tickAsync(1000);
    assert.doesNotMatch(f.player.status.textContent, /Audio unavailable/);
    f.document.querySelector('#choices input').click();
    assert.equal(f.document.getElementById('playBtn').disabled, true);
    assert.equal(f.document.querySelector('.walkthrough-next-action').id, 'restartBtn');
    assert.equal(f.document.getElementById('nextStepBtn').hidden, true);
    f.click('restartBtn'); await f.clock.tickAsync(0); assert.equal(f.player.index, 0); assert.equal(f.player.running, true);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
