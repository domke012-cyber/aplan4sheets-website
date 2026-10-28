import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const root = path.resolve(import.meta.dirname, '..');
const journey = [
  ['marketplace-install.html', '/demo/oauth-client.html'],
  ['oauth-client.html', '/demo/oauth-setup.html'],
  ['oauth-setup.html', '/demo/setup.html?focus=model'],
  ['setup.html?focus=model', '/demo/pivot.html'],
  ['pivot.html', '/demo/schedule.html'],
  ['schedule.html', '/guide.html#step-7']
];

function fixture(route, { embed = false, reducedMotion = false } = {}) {
  const url = new URL('/demo/' + route, 'https://aplan4sheets.com');
  if (embed) url.searchParams.set('embed', '1');
  const html = fs.readFileSync(path.join(root, url.pathname), 'utf8');
  const dom = new JSDOM(html, { url: url.href, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  const errors = [], played = [];
  window.matchMedia = () => ({ matches: reducedMotion });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  window.console.error = (...args) => errors.push(args.join(' '));
  window.addEventListener('error', event => errors.push(String(event.error || event.message)));
  const clock = FakeTimers.withGlobal(window).install();
  window.HTMLMediaElement.prototype.play = function () {
    played.push(this.getAttribute('src'));
    this._audioTimer = window.setTimeout(() => this.dispatchEvent(new window.Event('ended')), 500);
    return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause = function () { window.clearTimeout(this._audioTimer); };
  for (const script of window.document.scripts) {
    const source = script.src
      ? fs.readFileSync(path.join(root, new URL(script.src).pathname), 'utf8')
      : script.textContent;
    window.eval(source + (source.includes('demoPlayer.mount()') ? '\nwindow.testPlayer=demoPlayer;' : ''));
  }
  const document = window.document;
  return {
    window, document, clock, played, errors, player: window.testPlayer,
    click: selector => document.querySelector(selector).click(),
    card: () => document.querySelector('.walkthrough-journey'),
    cues: () => [...document.querySelectorAll('.walkthrough-next-action')],
    close() { clock.uninstall(); window.close(); }
  };
}

for (const [route, next] of journey) {
  test(route + ': completion alone reveals and highlights the correct next walkthrough', async () => {
    const f = fixture(route);
    try {
      await f.clock.tickAsync(0);
      assert.ok(f.document.querySelector('script[src="../assets/demo-player-v3.js"]'));
      assert.ok(f.card());
      assert.equal(f.card().hidden, true);
      assert.deepEqual(f.played, [], 'The completion journey does not start narration');
      assert.deepEqual(f.cues().map(node => node.id), ['playBtn']);
      f.click('#playBtn');
      for (let i = 0; i < f.player.scenes.length; i++) {
        await f.clock.tickAsync(100);
        assert.equal(f.card().hidden, true, 'No onward navigation while the current step is playing');
        assert.equal(f.cues().length, 0, 'The next walkthrough does not pulse during narration');
        await f.clock.tickAsync(40000);
        assert.equal(f.player.index, i);
        if (i + 1 < f.player.scenes.length) {
          assert.equal(f.player.awaitingNext, true);
          assert.equal(f.card().hidden, true, 'A finished intermediate step is not a finished walkthrough');
          assert.equal(f.cues().length, 1);
          assert.ok(f.cues()[0].hasAttribute('data-tour-next'));
          f.cues()[0].click();
        }
      }
      assert.equal(f.player.finished, true);
      assert.equal(f.card().hidden, false);
      assert.deepEqual(f.cues().map(node => node.id), ['nextWalkthrough']);
      assert.equal(f.cues()[0].getAttribute('href'), next);
      assert.equal(f.player.jobs.size, 0);
      assert.equal(f.played.length, f.player.scenes.length);

      f.click('#restartBtn, .ctrl-restart');
      await f.clock.tickAsync(100);
      assert.equal(f.player.index, 0);
      assert.equal(f.player.finished, false);
      assert.equal(f.card().hidden, true);
      assert.equal(f.cues().length, 0);
      assert.deepEqual(f.errors, []);
    } finally { f.close(); }
  });
}

test('Replay voice and full Replay hide completion navigation until their playback finishes', async () => {
  const f = fixture('marketplace-install.html');
  try {
    await f.clock.tickAsync(0);
    f.click('[data-tour-auto]');
    f.click('#playBtn');
    await f.clock.tickAsync(15000);
    assert.equal(f.player.finished, true);
    assert.equal(f.card().hidden, false);
    const count = f.played.length;
    f.click('[data-tour-replay]');
    await f.clock.tickAsync(100);
    assert.equal(f.card().hidden, true);
    assert.equal(f.cues().length, 0);
    assert.equal(f.played.length, count + 1);
    await f.clock.tickAsync(1000);
    assert.equal(f.player.finished, true);
    assert.deepEqual(f.cues().map(node => node.id), ['nextWalkthrough']);
    f.click('#playBtn');
    await f.clock.tickAsync(100);
    assert.equal(f.player.index, 0);
    assert.equal(f.card().hidden, true);
    assert.equal(f.cues().length, 0);
    await f.clock.tickAsync(15000);
    assert.equal(f.player.finished, true);
    assert.equal(f.card().hidden, false);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Embedded setup previews remain silent and never mount completion navigation', async () => {
  for (const [route] of journey) {
    const f = fixture(route, { embed: true });
    try {
      await f.clock.tickAsync(0);
      assert.equal(f.player.muted, true, route);
      assert.equal(f.card(), null, route);
      assert.equal(f.document.querySelector('#nextWalkthrough'), null, route);
      await f.clock.tickAsync(300000);
      assert.equal(f.player.finished, true, route);
      assert.equal(f.player.muted, true, route);
      assert.deepEqual(f.played, [], route);
      assert.equal(f.card(), null, route);
      assert.equal(f.cues().length, 0, route);
      assert.deepEqual(f.errors, [], route);
    } finally { f.close(); }
  }
});

test('The Add Model entry starts signed in, uses only its own scene and voice, and restarts independently', async () => {
  const f = fixture('setup.html?focus=model');
  try {
    await f.clock.tickAsync(0);
    const sidebar = f.document.getElementById('sidebarContent');
    assert.match(sidebar.textContent, /Signed in to Anaplan/);
    assert.match(sidebar.textContent, /Add Model/);
    assert.equal(sidebar.querySelector('#loginBtn'), null);
    assert.ok(f.document.getElementById('sidebar').classList.contains('visible'));
    assert.equal(f.player.scenes.length, 1);
    assert.equal(f.player.scenes[0].name, 'Add Model Configuration');
    assert.equal(f.player.clips.length, 1);
    assert.equal(f.player.clips[0].getAttribute('src'), 'audio/v4/setup-5.mp3');
    assert.equal(f.player.captions[0], f.window.DemoNarration.setup[4]);
    assert.equal(f.document.getElementById('stepTotal').textContent, '1');
    assert.equal(f.document.getElementById('modelStatus'), null);
    f.click('#playBtn');
    await f.clock.tickAsync(900);
    assert.match(f.document.getElementById('modelStatus').textContent, /Setting up/);
    assert.equal(f.document.getElementById('saveModelPreview').textContent, 'Save Model');
    await f.clock.tickAsync(20000);
    assert.equal(f.player.finished, true);
    assert.match(f.document.getElementById('saveStatus').textContent, /Model saved successfully/);
    assert.equal(f.document.getElementById('tenantVal').textContent, 'Acme Corp Production');
    assert.equal(f.document.getElementById('wsVal').textContent, 'FY26 Planning');
    assert.equal(f.document.getElementById('mdlVal').textContent, 'Revenue & Headcount');
    f.click('.ctrl-restart');
    await f.clock.tickAsync(0);
    assert.match(sidebar.textContent, /Signed in to Anaplan/);
    assert.equal(f.document.getElementById('modelStatus'), null);
    await f.clock.tickAsync(22000);
    assert.equal(f.player.finished, true);
    assert.match(f.document.getElementById('saveStatus').textContent, /Model saved successfully/);
    assert.deepEqual(f.played, ['audio/v4/setup-5.mp3', 'audio/v4/setup-5.mp3']);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('Reduced-motion Add Model embed waits for interaction and does not expose a journey', async () => {
  const f = fixture('setup.html?focus=model', { embed: true, reducedMotion: true });
  try {
    await f.clock.tickAsync(30000);
    assert.equal(f.player.started, false);
    assert.equal(f.player.running, false);
    assert.equal(f.player.muted, true);
    assert.match(f.document.getElementById('sidebarContent').textContent, /Signed in to Anaplan/);
    assert.equal(f.card(), null);
    assert.deepEqual(f.played, []);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});

test('The setup journey reaches the guide through existing pages and valid guide anchors', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/walkthrough-journey-v1.js'), 'utf8'), context);
  const definitions = context.window.WalkthroughJourney;
  for (const [route, next] of journey) {
    const slug = route.split('?')[0].replace(/\.html$/, '');
    assert.equal(definitions[slug].href, next);
    for (const href of [definitions[slug].href, definitions[slug].guide]) {
      const target = new URL(href, 'https://aplan4sheets.com');
      const file = path.join(root, target.pathname);
      assert.ok(fs.existsSync(file), `${route} links to an existing destination: ${href}`);
      if (target.hash) {
        const dom = new JSDOM(fs.readFileSync(file, 'utf8'));
        try { assert.ok(dom.window.document.getElementById(target.hash.slice(1)), href); }
        finally { dom.window.close(); }
      }
    }
  }
  assert.equal(definitions['marketplace-install'].alternative.href, '/demo/oauth-setup.html', 'Visitors who already have credentials can skip client creation');
});
