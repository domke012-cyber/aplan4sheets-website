/* Real navigation after the illustrative workflow has finished. */
window.WalkthroughJourney = {
  'marketplace-install': {
    heading: 'Next: prepare your Anaplan connection',
    detail: 'A tenant security administrator creates the OAuth client. Already have credentials? Skip to connection setup.',
    href: '/demo/oauth-client.html', label: 'Create the OAuth client →', guide: '/guide.html#step-3',
    alternative: { href: '/demo/oauth-setup.html', label: 'I already have client credentials →' }
  },
  'oauth-client': {
    heading: 'Next: connect aPlan4Sheets',
    detail: 'Use the client credentials in the installed connector, then validate and sign in.',
    href: '/demo/oauth-setup.html', label: 'Connect in Google Sheets →', guide: '/guide.html#step-3'
  },
  'oauth-setup': {
    heading: 'Next: add your Anaplan model',
    detail: 'Choose your tenant, workspace, and model to make its views available.',
    href: '/demo/setup.html?focus=model', label: 'Add your model →', guide: '/guide.html#step-4'
  },
  setup: {
    heading: 'Next: create your first report',
    detail: 'Select a view, arrange its dimensions, and create a pivot in Sheets.',
    href: '/demo/pivot.html', label: 'Create your first report →', guide: '/guide.html#step-5'
  },
  pivot: {
    heading: 'Next: keep your report up to date',
    detail: 'See how scheduled refreshes update your saved report configurations.',
    href: '/demo/schedule.html', label: 'Set up scheduled refresh →', guide: '/guide.html#step-7',
    alternative: { href: '/demo/exports.html', label: 'Explore exports and saved views →' }
  },
  exports: {
    heading: 'Next: keep your reports up to date',
    detail: 'Learn how to schedule refreshes for saved report configurations.',
    href: '/demo/schedule.html', label: 'Set up scheduled refresh →', guide: '/guide.html#step-7'
  },
  schedule: {
    heading: 'Your refresh walkthrough is complete',
    detail: 'Use the guide to follow the same steps in your own Google Sheet.',
    href: '/guide.html#step-7', label: 'Open the refresh guide →', guide: '/guide.html',
    alternative: { href: '/demo/formatted-ux.html', label: 'Explore Formatted UX next →' }
  }
};
