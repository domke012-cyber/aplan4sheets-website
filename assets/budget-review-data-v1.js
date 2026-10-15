/* Fictional demonstration data only. No customer records or connector access. */
(function (root) {
  'use strict';
  const versions = ['FY27 Budget', 'Q4 Forecast'];
  const measures = [
    { id: 'forecast', label: 'Open Forecast' }, { id: 'version', label: 'Sel. Version' },
    { id: 'yoy', label: 'YoY' }, { id: 'percent', label: 'YoY %' }
  ];
  const categories = [
    { id: 'people', label: 'People', prior: 21.6, forecast: 24, budget26: 23.5, budget: 26.4, q4: 26 },
    { id: 'software', label: 'Software', prior: 5.5, forecast: 6, budget26: 5.8, budget: 6.9, q4: 7.2 },
    { id: 'services', label: 'Professional services', prior: 3.7, forecast: 4.2, budget26: 4, budget: 4.5, q4: 4.35 },
    { id: 'facilities', label: 'Facilities', prior: 2.25, forecast: 2.4, budget26: 2.2, budget: 2.55, q4: 2.5 },
    { id: 'travel', label: 'Travel & events', prior: 1, forecast: 1.2, budget26: 1.1, budget: 1.35, q4: 1.45 }
  ];
  const columns = ['FY26', 'FY27'].flatMap(year => measures.map(m => ({ id: year + '|' + m.id, year, measure: m.id, label: m.label })));
  const recommendedColumns = ['FY26|forecast', 'FY27|version', 'FY27|yoy', 'FY27|percent'];
  const scenes = [
    { name: 'Start with the source', duration: 18400, caption: 'Let’s build a budget review in Sheets. This is an interactive simulation with fictional data, not a customer recording. Start with the sample FP&A view. We’ll keep one forecast column, add next year’s budget, and carry the same numbers into a chart.' },
    { name: 'Choose exact combinations', duration: 23900, caption: 'Open Configure Pivot. Time sits outside Line Items, but you don’t need every measure under every year. Keep FY26 Open Forecast, then FY27 Selected Version, year-over-year change, and change percent. You can also choose expense categories and merge repeated year headers. Try these controls yourself.' },
    { name: 'Execute the sample pivot', duration: 23500, caption: 'Execute the pivot to populate the sample sheet. The selected categories total thirty-seven point eight million in FY26 and forty-one point seven million in the FY27 Budget. That’s a three point nine million increase, or ten point three percent. These totals are calculated from the rows, not separate display numbers.' },
    { name: 'Build a chart from the output', duration: 21000, caption: 'Now build a chart from the exported columns. It compares each category’s FY26 forecast with the selected FY27 version. The chart and totals use the same snapshot, so they reconcile. In the actual workflow, you create and link these charts using Google Sheets and Slides.' },
    { name: 'Change version, then refresh', duration: 23000, caption: 'Switch the version to Q4 Forecast. The current report stays unchanged until you refresh it. After refresh, selected FY27 spend is forty-one point five million, and the chart updates from the new output. This makes the refresh step visible instead of suggesting that every selection instantly retrieves live data.' },
    { name: 'Review the presentation', duration: 20400, caption: 'Finally, review an illustrative slide using the same chart and numbers. This preview doesn’t create a Google Slides file. It shows how the reporting pieces fit together. Restart the tour, or explore the sample controls yourself. For help with your own model, request a live demo.' }
  ];
  function buildReport(config) {
    if (!versions.includes(config.version)) throw new Error('Unknown sample version.');
    const selectedColumns = columns.filter(c => config.columns.includes(c.id));
    const selectedRows = categories.filter(c => config.rows.includes(c.id));
    if (!selectedColumns.length || !selectedRows.length) throw new Error('Choose at least one row and column.');
    if (new Set(config.columns).size !== config.columns.length || new Set(config.rows).size !== config.rows.length || selectedColumns.length !== config.columns.length || selectedRows.length !== config.rows.length) throw new Error('Invalid sample selection.');
    function value(rows, column) {
      let current = 0, base = 0, forecast = 0;
      for (const row of rows) {
        const is27 = column.year === 'FY27';
        const selected = is27 ? (config.version === 'FY27 Budget' ? row.budget : row.q4) : (config.version === 'FY27 Budget' ? row.budget26 : row.forecast);
        current += Math.round(selected * 1000000);
        base += Math.round((is27 ? row.forecast : row.prior) * 1000000);
        forecast += Math.round((is27 ? row.q4 : row.forecast) * 1000000);
      }
      if (column.measure === 'percent') return base === 0 ? null : (current - base) / base;
      return column.measure === 'forecast' ? forecast : column.measure === 'version' ? current : current - base;
    }
    return {
      version: config.version, merge: Boolean(config.merge), columns: selectedColumns.map(c => ({ ...c })),
      rows: selectedRows.map(row => ({ id: row.id, label: row.label, values: selectedColumns.map(c => value([row], c)) })),
      total: { label: 'Selected categories total', values: selectedColumns.map(c => value(selectedRows, c)) }
    };
  }
  function chartData(report) {
    const base = report.columns.findIndex(c => c.id === 'FY26|forecast');
    const selected = report.columns.findIndex(c => c.id === 'FY27|version');
    if (base < 0 || selected < 0) return null;
    const prior = report.total.values[base], current = report.total.values[selected];
    return { version: report.version, prior, current, difference: current - prior, percent: prior === 0 ? null : (current - prior) / prior, rows: report.rows.map(r => ({ id: r.id, label: r.label, prior: r.values[base], current: r.values[selected] })) };
  }
  function format(value, measure = 'currency') {
    if (value === null) return '—';
    if (measure === 'percent') return (Math.round(value * 1000) / 10).toFixed(1) + '%';
    return (value < 0 ? '−' : '') + '$' + (Math.abs(value) / 1000000).toFixed(2) + 'M';
  }
  root.BudgetReviewData = { versions, measures, categories, columns, recommendedColumns, scenes, buildReport, chartData, format };
})(typeof window !== 'undefined' ? window : globalThis);
