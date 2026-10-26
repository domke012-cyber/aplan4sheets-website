import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const readPolicy = file => new JSDOM(fs.readFileSync(path.join(root, file), 'utf8'));
const section = (document, heading) => [...document.querySelectorAll('main section')]
  .find(node => node.querySelector('h2')?.textContent === heading);
const text = node => node.textContent.replace(/\s+/g, ' ').trim();

test('policy identity and canonical URLs identify aPlan4Sheets with the existing listing alias', () => {
  for (const [file, heading] of [['privacy.html', 'Overview'], ['terms.html', '1. Acceptance of Terms']]) {
    const dom = readPolicy(file);
    try {
      const document = dom.window.document;
      assert.match(document.title, /aPlan4Sheets/);
      assert.equal(document.querySelector('link[rel="canonical"]').href, `https://aplan4sheets.com/${file}`);
      const identity = text(section(document, heading));
      assert.match(identity, /aPlan4Sheets \("the Add-on", also known as Anaplan Connector for Sheets™\)/);
      assert.match(document.querySelector('main > p').textContent, /Last Updated: October 26, 2026/);
      for (const link of document.querySelectorAll('a[href^="/"]')) {
        const target = link.getAttribute('href') === '/' ? 'index.html' : link.getAttribute('href').slice(1);
        assert.ok(fs.existsSync(path.join(root, target)), `${file}: ${target}`);
      }
    } finally { dom.window.close(); }
  }
});

test('terms permit only the provider processing already disclosed by the privacy policy', () => {
  const privacy = readPolicy('privacy.html');
  const terms = readPolicy('terms.html');
  try {
    const privacySharing = section(privacy.window.document, 'Data Sharing');
    const termsSharing = section(terms.window.document, '5. User Data and Privacy');
    const processing = text(privacySharing.querySelector('p'));
    assert.ok([...termsSharing.querySelectorAll('li')].some(item => text(item) === processing),
      'Terms must retain the privacy policy’s exact provider-processing scope and user-action conditions');
    assert.match(processing, /When you invoke an AI feature/);
    assert.match(processing, /Claude handoffs are optional.*separate user action/);
    assert.match(text(termsSharing), /We do not sell your data or use connector data for advertising/);
    assert.doesNotMatch(text(termsSharing), /do not sell or share your data/);
    assert.equal(termsSharing.querySelector('a').getAttribute('href'), '/privacy.html');
  } finally { privacy.window.close(); terms.window.close(); }
});

test('clarification retains the original terms effective date', () => {
  const dom = readPolicy('terms.html');
  try {
    assert.match(dom.window.document.querySelector('main > p').textContent, /Effective Date: September 2, 2025/);
  } finally { dom.window.close(); }
});
