/* Self-paced browser-only walkthrough. No connector calls or customer data. */
(function () {
  'use strict';
  const D = window.FormattedUxData;
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let step = 0, selected = false, config = D.defaults(), report = null, busy = false, ready = false, generation = 0;
  let picker = null, draft = [], opener = null, expanded = new Set(['opex', ...D.hierarchy.filter(r => r.level === 1).map(r => r.id)]);
  const captions = [
    'Browse a familiar app → category → page structure. Start with Budget Review by Exec Owner; no backend model knowledge is needed.',
    'Inspect the source page and select its combined grid. Financials and commentary are two module regions inside one grid—not two unrelated exports.',
    'Open LISS_Budget Template to select hierarchy levels. Time and Executive Owner are already linked across both modules. The source formatting travels with the selection.',
    'Compare the exported Sheet with its source. Repivot keeps the configuration; Refresh rereads the same sample without changing your selections.'
  ];
  const status = message => { $('fxStatus').textContent = message; };
  const styleVars = { header: 'header-bg', text: 'header-fg', year: 'year-bg', forecast: 'forecast-bg', selected: 'selected-fg', favorable: 'favorable-text', unfavorable: 'unfavorable-text' };
  Object.entries(styleVars).forEach(([key, name]) => document.documentElement.style.setProperty('--fx-' + name, D.styles[key]));

  function letters(index) { let result = ''; for (let n = index + 1; n; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + (n - 1) % 26) + result; return result; }
  function tableHTML(data, sheet, formatted) {
    const layout = [];
    data.columns.forEach((column, index) => {
      if (index && column.group !== data.columns[index - 1].group) layout.push({ spacer: true });
      layout.push(column);
    });
    layout.push({ spacer: true }); // Separate the commentary module region.
    const count = layout.length + 2;
    const gutter = (row, heading = false) => sheet ? `<${heading ? 'th' : 'td'} class="fx-row-number">${row}</${heading ? 'th' : 'td'}><td class="fx-empty-column"></td>` : '';
    let html = '<thead>';
    if (sheet) {
      html += '<tr class="fx-column-letters"><th></th>' + Array.from({ length: count + 1 }, (_, i) => `<th>${letters(i)}</th>`).join('') + '</tr>';
      html += `<tr class="fx-sheet-blank">${gutter(1)}<td colspan="${count}"></td></tr>`;
      const metadata = [[2, 'Formatted UX · ' + data.config.sheetName], [3, 'Time: ' + data.time], [4, 'Executive Owner: ' + data.owner], [5, 'QTD: Actual vs Forecast · YTD: Actual vs Budget'], [6, 'USD in thousands · expense variance = actual less comparison']];
      html += metadata.map(([row, text]) => `<tr class="fx-sheet-metadata">${gutter(row)}<td colspan="${count}">${esc(text)}</td></tr>`).join('');
    }
    html += `<tr class="${formatted ? 'fx-financial-header' : ''}">${gutter(7, true)}<th scope="col" class="${formatted ? 'fx-label-header' : ''}">LISS_Budget Template</th>` + layout.map(c => c.spacer ? '<th class="fx-spacer" aria-hidden="true"></th>' : `<th scope="col" class="${formatted ? c.className : ''}" data-column="${c.id}">${esc(c.label)}</th>`).join('') + `<th scope="col" class="${formatted ? 'fx-variance-header' : ''}">Owner Commentary</th></tr></thead><tbody>`;
    const ordered = [];
    D.hierarchy.filter(row => row.level === 1).forEach(category => {
      const children = data.rows.filter(row => row.parent === category.id);
      if (children.length) ordered.push({ ...category, heading: true });
      ordered.push(...children);
      const subtotal = data.rows.find(row => row.id === category.id);
      if (subtotal) ordered.push({ ...subtotal, label: category.totalLabel });
    });
    const total = data.rows.find(row => row.level === 0);
    if (total) ordered.push(total);
    html += ordered.map((row, i) => {
      const summary = formatted && row.level < 2 ? (row.level === 0 ? 'fx-total' : row.heading ? 'fx-section-heading' : 'fx-summary') : '';
      if (row.heading) return `<tr class="${summary}" data-section="${row.id}">${gutter(i + 8)}<th scope="row" class="fx-row-label">${esc(row.groupLabel || row.label)}</th>${layout.map(c => `<td${c.spacer ? ' class="fx-spacer"' : ''}></td>`).join('')}<td></td></tr>`;
      return `<tr class="${summary}" data-row="${row.id}" data-level="${row.level}">${gutter(i + 8)}<th scope="row" class="fx-row-label">${esc(row.label)}</th>` + layout.map((c, j) => {
        if (c.spacer) return '<td class="fx-spacer" aria-hidden="true"></td>';
        const value = row.values[c.id], cellClass = formatted && c.conditionalFormatting ? D.varianceClass(value, c.varianceKind) : '';
        const text = D.format(value, c.format), addr = letters(j + 2) + (i + 8);
        return `<td class="fx-value ${cellClass}" data-row="${row.id}" data-column="${c.id}" data-value="${value === null ? '' : value}" data-format="${c.format}">${sheet ? `<button class="fx-cell-button" data-address="${addr}" data-raw="${value === null ? 'Blank' : value}" aria-label="${esc(addr + ': ' + row.label + ', ' + c.label + ', ' + text)}">${esc(text)}</button>` : esc(text)}</td>`;
      }).join('') + `<td class="fx-comment" data-row="${row.id}" data-column="comment"><span class="fx-comment-text" title="${esc(row.comment)}">${esc(row.comment)}</span></td></tr>`;
    }).join('');
    return html + '</tbody>';
  }
  function contextHTML(data) {
    return `<span>Time <b>${esc(data.time)}</b></span><span>Executive Owner <b>${esc(data.owner)}</b></span><span>Comparisons <b>Forecast · Budget · Prior year</b></span>`;
  }
  function renderSource() {
    const source = D.build({ ...D.defaults(), owner: config.owner, time: config.time });
    $('fxSourceContext').innerHTML = contextHTML(source);
    $('fxSourceTable').innerHTML = tableHTML(source, false, true);
    $('fxGridCard').classList.toggle('selected', selected);
    $('fxSelectGrid').setAttribute('aria-pressed', String(selected));
    $('fxGridLabel').textContent = selected ? '✓ Selected · Grid 1 — Budget Review' : 'Select · Grid 1 — Budget Review';
    $('fxSelectionStatus').textContent = selected ? 'Grid 1 · Budget Review + Owner Notes · 2 modules' : 'Select a grid to see its modules.';
    $('fxExportGrid').disabled = !selected;
    $('fxClearGrid').disabled = !selected;
  }
  function renderConfig() {
    $('fxRowsCount').textContent = config.rows.length + ' / ' + D.hierarchy.length + ' selected';
    $('fxColumnsCount').textContent = config.columns.length + ' / ' + D.columns.length + ' selected';
    $('fxTimeValue').textContent = config.time;
    $('fxOwnerValue').textContent = D.owners.find(o => o.id === config.owner).label;
    $('fxModuleProof').textContent = 'Budget Review and Owner Notes both use ' + config.time + ' · ' + D.owners.find(o => o.id === config.owner).label + '.';
    $('fxFormatting').checked = config.formatting;
    $('fxSheetName').value = config.sheetName;
    $('fxCreate').textContent = busy ? 'Creating sample sheet…' : report ? 'Apply Changes' : 'Create Pivot';
    $('fxCreate').hidden = ready;
    $('fxDone').hidden = !ready;
    $('fxCreate').disabled = busy || ready || !config.rows.length || !config.columns.length || !config.sheetName.trim();
    $('fxCancelConfig').disabled = busy;
    document.querySelectorAll('#fxConfig [data-picker], #fxFormatting, #fxSheetName').forEach(el => { el.disabled = busy || ready; });
  }
  function renderOutput() {
    if (!report) return;
    $('fxOutputTable').innerHTML = tableHTML(report, true, report.config.formatting);
    $('fxOutputTable').classList.toggle('fx-unformatted', !report.config.formatting);
    $('fxCompareTable').innerHTML = tableHTML(report, false, true);
    $('fxTabName').textContent = report.config.sheetName + ' ▾';
    $('fxCompareContext').textContent = report.time + ' · ' + report.owner + ' · ' + report.rows.length + ' selected data items. Section labels and subtotals retain their source order. Totals are not added to their detail.';
    $('fxParity').innerHTML = (report.config.formatting ? ['✓ QTD / PY / YTD structure', '✓ Headers & subtotal weights', '✓ Red/green text rules', '↔ Shared module context'] : ['UX formatting disabled', '✓ Same source values', '✓ Number formats retained', '↔ Shared module context']).map(t => '<span>' + esc(t) + '</span>').join('');
    $('fxFormula').textContent = report.config.sheetName + ' · ' + report.time + ' · ' + report.owner;
    $('fxCell').textContent = 'B2';
  }
  function showStep(next, focus = false) {
    step = next;
    ['fxDiscovery', 'fxSource', 'fxConfig', 'fxOutput'].forEach((id, index) => { $(id).hidden = index !== step; });
    $('fxCaption').textContent = captions[step];
    document.querySelectorAll('[data-step]').forEach(button => {
      if (Number(button.dataset.step) === step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
      button.disabled = busy || Number(button.dataset.step) === 2 && !selected || Number(button.dataset.step) === 3 && !report;
    });
    $('fxPrev').disabled = step === 0 || busy;
    $('fxNext').disabled = busy;
    $('fxNext').textContent = ['Open sample page →', selected ? 'Configure selected grid →' : 'Select this grid →', ready ? 'Review sample sheet →' : 'Create sample sheet →', 'Repivot this report →'][step];
    $('fxPage').toggleAttribute('data-active', step > 0);
    if (step > 0) $('fxPage').setAttribute('aria-current', 'page'); else $('fxPage').removeAttribute('aria-current');
    if (step === 1) renderSource();
    if (step === 2) renderConfig();
    if (step === 3) renderOutput();
    if (focus) { const heading = $([ 'fxDiscoveryTitle', 'fxSourceTitle', 'fxConfigTitle', 'fxOutputTitle' ][step]); heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
  function openPage() { if (busy) return; ready = false; showStep(1); status('Page loaded. Select the combined grid to configure it.'); }
  function selectGrid(value) { selected = value; renderSource(); showStep(1); status(value ? 'Selected Grid 1. Financials and commentary will be configured together.' : 'Grid selection cleared.'); }
  function configure() { if (!selected || busy) return; ready = false; showStep(2, true); status('Native selections loaded. Time and Executive Owner are automatically linked.'); }
  function repivot() { config = clone(report.config); ready = false; showStep(2, true); status('Saved configuration reopened. Both modules retain the same Time and Executive Owner.'); }
  function pickerItems() {
    if (picker === 'rows') return D.hierarchy;
    if (picker === 'columns') return D.columns.map(c => ({ ...c, level: 0 }));
    if (picker === 'owner') return D.owners.map(o => ({ ...o, level: o.parent ? 1 : 0 }));
    return D.periods.map(time => ({ id: time, label: time, level: 0 }));
  }
  function renderPicker() {
    // Keep keyboard focus when a selection updates the rendered hierarchy.
    const active = document.activeElement;
    const focusValue = active?.matches('#fxItems input') ? active.value : null;
    const focusExpand = active?.getAttribute('data-expand');
    const focusLevel = ['only', 'add', 'remove'].map(action => [action, active?.getAttribute('data-level-' + action)]).find(([, value]) => value !== null && value !== undefined);
    const single = ['owner', 'time'].includes(picker), term = $('fxItemSearch').value.trim().toLowerCase();
    const items = pickerItems(), matches = new Set();
    if (term) items.forEach(item => { if (item.label.toLowerCase().includes(term)) { matches.add(item.id); let parent = item.parent; while (parent) { matches.add(parent); parent = items.find(i => i.id === parent)?.parent; } } });
    function visible(item) {
      if (term) return matches.has(item.id);
      let parent = item.parent;
      while (parent) { if (!expanded.has(parent)) return false; parent = items.find(i => i.id === parent)?.parent; }
      return true;
    }
    $('fxItems').innerHTML = items.filter(visible).map(item => {
      const children = items.filter(i => i.parent === item.id), isExpanded = expanded.has(item.id) || Boolean(term);
      return `<li style="--depth:${item.level || 0}"><div class="fx-tree-line">${children.length ? `<button type="button" class="fx-expand" data-expand="${esc(item.id)}" aria-label="${isExpanded ? 'Collapse' : 'Expand'} ${esc(item.label)}" aria-expanded="${isExpanded}">${isExpanded ? '▾' : '▸'}</button>` : '<span class="fx-expand-spacer"></span>'}<label><input type="${single ? 'radio' : 'checkbox'}" name="fxItem" value="${esc(item.id)}" ${draft.includes(item.id) ? 'checked' : ''}><span>${esc(item.label)}</span></label>${children.length ? '<small>' + children.length + '</small>' : ''}</div></li>`;
    }).join('') || '<li class="fx-muted">No matching items.</li>';
    if (picker === 'rows') $('fxItems').querySelectorAll('input').forEach(input => {
      const ids = [input.value, ...D.descendants(input.value)];
      if (ids.length > 1) { const included = ids.filter(id => draft.includes(id)).length; input.indeterminate = included > 0 && included < ids.length; }
    });
    $('fxPickerCount').textContent = single ? 'One shared value for both modules' : draft.length + ' of ' + items.length + ' selected';
    $('fxApplyPicker').disabled = draft.length === 0;
    $('fxLevels').innerHTML = picker === 'rows' ? ['Total', 'Expense categories', 'Accounts'].map((label, level) => `<div><strong>${label} (${D.hierarchy.filter(r => r.level === level).length}):</strong><button class="fx-btn quiet" data-level-add="${level}">Select All</button><button class="fx-btn quiet" data-level-remove="${level}">Deselect All</button><button class="fx-btn" data-level-only="${level}">Only This</button></div>`).join('') : '';
    if (focusValue !== null) [...$('fxItems').querySelectorAll('input')].find(input => input.value === focusValue)?.focus();
    else if (focusExpand !== null && focusExpand !== undefined) [...$('fxItems').querySelectorAll('[data-expand]')].find(button => button.dataset.expand === focusExpand)?.focus();
    else if (focusLevel) [...$('fxLevels').querySelectorAll('button')].find(button => button.getAttribute('data-level-' + focusLevel[0]) === focusLevel[1])?.focus();
  }
  function openPicker(kind, target) {
    if (busy || ready) return;
    picker = kind; opener = target || document.activeElement;
    draft = ['owner', 'time'].includes(kind) ? [config[kind]] : [...config[kind]];
    expanded.add('all');
    const label = { rows: 'LISS_Budget Template', columns: 'Line Items', time: 'Time', owner: 'Executive Owner' }[kind];
    $('fxPickerTitle').textContent = 'Select Items: ' + label;
    const single = ['owner', 'time'].includes(kind);
    $('fxPickerKind').textContent = single ? 'LINKED PAGE FILTER · 2 MODULES' : 'PIVOT ' + (kind === 'rows' ? 'ROWS' : 'COLUMNS');
    $('fxPickerHelp').textContent = single ? 'Choose one shared ' + label + ' value for both grids. A parent is a single aggregate, not a selection of every child.' : kind === 'rows' ? 'Expand the hierarchy or select a level. Checking a parent includes its descendants; “Only This” selects just that level.' : 'Choose the financial line items to display. Commentary remains in its own module region.';
    $('fxItemSearch').value = '';
    $('fxHierarchyToggle').hidden = kind !== 'rows';
    $('fxHierarchyToggle').setAttribute('aria-expanded', 'false');
    $('fxHierarchyToggle').textContent = 'Show Hierarchy Selectors';
    $('fxLevels').hidden = true;
    $('fxSelectAll').hidden = single; $('fxSelectNone').hidden = single;
    renderPicker();
    if (typeof $('fxPicker').showModal === 'function') $('fxPicker').showModal(); else $('fxPicker').setAttribute('open', '');
    $('fxItemSearch').focus();
  }
  function closePicker() {
    if (typeof $('fxPicker').close === 'function') $('fxPicker').close(); else $('fxPicker').removeAttribute('open');
    picker = null; opener?.focus();
  }
  function applyPicker() {
    if (!draft.length) return;
    if (['owner', 'time'].includes(picker)) config[picker] = draft[0]; else config[picker] = [...draft];
    closePicker(); renderConfig(); status('Selection applied to the configuration. Create or Apply Changes to update the sample Sheet.');
  }
  function create() {
    if (busy || ready) return;
    config.sheetName = $('fxSheetName').value.trim();
    try { D.validate(config); } catch (error) { status(error.message); return; }
    const candidate = D.build(config), ticket = ++generation;
    busy = true; renderConfig(); showStep(2); status('Creating the sample Sheet from both module regions…');
    window.setTimeout(() => {
      if (ticket !== generation) return;
      report = candidate; busy = false; ready = true;
      renderConfig(); showStep(2); status('Sheet ready — select Done to close. ' + report.rows.length + ' selected data items, with section labels and ' + (report.columns.length + 1) + ' data columns.');
      $('fxDone').focus({ preventScroll: true });
    }, 450);
  }
  function done() { if (!ready || !report) return; ready = false; showStep(3, true); status('Sample Sheet ready. Values and formatting can be compared with the source below.'); }
  function restart() {
    ++generation; busy = false; ready = false; report = null; selected = false; config = D.defaults();
    if ($('fxPicker').open) closePicker();
    $('fxPageSearch').value = ''; $('fxApp').hidden = false; $('fxNoPages').hidden = true;
    $('fxApp').open = true; $('fxCategory').open = true;
    $('fxOutputTable').innerHTML = ''; $('fxCompareTable').innerHTML = '';
    $('fxRefresh').disabled = false; $('fxRepivot').disabled = false;
    expanded = new Set(['opex', ...D.hierarchy.filter(r => r.level === 1).map(r => r.id)]);
    showStep(0); status('Walkthrough reset. No files were created or changed.');
  }
  function refresh() {
    if (!report || busy) return;
    busy = true; const ticket = ++generation, snapshot = clone(report.config);
    $('fxRefresh').disabled = true; $('fxRepivot').disabled = true; showStep(3);
    status('Refreshing both module regions from the local sample…');
    window.setTimeout(() => {
      if (ticket !== generation) return;
      report = D.build(snapshot); busy = false; renderOutput(); showStep(3);
      $('fxRefresh').disabled = false; $('fxRepivot').disabled = false;
      status('Refresh complete. The sample source is unchanged; values, formatting and linked filters are preserved.');
    }, 450);
  }
  $('fxRestart').addEventListener('click', restart);
  $('fxExpand').addEventListener('click', () => {
    const expanded = document.querySelector('.fx-workspace').classList.toggle('expanded');
    $('fxExpand').setAttribute('aria-pressed', String(expanded));
    $('fxExpand').textContent = expanded ? 'Show UX navigation' : 'Expand report area';
  });
  ['fxOpenPage', 'fxPage'].forEach(id => $(id).addEventListener('click', openPage));
  $('fxBrowse').addEventListener('click', () => { if (busy) return; showStep(0); $('fxPageSearch').focus(); });
  $('fxPageSearch').addEventListener('input', event => {
    const match = 'northstar planning budget owner review budget review by exec owner'.includes(event.target.value.toLowerCase().trim());
    $('fxApp').hidden = !match; $('fxNoPages').hidden = match;
    if (match && event.target.value) { $('fxApp').open = true; $('fxCategory').open = true; }
  });
  $('fxDiscover').addEventListener('click', () => { status('Discovered 1 combined grid: Budget Review and Owner Notes. Select Grid 1 to continue.'); $('fxSelectGrid').focus(); });
  $('fxSelectGrid').addEventListener('click', () => selectGrid(true));
  $('fxClearGrid').addEventListener('click', () => selectGrid(false));
  $('fxExportGrid').addEventListener('click', configure);
  document.querySelectorAll('[data-picker]').forEach(button => button.addEventListener('click', () => openPicker(button.dataset.picker, button)));
  $('fxFormatting').addEventListener('change', event => { config.formatting = event.target.checked; status(config.formatting ? 'UX styling enabled for the next export.' : 'UX styling disabled. Source values and number formats remain unchanged.'); });
  $('fxSheetName').addEventListener('input', event => { config.sheetName = event.target.value; $('fxCreate').disabled = !config.sheetName.trim() || !config.rows.length || !config.columns.length; });
  $('fxCancelConfig').addEventListener('click', () => { if (report) { config = clone(report.config); showStep(3); } else { config = D.defaults(); showStep(1); } ready = false; status('Configuration changes discarded.'); });
  $('fxCreate').addEventListener('click', create); $('fxDone').addEventListener('click', done);
  $('fxRepivot').addEventListener('click', repivot); $('fxRefresh').addEventListener('click', refresh);
  $('fxNext').addEventListener('click', () => { if (busy) return; if (step === 0) openPage(); else if (step === 1) selected ? configure() : selectGrid(true); else if (step === 2) ready ? done() : create(); else repivot(); });
  $('fxPrev').addEventListener('click', () => { if (!busy && step > 0) { ready = false; showStep(step - 1); } });
  document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => { if (!busy) { const target = Number(button.dataset.step); if (target === 2) report && step === 3 ? repivot() : configure(); else if (target === 1) openPage(); else showStep(target); } }));
  ['fxClosePicker', 'fxCancelPicker'].forEach(id => $(id).addEventListener('click', closePicker));
  $('fxPicker').addEventListener('cancel', event => { event.preventDefault(); closePicker(); });
  $('fxPicker').addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closePicker(); } });
  $('fxApplyPicker').addEventListener('click', applyPicker);
  $('fxItemSearch').addEventListener('input', renderPicker);
  $('fxHierarchyToggle').addEventListener('click', () => { const show = $('fxLevels').hidden; $('fxLevels').hidden = !show; $('fxHierarchyToggle').setAttribute('aria-expanded', String(show)); $('fxHierarchyToggle').textContent = show ? 'Hide Hierarchy Selectors' : 'Show Hierarchy Selectors'; });
  $('fxSelectAll').addEventListener('click', () => { draft = pickerItems().map(i => i.id); renderPicker(); });
  $('fxSelectNone').addEventListener('click', () => { draft = []; renderPicker(); });
  $('fxLevels').addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    const action = ['only', 'add', 'remove'].find(a => button.hasAttribute('data-level-' + a)); if (!action) return;
    const ids = D.hierarchy.filter(r => r.level === Number(button.getAttribute('data-level-' + action))).map(r => r.id);
    draft = action === 'only' ? ids : action === 'add' ? [...new Set([...draft, ...ids])] : draft.filter(id => !ids.includes(id)); renderPicker();
  });
  $('fxItems').addEventListener('click', event => { const button = event.target.closest('[data-expand]'); if (!button) return; const id = button.dataset.expand; expanded.has(id) ? expanded.delete(id) : expanded.add(id); renderPicker(); });
  $('fxItems').addEventListener('change', event => {
    const input = event.target; if (!input.matches('input')) return;
    if (['owner', 'time'].includes(picker)) draft = [input.value];
    else { const ids = [input.value, ...(picker === 'rows' ? D.descendants(input.value) : [])]; draft = input.checked ? [...new Set([...draft, ...ids])] : draft.filter(id => !ids.includes(id)); }
    renderPicker();
  });
  $('fxOutputTable').addEventListener('click', event => { const button = event.target.closest('[data-address]'); if (!button) return; $('fxCell').textContent = button.dataset.address; $('fxFormula').textContent = button.dataset.raw + ' · underlying source value (USD for monetary measures)'; $('fxOutputTable').querySelectorAll('.fx-cell-selected').forEach(el => el.classList.remove('fx-cell-selected')); button.classList.add('fx-cell-selected'); });
  window.FormattedUxDemo = { snapshot: () => clone({ step, config, report, selected, busy }) };
  showStep(0);
})();
