import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

const root = path.resolve(import.meta.dirname, '..');
function fixture(query = '', reducedMotion = false) {
  const html = fs.readFileSync(path.join(root, 'demo/oauth-client.html'), 'utf8');
  const dom = new JSDOM(html, { url:'https://example.test/demo/oauth-client.html' + query, runScripts:'outside-only', pretendToBeVisual:true });
  const {window} = dom;
  window.matchMedia = () => ({matches:reducedMotion});
  const clock = FakeTimers.withGlobal(window).install();
  const played = [];
  window.HTMLMediaElement.prototype.play = function () { played.push(this.src); this.timer = window.setTimeout(() => this.dispatchEvent(new window.Event('ended')), 500); return Promise.resolve(); };
  window.HTMLMediaElement.prototype.pause = function () { window.clearTimeout(this.timer); };
  for (const script of window.document.scripts) window.eval(script.src ? fs.readFileSync(path.resolve(root, 'demo', script.getAttribute('src')), 'utf8') : script.textContent + '\nwindow.player=demoPlayer;');
  return {window, clock, played, document:window.document, player:window.player, close() {clock.uninstall();window.close();}};
}

test('Administration sequence teaches the correct grant, deployment-specific callback, credentials, and handoff', async () => {
  const f = fixture();
  try {
    await f.clock.tickAsync(0);
    const stage = () => f.document.getElementById('adminStage').textContent;
    assert.match(stage(), /tenant security administrator/);
    assert.match(stage(), /Redirect URI/);
    assert.match(stage(), /connector\.example\.invalid/);
    f.player.play();
    for (let index = 0; index < 8; index++) {
      await f.clock.tickAsync(6000);
      const content = stage();
      assert.equal(f.document.querySelectorAll('#adminStage button:not(:disabled), #adminStage input:not(:disabled), #adminStage [contenteditable]').length, 0, 'The illustration cannot collect credentials or perform admin actions');
      if (index === 1) assert.match(content, /Administration → Security → OAuth Clients/);
      if (index === 2) { assert.match(content, /Enable OAuth/); assert.match(content, /Already see the client list/); }
      if (index === 3) { assert.match(content, /New/); assert.equal(f.document.getElementById('sampleName').value, 'Aplan4Sheets'); }
      if (index === 4) assert.match(f.document.querySelector('.grant-options .chosen').textContent, /Authorization code grant/);
      if (index === 5) { assert.match(content, /Allowed callback URLs/); assert.match(content, /actual Redirect URI/); assert.match(content, /Create client/); }
      if (index === 6) { assert.match(content, /DEMO_CLIENT_ID_NOT_VALID/); assert.match(content, /Copy client secret/); assert.match(content, /Done/); }
      if (index === 7) { assert.match(content, /Enabled/); assert.equal(f.document.getElementById('continueSetup').getAttribute('href'), '/demo/oauth-setup.html'); }
      assert.equal(f.document.querySelector('#stepRail [aria-current="step"]').textContent.includes(f.player.scenes[index].name), true);
      if (index < 7) {
        f.document.querySelector('.browser-frame').scrollTop = 300;
        f.document.getElementById('nextStepBtn').click();
        await f.clock.tickAsync(0);
        assert.equal(f.document.querySelector('.browser-frame').scrollTop, 0, 'Each new step brings its instructions into view');
      }
    }
    assert.equal(f.player.finished, true);
    f.player.restart(); await f.clock.tickAsync(0);
    assert.match(stage(), /Get the callback/); assert.equal(f.document.querySelector('#continueSetup'), null);
  } finally { f.close(); }
});

test('Every new clip has the approved voice, a matching visible transcript, and a versioned static asset', () => {
  const f = fixture();
  try {
    const spec = JSON.parse(fs.readFileSync(path.join(root, 'assets/oauth-client-narration-v1.json')));
    assert.equal(spec.voice, 'en-US-AndrewMultilingualNeural'); assert.equal(spec.rate, '-3%');
    assert.equal(spec.clips.length, 8);
    for (const [index, clip] of spec.clips.entries()) {
      assert.equal(clip.text, f.window.OAuthClientData.steps[index].caption);
      assert.equal(f.document.querySelectorAll('audio')[index].getAttribute('src'), 'audio/oauth-client-v1/' + clip.file);
      assert.ok(fs.statSync(path.join(root, 'demo/audio/oauth-client-v1', clip.file)).size > 10000);
    }
    const runtime = fs.readFileSync(path.join(root, 'assets/oauth-client-v1.js'), 'utf8');
    assert.doesNotMatch(runtime, /fetch\(|XMLHttpRequest|localStorage|clipboard|speechSynthesis/);
  } finally { f.close(); }
});

test('Embedded client walkthrough stays silent and respects reduced motion', async () => {
  for (const reducedMotion of [false, true]) {
    const f = fixture('?embed=1', reducedMotion);
    try {
      await f.clock.tickAsync(45000);
      assert.deepEqual(f.played, []);
      assert.equal(f.player.muted, true);
      assert.equal(f.player.finished, !reducedMotion);
      assert.equal(f.player.index, reducedMotion ? 0 : 7);
      assert.equal(f.document.querySelectorAll('.walkthrough-next-action').length, 0);
    } finally { f.close(); }
  }
});

test('Client creation is discoverable from the gallery, walkthrough hub, guide, and connector setup', () => {
  for (const file of ['demos.html', 'demo.html', 'guide.html', 'demo/oauth-setup.html']) {
    const dom = new JSDOM(fs.readFileSync(path.join(root, file), 'utf8'));
    assert.ok(dom.window.document.querySelector('a[href="/demo/oauth-client.html"]'), file);
    dom.window.close();
  }
  assert.match(fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8'), /https:\/\/aplan4sheets.com\/demo\/oauth-client.html/);
});
