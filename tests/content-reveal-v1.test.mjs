import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {JSDOM} from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(root, 'assets/content-reveal-v1.css'), 'utf8');
const script = fs.readFileSync(path.join(root, 'assets/content-reveal-v1.js'), 'utf8');

function fixture({initialize = true, reduced = false, missingObserver = false, missingMedia = false, failure = ''} = {}) {
  const dom = new JSDOM(`<!doctype html><html lang="en"><head>
    <style>.fade-in{opacity:0;transform:translateY(24px)}.fade-in.visible{opacity:1;transform:translateY(0)}</style>
    <style>${css}</style></head><body>
    <section id="first" class="fade-in"><h2>Useful content</h2><a href="/guide.html">Setup Guide</a></section>
    <a id="second" class="fade-in" href="/demos.html">All demos</a>
    </body></html>`, {url: 'https://aplan4sheets.com/', runScripts: 'outside-only'});
  const {window} = dom;
  const {document} = window;
  const mediaListeners = [];
  const media = {matches: reduced, addEventListener(type, listener) {assert.equal(type, 'change'); mediaListeners.push(listener);}};
  if (!missingMedia) window.matchMedia = query => {
    assert.equal(query, '(prefers-reduced-motion: reduce)');
    if (failure === 'media') throw new Error('Media preferences unavailable');
    return media;
  };
  const observers = [];
  if (!missingObserver) window.IntersectionObserver = class {
    constructor(callback) {
      if (failure === 'construct') throw new Error('Observer unavailable');
      this.callback = callback;
      this.observed = new Set();
      this.disconnected = false;
      observers.push(this);
    }
    observe(element) {
      if (failure === 'observe' && this.observed.size) throw new Error('Cannot observe more elements');
      this.observed.add(element);
    }
    unobserve(element) {
      if (failure === 'unobserve') throw new Error('Cannot unobserve element');
      this.observed.delete(element);
    }
    disconnect() {this.disconnected = true; this.observed.clear();}
  };
  const load = () => {window.eval(script); document.dispatchEvent(new window.Event('DOMContentLoaded'));};
  if (initialize) load();
  const visible = () => {
    for (const element of document.querySelectorAll('.fade-in')) {
      const style = window.getComputedStyle(element);
      assert.equal(style.opacity, '1', element.id + ' stays opaque');
      assert.equal(style.transform, 'none', element.id + ' has no waiting transform');
      assert.notEqual(style.display, 'none');
      assert.notEqual(style.visibility, 'hidden');
      assert.equal(element.hidden, false);
    }
  };
  return {window, document, observers, media, load, visible,
    intersect(ids) {observers[0].callback(ids.map(id => ({target: document.getElementById(id), isIntersecting: true})));},
    setReduced(matches) {media.matches = matches; for (const listener of mediaListeners) listener({matches});},
    close() {window.close();}};
}

test('Content and links remain visible with JavaScript absent, including legacy fade classes', () => {
  const f = fixture({initialize: false});
  try {
    f.visible();
    assert.equal(f.document.querySelector('.content-reveal-enter'), null);
    f.document.querySelector('#first a').focus();
    assert.equal(f.document.activeElement.getAttribute('href'), '/guide.html');
    assert.equal(f.window.getComputedStyle(f.document.getElementById('first')).opacity, '1');
  } finally {f.close();}
});

test('Missing and failing optional browser APIs leave content visible and unanimated', () => {
  for (const options of [{missingObserver: true}, {missingMedia: true}, {failure: 'media'}, {failure: 'construct'}, {failure: 'observe'}]) {
    const f = fixture(options);
    try {
      f.visible();
      assert.equal(f.document.querySelector('.content-reveal-enter'), null);
      if (options.failure === 'observe') assert.equal(f.observers[0].disconnected, true);
    } finally {f.close();}
  }
});

test('Intersection adds movement once without a pending invisible state and clears it on completion', () => {
  const f = fixture();
  try {
    f.visible();
    assert.equal(f.document.querySelector('.content-reveal-enter'), null);
    f.observers[0].callback([{target: f.document.getElementById('first'), isIntersecting: false}]);
    assert.equal(f.document.querySelector('.content-reveal-enter'), null);
    f.intersect(['first']);
    assert.equal(f.document.getElementById('first').classList.contains('content-reveal-enter'), true);
    f.visible();
    const end = new f.window.Event('animationend');
    Object.defineProperty(end, 'animationName', {value: 'content-reveal-v1'});
    f.document.getElementById('first').dispatchEvent(end);
    assert.equal(f.document.querySelector('.content-reveal-enter'), null);
    f.intersect(['first']);
    assert.equal(f.document.querySelector('.content-reveal-enter'), null, 'Already-seen content does not animate again');
    f.intersect(['second']);
    assert.equal(f.observers[0].disconnected, true);
    f.visible();
  } finally {f.close();}
});

test('Observer callback failures and reduced-motion changes cancel movement while preserving content', () => {
  const failed = fixture({failure: 'unobserve'});
  try {
    failed.intersect(['first']);
    assert.equal(failed.observers[0].disconnected, true);
    assert.equal(failed.document.querySelector('.content-reveal-enter'), null);
    failed.visible();
  } finally {failed.close();}
  const f = fixture();
  try {
    f.intersect(['first']);
    f.setReduced(true);
    assert.equal(f.observers[0].disconnected, true);
    assert.equal(f.document.querySelector('.content-reveal-enter'), null);
    f.intersect(['second']);
    assert.equal(f.document.querySelector('.content-reveal-enter'), null, 'A late callback cannot restore motion');
    f.visible();
  } finally {f.close();}
});

test('Reduced motion skips enhancement and CSS independently disables movement and transforms', () => {
  const f = fixture({reduced: true});
  try {
    f.visible();
    assert.equal(f.observers.length, 0);
    const rules = [...f.document.styleSheets[1].cssRules];
    const reduced = rules.find(rule => rule.conditionText === '(prefers-reduced-motion: reduce)');
    assert.ok(reduced, 'CSS must respect reduced motion even when JavaScript is blocked');
    const motionRule = [...reduced.cssRules].find(rule => rule.selectorText.includes('.fade-in'));
    for (const property of ['animation', 'transition', 'transform', 'translate']) {
      assert.equal(motionRule.style.getPropertyValue(property), 'none');
      assert.equal(motionRule.style.getPropertyPriority(property), 'important');
    }
    const animation = rules.find(rule => rule.name === 'content-reveal-v1');
    for (const frame of animation.cssRules) assert.equal(frame.style.getPropertyValue('opacity'), '', 'Entrance never fades content out');
  } finally {f.close();}
});

test('Keyboard-focused content is never moved when the observer reports it entering view', () => {
  const f = fixture();
  try {
    const link = f.document.querySelector('#first a');
    link.focus();
    f.intersect(['first']);
    assert.equal(f.document.querySelector('.content-reveal-enter'), null);
    assert.equal(f.document.activeElement, link);
    f.document.getElementById('second').focus();
    f.intersect(['second']);
    assert.equal(f.document.querySelector('.content-reveal-enter'), null);
    f.visible();
  } finally {f.close();}
});
