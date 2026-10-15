# Budget review demo verification

Status: local candidate for review, not published. This website update adds a
working budget-review simulation and clearer entry points on the homepage,
gallery, and walkthrough hub. The connector, Google files, customer models,
and production services are unchanged.

## Interactive reporting workflow

The fictional Northstar dataset supplies every displayed cell, total, chart,
and illustrative slide. The recommended layout contains FY26 Open Forecast,
followed by FY27 Selected Version, YoY, and YoY percent. Users can select exact
year/measure occurrences, filter expense rows, search combinations, and merge
adjacent repeated year headers. The existing separate nested-selection demo
retains its three-dimension example; this flagship uses two column dimensions.

Applying selections changes the configuration, not an existing exported
snapshot. Execute or Refresh commits a new snapshot. Charts and the slide
preview read that output, so changing a version keeps the old report visible
until refresh. The full sample compares $37.80M in FY26 with $41.70M for FY27
Budget, a $3.90M increase of 10.3%. Q4 Forecast changes FY27 to $41.50M, an
increase of $3.70M or 9.8%. Row filters recalculate totals and percentages from
the selected numerator and denominator, rather than averaging percentages.

The six narrated chapters last about 130 seconds. Chapters establish their
required state when selected directly. Manual changes pause the tour so its
actions cannot overwrite a visitor's selections. Restart cancels pending
retrieval and animation work. Tabs support arrow-key, Home, and End navigation;
the native selection dialog supports keyboard dismissal and scrolls on mobile.

## Website and media changes

The homepage and gallery link to the flagship and display a screenshot of the
fictional workspace. A public business-email link lets visitors request a live
demo. The sitemap includes the new canonical page. The page is labeled a
simulation, not a customer recording; chart creation and slide assembly remain
illustrative steps, not automatic connector features. No VideoObject metadata
is used for an HTML simulation.

Homepage/gallery styles are prebuilt into a 28,435-byte CSS file instead of
compiled in the visitor's browser. The hero appears immediately instead of
waiting for a fade animation. Existing guide/blog styling remains unchanged.
The Tailwind build uses modern-browser CSS; older-browser compatibility should
be reviewed separately if it becomes a support requirement.

Six new Microsoft Aria narration clips use two-pass loudness normalization.
All decode as mono 44.1 kHz MP3. Integrated loudness measures −16.77 to −16.59
LUFS; the highest true peak is −1.84 dBTP. Narration loads when played, and
visible notes and the transcript remain available without audio. Original
narration files are preserved. Final voice and pronunciation preference still
requires a person's listening review.

Local CustomEvents cover tour progress, selections, sample pivot execution,
chart/slide steps, and demo-request clicks. They contain only fictional demo
fields and are not sent to a collector. This prepares instrumentation without
enabling external analytics, cookies, visitor IDs, or account tracking.

## Verification

- All 34 automated tests pass, covering all eleven walkthroughs, playback,
  pause/resume, restart, narration fallback, nested selections, weighted
  percentages, stale snapshots, cancellation, keyboard tabs, local event
  payloads, HTML, structured data, and asset references.
- Desktop, tablet, and mobile checks at actual 1280×800, 768×800, and 390×844
  viewports show no document-level horizontal overflow in the flagship chart,
  homepage, or gallery. Chart labels remain inside their container.
- The selection dialog stays inside the viewport at all three sizes. At
  390×844 it contains 1049px of content in a 593px scrollable body, with Apply
  and Cancel visible. Native mobile row selection and refresh updated the
  chart to $40.05M for the four-category Q4 Forecast selection.
- The hub preview has matching document/client widths at 1230px, 718px, and
  360px. Its taller contents can scroll, and the embedded native dialog opens
  and closes. Gallery thumbnails load at their actual 1224×751 size.
- Browser interaction confirmed $41.70M remains visible after selecting Q4
  Forecast until Refresh, after which the chart and slide show $41.50M.
- `npm audit` reports zero vulnerabilities; `git diff --check` passes. The
  Tailwind CLI's older pinned watcher is overridden to patched version 2.6.0.

The separate responsive-layout candidate and its 80-check browser matrix are
documented in `demo-layout-v2-review-20261007.md`. JSDOM verifies contracts and
behavior, not visual geometry; the browser checks supply layout evidence.

## Publication and genuine recording

Review the local flagship at `/demo/budget-review.html` and the updated
homepage/gallery before approving publication. GitHub Pages publishes on a
push to `main`; no push or deployment is part of this candidate.

For a genuine video, record the real connector in a synthetic-data sandbox,
including the actual selection, execution, version refresh, and Google Sheets
chart workflow. Replace simulated actions with that capture, then review its
audio and captions before publishing it as a recording. Do not use customer
models or imply that the illustrative slide button creates a Google file.
