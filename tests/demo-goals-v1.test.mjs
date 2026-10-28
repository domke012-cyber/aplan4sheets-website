import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'demos.html'), 'utf8');
const readPage = () => new JSDOM(source, { url: 'https://aplan4sheets.com/demos.html' });
const text = node => node.textContent.replace(/\s+/g, ' ').trim();
const groups = {
  'get-connected': ['marketplace-install', 'oauth-client', 'oauth-setup', 'setup'],
  'build-reports': ['formatted-ux', 'budget-review', 'pivot', 'exports', 'nested-selections', 'multi-module', 'discovery', 'ux-formatting'],
  automate: ['schedule'],
  'explore-ai': ['llm-agent']
};

test('Four native goal links reach complete, permanently available groups without filtering scripts', () => {
  const dom = readPage();
  try {
    const d = dom.window.document;
    const nav = d.querySelector('nav[aria-label="Choose a walkthrough goal"]');
    assert.ok(nav);
    assert.deepEqual([...nav.querySelectorAll('a')].map(a => a.hash), Object.keys(groups).map(id => '#' + id));
    for (const [id, slugs] of Object.entries(groups)) {
      const section = d.getElementById(id);
      assert.equal(section.tagName, 'SECTION');
      const heading = d.getElementById(section.getAttribute('aria-labelledby'));
      assert.equal(heading.tagName, 'H2');
      assert.ok(section.contains(heading));
      assert.equal(section.hidden, false);
      assert.equal(section.hasAttribute('aria-hidden'), false);
      const cards = [...section.querySelectorAll('[data-walkthrough]')];
      assert.deepEqual(cards.map(card => card.dataset.walkthrough), slugs);
      for (const card of cards) {
        assert.equal(card.tagName, 'A');
        assert.equal(card.getAttribute('href'), `/demo/${card.dataset.walkthrough}.html`);
        assert.ok(card.querySelector('h3'));
        assert.equal(card.querySelector('h2,button,a,input'), null, 'Cards have one link and the correct heading level');
        assert.equal(card.hidden, false);
        assert.ok(fs.existsSync(path.join(root, card.getAttribute('href'))));
      }
      assert.ok(section.querySelector('a[href="#choose-goal"]'));
    }
    assert.equal(d.querySelectorAll('#demoGrid [data-walkthrough]').length, 14);
    assert.equal(d.querySelector('[role="tab"], [role="tablist"], [role="tabpanel"]'), null);
    assert.equal(d.querySelector('#demoGrid button'), null);
  } finally { dom.window.close(); }
});

test('Structured demo list matches the visible cards exactly, including installation', () => {
  const dom = readPage();
  try {
    const d = dom.window.document;
    const list = [...d.querySelectorAll('script[type="application/ld+json"]')]
      .map(node => JSON.parse(node.textContent)).find(item => item['@type'] === 'ItemList');
    const expected = [...d.querySelectorAll('#demoGrid [data-walkthrough]')].map((card, index) => ({
      '@type': 'ListItem', position: index + 1, name: text(card.querySelector('h3')), url: card.href
    }));
    assert.equal(list.numberOfItems, 14);
    assert.deepEqual(list.itemListElement, expected);
    assert.equal(new Set(expected.map(item => item.url)).size, 14);
  } finally { dom.window.close(); }
});

test('The library distinguishes admin setup, connector users, and focused reporting tours truthfully', () => {
  const dom = readPage();
  try {
    const d = dom.window.document;
    const card = slug => d.querySelector(`[data-walkthrough="${slug}"]`);
    assert.match(text(card('oauth-client').querySelector('.demo-audience')), /Tenant security administrators/);
    assert.match(text(card('oauth-setup').querySelector('.demo-audience')), /approved client credentials/);
    assert.match(text(card('marketplace-install').querySelector('.demo-audience')), /Connector users/);
    assert.match(text(card('formatted-ux')), /complete workflow/);
    assert.match(text(card('discovery')), /focused tour covers choosing a combined grid/);
    assert.match(text(card('ux-formatting')), /formatting options/);
    assert.match(text(card('schedule')), /timing is approximate/);
    assert.match(text(card('llm-agent')), /separately configured pilot/);
    assert.match(text(d.querySelector('.demo-simulation-note')), /simulations using fictional data/);
    assert.match(text(d.querySelector('.demo-simulation-note')), /No sign-in is needed/);
    for (const card of d.querySelectorAll('[data-walkthrough]')) {
      assert.doesNotMatch(text(card.querySelector('.demo-format')), /minutes?|seconds?/i, 'Do not invent completion estimates');
    }
  } finally { dom.window.close(); }
});

test('Goal grouping preserves the connected setup path and existing resource destinations', () => {
  const dom = readPage();
  try {
    const d = dom.window.document;
    const pathBlock = d.querySelector('.setup-path');
    assert.ok(pathBlock.querySelector('a[href="/demo/marketplace-install.html"]'));
    assert.ok(pathBlock.querySelector('a[href="/guide.html"]'));
    assert.match(text(pathBlock), /Install → OAuth client → Connect → Add model → First report → Refresh/);
    assert.deepEqual([...d.querySelectorAll('.demo-resource-card')].map(a => a.getAttribute('href')), [
      '/blog/anaplan-google-sheets-connector-mac-chromebook.html',
      '/blog/anaplan-reporting-automation-google-sheets.html',
      '/blog/fluence-xl-axl-alternative-google-sheets.html'
    ]);
    assert.ok(d.querySelector('link[href="/assets/site-v1.css"]'));
    assert.ok(d.querySelector('link[href="/assets/demo-goals-v1.css"]'));
    assert.ok(d.querySelector('link[href="/assets/content-reveal-v1.css"]'));
    assert.ok(d.querySelector('script[src="/assets/content-reveal-v1.js"][defer]'));
    assert.doesNotMatch(source, /new IntersectionObserver|\.fade-in\s*\{/);
  } finally { dom.window.close(); }
});
