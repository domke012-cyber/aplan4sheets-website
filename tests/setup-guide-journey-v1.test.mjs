import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const readGuide = () => new JSDOM(fs.readFileSync(path.join(root, 'guide.html'), 'utf8'), {
  url: 'https://aplan4sheets.com/guide.html'
});
const text = node => node.textContent.replace(/\s+/g, ' ').trim();

test('Every silent guide preview links directly to its narrated, user-controlled walkthrough', () => {
  const dom = readGuide();
  try {
    const expected = [
      '/demo/marketplace-install.html',
      '/demo/setup.html',
      '/demo/oauth-setup.html',
      '/demo/setup.html?focus=model',
      '/demo/pivot.html',
      '/demo/exports.html',
      '/demo/schedule.html'
    ];
    const cards = [...dom.window.document.querySelectorAll('.guide-demo-card')];
    assert.equal(cards.length, expected.length);
    cards.forEach((card, i) => {
      const preview = card.querySelector('iframe');
      const link = card.querySelector('.guide-demo-caption a');
      assert.ok(link, `Step ${i + 1} needs an accessible narrated walkthrough link`);
      assert.match(text(card.querySelector('.guide-demo-caption')), /Silent preview/);
      assert.match(text(link), /Open narrated walkthrough/);
      assert.match(link.getAttribute('aria-label'), /Open narrated walkthrough: .+/);
      assert.equal(link.getAttribute('href'), expected[i]);
      const previewUrl = new URL(preview.src);
      assert.equal(previewUrl.searchParams.get('embed'), '1');
      assert.equal(previewUrl.searchParams.get('loop'), '1');
      previewUrl.searchParams.delete('embed');
      previewUrl.searchParams.delete('loop');
      assert.equal(previewUrl.href, link.href, 'The full walkthrough must match its preview, including the model entry point');
      const linkUrl = new URL(link.href);
      assert.equal(linkUrl.searchParams.has('embed'), false, 'Narration and controls must remain available');
    });
    const oauthClientLink = dom.window.document.querySelector('#step-3 a[href="/demo/oauth-client.html"]');
    assert.match(text(oauthClientLink), /Open narrated walkthrough/);
  } finally { dom.window.close(); }
});

test('First-pivot instructions create and verify the report before introducing Repivot', () => {
  const dom = readGuide();
  try {
    const steps = [...dom.window.document.querySelectorAll('#step-5 ol > li')].map(text);
    const selected = steps.findIndex(step => /Select items/.test(step));
    const create = steps.findIndex(step => /Click "Create Pivot"/.test(step));
    const verify = steps.findIndex(step => /Review the resulting Sheet/.test(step));
    const repivot = steps.findIndex(step => /"Repivot"/.test(step));
    assert.ok(selected >= 0 && selected < create && create < verify && verify < repivot);
    assert.match(steps[create], /write the report into Google Sheets.*completion message/);
    assert.match(steps[verify], /page filters, row and column headers.*values against the source Anaplan view/);
  } finally { dom.window.close(); }
});

test('Exports guidance uses the matching workflow and retains explicit destination confirmation', () => {
  const dom = readGuide();
  try {
    const section = dom.window.document.getElementById('step-6');
    assert.equal(new URL(section.querySelector('iframe').src).pathname, '/demo/exports.html');
    assert.match(text(section), /Export Actions.*Run Selected Exports.*Saved Views.*Export View/);
    assert.match(text(section), /Confirm exports.*Confirm export.*Existing destination data and formulas can be replaced.*Cancel.*workbook unchanged/);
    assert.doesNotMatch(text(section), /Demo labels may differ/);
    assert.equal(section.querySelector('a[href="/demo/discovery.html"]'), null);
  } finally { dom.window.close(); }
});
