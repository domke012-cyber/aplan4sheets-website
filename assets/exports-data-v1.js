/* Fictional public reporting fixture. No Anaplan or Google Sheets requests. */
window.ExportsData = {
  steps: [
    {
      name: 'Choose an export action',
      heading: 'Find the prepared export you want to run.',
      caption: 'With your model connected, open Export Actions. Use Search exports to find a prepared export, select it, then choose Run Selected Exports. This example uses a fictional Revenue Summary.',
      tip: 'Export Actions contains prepared Anaplan exports available to your account. The sample selects one export.',
      duration: 5000
    },
    {
      name: 'Confirm the export destination',
      heading: 'Review the destination before continuing.',
      caption: 'Review the destination warning. Existing destination data and formulas can be replaced. Choose Confirm exports only when the destination is correct, or Cancel to leave the workbook unchanged.',
      tip: 'This confirmation comes before the connector writes the selected export to your workbook.',
      duration: 5000
    },
    {
      name: 'Review the exported report',
      heading: 'Check the result in Google Sheets.',
      caption: 'After confirming, review the exported report in its destination tab. Our fictional Revenue Summary shows a total budget of one hundred twenty million dollars. Next, we will export a saved view.',
      tip: 'Check that the output matches the report and destination you selected. All figures here are illustrative.',
      duration: 5000
    },
    {
      name: 'Choose a saved view',
      heading: 'Open Saved Views and select your view.',
      caption: 'For a saved view, open Saved Views, find the relevant module, and select the view you want. Choose Export View to continue. Here, we select Operating Results from the Financial Planning module.',
      tip: 'Saved Views is a separate path from prepared Export Actions. Available modules and views depend on your Anaplan access.',
      duration: 5000
    },
    {
      name: 'Confirm the saved-view destination',
      heading: 'Check this destination too.',
      caption: 'The saved view also requires a destination review. Existing destination data and formulas can be replaced. Choose Confirm export to proceed, or Cancel to keep the workbook unchanged.',
      tip: 'Review the destination each time. The confirmation is singular for this one saved view.',
      duration: 5000
    },
    {
      name: 'Review your saved-view report',
      heading: 'Your selected view is now in the workbook.',
      caption: 'Review the saved-view result in its destination tab. You have now seen both export paths: prepared Export Actions and Saved Views. Continue to refresh and scheduling to learn how to update connected reports.',
      tip: 'Prepared exports and saved views start in different cards, and both require confirmation before writing to Sheets.',
      duration: 5000
    }
  ],
  exportReport: { title: 'Revenue Summary', headings: ['Region', 'FY27 Budget'], rows: [['North', '$72.0M'], ['South', '$48.0M'], ['Total revenue', '$120.0M']] },
  viewReport: { title: 'Operating Results', headings: ['Metric', 'FY27 Budget'], rows: [['Revenue', '$120.0M'], ['Operating costs', '$78.0M'], ['Operating profit', '$42.0M']] }
};
