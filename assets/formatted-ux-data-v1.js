/* Public demo fixture: fictional data, supported UX style semantics. No network. */
(function (root) {
  'use strict';
  const budget = root.BudgetReviewData;
  const hierarchy = [{ id: 'opex', label: 'Operating expenses', parent: null, level: 0 }];
  budget.categories.forEach(category => {
    hierarchy.push({ id: category.id, label: category.label, parent: 'opex', level: 1 });
    budget.accounts[category.id].forEach(account => hierarchy.push({ id: account[0], label: account[0] + ' · ' + account[1], parent: category.id, level: 2 }));
  });
  const columns = [
    { id: 'forecast', label: 'Open Forecast', format: 'number', className: 'fx-forecast-header' },
    { id: 'budget', label: 'Sel. Version', format: 'number', className: 'fx-selected-header' },
    { id: 'variance', label: 'Variance', format: 'number', className: 'fx-variance-header' },
    { id: 'percent', label: 'Variance %', format: 'percent', className: 'fx-variance-header' }
  ];
  const styles = Object.freeze({ header: '#2f5496', text: '#ffffff', year: '#748592', forecast: '#D5E0E8', selected: '#FFA437', favorable: '#C8E6C9', unfavorable: '#F5C7C3' });
  const defaults = () => ({ owner: 'all', time: 'FY27', rows: hierarchy.map(r => r.id), columns: columns.map(c => c.id), formatting: true, sheetName: 'Budget Review' });
  function descendants(id) { return hierarchy.filter(row => row.parent === id).flatMap(row => [row.id, ...descendants(row.id)]); }
  function validate(config) {
    if (!budget.owners.some(o => o.id === config.owner) || !['FY26', 'FY27'].includes(config.time)) throw new Error('Choose a valid owner and fiscal year.');
    if (!config.rows.length || !config.columns.length) throw new Error('Choose at least one row and one financial line item.');
    if (new Set(config.rows).size !== config.rows.length || config.rows.some(id => !hierarchy.some(r => r.id === id))) throw new Error('Invalid row selection.');
    if (new Set(config.columns).size !== config.columns.length || config.columns.some(id => !columns.some(c => c.id === id))) throw new Error('Invalid line-item selection.');
    if (!config.sheetName.trim() || /[\[\]*?:/\\]/.test(config.sheetName)) throw new Error('Use a sheet name without [ ] * ? : / or \\.');
  }
  function build(config) {
    validate(config);
    const owner = budget.owners.find(o => o.id === config.owner);
    const allRows = new Map();
    const commentScope = owner.id === 'all' ? 'Company plan' : owner.label.split(' · ')[0] + ' plan';
    function values(forecast, plan) { return { forecast, budget: plan, variance: plan - forecast, percent: plan === 0 ? null : (plan - forecast) / plan }; }
    let totalForecast = 0, totalBudget = 0;
    budget.categories.forEach((category, index) => {
      const definitions = budget.accounts[category.id];
      // Partition the company total once, then aggregate those exact leaf
      // values. All levels reconcile at the displayed $1,000 precision.
      function allocate(field) {
        const company = Math.round(category[field] * 1000000), leafOwners = budget.owners.filter(o => o.parent);
        let assigned = 0;
        const partitions = leafOwners.map((leafOwner, ownerIndex) => {
          const total = ownerIndex === leafOwners.length - 1 ? company - assigned : Math.round(company * leafOwner.shares[index] / 1000) * 1000;
          assigned += total;
          let used = 0;
          return definitions.map((account, accountIndex) => {
            const amount = accountIndex === definitions.length - 1 ? total - used : Math.round(total * account[2] / 1000) * 1000;
            used += amount; return amount;
          });
        });
        return owner.id === 'all' ? definitions.map((_, i) => partitions.reduce((sum, amounts) => sum + amounts[i], 0)) : partitions[leafOwners.findIndex(o => o.id === owner.id)];
      }
      const forecastAccounts = allocate(config.time === 'FY26' ? 'forecast' : 'q4');
      const budgetAccounts = allocate(config.time === 'FY26' ? 'budget26' : 'budget');
      const forecast = forecastAccounts.reduce((sum, value) => sum + value, 0), plan = budgetAccounts.reduce((sum, value) => sum + value, 0);
      definitions.forEach((account, i) => {
        const accountForecast = forecastAccounts[i], accountBudget = budgetAccounts[i];
        allRows.set(account[0], { ...hierarchy.find(r => r.id === account[0]), values: values(accountForecast, accountBudget), comment: '' });
      });
      const notes = { people: 'Hiring and merit assumptions retained for owner review.', software: 'Cloud capacity is above budget; review usage assumptions.', services: 'Some implementation work is phased later in the year.', facilities: 'Existing leases; no additional office assumed.', travel: 'Review event timing and the travel allocation.' };
      allRows.set(category.id, { ...hierarchy.find(r => r.id === category.id), values: values(forecast, plan), comment: commentScope + ' · ' + config.time + ': ' + notes[category.id] });
      totalForecast += forecast; totalBudget += plan;
    });
    allRows.set('opex', { ...hierarchy[0], values: values(totalForecast, totalBudget), comment: commentScope + ' · ' + config.time + ': budget less forecast; positive variance is favorable.' });
    return {
      config: JSON.parse(JSON.stringify(config)), owner: owner.label, time: config.time,
      rows: hierarchy.filter(r => config.rows.includes(r.id)).map(r => allRows.get(r.id)),
      columns: columns.filter(c => config.columns.includes(c.id)),
      // Root is the entire model aggregation, not the sum of displayed parents
      // plus children. Selecting a hierarchy level changes display, not totals.
      root: allRows.get('opex'),
      moduleContexts: [{ module: 'Budget Review', owner: config.owner, time: config.time }, { module: 'Owner Notes', owner: config.owner, time: config.time }]
    };
  }
  function format(value, type) {
    if (value === null) return '—';
    if (type === 'percent') return (value < 0 ? '(' : '') + (Math.abs(value) * 100).toFixed(1) + '%' + (value < 0 ? ')' : '');
    return (value < 0 ? '(' : '') + (Math.abs(value) / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 }) + (value < 0 ? ')' : '');
  }
  function varianceClass(value) { return value == null || value === 0 ? '' : value > 0 ? 'fx-favorable' : 'fx-unfavorable'; }
  root.FormattedUxData = { hierarchy, columns, owners: budget.owners, periods: ['FY26', 'FY27'], styles, defaults, descendants, validate, build, format, varianceClass };
})(typeof window !== 'undefined' ? window : globalThis);
