/* Read-only illustrations. Only the shared player and handoff links interact. */
(function (root) {
  'use strict';
  const data = root.OAuthClientData;
  const mockButton = (label, focus = false) => `<button type="button" disabled class="mock-button primary${focus ? ' mock-focus' : ''}">${label}</button>`;
  const sidebar = `<aside class="admin-sidebar" aria-label="Illustrative administration menu"><div>Users</div><div>Models</div><div>Workspaces</div><div class="nav-section">Security</div><div>Single sign-on</div><div class="active">OAuth Clients</div><div>Audit</div></aside>`;
  function shell(content, withSidebar = true) {
    return `<div class="app-top"><span aria-hidden="true">☰</span><strong>anaplan</strong><span>Administration</span><span class="tenant">Example organization</span></div>${withSidebar ? '<div class="admin-body">' + sidebar : '<div>'}<div class="admin-content">${content}</div></div>`;
  }
  function form(step) {
    const isGrant = step === 4, isCallback = step === 5;
    return shell(`${step === 3 ? '<div class="panel-heading"><h3>OAuth Clients</h3>' + mockButton('New', true) + '</div>' : ''}<div class="client-form"><h3>Create OAuth 2.0 client</h3>
      <div class="mock-field"><label for="sampleName">Name</label><input id="sampleName" class="mock-input${step === 3 ? ' mock-focus' : ''}" value="${data.clientName}" disabled></div>
      <div class="mock-field"><span class="field-label">Type</span><div class="mock-input${isGrant ? ' mock-focus' : ''}">${step >= 4 ? 'Authorization code grant' : 'Select a grant type'} <span aria-hidden="true">⌄</span></div>${isGrant ? '<div class="grant-options"><div class="chosen">✓ Authorization code grant</div><div>Device grant</div></div>' : ''}</div>
      <div class="mock-field"><span class="field-label">Allowed callback URLs</span><div class="mock-input code${isCallback ? ' mock-focus' : ' blank'}">${isCallback ? data.callback : 'Paste the Redirect URI from your connector'}</div>${isCallback ? '<p class="mock-help">Example only — use your installed connector’s actual Redirect URI.</p>' : ''}</div>
      <div class="form-actions"><button type="button" class="mock-button" disabled>Cancel</button>${mockButton('Create client', isCallback)}</div>
      <p class="action-caption">${step === 3 ? 'Example action: New → enter Name' : isGrant ? 'Example selection: Authorization code grant' : 'Example action: check the callback → Create client'}</p>
    </div>`);
  }
  const screens = [
    () => `<div class="prep"><p class="eyebrow">BEFORE OPENING ANAPLAN ADMINISTRATION</p><h3>Get the callback from your connector</h3><span class="prep-role">Required role: tenant security administrator</span><div class="connector-card"><p class="eyebrow">ILLUSTRATIVE APLAN4SHEETS SETUP WIZARD</p><h4>OAuth connection details</h4><p class="muted">Extensions → aPlan4Sheets → Setup OAuth Credentials</p><div class="mock-field"><span class="field-label">Redirect URI <span class="sample-tag">EXAMPLE ONLY</span></span><div class="mock-input code">${data.callback}</div></div>${mockButton('Copy Redirect URI', true)}<p class="action-caption">Copy this from the installed connector, not from this demo.</p></div><p class="prep-check"><span aria-hidden="true">✓</span><span>Use an organizational account and your organization’s approved OAuth configuration.</span></p></div>`,
    () => shell(`<p class="eyebrow">TOP-LEFT NAVIGATION MENU</p><div class="app-menu"><div>Home</div><div>Apps</div><div>Models</div><div class="selected mock-focus">Administration</div></div><span class="path-chip">Administration → Security → <strong>OAuth Clients</strong></span><p class="action-caption">Example action: open Administration, then follow this path.</p>`, false),
    () => shell(`<div class="panel-heading"><h3>OAuth Clients</h3></div><div class="empty-state"><div class="symbol" aria-hidden="true">◇</div><h4>Enable OAuth for your tenant</h4><p class="muted">This prompt appears on first use.</p>${mockButton('Enable OAuth', true)}<p class="action-caption">Already see the client list? Go straight to New.</p></div>`),
    () => form(3), () => form(4), () => form(5),
    () => shell(`<div class="client-form"><div class="saved-status">✓ OAuth client created</div><h3>Client credentials</h3><div class="mock-field"><span class="field-label">Client name</span><div class="mock-input">${data.clientName}</div></div><div class="mock-field"><span class="field-label">Client ID <span class="sample-tag">SAMPLE</span></span><div class="mock-input code">${data.clientId}</div></div><div class="mock-field"><span class="field-label">Client secret</span><div class="mock-input code" aria-label="Sample client secret, masked">••••••••••••••••••••••••</div></div>${mockButton('Copy client secret', true)}<p class="action-caption">Keep both values securely for connector setup.</p><div class="form-actions">${mockButton('Done')}</div></div>`),
    () => shell(`<div class="panel-heading"><h3>OAuth Clients</h3>${mockButton('New')}</div><table class="client-list" aria-label="Example OAuth client list"><thead><tr><th>Client name</th><th>Status</th><th>Type</th></tr></thead><tbody><tr><td>${data.clientName}</td><td><span class="enabled">Enabled</span></td><td>Authorization code grant</td></tr></tbody></table><div class="handoff"><p class="eyebrow">NEXT · GOOGLE SHEETS</p><h4>Connect aPlan4Sheets</h4><p>Enter this client’s ID and secret in the installed connector’s OAuth setup wizard, then validate and sign in.</p><a id="continueSetup" href="/demo/oauth-setup.html">Continue to connector setup →</a></div><p class="muted">Your administrator can reopen the client from this list to view its details.</p>`)
  ];
  function render(index) {
    const step = data.steps[index];
    document.body.dataset.oauthStep = index;
    document.getElementById('lessonCount').textContent = 'STEP ' + String(index + 1).padStart(2, '0') + ' OF 08';
    document.getElementById('lessonHeading').textContent = step.heading;
    document.getElementById('lessonTip').textContent = step.tip;
    document.getElementById('windowLocation').textContent = index === 0 ? 'aPlan4Sheets · OAuth setup' : 'Anaplan · Administration';
    document.getElementById('stepRail').innerHTML = data.steps.map((s, i) => `<li${i === index ? ' aria-current="step"' : ''}${i < index ? ' class="completed"' : ''}><span>${i < index ? '✓' : i + 1}</span>${s.name}</li>`).join('');
    document.getElementById('adminStage').innerHTML = screens[index]();
    document.querySelector('.browser-frame').scrollTop = 0;
  }
  root.OAuthClientDemo = {
    create() {
      document.body.classList.toggle('embed-mode', new URLSearchParams(location.search).has('embed'));
      return new root.DemoPlayer({
        scenes:data.steps.map(({name, duration}) => ({name, duration})),
        captions:data.steps.map(step => step.caption),
        actions:data.steps.map((_, index) => () => render(index)),
        reset:() => render(0)
      });
    }
  };
})(window);
