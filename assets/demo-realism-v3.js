/* Public, fictional walkthrough chrome. No Google APIs, credentials or customer data. */
(function () {
  'use strict';
  function mount() {
    if (document.body.classList.contains('demo-realism')) return;
    document.body.classList.add('demo-realism');
    const toolbar = document.querySelector('.sheets-toolbar');
    if (toolbar) {
      const icon = toolbar.querySelector('.doc-icon');
      if (icon) icon.innerHTML = '<svg viewBox="0 0 32 40" aria-hidden="true"><path fill="#0f9d58" d="M3 0h19l10 10v27a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3"/><path fill="#87ceac" d="M22 0v10h10"/><path fill="none" stroke="white" stroke-width="1.6" d="M7 19h18v13H7zM7 24h18M7 28h18M13 19v13"/></svg>';
      const context = document.createElement('span');
      context.className = 'sheet-document-context';
      context.textContent = 'Sample workbook';
      toolbar.append(context);
      const menus = document.createElement('div');
      menus.className = 'sheet-menu-preview';
      menus.setAttribute('aria-label', 'Illustrative spreadsheet menus, not interactive');
      menus.innerHTML = '<span>File</span><span>Edit</span><span>View</span><span>Insert</span><span>Format</span><span>Data</span><span>Tools</span><span>Extensions</span><span>Help</span>';
      const tools = document.createElement('div');
      tools.className = 'sheet-format-preview';
      tools.setAttribute('aria-label', 'Illustrative spreadsheet toolbar, not interactive');
      tools.innerHTML = '<span class="sheet-tool-symbol">↶</span><span class="sheet-tool-symbol">↷</span><span class="sheet-tool-divider"></span><span>100% ▾</span><span class="sheet-tool-divider"></span><span>$</span><span>%</span><span>.0</span><span>.00</span><span>123 ▾</span><span class="sheet-tool-divider"></span><span>Arial ▾</span><span class="sheet-font-size">10</span><strong>B</strong><em>I</em><span class="sheet-text-color">A</span><span class="sheet-tool-divider"></span><span>▦</span><span>≡ ▾</span><span>⋮</span>';
      toolbar.after(menus, tools);
    }
    const disclosure = document.createElement('div');
    disclosure.className = 'demo-simulation-label';
    disclosure.textContent = 'Illustrative walkthrough · Fictional sample data · No live connection';
    const frame = document.querySelector('.browser-frame, .demo-shell');
    if (frame) frame.prepend(disclosure);
    else document.querySelector('.demo-controls')?.after(disclosure);

    document.addEventListener('click', event => {
      const cell = event.target.closest?.('.grid-table tbody td:not(.row-header)');
      if (!cell) return;
      const row = cell.parentElement;
      const rowNumber = row.querySelector('.row-header')?.textContent.trim();
      const table = cell.closest('table');
      const column = table.querySelectorAll('.col-header')[cell.cellIndex - 1]?.textContent.trim();
      if (!rowNumber || !column) return;
      table.querySelectorAll('.demo-selected-cell').forEach(item => item.classList.remove('demo-selected-cell'));
      cell.classList.add('demo-selected-cell');
      const ref = document.getElementById('cellRef');
      const formula = document.getElementById('formulaText') || document.getElementById('formulaValue');
      if (ref) ref.textContent = column + rowNumber;
      if (formula) formula.textContent = cell.dataset.formula || cell.dataset.value || cell.textContent.trim();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
