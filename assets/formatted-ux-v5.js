/* v5: context-aware next-step guidance and a restrained, finite action halo. */
(function () {
  'use strict';
  const D = window.FormattedUxData;
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const defaults = () => ({ ...D.defaults(), customName: false, hideZeros: false, keepFormatting: false,
    dashboard: { autoFitRows: true, freezeHeaders: true, hideGridlines: true } });
  let config = defaults(), report = null, step = 0, selected = false, discovered = false;
  let busy = false, ready = false, generation = 0, picker = null;
  const defaultLayout = () => ({ rows: ['rows', 'rowsM2'], columns: ['columns', 'columnsM2'], pages: ['time', 'owner', 'gaap', 'versions'] });
  const chipLabels = { rows: 'LISS_Budget Template', rowsM2: 'M2 LISS_Budget Template', columns: 'Line Items', columnsM2: 'M2 Line Items', time: 'Time', owner: 'Executive Owner', gaap: 'GAAP', versions: 'Versions' };
  const axisLabels = { rows: 'Rows', columns: 'Columns', pages: 'Pages' };
  // Positions are an illustrative UI draft, never query axes or saved report state.
  let layout = defaultLayout(), movingChip = null, draggedChip = null;
  const chipNodes = new Map();
  let expanded = new Set(['opex', 'all', 'FY26', 'Q2FY26', 'Q3FY26', ...D.hierarchy.filter(r => r.level === 1).map(r => r.id)]);
  const dashboardControls = { fxAutoFitRows: 'autoFitRows', fxFreezeHeaders: 'freezeHeaders', fxHideGridlines: 'hideGridlines' };
  const captions = [
    'Choose Browse UX Pages to open the sample app directory.',
    'Navigate app → category → page. Discover the grid structure, select the combined grid, then export it.',
    'Click a dimension on the right to select items on the left. Time and Executive Owner are already linked across both modules.',
    'Your formatted report is ready. Explore the Sheet, or use Repivot to try different selections.'
  ];
  let guidedTarget = null, guidedDescription = null;
  function highlightNext(target, description) {
    // Leave keyboard focus and unrelated descriptions alone during updates.
    if (guidedTarget === target && guidedDescription === description) return;
    if (guidedTarget) {
      guidedTarget.classList.remove('fx-next-action');
      const remaining = (guidedTarget.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== guidedDescription);
      if (remaining.length) guidedTarget.setAttribute('aria-describedby', remaining.join(' '));
      else guidedTarget.removeAttribute('aria-describedby');
    }
    guidedTarget = target; guidedDescription = description;
    if (!target) return;
    target.classList.add('fx-next-action');
    target.setAttribute('aria-describedby', [...new Set([...(target.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean), description])].join(' '));
  }
  function renderGuide() {
    let target = null, text = '', description = 'fxCaption';
    const dim = kind => document.querySelector('[data-picker="' + kind + '"]');
    $('fxGuideLabel').textContent = step === 3 ? 'Complete · Step 4 of 4' : 'Next · Step ' + (step + 1) + ' of 4';
    if ($('fxPivotDialog').open) {
      description = 'fxPivotGuideText';
      $('fxPivotGuideLabel').textContent = busy ? 'Working · Step 3 of 4' : ready ? 'Ready · Step 3 of 4' : 'Next · Step 3 of 4';
      if (busy) text = 'Creating your sample Sheet. The next action will appear when it is ready.';
      else if (ready) { target = $('fxCancelConfig'); text = 'Your Sheet is ready. Choose Done to close this window and review the report.'; }
      else if (!config.rows.length || !config.columns.length) {
        const missing = !config.rows.length ? 'rows' : 'columns';
        target = picker === missing ? $('fxSelectAll') : dim(missing);
        text = 'Select at least one ' + (missing === 'rows' ? 'row' : 'line item') + ' before creating the Sheet.';
      } else if (!picker) {
        target = dim('rows');
        text = 'Start with LISS_Budget Template to choose rows. Or keep the sample selections and choose Create Pivot.';
      } else if (picker === 'rows' && $('fxLevels').hidden) {
        target = $('fxHierarchyToggle');
        text = 'Open Show Hierarchy Selectors to choose an entire level, or pick individual rows below.';
      } else {
        target = $('fxCreate');
        text = 'When your selections look right, choose Create Pivot. You can still explore the other dimensions.';
      }
    } else if ($('fxUxDialog').open) {
      description = 'fxUxGuideText';
      if ($('fxApp').hidden) { target = $('fxPageSearch'); text = 'No matching page. Clear or change your search to continue.'; }
      else if (!$('fxApp').open) { target = $('fxApp').querySelector('summary'); text = 'Open Northstar Planning to see its UX categories.'; }
      else if (!$('fxCategory').open) { target = $('fxCategory').querySelector('summary'); text = 'Open Budget Owner Review to find the sample page.'; }
      else if (!discovered) { target = $('fxDiscover'); text = 'Choose Discover modules beside Budget Review by Exec Owner.'; }
      else if (!selected) { target = $('fxSelectGrid'); text = 'Select Grid 1 — Budget Review by clicking its heading or preview.'; }
      else { target = $('fxExportGrid'); text = 'Grid selected. Choose Export selected grid to configure your report.'; }
    } else if (step === 0) target = $('fxNext');
    if (description !== 'fxCaption' && $(description).textContent !== text) $(description).textContent = text;
    highlightNext(busy ? null : target, description);
  }
  const status = message => { $('fxStatus').textContent = message; };
  const styleVars = { header: 'header-bg', text: 'header-fg', year: 'year-bg', forecast: 'forecast-bg', selected: 'selected-fg', favorable: 'favorable-text', unfavorable: 'unfavorable-text' };
  Object.entries(styleVars).forEach(([key, name]) => document.documentElement.style.setProperty('--fx-' + name, D.styles[key]));
  const closeDialog = id => { if ($(id).open) $(id).close(); };
  function openDialog(id, modal) { if (!$(id).open) { if (modal) $(id).showModal(); else $(id).show(); } }
  function chipAxis(id) { return Object.keys(layout).find(axis => layout[axis].includes(id)); }
  function renderMoveControls() {
    $('fxChipMoveMenu').hidden = !movingChip;
    ['fxChipAxis', 'fxChipEarlier', 'fxChipLater', 'fxChipMoveClose'].forEach(id => { $(id).disabled = busy || ready; });
    if (!movingChip) return;
    const axis = chipAxis(movingChip), index = layout[axis].indexOf(movingChip);
    $('fxChipMoveTitle').textContent = 'Rearrange ' + chipLabels[movingChip];
    $('fxChipAxis').value = axis;
    $('fxChipAxis').disabled = busy || ready;
    $('fxChipEarlier').disabled = busy || ready || index === 0;
    $('fxChipLater').disabled = busy || ready || index === layout[axis].length - 1;
    $('fxChipMoveClose').disabled = busy || ready;
    chipNodes.forEach((node, id) => node.querySelector('[data-move-chip]').setAttribute('aria-expanded', String(id === movingChip)));
  }
  function endDrag() {
    draggedChip = null;
    document.querySelectorAll('.is-dragging, .is-drag-over').forEach(node => node.classList.remove('is-dragging', 'is-drag-over'));
  }
  function renderLayout() {
    Object.entries(layout).forEach(([axis, ids]) => {
      const list = document.querySelector('[data-axis-zone="' + axis + '"] .fx-chip-list');
      ids.forEach(id => {
        const node = chipNodes.get(id);
        // Reuse the original nodes: counts, picker events, and linked badges survive moves.
        list.append(node); node.draggable = !busy && !ready;
        node.querySelector('[data-move-chip]').disabled = busy || ready;
      });
      list.classList.toggle('is-empty', !ids.length);
    });
    $('fxResetLayout').disabled = busy || ready;
    renderMoveControls();
  }
  function closeMoveControls(restoreFocus = true) {
    const previous = movingChip; movingChip = null;
    $('fxChipMoveMenu').hidden = true;
    chipNodes.forEach(node => node.querySelector('[data-move-chip]').setAttribute('aria-expanded', 'false'));
    if (restoreFocus && previous) chipNodes.get(previous).querySelector('[data-move-chip]').focus({ preventScroll: true });
  }
  function resetLayout() {
    endDrag(); closeMoveControls(false); layout = defaultLayout(); renderLayout();
  }
  function moveChip(id, targetAxis, beforeId = null) {
    if (busy || ready || !chipNodes.has(id) || !Object.hasOwn(layout, targetAxis)) return;
    if (beforeId === id || beforeId !== null && !layout[targetAxis].includes(beforeId)) return;
    const oldAxis = chipAxis(id);
    layout[oldAxis] = layout[oldAxis].filter(value => value !== id);
    const index = beforeId === null ? layout[targetAxis].length : layout[targetAxis].indexOf(beforeId);
    layout[targetAxis].splice(index, 0, id);
    renderLayout();
    $('fxLayoutStatus').textContent = chipLabels[id] + ' moved to ' + axisLabels[targetAxis] + ', position ' + (index + 1) + '. Layout preview only; the sample output stays in Budget Review format.';
  }
  function initializeChips() {
    const zones = document.querySelectorAll('.fx-dimension-zones > .fx-zone');
    Object.entries(layout).forEach(([axis, ids], index) => {
      const zone = zones[index]; zone.dataset.axisZone = axis;
      zone.setAttribute('aria-label', axisLabels[axis] + ' dimension drop area');
      const list = document.createElement('div'); list.className = 'fx-chip-list';
      const chips = Array.from(zone.querySelectorAll(':scope > .fx-dim'));
      zone.querySelector('h3').after(list);
      chips.forEach((chip, i) => {
        const id = ids[i], wrapper = document.createElement('div');
        wrapper.className = 'fx-chip-wrap'; wrapper.dataset.chipId = id;
        wrapper.setAttribute('aria-describedby', 'fxLayoutNote');
        const move = document.createElement('button');
        move.type = 'button'; move.className = 'fx-chip-move'; move.dataset.moveChip = id;
        move.textContent = '↕'; move.setAttribute('aria-label', 'Rearrange ' + chipLabels[id]);
        move.setAttribute('aria-controls', 'fxChipMoveMenu'); move.setAttribute('aria-expanded', 'false');
        move.title = 'Drag this chip or open rearrange controls';
        wrapper.append(chip, move); list.append(wrapper); chipNodes.set(id, wrapper);
        move.addEventListener('click', () => {
          if (busy || ready) return;
          movingChip = id; renderMoveControls(); $('fxChipAxis').focus();
        });
        wrapper.addEventListener('dragstart', event => {
          if (busy || ready) { event.preventDefault(); return; }
          draggedChip = id; closeMoveControls(false); wrapper.classList.add('is-dragging');
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', id);
          }
        });
        wrapper.addEventListener('dragend', endDrag);
      });
      zone.addEventListener('dragover', event => {
        if (!draggedChip || busy || ready) return;
        event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        document.querySelectorAll('.is-drag-over').forEach(node => node.classList.remove('is-drag-over'));
        zone.classList.add('is-drag-over');
      });
      zone.addEventListener('dragleave', event => {
        if (!zone.contains(event.relatedTarget)) zone.classList.remove('is-drag-over');
      });
      zone.addEventListener('drop', event => {
        // Ignore external text/files: only a chip dragged in this dialog is accepted.
        if (!draggedChip || busy || ready) return;
        event.preventDefault();
        const id = draggedChip, target = event.target.closest('[data-chip-id]');
        moveChip(id, axis, target?.dataset.chipId || null); endDrag();
        chipNodes.get(id).querySelector('[data-move-chip]').focus({ preventScroll: true });
      });
    });
    $('fxChipAxis').addEventListener('change', event => { if (movingChip) moveChip(movingChip, event.target.value); });
    $('fxChipEarlier').addEventListener('click', () => {
      if (!movingChip) return;
      const axis = chipAxis(movingChip), index = layout[axis].indexOf(movingChip);
      if (index > 0) moveChip(movingChip, axis, layout[axis][index - 1]);
    });
    $('fxChipLater').addEventListener('click', () => {
      if (!movingChip) return;
      const axis = chipAxis(movingChip), index = layout[axis].indexOf(movingChip);
      if (index < layout[axis].length - 1) moveChip(movingChip, axis, layout[axis][index + 2] || null);
    });
    $('fxChipMoveClose').addEventListener('click', () => closeMoveControls());
    $('fxChipMoveMenu').addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeMoveControls(); }
    });
    $('fxResetLayout').addEventListener('click', () => {
      if (busy || ready) return;
      resetLayout(); $('fxLayoutStatus').textContent = 'Original Budget Review chip layout restored.';
    });
  }
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
  function buildReport(saved) {
    const result = D.build(saved);
    // A page filter remains one aggregate; hiding rows does not recalculate totals.
    if (saved.hideZeros) result.rows = result.rows.filter(row => row.level < 2 ||
      result.columns.some(column => row.values[column.id] !== null && row.values[column.id] !== 0) ||
      Boolean(row.comment && row.comment.trim()));
    return result;
  }
  function renderSource() {
    const cols = D.columns.slice(0, 7);
    const rows = D.hierarchy.filter(r => r.level > 0).slice(0, 7);
    $('fxSourceTable').innerHTML = '<thead><tr><th>LISS_Budget Template</th>' +
      cols.map(c => '<th>' + esc(c.label) + '</th>').join('') + '<th>Owner Commentary</th></tr></thead><tbody>' +
      rows.map(r => '<tr><th>' + esc(r.groupLabel || r.label) + '</th>' + cols.map(() => '<td></td>').join('') + '<td></td></tr>').join('') + '</tbody>';
    $('fxSource').hidden = !discovered;
    $('fxGridCard').classList.toggle('selected', selected);
    $('fxSelectGrid').setAttribute('aria-pressed', String(selected));
    $('fxGridLabel').textContent = 'Grid 1 — Budget Review';
    $('fxSelectionStatus').textContent = selected ? '✓ Selected · Grid 1' : 'Select a grid to see its modules';
    $('fxModuleReference').textContent = selected ? 'Budget Review [Combined Grid Section 1 of 2] · Owner Commentary [Combined Grid Section 2 of 2]' : 'Click, Enter or Space to keep a selection, then choose Export.';
    $('fxExportGrid').disabled = !selected || busy;
    $('fxClearGrid').disabled = !selected || busy;
  }
  function renderConfig() {
    ['rows', 'columns'].forEach(kind => {
      const total = kind === 'rows' ? D.hierarchy.length : D.columns.length;
      const stem = kind === 'rows' ? 'fxRows' : 'fxColumns';
      $(stem + 'Count').textContent = total + ' items';
      $(stem + 'Selection').textContent = config[kind].length === total ? 'All' : config[kind].length + '/' + total;
      $(stem + 'Selection').classList.toggle('partial', config[kind].length !== total);
    });
    const owner = D.owners.find(o => o.id === config.owner).label;
    $('fxTimeValue').textContent = '1/' + D.periods.length;
    $('fxOwnerValue').textContent = '1/' + D.owners.length;
    $('fxTimeValue').title = config.time; $('fxOwnerValue').title = owner;
    $('fxModuleProof').textContent = 'Budget Review and Owner Commentary both use ' + config.time + ' · ' + owner + '.';
    $('fxFormatting').checked = Object.values(config.dashboard).every(Boolean);
    $('fxFormatting').indeterminate = Object.values(config.dashboard).some(Boolean) && !$('fxFormatting').checked;
    $('fxDashboardState').textContent = $('fxFormatting').indeterminate ? 'Custom' : $('fxFormatting').checked ? 'On' : 'Off';
    Object.entries(dashboardControls).forEach(([id, key]) => { $(id).checked = config.dashboard[key]; });
    $('fxCustomName').checked = config.customName;
    $('fxSheetNameWrap').hidden = !config.customName;
    // Preserve an input's caret while inline validation updates the footer.
    if ($('fxSheetName').value !== config.sheetName) $('fxSheetName').value = config.sheetName;
    $('fxHideZeros').checked = config.hideZeros;
    $('fxKeepFormatting').checked = config.keepFormatting;
    $('fxCreate').textContent = 'Create Pivot';
    $('fxCreate').hidden = false;
    $('fxCreate').disabled = busy || ready || !config.rows.length || !config.columns.length;
    $('fxCancelConfig').textContent = ready ? '✓ Done' : 'Cancel';
    $('fxCancelConfig').classList.toggle('primary', ready);
    $('fxCancelConfig').disabled = busy;
    $('fxClosePivot').disabled = busy;
    $('fxCompletionStatus').textContent = ready ? 'Sheet ready — select Done to close.' : busy ? 'Creating your sample Sheet…' : '';
    document.querySelectorAll('#fxConfig input:not([data-reference]), #fxConfig button:not([data-reference])').forEach(el => { el.disabled = busy || ready; });
    ['fxMergeHeaders', 'fxGroupSetup', 'fxGroupHierarchy'].forEach(id => { $(id).disabled = true; });
    document.querySelectorAll('[data-picker]').forEach(el => { el.classList.toggle('active', el.dataset.picker === picker); });
    renderLayout();
    renderGuide();
  }
  function renderOutput() {
    $('fxBlankGrid').hidden = Boolean(report);
    $('fxOutput').hidden = !report;
    $('fxParity').hidden = !report;
    $('fxComparison').hidden = !report;
    if (!report) return;
    $('fxOutputTable').innerHTML = tableHTML(report, true, true);
    $('fxCompareTable').innerHTML = tableHTML(report, false, true);
    Object.entries({ autoFitRows: 'fx-auto-fit', freezeHeaders: 'fx-freeze-headers', hideGridlines: 'fx-hide-gridlines' })
      .forEach(([key, className]) => $('fxOutputTable').classList.toggle(className, report.config.dashboard[key]));
    $('fxTabName').textContent = report.config.sheetName + ' ▾';
    $('fxCompareContext').textContent = report.time + ' · ' + report.owner + ' · ' + report.rows.length + ' displayed data items. Section labels and subtotals retain their source order.';
    $('fxParity').innerHTML = ['✓ UX headers & subtotal weights', '✓ Source number formats', '✓ Red/green text rules', '↔ Shared module context'].map(t => '<span>' + esc(t) + '</span>').join('');
    $('fxFormula').textContent = report.config.sheetName + ' · ' + report.time + ' · ' + report.owner;
    $('fxCell').textContent = 'B2';
  }
  function showStep(next) {
    step = next;
    $('fxCaption').textContent = captions[step];
    document.querySelectorAll('[data-step]').forEach(button => {
      const index = Number(button.dataset.step);
      if (index === step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
      button.disabled = busy || index === 2 && !selected || index === 3 && !report;
    });
    $('fxPrev').disabled = step === 0 || busy;
    $('fxNext').disabled = busy || step === 2 && !ready && $('fxCreate').disabled;
    $('fxNext').textContent = ['Browse UX Pages →', discovered ? (selected ? 'Configure selected grid →' : 'Select this grid →') : 'Discover page modules →', ready ? 'Review sample sheet →' : 'Create sample sheet →', 'Repivot this report →'][step];
    $('fxBrowse').disabled = busy;
    $('fxRefresh').disabled = !report || busy;
    $('fxRepivot').disabled = !report || busy;
    renderGuide();
  }
  function browse() {
    if (busy) return;
    if ($('fxPivotDialog').open) cancelConfig();
    closeDialog('fxPivotDialog');
    showStep(1); renderSource(); openDialog('fxUxDialog', false);
    renderGuide();
    (guidedTarget || $('fxPageSearch')).focus({ preventScroll: true });
    status('Browse the app and category, then discover the page modules.');
  }
  function closeUx() {
    closeDialog('fxUxDialog'); showStep(report ? 3 : 0); $('fxBrowse').focus();
  }
  function discover() {
    if (busy) return;
    discovered = true; $('fxApp').open = true; $('fxCategory').open = true;
    $('fxPage').setAttribute('aria-current', 'page'); renderSource(); showStep(1);
    status('Grid structure discovered. Select the combined grid to continue.');
  }
  function selectGrid(value) {
    if (!discovered || busy) return;
    selected = value; renderSource(); showStep(1);
    status(value ? 'Combined grid selected: financials and commentary will be configured together.' : 'Grid selection cleared.');
  }
  function resetPicker() {
    picker = null; $('fxPickerContent').hidden = true; $('fxPickerEmpty').hidden = false;
    $('fxPickerTitle').textContent = 'Item Selector';
    $('fxPickerHelp').textContent = 'Click on a dimension to select items';
  }
  function configure(fromReport = false) {
    if (busy || (!selected && !fromReport)) return;
    if (fromReport && report) config = clone(report.config);
    ready = false; resetLayout(); resetPicker(); $('fxProgress').hidden = true;
    closeDialog('fxUxDialog'); renderConfig(); showStep(2); openDialog('fxPivotDialog', true);
    $('fxConfig').scrollTop = 0;
    renderGuide();
    guidedTarget?.focus({ preventScroll: true });
    status('Native selections loaded. Time and Executive Owner are automatically linked across both modules.');
  }
  function cancelConfig() {
    if (busy) return;
    if (ready) { done(); return; }
    config = report ? clone(report.config) : defaults(); ready = false; resetLayout(); resetPicker();
    closeDialog('fxPivotDialog'); showStep(report ? 3 : 0);
    (report ? $('fxRepivot') : $('fxBrowse')).focus();
    status('Configuration closed. Unapplied selections were discarded.');
  }
  function pickerItems() {
    if (picker === 'rows') return D.hierarchy;
    if (picker === 'columns') return D.columns.map(c => ({ ...c, level: 0 }));
    if (picker === 'owner') return D.owners.map(o => ({ ...o, level: o.parent ? 1 : 0 }));
    return [
      { id: 'FY26', label: 'FY26', level: 0, structural: true },
      { id: 'Q2FY26', label: 'Q2 FY26', parent: 'FY26', level: 1, structural: true },
      { id: 'Jun26', label: 'Jun26', parent: 'Q2FY26', level: 2 },
      { id: 'Q3FY26', label: 'Q3 FY26', parent: 'FY26', level: 1, structural: true },
      { id: 'Sep26', label: 'Sep26', parent: 'Q3FY26', level: 2 }
    ];
  }
  function pickerSelection() { return ['owner', 'time'].includes(picker) ? [config[picker]] : config[picker]; }
  function renderPicker() {
    if (!picker) return;
    const active = document.activeElement;
    const focusValue = active?.matches('#fxItems input') ? active.value : null;
    const focusExpand = active?.getAttribute('data-expand');
    const focusLevel = ['only', 'add', 'remove'].map(action => [action, active?.getAttribute('data-level-' + action)]).find(([, value]) => value !== null && value !== undefined);
    const single = ['owner', 'time'].includes(picker), term = $('fxItemSearch').value.trim().toLowerCase();
    const items = pickerItems(), matches = new Set(), chosen = pickerSelection();
    if (term) items.forEach(item => {
      if (item.label.toLowerCase().includes(term)) {
        matches.add(item.id); let parent = item.parent;
        while (parent) { matches.add(parent); parent = items.find(i => i.id === parent)?.parent; }
      }
    });
    function visible(item) {
      if (term) return matches.has(item.id);
      let parent = item.parent;
      while (parent) { if (!expanded.has(parent)) return false; parent = items.find(i => i.id === parent)?.parent; }
      return true;
    }
    $('fxItems').innerHTML = items.filter(visible).map(item => {
      const children = items.filter(i => i.parent === item.id), isExpanded = expanded.has(item.id) || Boolean(term);
      return '<li data-level="' + (item.level || 0) + '" style="--depth:' + (item.level || 0) + '"><div class="fx-tree-line">' +
        (children.length ? '<button type="button" class="fx-expand" data-expand="' + esc(item.id) + '" aria-label="' + (isExpanded ? 'Collapse' : 'Expand') + ' ' + esc(item.label) + '" aria-expanded="' + isExpanded + '">' + (isExpanded ? '▾' : '▸') + '</button>' : '<span class="fx-expand-spacer"></span>') +
        (item.structural ? '<span class="fx-tree-group" title="Sample calendar group; select one of the two available months">' + esc(item.label) + '</span>' : '<label><input type="' + (single ? 'radio' : 'checkbox') + '" name="fxItem" value="' + esc(item.id) + '" ' + (chosen.includes(item.id) ? 'checked' : '') + '><span>' + esc(item.label) + '</span></label>') +
        (children.length ? '<small>' + children.length + '</small>' : '') + '</div></li>';
    }).join('') || '<li class="fx-muted">No matching items.</li>';
    if (picker === 'rows') $('fxItems').querySelectorAll('input').forEach(input => {
      const ids = [input.value, ...D.descendants(input.value)], included = ids.filter(id => chosen.includes(id)).length;
      input.indeterminate = ids.length > 1 && included > 0 && included < ids.length;
    });
    $('fxPickerCount').textContent = chosen.length + ' of ' + items.filter(i => !i.structural).length + ' selected' + (single ? ' · shared by both grids' : '');
    $('fxLevels').innerHTML = picker === 'rows' ? ['Total', 'Expense categories', 'Accounts'].map((label, level) =>
      '<div><strong>' + label + ' (' + D.hierarchy.filter(r => r.level === level).length + '):</strong><button data-level-add="' + level + '">Select All</button><button data-level-remove="' + level + '">Deselect All</button><button data-level-only="' + level + '">Only This</button></div>').join('') : '';
    $('fxLevels').querySelectorAll('button').forEach(button => {
      const action = ['only', 'add', 'remove'].find(key => button.hasAttribute('data-level-' + key));
      const ids = D.hierarchy.filter(r => r.level === Number(button.getAttribute('data-level-' + action))).map(r => r.id);
      const included = ids.filter(id => chosen.includes(id)).length;
      const pressed = action === 'only' ? included === ids.length && chosen.length === ids.length : action === 'add' ? included === ids.length : included === 0;
      button.setAttribute('aria-pressed', String(pressed)); button.classList.toggle('active', pressed);
    });
    if (focusValue !== null) [...$('fxItems').querySelectorAll('input')].find(input => input.value === focusValue)?.focus();
    else if (focusExpand !== null && focusExpand !== undefined) [...$('fxItems').querySelectorAll('[data-expand]')].find(button => button.dataset.expand === focusExpand)?.focus();
    else if (focusLevel) [...$('fxLevels').querySelectorAll('button')].find(button => button.getAttribute('data-level-' + focusLevel[0]) === focusLevel[1])?.focus();
  }
  function openPicker(kind) {
    if (busy || ready) return;
    picker = kind;
    const label = { rows: 'LISS_Budget Template', columns: 'Line Items', time: 'Time', owner: 'Executive Owner' }[kind];
    const single = ['owner', 'time'].includes(kind);
    $('fxPickerTitle').textContent = 'Select Items: ' + label;
    $('fxPickerHelp').textContent = single ? 'Linked filter: choose one shared ' + label + ' value for both grids.' :
      kind === 'rows' ? 'Expand the sample hierarchy or select a level. Checking a parent includes its descendants.' : 'Choose financial line items. Commentary remains in its own module region.';
    if (kind === 'time') $('fxPickerHelp').textContent += ' This sample includes two months; year and quarter labels are navigation groups.';
    $('fxPickerEmpty').hidden = true; $('fxPickerContent').hidden = false;
    $('fxItemSearch').value = '';
    $('fxHierarchyToggle').hidden = kind !== 'rows';
    $('fxHierarchyToggle').setAttribute('aria-expanded', 'false');
    $('fxHierarchyToggle').textContent = '▶ Show Hierarchy Selectors'; $('fxLevels').hidden = true;
    $('fxPickerTools').hidden = single;
    renderPicker(); renderConfig(); $('fxItemSearch').focus({ preventScroll: true });
  }
  function updateSelection(values) {
    if (!picker || busy || ready) return;
    if (['owner', 'time'].includes(picker)) config[picker] = values[0];
    else config[picker] = pickerItems().filter(item => values.includes(item.id)).map(item => item.id);
    renderPicker(); renderConfig(); showStep(2);
  }
  function create() {
    if (busy || ready) return;
    config.sheetName = config.customName ? ($('fxSheetName').value.trim() || 'Budget Review') : 'Budget Review';
    // Financial formatting is native to every export; dashboard options only shape layout.
    config.formatting = true;
    try { D.validate(config); } catch (error) {
      status(error.message); $('fxCompletionStatus').textContent = error.message;
      $('fxPivotGuideText').textContent = error.message;
      const target = config.customName ? $('fxSheetName') : guidedTarget;
      highlightNext(target, 'fxPivotGuideText'); target?.focus(); return;
    }
    const candidate = buildReport(clone(config)), ticket = ++generation;
    resetLayout();
    $('fxLayoutStatus').textContent = 'Creating the showcased Budget Review layout. Chip placement preview has been reset.';
    busy = true; $('fxProgress').hidden = false; $('fxProgressText').textContent = 'Fetching both module regions…';
    $('fxProgressFill').style.width = '35%'; $('fxProgressPercent').textContent = '35%';
    $('fxProgressText').textContent = 'Creating the showcased Budget Review layout…';
    renderConfig(); showStep(2); status('Creating the sample Sheet from both module regions…');
    window.setTimeout(() => {
      if (ticket !== generation) return;
      report = candidate; busy = false; ready = true;
      $('fxProgressText').textContent = 'Sheet ready — select Done to close.';
      $('fxProgressFill').style.width = '100%'; $('fxProgressPercent').textContent = '100%';
      renderOutput(); renderConfig(); showStep(2);
      status('Sheet ready — select Done to close. No live files were changed.');
      $('fxCancelConfig').focus({ preventScroll: true });
    }, 450);
  }
  function done() {
    if (!report || !ready) return;
    ready = false; closeDialog('fxPivotDialog'); showStep(3); $('fxNext').focus({ preventScroll: true });
    status('Sample Sheet ready. Source formatting, hierarchy totals and linked filters are preserved.');
  }
  function refresh() {
    if (!report || busy) return;
    busy = true; const ticket = ++generation, saved = clone(report.config);
    showStep(3); status('Refreshing both module regions from the local sample…');
    window.setTimeout(() => {
      if (ticket !== generation) return;
      report = buildReport(saved); busy = false; renderOutput(); showStep(3);
      status('Refresh complete. Source values are unchanged; saved selections and formatting are preserved.');
    }, 450);
  }
  function restart() {
    ++generation; busy = false; ready = false; report = null; selected = false; discovered = false; config = defaults();
    closeDialog('fxUxDialog'); closeDialog('fxPivotDialog'); resetLayout(); resetPicker();
    $('fxLayoutStatus').textContent = '';
    expanded = new Set(['opex', 'all', 'FY26', 'Q2FY26', 'Q3FY26', ...D.hierarchy.filter(r => r.level === 1).map(r => r.id)]);
    $('fxPageSearch').value = ''; $('fxApp').hidden = false; $('fxNoPages').hidden = true;
    $('fxApp').open = false; $('fxCategory').open = false; $('fxPage').removeAttribute('aria-current');
    $('fxOutputTable').innerHTML = ''; $('fxCompareTable').innerHTML = '';
    $('fxComparison').open = false; $('fxTabName').textContent = 'Sheet1 ▾';
    $('fxFormula').textContent = ''; $('fxCell').textContent = 'A1'; $('fxProgress').hidden = true;
    renderSource(); renderConfig(); renderOutput(); showStep(0);
    status('Walkthrough reset. No files were created or changed.');
  }
  $('fxBrowse').addEventListener('click', browse);
  $('fxCloseUx').addEventListener('click', closeUx);
  $('fxClosePivot').addEventListener('click', cancelConfig);
  $('fxCancelConfig').addEventListener('click', cancelConfig);
  $('fxUxDialog').addEventListener('cancel', event => { event.preventDefault(); closeUx(); });
  $('fxPivotDialog').addEventListener('cancel', event => { event.preventDefault(); cancelConfig(); });
  ['fxPage', 'fxDiscover'].forEach(id => $(id).addEventListener('click', discover));
  $('fxRefreshDirectory').addEventListener('click', () => {
    selected = false; discovered = false; renderSource(); showStep(1);
    status('Sample UX directory refreshed. Discover the page modules again to choose a grid.');
  });
  $('fxPageSearch').addEventListener('input', event => {
    const term = event.target.value.trim().toLowerCase();
    const match = 'northstar planning budget owner review budget review by exec owner'.includes(term);
    $('fxApp').hidden = !match; $('fxNoPages').hidden = match;
    if (term && match) { $('fxApp').open = true; $('fxCategory').open = true; }
    renderGuide();
  });
  ['fxApp', 'fxCategory'].forEach(id => $(id).addEventListener('toggle', renderGuide));
  $('fxSelectGrid').addEventListener('click', () => selectGrid(true));
  $('fxGridCard').addEventListener('click', event => { if (!event.target.closest('button')) selectGrid(true); });
  $('fxClearGrid').addEventListener('click', () => selectGrid(false));
  $('fxExportGrid').addEventListener('click', () => configure());
  document.querySelectorAll('[data-picker]').forEach(el => el.addEventListener('click', () => openPicker(el.dataset.picker)));
  $('fxItemSearch').addEventListener('input', renderPicker);
  $('fxHierarchyToggle').addEventListener('click', () => {
    $('fxLevels').hidden = !$('fxLevels').hidden;
    $('fxHierarchyToggle').setAttribute('aria-expanded', String(!$('fxLevels').hidden));
    $('fxHierarchyToggle').textContent = $('fxLevels').hidden ? '▶ Show Hierarchy Selectors' : '▼ Hide Hierarchy Selectors';
    renderGuide();
  });
  $('fxItems').addEventListener('click', event => {
    const button = event.target.closest('[data-expand]');
    if (!button || busy || ready) return;
    const id = button.dataset.expand;
    if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
    renderPicker();
  });
  $('fxItems').addEventListener('change', event => {
    if (!event.target.matches('input') || busy || ready) return;
    const input = event.target;
    if (['time', 'owner'].includes(picker)) { updateSelection([input.value]); return; }
    const ids = picker === 'rows' ? [input.value, ...D.descendants(input.value)] : [input.value];
    const next = new Set(pickerSelection());
    ids.forEach(id => input.checked ? next.add(id) : next.delete(id)); updateSelection([...next]);
  });
  $('fxLevels').addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button || busy || ready || picker !== 'rows') return;
    const action = ['only', 'add', 'remove'].find(key => button.hasAttribute('data-level-' + key));
    if (!action) return;
    const ids = D.hierarchy.filter(r => r.level === Number(button.getAttribute('data-level-' + action))).map(r => r.id);
    const next = action === 'only' ? new Set() : new Set(config.rows);
    ids.forEach(id => action === 'remove' ? next.delete(id) : next.add(id)); updateSelection([...next]);
  });
  $('fxSelectDefault').addEventListener('click', () => { if (picker && !['time', 'owner'].includes(picker)) updateSelection(D.defaults()[picker]); });
  $('fxSelectAll').addEventListener('click', () => { if (picker && !['time', 'owner'].includes(picker)) updateSelection(pickerItems().map(i => i.id)); });
  $('fxSelectNone').addEventListener('click', () => { if (picker && !['time', 'owner'].includes(picker)) updateSelection([]); });
  $('fxCustomName').addEventListener('change', event => {
    config.customName = event.target.checked; if (!config.customName) config.sheetName = 'Budget Review';
    renderConfig(); showStep(2); if (config.customName) $('fxSheetName').focus();
  });
  $('fxSheetName').addEventListener('input', event => { config.sheetName = event.target.value; renderConfig(); showStep(2); });
  $('fxHideZeros').addEventListener('change', event => { config.hideZeros = event.target.checked; });
  $('fxKeepFormatting').addEventListener('change', event => { config.keepFormatting = event.target.checked; });
  $('fxFormatting').addEventListener('change', event => {
    Object.keys(config.dashboard).forEach(key => { config.dashboard[key] = event.target.checked; }); renderConfig();
  });
  Object.entries(dashboardControls).forEach(([id, key]) => $(id).addEventListener('change', event => { config.dashboard[key] = event.target.checked; renderConfig(); }));
  $('fxCreate').addEventListener('click', create);
  $('fxRepivot').addEventListener('click', () => configure(true));
  $('fxRefresh').addEventListener('click', refresh);
  $('fxRestart').addEventListener('click', restart);
  $('fxExpand').addEventListener('click', () => {
    const value = $('fxWorkbook').classList.toggle('expanded');
    $('fxExpand').setAttribute('aria-pressed', String(value));
    $('fxExpand').textContent = value ? 'Show connector sidebar' : 'Expand report area';
  });
  $('fxOutputTable').addEventListener('click', event => {
    const cell = event.target.closest('[data-address]'); if (!cell) return;
    $('fxCell').textContent = cell.dataset.address; $('fxFormula').textContent = cell.dataset.raw;
    document.querySelectorAll('.fx-cell-button.selected').forEach(el => el.classList.remove('selected'));
    cell.classList.add('selected');
  });
  $('fxNext').addEventListener('click', () => {
    if (busy) return;
    if (step === 0) browse();
    else if (step === 1) { if (!discovered) discover(); else if (!selected) selectGrid(true); else configure(); }
    else if (step === 2) { if (ready) done(); else create(); }
    else configure(true);
  });
  $('fxPrev').addEventListener('click', () => {
    if (busy) return;
    if (step === 1) closeUx();
    else if (step === 2) { cancelConfig(); browse(); }
    else if (step === 3) configure(true);
  });
  document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => {
    if (busy) return;
    const target = Number(button.dataset.step);
    if (target === 0) { if ($('fxPivotDialog').open) cancelConfig(); closeDialog('fxUxDialog'); showStep(0); }
    else if (target === 1) browse();
    else if (target === 2) configure(Boolean(report));
    else if (report) { if ($('fxPivotDialog').open) cancelConfig(); closeDialog('fxUxDialog'); showStep(3); }
  }));
  window.FormattedUxDemo = { snapshot: () => clone({ step, config, report, selected, discovered, busy, ready, picker, layout }) };
  initializeChips();
  restart();
})();
