/* v3: contextual next actions for manual exploration and step controls in dialogs. */
(function (root) {
  'use strict';
  function create() {
    const D = root.BudgetReviewData, el = id => document.getElementById(id);
    const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const allRows = () => D.categories.map(r => r.id), allColumns = () => D.columns.map(c => c.id);
    let state, draft, selectionMode = 'columns', player, requestTimer, requestGeneration = 0, exploring = false;
    const collapsedRows = new Set();
    const gridNumber = (value, measure) => value === null ? '—' : measure === 'percent' ? D.format(value, measure) : (value < 0 ? '(' : '') + (Math.abs(value) / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + (value < 0 ? ')' : '');
    const letter = n => String.fromCharCode(65 + n);
    const showModal = node => typeof node.showModal === 'function' ? node.showModal() : node.setAttribute('open', '');
    const dismiss = node => typeof node.close === 'function' ? node.close() : node.removeAttribute('open');
    const milestones = new Set();
    function emit(event, detail = {}) { root.dispatchEvent(new CustomEvent('aplan:demo-event', { detail: { event, demo: 'budget-review', ...detail } })); }
    function status(text) { el('status').textContent = text; }
    function manual() {
      if (player) { player.pause(); player.cancel(); }
      if (state?.busy) { requestGeneration++; clearTimeout(requestTimer); state.busy = false; render(); }
      exploring = true; hideFocus();
      if (player) { player.update(); el('playBtn').textContent = '▶ Play tour'; el('playBtn').setAttribute('aria-label', 'Play tour'); }
    }
    function updateActionGuide() {
      if (!player || !state) return;
      player.manualExploration = exploring;
      document.body.classList.toggle('walkthrough-exploring', exploring);
      let target = null, message = '';
      if (exploring && !state.busy) {
        if (el('uxDialog').open) { target = el('useUxGrid'); message = 'Export the selected grid to review its layout.'; }
        else if (el('ownerDialog').open) { target = el('applyOwner'); message = 'Apply your owner selection to both modules.'; }
        else if (el('layoutDialog').open) {
          target = el('applySelections'); message = 'Apply your selections to continue to the sample sheet.';
          if (target.disabled) {
            target = !draft.rows.length && selectionMode !== 'rows' ? el('rowsMode') : el('showAll');
            message = 'Select at least one row and one column before applying the layout.';
          }
        } else if (state.dirty) { target = el('refreshBtn'); message = 'Refresh to apply your selections to the report and chart.'; }
        else if (!state.report) { target = el('executeBtn'); message = 'Execute the sample pivot to populate the sheet.'; }
        else if (!state.chart) {
          target = el('chartBtn').disabled ? el('configureBtn') : el('chartBtn');
          message = el('chartBtn').disabled ? 'Include FY26 Forecast and FY27 Selected Version to build a comparison chart.' : 'Build a chart from the exported columns.';
        } else if (state.pane !== 'slide') { target = el('slideBtn'); message = 'Preview a slide using the same chart and numbers.'; }
      }
      player.setActionTarget(target);
      const scope = target?.closest('dialog') || document.querySelector('main');
      document.querySelectorAll('.walkthrough-action-note').forEach(note => { note.textContent = exploring && note.parentElement === scope ? (message ? 'Next · ' + message : state.busy ? 'Retrieving the sample report…' : 'Report ready. Explore the sample or restart the tour.') : ''; });
    }
    function hideFocus() { document.querySelectorAll('.tour-focus').forEach(e => e.classList.remove('tour-focus')); el('tourPointer').hidden = true; }
    function focus(id) {
      hideFocus(); const target = el(id); target.classList.add('tour-focus');
      if (player?.running) target.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const box = target.getBoundingClientRect(); el('tourPointer').style.left = (box.left + box.width * .72) + 'px'; el('tourPointer').style.top = (box.top + box.height * .7) + 'px'; el('tourPointer').hidden = false;
      }
    }
    function pane(name) {
      state.pane = name;
      for (const type of ['sheet', 'chart', 'slide']) { el(type + 'Pane').hidden = type !== name; el(type + 'Tab').setAttribute('aria-selected', String(type === name)); el(type + 'Tab').tabIndex = type === name ? 0 : -1; }
    }
    function table(report, preview = false) {
      if (!preview) return sheetTable(report);
      let html = '<thead><tr><th rowspan="2" scope="col">Expense category</th>';
      for (let i = 0; i < report.columns.length;) {
        let span = 1;
        if (report.merge) while (i + span < report.columns.length && report.columns[i + span].year === report.columns[i].year) span++;
        html += '<th colspan="' + span + '" scope="' + (span > 1 ? 'colgroup' : 'col') + '">' + escape(report.columns[i].year) + '</th>'; i += span;
      }
      html += '</tr><tr>';
      for (const c of report.columns) html += '<th scope="col">' + (preview ? '<button class="header-toggle" data-column="' + c.id + '" aria-label="' + c.year + ' ' + escape(c.label) + '" aria-pressed="' + draft.columns.includes(c.id) + '">' + escape(c.label) + '</button>' : escape(c.label)) + '</th>';
      html += '</tr></thead><tbody>';
      for (const r of report.rows) html += '<tr><th scope="row">' + escape(r.label) + '</th>' + r.values.map((v, i) => '<td' + (preview && !draft.columns.includes(report.columns[i].id) ? ' class="header-hidden"' : '') + '>' + D.format(v, report.columns[i].measure) + '</td>').join('') + '</tr>';
      if (!report.rows.length) html += '<tr><td colspan="' + (report.columns.length + 1) + '">Choose at least one expense category.</td></tr>';
      return html + '</tbody>' + (report.rows.length ? '<tfoot><tr><th scope="row">' + report.total.label + '</th>' + report.total.values.map((v, i) => '<td>' + D.format(v, report.columns[i].measure) + '</td>').join('') + '</tr></tfoot>' : '');
    }
    function sheetTable(report) {
      const width = report.columns.length + 2;
      let rowNumber = 1;
      const margin = () => '<th class="row-number" scope="row">' + rowNumber++ + '</th><td class="sheet-gutter"></td>';
      let html = '<thead class="sheet-letters"><tr><th></th><th>A</th>' + Array.from({ length: width }, (_, i) => '<th>' + letter(i + 1) + '</th>').join('') + '</tr></thead><tbody>';
      html += '<tr class="setup-row">' + margin() + '<td colspan="' + width + '"></td></tr>';
      html += '<tr class="setup-row">' + margin() + '<td colspan="' + width + '" class="connection-stamp">aPlan4Sheets · Northstar FP&A / Budget Review by Exec Owner · SAMPLE DATA</td></tr>';
      html += '<tr class="report-title-row">' + margin() + '<td colspan="' + width + '">FY27 operating expense review <small>USD in thousands</small></td></tr>';
      html += '<tr class="setup-row">' + margin() + '<td>Executive Owner</td><td colspan="' + (width - 1) + '">' + escape(report.ownerLabel) + ' <span class="inline-link-badge">↔ Financials + Comments</span></td></tr>';
      html += '<tr class="setup-row">' + margin() + '<td>Planning scenario</td><td colspan="' + (width - 1) + '">' + escape(report.snapshot) + '</td></tr>';
      html += '<tr class="setup-row">' + margin() + '<td colspan="' + width + '"></td></tr>';
      html += '<tr class="report-year-row">' + margin() + '<th rowspan="2" scope="col">Operating expenses</th>';
      for (let i = 0; i < report.columns.length;) {
        let span = 1;
        if (report.merge) while (i + span < report.columns.length && report.columns[i + span].year === report.columns[i].year) span++;
        html += '<th colspan="' + span + '" scope="' + (span > 1 ? 'colgroup' : 'col') + '">' + report.columns[i].year + '</th>'; i += span;
      }
      html += '<th rowspan="2" class="comment-heading">Owner commentary <small>Linked module</small></th></tr><tr class="report-measure-row">' + margin();
      html += report.columns.map(c => '<th scope="col">' + escape(c.label) + '</th>').join('') + '</tr>';
      const cells = values => values.map((value, i) => {
        const c = report.columns[i], isVariance = ['yoy', 'percent'].includes(c.measure);
        return '<td class="number-cell ' + (isVariance ? value > 0 ? 'expense-up' : value < 0 ? 'expense-down' : '' : '') + '" data-cell="' + letter(i + 2) + (rowNumber - 1) + '" data-value="' + value + '">' + gridNumber(value, c.measure) + '</td>';
      }).join('');
      for (const row of report.rows) {
        html += '<tr class="category-row">' + margin() + '<th scope="row"><button class="hierarchy-toggle" data-category="' + row.id + '" aria-expanded="' + !collapsedRows.has(row.id) + '">' + (collapsedRows.has(row.id) ? '▸ ' : '▾ ') + escape(row.label) + '</button></th>' + cells(row.values) + '<td class="comment-cell">' + escape(row.comment) + '</td></tr>';
        const details = D.detailRows(report, row);
        // Hiding a group does not renumber the remaining spreadsheet rows.
        if (collapsedRows.has(row.id)) rowNumber += details.length;
        else for (const detail of details) html += '<tr class="account-row">' + margin() + '<th scope="row"><span class="account-code">' + detail.code + '</span>' + escape(detail.label) + '</th>' + cells(detail.values) + '<td class="comment-cell"></td></tr>';
      }
      return html + '<tr class="total-row">' + margin() + '<th scope="row">' + report.total.label + '</th>' + cells(report.total.values) + '<td class="comment-cell">Selected categories only · no double-counting of account detail</td></tr></tbody>';
    }
    function bars(data) {
      const max = Math.max(...data.rows.flatMap(r => [r.prior, r.current]), 1);
      return data.rows.map(r => '<div class="bar-row"><span class="bar-label">' + escape(r.label) + '</span><div class="bar-pair">' + ['prior', 'current'].map(key => '<div class="bar-track"><div class="bar ' + key + '" data-category="' + r.id + '" data-value="' + r[key] + '" style="width:calc(' + (r[key] / max * 100) + '% - ' + (r[key] / max * 60) + 'px)"></div><span>' + D.format(r[key]) + '</span></div>').join('') + '</div></div>').join('');
    }
    function renderChart() {
      const data = state.report && D.chartData(state.report);
      if (!data || !state.chart) return;
      const versionLabel = data.version.startsWith('FY27') ? data.version : 'FY27 ' + data.version;
      el('chartLegend').innerHTML = '<span>FY26 Open Forecast</span><span>' + escape(versionLabel) + '</span>';
      el('chartSummary').innerHTML = '<div><small>FY26 Open Forecast</small><strong>' + D.format(data.prior) + '</strong></div><div><small>' + escape(versionLabel) + '</small><strong>' + D.format(data.current) + '</strong></div><div><small>Selected spend increase</small><strong>' + D.format(data.percent, 'percent') + '</strong></div>';
      el('chartBars').innerHTML = bars(data);
      el('slideTitle').textContent = versionLabel + ' review';
      el('slideHeadline').textContent = 'Selected spend: ' + D.format(data.current) + '. Change versus FY26: ' + D.format(data.difference) + ' (' + D.format(data.percent, 'percent') + ').';
      el('slideChart').innerHTML = bars(data);
    }
    function render() {
      const report = state.report || D.buildReport(state.config);
      el('reportTable').innerHTML = table(report);
      el('reportTable').dataset.columnCount = report.columns.length;
      el('versionSelect').value = state.config.version;
      el('ownerBtn').textContent = D.owners.find(o => o.id === state.config.owner).label + ' ▾';
      el('scenarioNote').textContent = state.config.version === 'FY27 Budget' ? 'FY27 Budget scenario. FY26 remains the fixed Open Forecast reference.' : 'FY27 Q4 Forecast is a later, full-year scenario—not a forecast for Q4 alone.';
      el('staleBanner').hidden = !state.dirty;
      el('outputVersion').textContent = state.report ? 'Exported snapshot · ' + state.report.version : 'Source preview';
      el('reportState').textContent = state.report ? 'Sample pivot configuration retained for refresh' : 'Preview only · not exported';
      el('formulaText').textContent = state.report ? 'Sample pivot output · ' + state.report.version : 'Source view preview · fictional data';
      el('configSummary').textContent = state.config.rows.length + ' categories · ' + state.config.columns.length + ' exact columns · ' + (state.config.merge ? 'merged years' : 'repeated years');
      for (const id of ['configureBtn', 'executeBtn', 'versionSelect', 'ownerBtn', 'browseUx']) el(id).disabled = state.busy;
      el('executeBtn').textContent = state.busy ? 'Retrieving sample data…' : 'Execute sample pivot';
      el('refreshBtn').disabled = !state.report || state.busy;
      const eligible = state.report && D.chartData(state.report);
      el('chartBtn').disabled = !eligible || state.busy;
      for (const id of ['slideBtn', 'slideTab', 'chartTab']) el(id).disabled = !state.chart || !eligible || state.busy;
      if (!eligible && state.chart) { state.chart = false; pane('sheet'); }
      renderChart(); updateActionGuide();
    }
    function closeDialog() {
      if (typeof el('layoutDialog').close === 'function') el('layoutDialog').close();
      else el('layoutDialog').removeAttribute('open');
      draft = null;
    }
    function reset() {
      requestGeneration++; clearTimeout(requestTimer); milestones.clear(); collapsedRows.clear(); closeDialog(); dismiss(el('ownerDialog')); dismiss(el('uxDialog')); exploring = false;
      state = { config: { version: D.versions[0], owner: 'all', rows: allRows(), columns: allColumns(), merge: false }, report: null, chart: false, dirty: false, busy: false, pane: 'sheet' };
      pane('sheet'); render(); status('Ready. Configure the sample pivot or play the guided tour.'); hideFocus();
    }
    function renderSelections() {
      const search = el('selectionSearch').value.trim().toLowerCase();
      const items = selectionMode === 'columns' ? D.columns.map(c => ({ id: c.id, label: c.year + ' › ' + c.label })) : D.categories;
      const chosen = draft[selectionMode];
      el('selectionChoices').innerHTML = items.filter(i => i.label.toLowerCase().includes(search)).map(i => '<label><input type="checkbox" data-selection="' + i.id + '" ' + (chosen.includes(i.id) ? 'checked' : '') + '>' + escape(i.label) + '</label>').join('');
      el('columnsMode').setAttribute('aria-pressed', String(selectionMode === 'columns')); el('rowsMode').setAttribute('aria-pressed', String(selectionMode === 'rows'));
      el('mergeHeaders').checked = draft.merge;
      const preview = D.buildReport({ ...draft, columns: allColumns(), rows: draft.rows.length ? draft.rows : allRows() });
      if (!draft.rows.length) preview.rows = [];
      el('selectionPreview').innerHTML = table(preview, true);
      el('selectionCount').textContent = draft.columns.length + ' of 8 columns · ' + draft.rows.length + ' of 5 categories shown';
      const invalid = !draft.columns.length || !draft.rows.length;
      el('applySelections').disabled = invalid;
      el('selectionError').textContent = invalid ? 'Choose at least one row and column.' : 'Changes are local to this preview until applied.';
    }
    function openDialog() {
      draft = { ...state.config, rows: [...state.config.rows], columns: [...state.config.columns] }; selectionMode = 'columns'; el('selectionSearch').value = ''; el('dialogVersion').textContent = '↔ ' + D.owners.find(o => o.id === draft.owner).label + ' · ' + draft.version + ' (2 modules)'; renderSelections();
      if (typeof el('layoutDialog').showModal === 'function') el('layoutDialog').showModal(); else el('layoutDialog').setAttribute('open', '');
      emit('configure_open');
    }
    function recommend() { draft.columns = [...D.recommendedColumns]; draft.merge = true; renderSelections(); }
    function apply() {
      if (!draft || !draft.rows.length || !draft.columns.length) return;
      state.config = { ...draft, rows: [...draft.rows], columns: D.columns.filter(c => draft.columns.includes(c.id)).map(c => c.id) };
      state.dirty = Boolean(state.report); closeDialog(); render(); status('Selections applied. Execute or refresh to update the sample sheet.'); emit('selection_apply', { columns: state.config.columns.length, rows: state.config.rows.length });
    }
    function commit(config) {
      state.report = D.buildReport(config); state.busy = false; state.dirty = false; render();
      status('Sample sheet updated from ' + config.version + '. Totals include ' + config.rows.length + ' selected categories.'); emit('pivot_complete', { version: config.version });
    }
    async function retrieve(tour = false) {
      const config = { ...state.config, rows: [...state.config.rows], columns: [...state.config.columns] }, generation = ++requestGeneration;
      state.busy = true; render(); status('Retrieving fictional sample data. This delay is illustrative, not a performance benchmark.');
      if (tour) { await player.wait(750); if (generation === requestGeneration) commit(config); }
      else requestTimer = setTimeout(() => { if (generation === requestGeneration) commit(config); }, 750);
    }
    function createChart() { if (!state.report || !D.chartData(state.report)) return; state.chart = true; render(); pane('chart'); status('Chart built from the exported sample columns.'); emit('chart_create'); }
    function createSlide() { if (!state.chart) return; pane('slide'); status('Illustrative slide preview. No Google Slides file is created.'); emit('slide_preview'); }
    function changeVersion(version) { state.config.version = version; state.dirty = Boolean(state.report); render(); status(state.report ? 'Version changed. Refresh to update the exported sheet and chart.' : 'Source preview changed to ' + version + '.'); emit('version_change', { version }); }
    const pointer = document.createElement('div'); pointer.id = 'tourPointer'; pointer.className = 'tour-pointer'; pointer.setAttribute('aria-hidden', 'true'); pointer.hidden = true; pointer.innerHTML = '<svg width="24" height="30" viewBox="0 0 24 30"><path d="M2 2L20 18L12 19L16 27L12 29L8 21L2 26Z" fill="#1a2744" stroke="white" stroke-width="2"/></svg>'; document.body.appendChild(pointer);
    el('versionSelect').innerHTML = D.versions.map(v => '<option>' + escape(v) + '</option>').join('');
    el('chapter').innerHTML = D.scenes.map((s, i) => '<option value="' + i + '">' + (i + 1) + '. ' + escape(s.name) + '</option>').join('');
    el('transcript').innerHTML = D.scenes.map(s => '<li><strong>' + escape(s.name) + '</strong><p>' + escape(s.caption) + '</p></li>').join('');
    const bind = (id, action) => el(id).addEventListener('click', () => { manual(); action(); });
    bind('focusBtn', () => { const active = document.body.classList.toggle('focus-demo'); el('focusBtn').setAttribute('aria-pressed', String(active)); el('focusBtn').textContent = active ? 'Exit focus ⛶' : 'Focus demo ⛶'; });
    bind('ownerBtn', () => {
      el('ownerChoices').innerHTML = D.owners.map(o => '<label class="' + (o.parent ? 'owner-child' : 'owner-parent') + '"><input type="radio" name="sampleOwner" value="' + o.id + '" ' + (o.id === state.config.owner ? 'checked' : '') + '><span>' + (o.parent ? '' : '▾ ') + escape(o.label) + '</span></label>').join('');
      showModal(el('ownerDialog'));
    });
    bind('closeOwner', () => dismiss(el('ownerDialog')));
    bind('applyOwner', () => { state.config.owner = el('ownerChoices').querySelector('input:checked').value; state.dirty = Boolean(state.report); dismiss(el('ownerDialog')); render(); status('Owner selection is shared by both modules. ' + (state.report ? 'Refresh to retrieve the new owner snapshot.' : 'Execute the pivot to populate the sample report.')); });
    function openUxPreview() {
      const current = D.buildReport({...state.config, columns:D.recommendedColumns});
      el('uxDialog').querySelector('.ux-filter-strip').innerHTML = '<span>Executive Owner <b>' + escape(current.ownerLabel) + '</b></span><span>Version <b>' + escape(current.version) + '</b></span>';
      el('uxFinancialPreview').innerHTML = '<table><thead><tr><th>Expense category</th><th>FY26 Forecast</th><th>' + escape(current.version === 'Q4 Forecast' ? 'FY27 Q4 Forecast' : current.version) + '</th></tr></thead><tbody>' + current.rows.map(r => '<tr><td>' + escape(r.label) + '</td><td>' + D.format(r.values[0]) + '</td><td>' + D.format(r.values[1]) + '</td></tr>').join('') + '</tbody></table>';
      el('uxCommentsPreview').innerHTML = '<table><thead><tr><th>Expense category</th><th>Owner commentary</th></tr></thead><tbody>' + current.rows.map(r => '<tr><td>' + escape(r.label) + '</td><td>' + escape(r.comment) + '</td></tr>').join('') + '</tbody></table>';
      showModal(el('uxDialog'));
    }
    bind('browseUx', openUxPreview);
    bind('closeUx', () => dismiss(el('uxDialog')));
    bind('useUxGrid', () => { dismiss(el('uxDialog')); openDialog(); });
    el('reportTable').addEventListener('click', event => {
      const category = event.target.closest('[data-category]');
      if (category) { manual(); const id = category.dataset.category; collapsedRows.has(id) ? collapsedRows.delete(id) : collapsedRows.add(id); render(); return; }
      const cell = event.target.closest('[data-cell]');
      if (cell) { manual(); el('reportTable').querySelectorAll('.selected-cell').forEach(c => c.classList.remove('selected-cell')); cell.classList.add('selected-cell'); el('cellAddress').textContent = cell.dataset.cell; el('formulaText').textContent = Number(cell.dataset.value).toLocaleString('en-US', {maximumFractionDigits: 6}) + ' · source value (USD for currency cells)'; }
    });
    bind('configureBtn', openDialog); bind('sourceView', openDialog); bind('executeBtn', () => retrieve()); bind('refreshBtn', () => retrieve()); bind('chartBtn', createChart); bind('slideBtn', createSlide);
    for (const id of ['closeDialog', 'cancelDialog']) bind(id, closeDialog);
    bind('applySelections', apply); bind('recommendedBtn', recommend);
    for (const mode of ['columns', 'rows']) bind(mode + 'Mode', () => { selectionMode = mode; el('selectionSearch').value = ''; renderSelections(); });
    el('layoutDialog').addEventListener('cancel', () => { manual(); draft = null; });
    el('versionSelect').addEventListener('change', () => { manual(); changeVersion(el('versionSelect').value); });
    el('selectionSearch').addEventListener('input', () => { manual(); renderSelections(); });
    el('mergeHeaders').addEventListener('change', () => { manual(); draft.merge = el('mergeHeaders').checked; renderSelections(); });
    el('selectionChoices').addEventListener('change', event => {
      manual(); const id = event.target.dataset.selection; if (!id) return;
      draft[selectionMode] = event.target.checked ? [...draft[selectionMode], id] : draft[selectionMode].filter(i => i !== id); renderSelections();
    });
    el('selectionPreview').addEventListener('click', event => { const button = event.target.closest('[data-column]'); if (!button) return; manual(); const id = button.dataset.column; draft.columns = draft.columns.includes(id) ? draft.columns.filter(c => c !== id) : [...draft.columns, id]; renderSelections(); });
    for (const action of ['show', 'hide']) bind(action + 'All', () => {
      const visible = Array.from(el('selectionChoices').querySelectorAll('input')).map(e => e.dataset.selection);
      draft[selectionMode] = action === 'show' ? [...new Set([...draft[selectionMode], ...visible])] : draft[selectionMode].filter(id => !visible.includes(id)); renderSelections();
    });
    for (const name of ['sheet', 'chart', 'slide']) bind(name + 'Tab', () => pane(name));
    document.querySelector('.pane-tabs').addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = Array.from(document.querySelectorAll('.pane-tabs button')).filter(button => !button.disabled);
      const current = tabs.indexOf(document.activeElement); if (current < 0) return;
      event.preventDefault(); manual();
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[index].focus(); pane(tabs[index].id.replace('Tab', ''));
    });
    const actions = [
      async () => { pane('sheet'); focus('browseUx'); await player.wait(900); openUxPreview(); focus('useUxGrid'); await player.wait(5500); dismiss(el('uxDialog')); focus('configureBtn'); },
      async () => { openDialog(); await player.wait(1300); recommend(); focus('recommendedBtn'); },
      async () => { if (draft) apply(); focus('executeBtn'); await retrieve(true); },
      () => { createChart(); focus('chartTab'); },
      async () => { changeVersion('Q4 Forecast'); focus('versionSelect'); await player.wait(3000); focus('refreshBtn'); await retrieve(true); pane('chart'); },
      () => { createSlide(); focus('slideTab'); }
    ];
    player = new root.DemoPlayer({ scenes: D.scenes, captions: D.scenes.map(s => s.caption), actions, reset });
    const update = player.update.bind(player);
    player.update = () => {
      update(); updateActionGuide(); el('chapter').value = String(player.index);
      if (player.finished) { hideFocus(); if (!milestones.has('complete')) { milestones.add('complete'); emit('demo_complete'); } }
    };
    const progress = player.progress.bind(player);
    player.progress = () => { progress(); const percent = parseFloat(el('globalProgress').style.width) || 0; for (const level of [25, 50, 75]) if (percent >= level && !milestones.has(level)) { milestones.add(level); emit('demo_progress', { percent: level }); } };
    const play = player.play.bind(player);
    player.play = () => { if (exploring) { player.restart(); return; } if (!player.running && !milestones.has('start')) { milestones.add('start'); emit('demo_start'); } play(); };
    const mount = player.mount.bind(player);
    player.mount = () => {
      if (new URLSearchParams(location.search).has('embed')) document.body.classList.add('embed-mode');
      mount();
      for (const scope of [document.querySelector('main'), ...document.querySelectorAll('dialog')]) {
        const note = document.createElement('p'); note.className = 'walkthrough-action-note'; note.setAttribute('role', 'status');
        scope.prepend(note);
      }
      for (const event of ['click', 'change', 'input', 'close']) document.addEventListener(event, updateActionGuide, event === 'close');
      el('playBtn').onclick = () => { if (exploring) player.restart(); else player.toggle(); };
      el('chapter').addEventListener('change', () => {
        const index = Number(el('chapter').value); player.pause(); player.cancel(); reset();
        if (index >= 2) state.config = { ...state.config, columns: [...D.recommendedColumns], merge: true };
        if (index >= 3) state.report = D.buildReport(state.config);
        if (index >= 3) state.chart = true;
        if (index >= 5) { state.config.version = 'Q4 Forecast'; state.report = D.buildReport(state.config); }
        render(); player.scene(index); player.play(); emit('chapter_select', { chapter: index + 1 });
      });
    };
    document.querySelectorAll('a.request-demo,.next-card a').forEach(a => a.addEventListener('click', () => emit('demo_request_click')));
    root.BudgetReviewDemo.app = { getState: () => JSON.parse(JSON.stringify(state)) };
    return player;
  }
  root.BudgetReviewDemo = { create };
})(window);
