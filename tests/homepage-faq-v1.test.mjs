import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const text = node => node.textContent.replace(/\s+/g, ' ').trim();
const openHome = () => new JSDOM(read('index.html'), { url: 'https://aplan4sheets.com/' });

test('The six FAQs use native disclosures that open independently without JavaScript', () => {
  const dom = openHome();
  try {
    const d = dom.window.document;
    const section = d.getElementById('faq');
    assert.ok(section);
    assert.equal(section.getAttribute('aria-labelledby'), 'faqHeading');
    assert.equal(d.getElementById('faqHeading').tagName, 'H2');
    const items = [...section.querySelectorAll('details.faq-item')];
    assert.equal(items.length, 6);
    assert.equal(new Set(items.map(item => item.id)).size, 6);
    assert.ok(items.every(item => /^faq-/.test(item.id)));
    for (const item of items) {
      const summary = item.firstElementChild;
      assert.equal(summary.tagName, 'SUMMARY');
      assert.ok(summary.classList.contains('faq-toggle'));
      assert.equal(summary.hasAttribute('aria-expanded'), false, 'Native summary owns its expanded state');
      assert.equal(summary.hasAttribute('role'), false, 'Native summary owns its disclosure semantics');
      assert.equal(summary.getAttribute('tabindex'), null, 'Keep native keyboard access');
      assert.equal(summary.querySelectorAll('button, a, input').length, 0);
      assert.ok(summary.querySelector(':scope > span:first-child'));
      assert.equal(summary.querySelector('.faq-icon').getAttribute('aria-hidden'), 'true');
      assert.equal(item.hasAttribute('name'), false, 'No exclusive disclosure group');
      assert.equal(item.open, false);
      summary.click();
      assert.equal(item.open, true, 'The native default action works with no page scripts running');
    }
    assert.ok(items.every(item => item.open), 'Opening a question leaves the other answers open');
    items[0].querySelector('summary').click();
    assert.equal(items[0].open, false);
    assert.ok(items.slice(1).every(item => item.open));
    assert.equal(section.querySelector('.fade-in'), null, 'FAQ content must not depend on a scroll script for visibility');
  } finally { dom.window.close(); }
});

test('FAQ answers use native disclosure visibility without hidden fields or height clipping', () => {
  const dom = openHome();
  try {
    const d = dom.window.document;
    const answers = [...d.querySelectorAll('#faq details.faq-item > .faq-answer')];
    assert.equal(answers.length, 6);
    for (const answer of answers) {
      assert.equal(answer.hasAttribute('hidden'), false);
      assert.equal(answer.hasAttribute('aria-hidden'), false);
      assert.doesNotMatch(answer.getAttribute('style') || '', /(?:max-)?height\s*:|display\s*:\s*none|visibility\s*:\s*hidden|overflow\s*:\s*hidden/i);
      assert.equal(answer.classList.contains('hidden'), false);
    }
    const styles = [...d.querySelectorAll('style')].map(node => node.textContent);
    for (const link of d.querySelectorAll('link[rel="stylesheet"][href]')) {
      const url = new URL(link.href);
      if (url.origin === 'https://aplan4sheets.com') styles.push(read(url.pathname.slice(1)));
    }
    for (const css of styles) {
      for (const [, selector, declarations] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!selector.includes('.faq-answer')) continue;
        assert.doesNotMatch(declarations, /(?:max-)?height\s*:|display\s*:\s*none|visibility\s*:\s*hidden|overflow(?:-y)?\s*:\s*hidden/i, `Answer visibility is native: ${selector.trim()}`);
      }
    }
  } finally { dom.window.close(); }
});

test('FAQ structured data exactly matches all six visible questions and answers', () => {
  const dom = openHome();
  try {
    const d = dom.window.document;
    const schemas = [...d.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent));
    const faqs = schemas.filter(schema => schema['@type'] === 'FAQPage');
    assert.equal(faqs.length, 1);
    const expected = [...d.querySelectorAll('#faq details.faq-item')].map(item => ({
      '@type': 'Question',
      name: text(item.querySelector('summary > span:first-child')),
      acceptedAnswer: { '@type': 'Answer', text: text(item.querySelector('.faq-answer')) }
    }));
    assert.equal(expected.length, 6);
    assert.deepEqual(faqs[0].mainEntity, expected);
    assert.doesNotMatch(text(d.getElementById('faq')), /\baPlan4S\b/);
  } finally { dom.window.close(); }
});

test('Getting started links to the real guide and optional installation walkthrough without a time guarantee', () => {
  const dom = openHome();
  try {
    const answer = dom.window.document.querySelector('#faq-start .faq-answer');
    assert.ok(answer.querySelector('a[href="/guide.html"]'));
    assert.ok(answer.querySelector('a[href="/demo/marketplace-install.html"]'));
    assert.ok(answer.querySelector('a[href="https://workspace.google.com/marketplace/app/anaplan_connector_for_sheets/751768451107"]'));
    assert.match(text(answer), /organization may need to approve installation and configure the OAuth client/);
    assert.doesNotMatch(text(answer), /in minutes|within \d+ minutes/i);
    for (const link of answer.querySelectorAll('a[href^="/"]')) {
      assert.ok(fs.existsSync(path.join(root, link.getAttribute('href'))));
    }
  } finally { dom.window.close(); }
});

test('Security FAQ distinguishes interactive and scheduled authentication and links to the full privacy policy', () => {
  const dom = openHome();
  const policy = new JSDOM(read('privacy.html'));
  try {
    const answer = dom.window.document.querySelector('#faq-security .faq-answer');
    const copy = text(answer);
    for (const statement of [
      'Interactive authentication state is retained in Google Apps Script storage.',
      'Schedules can retain separate authentication records in workbook-specific Apps Script storage and the Google-hosted execution service.'
    ]) {
      assert.ok(copy.includes(statement));
      assert.ok(text(policy.window.document.body).includes(statement), 'Security summary agrees with the policy');
    }
    assert.match(copy, /Basic Auth, your Anaplan email and password are also retained to authenticate and renew sessions/);
    assert.match(copy, /over HTTPS/);
    assert.equal(text(answer.querySelector('a[href="/privacy.html"]')), 'Privacy Policy');
    assert.match(copy, /full storage and retention details, AI processing, and operational usage records/);
    assert.doesNotMatch(copy, /Authentication details are retained in user-specific Google Apps Script storage/);
  } finally { dom.window.close(); policy.window.close(); }
});
