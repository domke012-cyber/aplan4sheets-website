import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('The actual homepage wires its mobile navigation to the same destinations as desktop', () => {
  const dom = new JSDOM(read('index.html'), {url:'https://aplan4sheets.com/', runScripts:'outside-only'});
  const {window} = dom, d = window.document;
  try {
    const script = d.querySelector('script[src="/assets/homepage-navigation-v1.js"]');
    assert.ok(script?.defer);
    const menu = d.getElementById('mobileMenu'), toggle = d.getElementById('mobileMenuToggle');
    assert.equal(menu.hidden, false, 'Ordinary links are available without JavaScript');
    assert.equal(toggle.hidden, true, 'No nonfunctional menu button in the fallback');
    const hrefs = selector => [...d.querySelectorAll(selector)].map(a=>a.getAttribute('href'));
    assert.deepEqual(hrefs('#mobileMenu a'), hrefs('.home-nav-links a'));
    assert.deepEqual(hrefs('#mobileMenu a').slice(0,3), ['/demos.html','/guide.html','/blog/']);
    window.matchMedia = () => ({matches:false,addEventListener(){}});
    window.eval(read(script.getAttribute('src').slice(1)));
    d.dispatchEvent(new window.Event('DOMContentLoaded'));
    assert.equal(menu.hidden, true);
    toggle.click();
    assert.equal(menu.hidden, false);
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(toggle.getAttribute('aria-controls'), menu.id);
  } finally { dom.window.close(); }
});

test('Get started opens the complete guide alongside the interactive demo and its narrated journey', () => {
  const dom = new JSDOM(read('index.html'));
  const guide = new JSDOM(read('guide.html'));
  try {
    const hero = dom.window.document.querySelector('.home-hero');
    assert.equal(hero.querySelector('#getStarted').getAttribute('href'), '/guide.html');
    assert.match(hero.querySelector('#getStarted').textContent, /Get started/);
    assert.ok(hero.querySelector('.home-hero-actions a[href="/demo/budget-review.html"]'));
    assert.deepEqual([...hero.querySelectorAll('.home-setup-path li')].map(li=>li.textContent), ['Install','Connect','Add a model','Create a report','Refresh']);
    assert.equal(guide.window.document.querySelectorAll('.guide-demo-link').length, 7);
    for (const a of guide.window.document.querySelectorAll('.guide-demo-link')) {
      assert.ok(fs.existsSync(path.join(root, a.getAttribute('href').split('?')[0])));
    }
  } finally { dom.window.close(); guide.window.close(); }
});
