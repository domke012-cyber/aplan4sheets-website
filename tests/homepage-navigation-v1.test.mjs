import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const script = fs.readFileSync(path.join(root, 'assets/homepage-navigation-v1.js'), 'utf8');
const destinations = [
  ['/demos.html', 'Demos'],
  ['/guide.html', 'Setup Guide'],
  ['/blog/', 'Resources'],
  ['https://workspace.google.com/marketplace/app/aplan4sheets/751768451107', 'Marketplace Listing']
];
const links = prefix => destinations.map(([href, label], index) => `<a id="${prefix}${index}" href="${href}"${index === 3 ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`).join('');

function fixture({desktop = false, initialize = true, missingMatchMedia = false} = {}) {
  const dom = new JSDOM(`<!doctype html><html lang="en"><body>
    <nav id="homepageNav" aria-label="Main navigation">
      <a id="homeBrand" href="/">aPlan4Sheets</a>
      <div class="home-nav-links">${links('desktop')}</div>
      <button id="mobileMenuToggle" type="button" aria-controls="mobileMenu" aria-expanded="false" hidden>Menu</button>
      <div id="mobileMenu">${links('mobile')}</div>
    </nav>
    <main><a id="outside" href="#content">Outside navigation</a><div id="content">Page content</div></main>
    </body></html>`, {url: 'https://aplan4sheets.com/', runScripts: 'outside-only'});
  const {window} = dom;
  const {document} = window;
  const mediaListeners = new Set();
  const media = {matches: desktop, addEventListener(type, listener) { assert.equal(type, 'change'); mediaListeners.add(listener); }};
  if (!missingMatchMedia) window.matchMedia = query => { assert.equal(query, '(min-width: 900px)'); return media; };
  const load = () => { window.eval(script); document.dispatchEvent(new window.Event('DOMContentLoaded')); };
  if (initialize) load();
  const resize = matches => { media.matches = matches; for (const listener of mediaListeners) listener({matches}); };
  return {window, document, media, load, resize,
    nav: document.getElementById('homepageNav'),
    menu: document.getElementById('mobileMenu'),
    toggle: document.getElementById('mobileMenuToggle'),
    close() { window.close(); }};
}

test('Navigation progressively enhances visible fallback links without duplicating handlers', () => {
  const f = fixture({initialize: false});
  try {
    assert.equal(f.menu.hidden, false);
    assert.equal(f.toggle.hidden, true);
    assert.equal(f.menu.querySelectorAll('a[href]').length, 4);
    assert.equal(f.nav.querySelector('[role="menu"], [role="dialog"]'), null);
    f.load();
    assert.equal(f.nav.classList.contains('nav-enhanced'), true);
    assert.equal(f.toggle.hidden, false);
    assert.equal(f.toggle.getAttribute('aria-controls'), 'mobileMenu');
    assert.equal(f.toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(f.menu.hidden, true);
    f.load();
    f.toggle.click();
    assert.equal(f.menu.hidden, false, 'A second initialization does not add a second toggle handler');
    assert.equal(f.toggle.getAttribute('aria-expanded'), 'true');
    f.toggle.click();
    assert.equal(f.menu.hidden, true);
    assert.equal(f.toggle.getAttribute('aria-expanded'), 'false');
  } finally { f.close(); }
});

test('Unsupported enhancement leaves the ordinary fallback navigation usable', () => {
  const f = fixture({missingMatchMedia: true});
  try {
    assert.equal(f.menu.hidden, false);
    assert.equal(f.toggle.hidden, true);
    assert.equal(f.nav.classList.contains('nav-enhanced'), false);
  } finally { f.close(); }
});

test('Escape closes the mobile links and returns focus to their trigger', () => {
  const f = fixture();
  try {
    for (const focusId of ['mobileMenuToggle', 'mobile1']) {
      f.toggle.click();
      f.document.getElementById(focusId).focus();
      const escape = new f.window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true});
      f.document.activeElement.dispatchEvent(escape);
      assert.equal(f.menu.hidden, true);
      assert.equal(f.toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(f.document.activeElement, f.toggle);
      assert.equal(escape.defaultPrevented, true);
    }
    f.document.getElementById('outside').focus();
    const escape = new f.window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true});
    f.document.activeElement.dispatchEvent(escape);
    assert.equal(f.document.activeElement.id, 'outside');
    assert.equal(escape.defaultPrevented, false, 'A closed navigation does not intercept Escape elsewhere');
  } finally { f.close(); }
});

test('Following a mobile link closes the disclosure without intercepting navigation or moving focus', () => {
  const f = fixture();
  try {
    f.toggle.click();
    const link = f.document.getElementById('mobile1');
    link.focus();
    let reachedDocument = false;
    f.document.addEventListener('click', event => {
      reachedDocument = true;
      assert.equal(event.defaultPrevented, false, 'Navigation runtime permits the normal link action');
      event.preventDefault(); // Stop JSDOM attempting a real document navigation.
    }, {once: true});
    link.click();
    assert.equal(reachedDocument, true);
    assert.equal(f.menu.hidden, true);
    assert.equal(f.toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(f.document.activeElement, link, 'Link activation does not jump focus back to Menu');
  } finally { f.close(); }
});

test('Outside clicks and focus leaving the nav close it; movement within it stays open', () => {
  const f = fixture();
  try {
    f.toggle.focus();
    f.toggle.click();
    f.document.getElementById('mobile0').focus();
    f.document.getElementById('mobile1').focus();
    assert.equal(f.menu.hidden, false);
    f.document.getElementById('outside').focus();
    assert.equal(f.menu.hidden, true);
    assert.equal(f.document.activeElement.id, 'outside');
    f.toggle.click();
    f.document.getElementById('content').click();
    assert.equal(f.menu.hidden, true);
    assert.equal(f.document.activeElement.id, 'outside', 'Outside clicks do not pull focus into the nav');
    f.toggle.focus();
    f.toggle.click();
    f.document.getElementById('mobile0').focus();
    f.document.getElementById('mobile0').blur();
    assert.equal(f.menu.hidden, true, 'A focusout with no related target also closes the disclosure');
  } finally { f.close(); }
});

test('New-tab and modified primary link activation restore visible focus without intercepting navigation', () => {
  const f = fixture();
  try {
    for (const [id, modifiers] of [
      ['mobile3', {}],
      ['mobile1', {ctrlKey: true}],
      ['mobile1', {metaKey: true}],
      ['mobile1', {shiftKey: true}]
    ]) {
      f.toggle.click();
      const link = f.document.getElementById(id);
      link.focus();
      let reachedDocument = false;
      f.document.addEventListener('click', event => {
        reachedDocument = true;
        assert.equal(event.defaultPrevented, false, 'New browsing-context navigation remains a normal link action');
        event.preventDefault(); // JSDOM does not implement navigation.
      }, {once: true});
      link.dispatchEvent(new f.window.MouseEvent('click', {bubbles: true, cancelable: true, button: 0, ...modifiers}));
      assert.equal(reachedDocument, true);
      assert.equal(f.menu.hidden, true);
      assert.equal(f.toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(f.document.activeElement, f.toggle, id + ' leaves visible focus in the original page');
    }

    f.document.getElementById('outside').focus();
    f.toggle.click(); // Scripted activation opens the menu without moving focus.
    f.document.addEventListener('click', event => event.preventDefault(), {once: true});
    f.document.getElementById('mobile3').click();
    assert.equal(f.menu.hidden, true);
    assert.equal(f.document.activeElement.id, 'outside', 'No focus is stolen when activation did not start with focus in the menu');
  } finally { f.close(); }
});

test('Viewport changes close the mobile links and preserve a visible, logical focus target', () => {
  const f = fixture();
  try {
    f.toggle.click();
    f.document.getElementById('mobile1').focus();
    f.resize(true);
    assert.equal(f.menu.hidden, true);
    assert.equal(f.toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(f.document.activeElement.id, 'desktop1');
    f.toggle.click();
    assert.equal(f.menu.hidden, true, 'Desktop viewport cannot open the mobile disclosure');
    f.resize(false);
    assert.equal(f.document.activeElement, f.toggle, 'A newly hidden desktop link hands focus to the mobile trigger');
    assert.equal(f.menu.hidden, true);
    f.toggle.click();
    f.resize(true);
    assert.equal(f.document.activeElement.id, 'homeBrand', 'The hidden mobile trigger falls back to the visible brand');
    f.document.getElementById('outside').focus();
    f.resize(false);
    assert.equal(f.document.activeElement.id, 'outside', 'Resizing does not change focus outside navigation');
    f.toggle.click();
    f.document.getElementById('mobile2').focus();
    f.document.getElementById('desktop2').remove();
    f.resize(true);
    assert.equal(f.document.activeElement.id, 'homeBrand', 'Missing desktop equivalent safely falls back to the brand');
  } finally { f.close(); }
});
