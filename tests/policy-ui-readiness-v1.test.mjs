import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const open = name => new JSDOM(read(name));
const text = node => node.textContent.replace(/\s+/g, ' ').trim();
const section = (document, heading) => [...document.querySelectorAll('main section')]
  .find(node => node.querySelector('h2')?.textContent === heading);

test('privacy distinguishes interactive authentication, Basic Auth and separately retained schedule records', () => {
  const dom = open('privacy.html');
  try {
    const d = dom.window.document;
    const access = text(section(d, 'Information We Access'));
    const storage = text(section(d, 'Information We Store'));
    const retention = text(section(d, 'Data Retention'));
    const rights = text(section(d, 'Your Rights'));
    assert.match(access, /Basic Auth, your Anaplan email and password are also retained/);
    assert.match(storage, /Apps Script Document Properties/);
    assert.match(storage, /Schedules can retain separate authentication records/);
    assert.match(storage, /Google-hosted execution service/);
    assert.match(retention, /current sign-in method's interactive tokens or Basic Auth credentials/);
    assert.match(retention, /does not remove saved OAuth client settings, schedules, separate schedule authentication records/);
    assert.match(retention, /successful schedule deletion stops its execution and removes its local schedule definition and schedule authentication record/);
    assert.match(retention, /not a promise to erase every server-side operational record/);
    assert.match(retention, /Uninstalling or ending use is not an automatic deletion request/);
    assert.match(rights, /Disable or delete scheduled exports.*check the confirmation/);
    assert.doesNotMatch(text(d.body), /Clear all stored credentials|Authentication tokens are encrypted|stored in Google Script Properties|Only the spreadsheets where you explicitly install/);
  } finally { dom.window.close(); }
});

test('terms describe retrieval and do not promise automatic erasure on termination', () => {
  const dom = open('terms.html');
  try {
    const d = dom.window.document;
    assert.match(text(section(d, '2. Description of Service')), /retrieves authorized Anaplan data into Google Sheets/);
    const termination = section(d, '8. Termination');
    assert.match(text(termination), /disable or delete scheduled refreshes and check the result, then sign out/);
    assert.match(text(termination), /does not automatically delete all stored authentication, configuration, or operational records/);
    assert.equal(termination.querySelector('a[href="/privacy.html"]').textContent, 'Privacy Policy');
    assert.ok(termination.querySelector('a[href="mailto:ryan.domke@aplan4sheets.com"]'));
    assert.doesNotMatch(text(d.body), /Upon termination, all stored credentials will be deleted|automated data synchronization between/);
  } finally { dom.window.close(); }
});

test('guide uses current menu, authentication, model and export labels with explicit destination consent', () => {
  const dom = open('guide.html');
  try {
    const d = dom.window.document;
    assert.match(text(d.getElementById('step-1')), /If the Extensions menu still shows the earlier name Anaplan Connector for Sheets™, it is the same add-on/);
    assert.match(text(d.getElementById('step-2')), /Open Sidebar/);
    assert.match(text(d.getElementById('step-2')), /Sign in to Anaplan, Set Up OAuth, or Set Up OAuth Credentials/);
    assert.match(text(d.getElementById('step-3')), /Sign-in method/);
    assert.match(text(d.getElementById('step-3')), /Sign in with Anaplan SSO/);
    assert.match(text(d.getElementById('step-3')), /Basic Auth retains your Anaplan email and password/);
    assert.match(text(d.getElementById('step-4')), /Tenant.*Workspace.*Model.*Save Model/);
    assert.match(text(d.getElementById('step-5')), /sidebar's "Repivot" control/);
    const exports = text(d.getElementById('step-6'));
    assert.match(exports, /Export Actions.*Run Selected Exports.*Saved Views.*Export View/);
    assert.match(exports, /Confirm exports.*Confirm export.*Cancel.*workbook unchanged/);
    assert.match(exports, /Existing destination data and formulas can be replaced/);
    assert.match(d.querySelector('#step-6 iframe').getAttribute('src'), /^\/demo\/exports\.html\?embed=1/);
    assert.match(text(d.getElementById('step-7')), /Select the saved reports.*number of selected configurations/);
    assert.doesNotMatch(text(d.body), /Pre-Defined Exports|Filter Views|Refresh Selected Exports|Login with Anaplan SSO|credentials are encrypted and stored securely/);
    assert.equal(d.querySelectorAll('iframe').length, 7, 'illustrative demo embeds are preserved');
  } finally { dom.window.close(); }
});

test('factual update preserves current-domain policy links, support, dates, and the existing listing ID', () => {
  for (const file of ['privacy.html', 'terms.html', 'guide.html']) {
    const source = read(file);
    assert.doesNotMatch(source, /anaplansheetsconnector\.com/);
    assert.match(source, /ryan\.domke@aplan4sheets\.com/);
    assert.match(source, /href=['"]\/privacy\.html['"]/);
    assert.match(source, /href=['"]\/terms\.html['"]/);
  }
  assert.match(read('privacy.html'), /Last Updated: October 27, 2026/);
  assert.match(read('terms.html'), /Effective Date: September 2, 2025 · Last Updated: October 27, 2026/);
  assert.match(read('guide.html'), /marketplace\/app\/aplan4sheets\/751768451107/);
});
