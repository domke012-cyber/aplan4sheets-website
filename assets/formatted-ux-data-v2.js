/* Fictional public-demo financials. The reference supplies layout only, never amounts.
 * Source arrays are USD thousands, ordered Q1/Q2/Q3 FY26. Build returns integer USD.
 * September is Q3 and June is Q2; YTD is the sum of quarters through that period.
 * No customer data, live model access, credentials or network requests.
 */
(function (root) {
  'use strict';

  const owners = [
    { id: 'all', label: 'All Executive Owners', parent: null },
    { id: 'product', label: 'Alex Morgan · Product & Engineering', parent: 'all' },
    { id: 'commercial', label: 'Jordan Lee · Sales & Marketing', parent: 'all' },
    { id: 'operations', label: 'Casey Rivera · Finance & Operations', parent: 'all' }
  ];
  const periods = ['Sep26', 'Jun26'];
  const quarterIndex = { Sep26: 2, Jun26: 1 };
  const categories = [
    { id: 'headcount', label: 'Headcount Expense', totalLabel: 'Headcount Expense Total', note: 'Review hiring dates and compensation assumptions with the People team.' },
    { id: 'controllable', label: 'Controllable', totalLabel: 'Controllable Total', note: 'Review supplier renewals, professional support and travel commitments with the owner.' },
    { id: 'nonControllable', label: 'Non-Controllable', totalLabel: 'Non-Controllable Total', note: 'Confirm facilities allocations and depreciation schedules before the next forecast.' },
    { id: 'otherSpend', label: 'Other Spend', totalLabel: 'Other Spend Total', note: 'Review campaign commitments, hosting capacity and purchased-service volumes.' }
  ];

  // Every amount below is invented. Shares partition a leaf across three
  // disjoint owners; remainder allocation keeps every displayed $1,000 exact.
  const accounts = [
    { id: 'salaries', label: 'Salaries, Benefits, Taxes', parent: 'headcount', shares: [50, 30, 20], actual: [7240, 7510, 7680], forecast: [7300, 7680, 7890], prior: [6380, 6720, 7050], budget: [7380, 7600, 7820] },
    { id: 'bonus', label: 'Bonus', parent: 'headcount', shares: [45, 40, 15], actual: [870, 940, 1020], forecast: [900, 990, 1080], prior: [760, 840, 930], budget: [910, 980, 1060] },
    { id: 'sbc', label: 'SBC', parent: 'headcount', shares: [65, 20, 15], actual: [1860, 1990, 2110], forecast: [1900, 2050, 2180], prior: [1510, 1640, 1790], budget: [1920, 2020, 2140] },
    { id: 'employeeRelated', label: 'Employee Related', parent: 'controllable', shares: [45, 30, 25], actual: [136, 148, 163], forecast: [145, 155, 175], prior: [114, 121, 139], budget: [150, 165, 180] },
    { id: 'software', label: 'Software', parent: 'controllable', shares: [60, 20, 20], actual: [412, 438, 467], forecast: [420, 450, 490], prior: [361, 387, 401], budget: [425, 455, 480] },
    { id: 'professionalFees', label: 'Professional Fees', parent: 'controllable', shares: [30, 25, 45], actual: [219, 284, 326], forecast: [240, 270, 300], prior: [183, 208, 241], budget: [245, 275, 305] },
    { id: 'legalFees', label: 'Legal Fees', parent: 'controllable', shares: [15, 20, 65], actual: [118, 154, 132], forecast: [140, 150, 160], prior: [109, 125, 148], budget: [145, 155, 165] },
    { id: 'travelEntertainment', label: 'Travel & Entertainment', parent: 'controllable', shares: [20, 65, 15], actual: [174, 231, 208], forecast: [190, 240, 225], prior: [156, 204, 218], budget: [200, 250, 230] },
    { id: 'businessDevelopment', label: 'Business Development', parent: 'controllable', shares: [5, 90, 5], actual: [41, 47, 59], forecast: [45, 50, 55], prior: [33, 39, 48], budget: [42, 48, 54] },
    { id: 'supplies', label: 'Supplies', parent: 'nonControllable', shares: [30, 30, 40], actual: [34, 38, 42], forecast: [36, 40, 45], prior: [31, 35, 37], budget: [37, 41, 45] },
    { id: 'facilitiesRelated', label: 'Facilities Related', parent: 'nonControllable', shares: [40, 30, 30], actual: [287, 296, 302], forecast: [290, 300, 310], prior: [272, 278, 284], budget: [292, 302, 312] },
    // No capitalized development is assumed in this fictional scenario.
    // Zero divided by zero is undefined, not a fabricated 100% attainment.
    { id: 'capitalizedSoftware', label: 'Capitalized Software', parent: 'nonControllable', shares: [60, 20, 20], actual: [0, 0, 0], forecast: [0, 0, 0], prior: [0, 0, 0], budget: [0, 0, 0] },
    { id: 'depreciationAmortization', label: 'Depreciation/Amortization', parent: 'nonControllable', shares: [45, 25, 30], actual: [181, 189, 197], forecast: [180, 190, 200], prior: [164, 171, 179], budget: [185, 195, 205] },
    { id: 'otherOperatingExpenses', label: 'Other Operating Expenses', parent: 'nonControllable', shares: [20, 30, 50], actual: [244, 253, 278], forecast: [230, 245, 260], prior: [211, 223, 237], budget: [235, 250, 265] },
    { id: 'adPromo', label: 'Ad & Promo', parent: 'otherSpend', shares: [5, 90, 5], actual: [328, 421, 389], forecast: [350, 430, 410], prior: [286, 357, 344], budget: [360, 440, 420] },
    { id: 'dataCenter', label: 'Data Center', parent: 'otherSpend', shares: [80, 5, 15], actual: [612, 655, 704], forecast: [620, 670, 690], prior: [527, 568, 604], budget: [625, 665, 705] },
    { id: 'purchasedServices', label: 'Purchased Services', parent: 'otherSpend', shares: [40, 35, 25], actual: [3340, 3480, 3620], forecast: [3380, 3530, 3670], prior: [2950, 3120, 3270], budget: [3400, 3550, 3700] }
  ];

  const hierarchy = [{ id: 'opex', label: 'Total Expense', parent: null, level: 0, kind: 'root' }];
  for (const category of categories) {
    hierarchy.push({ id: category.id, label: category.label, groupLabel: category.label, totalLabel: category.totalLabel, parent: 'opex', level: 1, kind: 'category' });
    accounts.filter(account => account.parent === category.id).forEach(account => hierarchy.push({ id: account.id, label: account.label, parent: category.id, level: 2, kind: 'account' }));
  }
  const columns = [
    { id: 'qtdActual', label: 'QTD Actuals', group: 'QTD', format: 'number', className: '' },
    { id: 'qtdForecast', label: 'QTD Forecast', group: 'QTD', format: 'number', className: 'fx-selected-header' },
    { id: 'qtdVariance', label: 'QTD Variance', group: 'QTD', format: 'number', className: '', conditionalFormatting: true, varianceKind: 'variance' },
    { id: 'qtdAttainment', label: 'QTD Attainment %', group: 'QTD', format: 'percent', className: '', conditionalFormatting: true, varianceKind: 'attainment' },
    { id: 'qtdPyActual', label: 'QTD PY Actuals', group: 'Prior year', format: 'number', className: '' },
    { id: 'qtdGrowth', label: 'QTD YoY Growth', group: 'Prior year', format: 'number', className: '' },
    { id: 'qtdGrowthPercent', label: 'QTD YoY Growth %', group: 'Prior year', format: 'percent', className: '' },
    { id: 'ytdActual', label: 'YTD Actuals', group: 'YTD', format: 'number', className: 'fx-selected-header' },
    { id: 'ytdBudget', label: 'YTD Budget', group: 'YTD', format: 'number', className: '' },
    { id: 'ytdVariance', label: 'YTD Variance', group: 'YTD', format: 'number', className: '' },
    { id: 'ytdAttainment', label: 'YTD Attainment %', group: 'YTD', format: 'percent', className: '' }
  ];
  const styles = Object.freeze({ header: '#2f5496', text: '#ffffff', year: '#748592', forecast: '#D5E0E8', selected: '#FFA437', favorable: '#16833a', unfavorable: '#c62828' });
  const defaults = () => ({ owner: 'all', time: 'Sep26', rows: hierarchy.map(row => row.id), columns: columns.map(column => column.id), formatting: true, sheetName: 'Budget Review' });
  function descendants(id) { return hierarchy.filter(row => row.parent === id).flatMap(row => [row.id, ...descendants(row.id)]); }
  function validate(config) {
    if (!config || !owners.some(owner => owner.id === config.owner) || !periods.includes(config.time)) throw new Error('Choose a valid executive owner and quarter-end period.');
    if (!Array.isArray(config.rows) || !Array.isArray(config.columns) || !config.rows.length || !config.columns.length) throw new Error('Choose at least one row and one financial line item.');
    if (new Set(config.rows).size !== config.rows.length || config.rows.some(id => !hierarchy.some(row => row.id === id))) throw new Error('Invalid row selection.');
    if (new Set(config.columns).size !== config.columns.length || config.columns.some(id => !columns.some(column => column.id === id))) throw new Error('Invalid line-item selection.');
    if (typeof config.sheetName !== 'string' || !config.sheetName.trim() || /[\[\]*?:/\\]/.test(config.sheetName)) throw new Error('Use a sheet name without [ ] * ? : / or \\.');
  }
  function partition(thousands, shares) {
    let used = 0;
    return shares.map((share, index) => {
      const amount = index === shares.length - 1 ? thousands - used : Math.round(thousands * share / 100);
      used += amount;
      return amount * 1000;
    });
  }
  const baseFields = ['qtdActual', 'qtdForecast', 'qtdPyActual', 'ytdActual', 'ytdBudget'];
  function aggregate(records) {
    return Object.fromEntries(baseFields.map(key => [key, records.reduce((sum, record) => sum + record[key], 0)]));
  }
  function derived(base) {
    const ratio = (numerator, denominator) => denominator === 0 ? null : numerator / denominator;
    const qtdVariance = base.qtdActual - base.qtdForecast;
    const qtdGrowth = base.qtdActual - base.qtdPyActual;
    const ytdVariance = base.ytdActual - base.ytdBudget;
    return {
      ...base, qtdVariance, qtdAttainment: ratio(base.qtdActual, base.qtdForecast),
      qtdGrowth, qtdGrowthPercent: ratio(qtdGrowth, base.qtdPyActual),
      ytdVariance, ytdAttainment: ratio(base.ytdActual, base.ytdBudget)
    };
  }
  function build(config) {
    validate(config);
    const owner = owners.find(item => item.id === config.owner), quarter = quarterIndex[config.time];
    const ownerIndex = owners.filter(item => item.parent).findIndex(item => item.id === config.owner);
    const scope = 'Illustrative owner note · ' + owner.label + ' · ' + config.time;
    const allRows = new Map(), leafBases = new Map();
    for (const account of accounts) {
      function quarterAmount(field, index) {
        const ownerAmounts = partition(account[field][index], account.shares);
        return owner.id === 'all' ? ownerAmounts.reduce((sum, amount) => sum + amount, 0) : ownerAmounts[ownerIndex];
      }
      function yearToDate(field) { return account[field].slice(0, quarter + 1).reduce((sum, _, index) => sum + quarterAmount(field, index), 0); }
      const base = {
        qtdActual: quarterAmount('actual', quarter), qtdForecast: quarterAmount('forecast', quarter),
        qtdPyActual: quarterAmount('prior', quarter), ytdActual: yearToDate('actual'), ytdBudget: yearToDate('budget')
      };
      leafBases.set(account.id, base);
      allRows.set(account.id, { ...hierarchy.find(row => row.id === account.id), values: derived(base), comment: scope + ': ' + account.label + ' — review source commitments with the owner; the variance alone does not establish its cause.' });
    }
    for (const category of categories) {
      const base = aggregate(accounts.filter(account => account.parent === category.id).map(account => leafBases.get(account.id)));
      allRows.set(category.id, { ...hierarchy.find(row => row.id === category.id), values: derived(base), comment: scope + ': ' + category.note + ' This note is fictional context, not a conclusion inferred from the variance.' });
    }
    allRows.set('opex', {
      ...hierarchy[0], values: derived(aggregate([...leafBases.values()])),
      comment: scope + ': expenses use actual less forecast/budget; a negative expense variance is favorable. QTD is the selected quarter; YTD includes all quarters through ' + config.time + '.'
    });
    return {
      config: JSON.parse(JSON.stringify(config)), owner: owner.label, time: config.time,
      rows: hierarchy.filter(row => config.rows.includes(row.id)).map(row => allRows.get(row.id)),
      columns: columns.filter(column => config.columns.includes(column.id)), root: allRows.get('opex'),
      moduleContexts: [{ module: 'Budget Review', owner: config.owner, time: config.time }, { module: 'Owner Notes', owner: config.owner, time: config.time }]
    };
  }
  function format(value, type) {
    if (value == null || !Number.isFinite(value) || value === 0) return '-';
    if (type === 'percent') return (value * 100).toFixed(1) + '%';
    return (value < 0 ? '-$' : '$') + (Math.abs(value) / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  function varianceClass(value, kind = 'variance') {
    if (value == null || !Number.isFinite(value)) return '';
    const comparison = /attainment/i.test(kind) ? 1 : 0;
    return value === comparison ? '' : value < comparison ? 'fx-favorable' : 'fx-unfavorable';
  }
  root.FormattedUxData = { hierarchy, columns, owners, periods, styles, defaults, descendants, validate, build, format, varianceClass };
})(typeof window !== 'undefined' ? window : globalThis);
