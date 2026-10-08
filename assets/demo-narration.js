/* Versioned narration scripts: also displayed as scene notes for silent viewing. */
window.DemoNarration = {
  setup: [
    'Open Google Sheets, then choose the connector from Extensions. This walkthrough uses sample data; it does not connect to a customer model.',
    'The sidebar brings your connection settings and model selections together. Choose the authentication method configured by your organization.',
    'Sign in through your organization’s Anaplan login. OAuth and single sign-on depend on your Anaplan administrator’s configuration.',
    'Once authenticated, the connector shows your account and available model context. Your Anaplan access determines what you can retrieve.',
    'Choose a tenant, workspace, and model, then save the connection. You can now browse views and build connected reports in Sheets.'
  ],
  pivot: [
    'Start in Pivot Views. Browse or search the modules available in your connected Anaplan model.',
    'Expand the module and choose a view. The connector uses its dimensions as the starting point for your report.',
    'Open Configure Pivot to arrange the report. Your row, column, and page dimensions stay visible as you work.',
    'Move dimensions between rows, columns, and pages. Use page selections to focus the report on the context you need.',
    'Choose the line items you want to include. For exact nested occurrences, use the show and hide workflow demonstrated separately.',
    'Select the time periods that matter for this report. The saved configuration keeps those choices for later refreshes.',
    'Execute the pivot to retrieve data and write the result to Sheets. Review the output and save the configuration for reuse.'
  ],
  'multi-module': [
    'Start with an existing headcount pivot. This sample report groups headcount by executive owner.',
    'Add another module to the pivot. Combined grids are useful when compatible modules need to share one reporting layout.',
    'Choose from compatible sources. A combined pivot requires compatible dimensions; it is not an unrestricted join across models.',
    'Review the second module’s dimensions and shared selections before adding its measures.',
    'Choose the measure to include from the second module. Each source keeps its own data and formatting context.',
    'Execute the combined pivot. The connector retrieves the sources and aligns their output in one sheet.',
    'Review the combined result. Separately, linked pivots can synchronize shared page dimensions across compatible configurations in the same model.'
  ],
  schedule: [
    'Open Scheduled Refresh to manage recurring updates for your connected reports.',
    'Create a schedule and give it a recognizable name. The schedule runs under its saved owner’s access.',
    'Choose the refresh cadence. Google-managed trigger timing is approximate rather than an exact minute guarantee.',
    'Select the connected sheets or configurations to refresh. Keep the scope focused on the reports your team needs.',
    'Save the schedule. Check its status and keep your Anaplan authentication current for future runs.',
    'The walkthrough simulates a scheduled run. Actual refreshes depend on authentication, model availability, and the selected data volume.'
  ],
  discovery: [
    'Choose Formatted UX Pages in the connector to browse the apps and pages available for your active model.',
    'The connector loads the UX app catalog and resolves the grid widgets behind each page. Access depends on your Anaplan permissions.',
    'Browse an app, expand its categories, and choose a page. Search helps narrow the available apps and pages.',
    'Select a supported grid widget. Review its source, dimensions, and page selections before exporting it.',
    'Write the grid to Sheets with supported number formats, hierarchy styles, and conditional colors. Review the result and save the configuration for refresh.'
  ],
  'ux-formatting': [
    'Browse a UX board’s supported grid widgets. This example uses a sample profit and loss report.',
    'Choose the grid to export. The connector reads the widget’s source and formatting context.',
    'Review the pivot dimensions and page selections. Formatting is tied to the selected source, not a fixed spreadsheet color template.',
    'Execute the configuration to retrieve the data and write it to Sheets.',
    'Apply supported UX styles, including number formats, hierarchy emphasis, and conditional colors. Not every Anaplan card type or style is supported.',
    'Review the formatted result. You can reuse this connected data in spreadsheet analysis, charts, and presentation workflows.'
  ],
  'llm-agent': [
    'Open AI Analyst with your model context. This is an illustrative analysis workflow using sample data, not a live recording.',
    'Describe the question in plain English. Be specific about the period, version, and comparison you want to analyze.',
    'Review the source context while the analysis runs. Check the returned numbers and explanation against the underlying data.',
    'Review the findings and draft narrative. AI output is a starting point for your judgment, not an automatically approved report.',
    'Export only after review. Aplan AI offers Export to Sheet; the separately configured Claude pilot offers Write to sheet. Neither is Anaplan model write-back.',
    'Use the reviewed findings to prepare presentation talking points. Review your charts and Slides output before sharing them.',
    'Your reviewed result is ready for the next reporting step. Claude handoffs require a configured connector and depend on your environment.'
  ],
  'oauth-setup': [
    'Open the connector from Google Sheets. This setup example uses placeholder credentials, not real secrets.',
    'The OAuth setup wizard guides your organization’s connection configuration. Coordinate these settings with your Anaplan administrator.',
    'Enter the OAuth details supplied for your organization. Never share client secrets in public documents or screenshots.',
    'Verify the connection configuration. A failed check needs attention before users can sign in.',
    'Complete the setup and review the next steps. Organizational login configuration can vary between tenants.',
    'Return to the connector and begin the Anaplan sign-in flow using your organization’s configured login.',
    'Once connected, select your model and start browsing. Access remains subject to your Anaplan permissions.'
  ],
  'marketplace-install': [
    'Find Anaplan Connector for Sheets in Google Workspace Marketplace. This is a simulated listing, not an interactive installer.',
    'Install from the real Marketplace listing. Your Google Workspace administrator may need to approve the add-on.',
    'After installation, open Google Sheets and launch the connector from Extensions. Follow the setup guide for authentication.'
  ],
  'nested-selections': [
    'Start with Time outside Line Items. A full nested layout repeats every measure under every year.',
    'Keep Forecast for the earlier year, and Budget plus variance measures for the later year. Show or hide exact combinations rather than entire dimensions.',
    'Add a third dimension for a more specific selection. Each occurrence is identified by its full path. The same selection approach also works on rows.',
    'Review the compact report with adjacent repeated outer headers merged. Save the configuration so refresh keeps the selected combinations.'
  ]
};
