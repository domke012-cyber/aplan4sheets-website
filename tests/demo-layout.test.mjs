import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const demos = fs.readdirSync(path.join(root, 'demo')).filter(file => file.endsWith('.html'));
const css = fs.readFileSync(path.join(root, 'assets/demo-responsive-v2.css'), 'utf8');

// JSDOM has no layout engine: these are stylesheet wiring/contract checks.
// Actual nested-overflow geometry is checked in the browser, including embeds.
function rules(stylesheet = css) {
  const dom = new JSDOM(`<style>${stylesheet}</style>`, { url: 'https://example.test/assets/layout-test.html' });
  const result = [];
  function visit(list, media = '') {
    for (const rule of list) {
      if (rule.selectorText) result.push({ selector: rule.selectorText, style: rule.style, media });
      if (rule.cssRules) visit(rule.cssRules, rule.conditionText || media);
    }
  }
  visit(dom.window.document.styleSheets[0].cssRules);
  dom.window.close();
  return result;
}

test('Every shared-player walkthrough uses the versioned nested-layout fix', () => {
  assert.match(css, /@import url\('\.\/demo-responsive\.css'\)/);
  for (const file of demos.filter(file => file !== 'formatted-ux.html')) {
    const dom = new JSDOM(fs.readFileSync(path.join(root, 'demo', file), 'utf8'));
    assert.equal(dom.window.document.querySelector('link[href*="demo-responsive"]')?.getAttribute('href'), '../assets/demo-responsive-v2.css', file);
    dom.window.close();
  }
});

test('Self-paced Formatted UX uses dedicated versioned CSS with responsive internal scrolling', () => {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'demo/formatted-ux.html'), 'utf8'));
  try {
    const stylesheets = Array.from(dom.window.document.querySelectorAll('link[rel="stylesheet"]'), link => link.getAttribute('href'));
    assert.deepEqual(stylesheets, ['../assets/formatted-ux-v6.css']);
    for (const id of ['fxOutputTable', 'fxCompareTable']) {
      assert.ok(dom.window.document.getElementById(id).closest('.fx-grid-scroll'), `${id} has a scrollable wrapper`);
    }
    assert.ok(dom.window.document.getElementById('fxSourceTable').closest('.fx-preview-table-wrap'), 'discovery structure is a compact thumbnail');
    const overrides = fs.readFileSync(path.join(root, 'assets/formatted-ux-v3.css'), 'utf8');
    const compact = fs.readFileSync(path.join(root, 'assets/formatted-ux-v4.css'), 'utf8');
    assert.match(compact, /@import\s+url\(['"](?:\.\/)?formatted-ux-v3\.css['"]\)/);
    assert.match(overrides, /@import\s+url\(['"](?:\.\/)?formatted-ux-v2\.css['"]\)/);
    const base = fs.readFileSync(path.join(root, 'assets/formatted-ux-v1.css'), 'utf8');
    const financial = fs.readFileSync(path.join(root, 'assets/formatted-ux-v2.css'), 'utf8');
    const list = rules(base + '\n' + financial.replace(/@import[^;]+;/g, '') + '\n' + overrides.replace(/@import[^;]+;/g, ''));
    assert.ok(list.some(rule => rule.selector.includes('.fx-grid-scroll') && rule.style.getPropertyValue('overflow-x') === 'auto' && rule.style.getPropertyValue('max-width') === '100%'));
    assert.ok(list.some(rule => rule.selector === '.fx-workbook-main' && rule.style.getPropertyValue('min-width') === '0'));
    assert.ok(list.some(rule => rule.media === '(max-width: 760px)' && rule.selector === '.fx-workspace' && rule.style.getPropertyValue('grid-template-columns') === 'minmax(0, 1fr)'));
    assert.ok(list.some(rule => rule.selector === '.fx-dimension-manager' && /minmax\(0,1fr\).*minmax\(0,1fr\)/.test(rule.style.getPropertyValue('grid-template-columns'))));
    assert.ok(list.some(rule => rule.media === '(max-width:760px)' && rule.selector === '.fx-dimension-manager' && rule.style.getPropertyValue('grid-template-columns') === 'minmax(0,1fr)'));
    assert.ok(list.some(rule => rule.selector === '.fx-pivot-dialog .fx-hierarchy' && rule.style.getPropertyValue('overflow-y') === 'auto'));
    assert.ok(list.some(rule => rule.selector === '.fx-app-dialog' && /100dvh/.test(rule.style.getPropertyValue('max-height'))));
    assert.ok(list.some(rule => rule.selector === '.fx-pivot-footer' && rule.style.getPropertyValue('flex-shrink') === '0'));
  } finally { dom.window.close(); }
});

test('AI cards wrap using available container width, without shrinking messages', () => {
  const list = rules();
  const cards = list.find(rule => rule.selector === '.kpi-strip');
  assert.match(cards.style.getPropertyValue('grid-template-columns'), /auto-fit.*min\(100%, 130px\)/);
  const bubble = list.find(rule => rule.selector === '.msg.ai .bubble');
  assert.equal(bubble.style.getPropertyValue('max-width'), 'calc(100% - 38px)');
  assert.equal(list.find(rule => rule.selector === '.msg').style.getPropertyValue('flex-shrink'), '0');
  assert.ok(list.some(rule => rule.selector.includes('.bubble') && rule.style.getPropertyValue('overflow-wrap') === 'anywhere'));
});

test('Embedded and standalone grids stack and scroll instead of being cropped', () => {
  const list = rules();
  assert.ok(list.some(rule => rule.selector.includes('body.embed-mode .browser-frame') && rule.style.getPropertyValue('height') === 'auto'));
  assert.ok(list.some(rule => rule.selector.includes('.grid-container') && rule.style.getPropertyValue('overflow') === 'auto'));
  assert.ok(list.some(rule => rule.media === '(max-width: 900px)' && rule.selector === 'body .main-area' && rule.style.getPropertyValue('flex-direction') === 'column'));
  assert.ok(list.some(rule => rule.media === '(max-width: 900px)' && rule.selector === 'body .main-area' && rule.style.getPropertyValue('overflow-y') === 'auto'));
  assert.ok(list.some(rule => rule.selector === 'body .main-area > .grid-area' && rule.style.getPropertyValue('min-height') === '120px'));
});

test('Narrow dialogs have one dimension column and scrollable contents', () => {
  const list = rules();
  assert.ok(list.some(rule => rule.selector.includes('.pivot-modal-content') && rule.style.getPropertyValue('overflow') === 'auto'));
  assert.ok(list.some(rule => rule.media === '(max-width: 640px)' && rule.selector === '.pivot-modal-content .dimension-manager' && rule.style.getPropertyValue('grid-template-columns') === 'minmax(0, 1fr)'));
});

test('The walkthrough hub loads a fresh preview URL when selecting a topic', () => {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'demo.html'), 'utf8'), { url: 'https://example.test/demo.html', runScripts: 'dangerously' });
  try {
    const link = dom.window.document.querySelector('a[href="/demo/llm-agent.html"]');
    link.click();
    assert.equal(dom.window.document.getElementById('walkthrough').src, 'https://example.test/demo/llm-agent.html?preview=2');
    assert.equal(dom.window.document.getElementById('fullScreenLink').getAttribute('href'), 'https://example.test/demo/llm-agent.html');
    assert.equal(link.getAttribute('aria-current'), 'true');
  } finally { dom.window.close(); }
});
