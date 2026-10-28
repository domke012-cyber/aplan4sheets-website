/* Read-only connector illustrations; interaction belongs to the shared player. */
(function (root) {
  'use strict';
  const data = root.ExportsData;
  const button = (text, primary = false, highlighted = false) => `<button type="button" disabled class="ex-mock-button${primary ? ' ex-primary' : ''}${highlighted ? ' ex-focus' : ''}">${text}</button>`;
  function report(which) {
    const report = data[which];
    return `<div class="ex-report"><p class="ex-kicker">FICTIONAL REPORT · USD MILLIONS</p><h3>${report.title}</h3><table aria-label="Fictional ${report.title}"><thead><tr>${report.headings.map(heading => `<th scope="col">${heading}</th>`).join('')}</tr></thead><tbody>${report.rows.map((row, index) => `<tr${index === report.rows.length - 1 ? ' class="ex-total"' : ''}><th scope="row">${row[0]}</th><td>${row[1]}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function emptySheet() {
    return '<div class="ex-empty-sheet"><div class="ex-sheet-columns" aria-hidden="true">A　　　　　 B　　　　　 C　　　　　 D</div><div class="ex-empty-note">Your selected report will appear in its destination tab after confirmation.</div></div>';
  }
  function sidebar(mode, highlight = false) {
    const isExport = mode === 'export';
    return `<aside class="ex-sidebar" aria-label="Illustrative aPlan4Sheets sidebar"><div class="ex-sidebar-brand">aPlan4Sheets <span>EXAMPLE</span></div><div class="ex-model-label">CONNECTED MODEL</div><div class="ex-model-name">Example Planning</div><div class="ex-card${isExport ? ' ex-card-open' : ''}"><h3>Export Actions <span aria-hidden="true">${isExport ? '⌃' : '⌄'}</span></h3>${isExport ? `<label class="ex-search-label" for="exportSearch">Search exports...</label><input id="exportSearch" class="ex-search" placeholder="Search exports..." value="Revenue" disabled><label class="ex-export-option"><input type="checkbox" checked disabled> Revenue Summary</label><p class="ex-selection-count">1 export selected</p>${button('Run Selected Exports', true, highlight)}` : ''}</div><div class="ex-card${!isExport ? ' ex-card-open' : ''}"><h3>Saved Views <span aria-hidden="true">${!isExport ? '⌃' : '⌄'}</span></h3>${!isExport ? `<div class="ex-module">⌄ Financial Planning</div><div class="ex-view ex-selected">Operating Results <span aria-hidden="true">✓</span></div><div class="ex-view">Revenue by Region</div>${button('Export View', true, highlight)}` : ''}</div><div class="ex-card ex-card-muted">Pivot Views <span aria-hidden="true">⌄</span></div></aside>`;
  }
  function confirmation(isExport) {
    const title = isExport ? 'Confirm exports' : 'Confirm export';
    const name = isExport ? data.exportReport.title : data.viewReport.title;
    return `<section class="ex-confirm" aria-label="Illustrative ${title} confirmation"><div class="ex-confirm-title"><span aria-hidden="true">!</span><h3>${title}</h3></div><p>Review the destination before continuing.</p><dl><div><dt>${isExport ? 'Selected export' : 'Saved view'}</dt><dd>${name}</dd></div><div><dt>Destination tab</dt><dd>${name}</dd></div></dl><p class="ex-warning"><strong>Existing destination data and formulas can be replaced.</strong> Choose Cancel to leave the workbook unchanged.</p><div class="ex-confirm-actions">${button('Cancel')}${button(title, true, true)}</div><p class="ex-caption">Illustrative confirmation — the installed connector shows your actual destination details.</p></section>`;
  }
  function screen(index) {
    const isExport = index < 3;
    const completed = index === 2 || index === 5;
    const pending = index === 1 || index === 4;
    return `<div class="ex-sheet-header"><span class="ex-sheets-symbol" aria-hidden="true">▤</span><div><strong>Example reporting workbook</strong><p>File　Edit　View　Insert　Format　Data　Tools　Extensions</p></div><span class="ex-demo-tag">DEMO</span></div><div class="ex-workspace"><div class="ex-sheet-area">${pending ? confirmation(isExport) : completed ? report(isExport ? 'exportReport' : 'viewReport') : emptySheet()}${completed ? '<div class="ex-success">✓ Report exported · fictional sample</div>' : ''}<div class="ex-sheet-tabs"><span${isExport ? ' class="ex-active"' : ''}>Revenue Summary</span>${index >= 3 ? `<span${!isExport ? ' class="ex-active"' : ''}>Operating Results</span>` : ''}</div></div>${sidebar(isExport ? 'export' : 'view', !completed && !pending)}</div>`;
  }
  function render(index) {
    const step = data.steps[index];
    document.body.dataset.exportsStep = index;
    document.getElementById('lessonCount').textContent = 'STEP ' + String(index + 1).padStart(2, '0') + ' OF 06';
    document.getElementById('lessonHeading').textContent = step.heading;
    document.getElementById('lessonTip').textContent = step.tip;
    document.getElementById('stepRail').innerHTML = data.steps.map((s, i) => `<li${i === index ? ' aria-current="step"' : ''}${i < index ? ' class="ex-completed"' : ''}><span>${i < index ? '✓' : i + 1}</span>${s.name}</li>`).join('');
    document.getElementById('exportsStage').innerHTML = screen(index);
    document.querySelector('.browser-frame').scrollTop = 0;
  }
  root.ExportsDemo = {
    create() {
      document.body.classList.toggle('embed-mode', new URLSearchParams(location.search).has('embed'));
      return new root.DemoPlayer({
        scenes: data.steps.map(({name, duration}) => ({name, duration})),
        captions: data.steps.map(step => step.caption),
        actions: data.steps.map((_, index) => () => render(index)),
        reset: () => render(0)
      });
    }
  };
})(window);
