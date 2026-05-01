# Demo Fit Audit

## Scope

Checked the public/demo entry pages and every animated demo page:

- `index.html`
- `demos.html`
- `demo.html`
- `demo/setup.html`
- `demo/pivot.html`
- `demo/multi-module.html`
- `demo/schedule.html`
- `demo/discovery.html`
- `demo/ux-formatting.html`
- `demo/llm-agent.html`
- `demo/oauth-setup.html`
- `demo/marketplace-install.html`

## Viewports

Verification used static browser render screenshots and DOM metrics at:

- Desktop: `1440x900`
- Laptop: `1280x720`
- Tablet: `768x1024`
- Mobile: `390x844`

## Findings And Fix

The animated demo pages were using fixed viewport math such as `height: calc(100vh - 56px)` for the browser simulation. That only subtracted the nav height and ignored demo controls plus the progress bar, so the simulated browser extended past the bottom of the viewport on common laptop/mobile sizes. The Marketplace walkthrough also had a `640px` browser minimum height that forced clipping on `1280x720`.

The fix adds `assets/demo-responsive.css` and links it from the demo pages. The shared override makes the demo page a vertical flex shell, locks standalone demo pages to the available `100dvh` viewport, lets the simulated browser fill the remaining screen, removes fixed minimum heights that caused bottom clipping, and stacks the grid/sidebar layout on tablet and mobile. Spreadsheet grids keep internal scrolling on narrow screens so wide simulated Sheets content remains reachable instead of forcing page-level horizontal overflow.

## Verification Artifacts

Artifacts were written outside the repo:

- Before screenshots and metrics: `/tmp/aplan4sheets-demo-audit/before`
- Final screenshots and metrics: `/tmp/aplan4sheets-demo-audit/final`

Final result: 48 screenshots and 48 metric files. The final audit reported no document-level horizontal overflow, no locked vertical overflow, and `maxPrimaryOverBottom=0` for all demo/browser shells. Rechecked on 2026-05-01 with a Chrome DevTools viewport audit across desktop, laptop, tablet, and mobile; all demo/browser shells again reported `primaryOverBottom=0`.

## Caveats

`index.html` and `demos.html` use CDN Tailwind in production. In the local sandbox, external network fetches were unavailable, so those two pages were checked structurally and in the same renderer, but the demo clipping fix is scoped to the animated demo/browser-frame pages where the issue reproduced.
