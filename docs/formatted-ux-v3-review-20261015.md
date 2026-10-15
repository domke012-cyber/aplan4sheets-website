# Formatted UX walkthrough v3 — review record

Date: October 15, 2026 (America/Chicago)

## Status and scope

This is an **unpublished local website candidate** at `demo/formatted-ux.html`.
It has not been published to aplan4sheets.com. The connector's PROD deployment,
production workbook and production model were not changed by this website work.
The v1 review record and v1/v2 runtime assets remain preserved.

The v3 interface was rebuilt in HTML/CSS from the actual connector workflow,
with a fictional financial fixture. It is a self-paced interactive simulation,
not a video, live connector session or customer-data export. Its controls do not
call Anaplan or Google services and do not create real files.

## Reference capture and fidelity

The live reference was captured in the designated **sandbox** workflow across
11 stages. The reference run successfully created the new sandbox tab
`[QA] Website UI Reference Oct15`. The captures remain private working evidence;
they were not copied into website assets or embedded in the walkthrough.

The rebuild reflects these observed interaction patterns:

1. A Google Sheets-style workbook with the connector sidebar on the right.
2. **Browse UX Pages** opens a separate, modeless UX browser with search,
   app/category/page navigation and **Discover modules**.
3. Discovery presents a structural grid thumbnail with blank financial cells.
   Selecting its heading or thumbnail body selects the combined grid for export.
4. Export opens a modal, two-pane **Configure Pivot** interface. The persistent
   left Item Selector is populated by a dimension chip on the right.
5. Item checks change the editable configuration immediately. There is no
   separate, invented Apply Selection popup. Cancel discards uncommitted edits.
6. Time and Executive Owner are automatically linked across both module regions.
7. During creation, Create Pivot is disabled. On completion it stays disabled,
   while Cancel becomes **Done**, which closes the completed dialog.
8. The sample output retains the financial grid's source-style headers,
   subtotals, number formats and text-only conditional formatting.

The live sandbox reference screenshots were captured from Chrome. Separate
screenshots of the rebuilt local demo were captured through the in-app browser
at limited resolution. This is a structural and interaction-fidelity review,
not a claim of pixel-perfect reproduction. Browser chrome, model catalogs and
financial data are intentionally illustrative.

## Deliberate simulation boundaries

- All model references, owner names, amounts and commentary in the public-facing
  demo are fictional. The customer screenshot supplies visual structure, not its
  financial values.
- The demo has a 22-item financial row hierarchy, with four categories and
  selectable hierarchy levels. This is illustrative; the captured live LISS
  selector had 26 items and was flat. The demo hierarchy is not presented as an
  exact copy of that live list.
- The calendar offers two selectable months, Jun26 and Sep26. FY26, Q2 FY26 and
  Q3 FY26 are structural navigation labels, not extra selectable sample periods.
  Search and collapse change visibility without changing the shared selection.
- A discovery thumbnail is a schema preview, not a fetched financial report.
  An optional, separately labeled source-formatting comparison appears only
  after the sample output exists.
- New exports are always source-formatted. **Use dashboard settings** controls
  layout choices—auto-fit row heights, frozen headers and hidden gridlines—not
  whether source header colors, financial number formats or conditional
  formatting are applied.
- Out-of-scope controls are disabled or visibly illustrative. The three remaining
  dashboard options are explicitly labeled as UI reference only; unsupported
  interactions do not silently pretend to execute.
- **Keep current Sheet formatting on refresh** is retained as a saved option.
  This simulation does not include a separate manual formatting editor. Refresh
  rereads the same stable fictional snapshot instead of inventing a data change.
- **Hide rows that are all zero or blank** considers every data cell, including
  commentary. A row with nonempty commentary is retained even if its financial
  measures are zero. Hiding a row never recalculates source subtotal amounts.
- A blank custom-name field falls back to Budget Review; forbidden sheet-name
  characters are rejected without changing an already-created sample report.

## Verification

Automated verification: **122/122 tests passed** on the v3 candidate.
The new v3 suite contains 18 interaction regressions. The historical v1/v2 suites
continue against a frozen v2 HTML fixture, preserving the original behavior and
financial/source-style checks without coupling them to the new modal shell.
`git diff --check` passed.

The automated checks cover modal lifecycle, immediate inline edits, hierarchy
selection and button state, structural Time navigation, shared module filters,
thumbnail selection, asynchronous creation and Done, cancel/close behavior,
dashboard options, name validation, zero-row handling, source/output parity,
raw-value coordinates, refresh persistence, keyboard focus, and restart during
pending work. The harness rejects real service requests.

Desktop browser verification completed the flow with **Jun26** and fictional
owner **Alex Morgan**, closed the completed dialog with Done, checked output,
refreshed, and reopened Repivot with Jun26 retained.

Responsive verification used a 390 × 844 browser viewport. Its measured DOM
viewport width and document scroll width were both 375 pixels; the dialog bounds
were 374 × 824 pixels and remained within the viewport. The wide financial grid
scrolls internally rather than widening the page. The mobile Sep26 selection →
Create → Done flow also completed successfully. The viewport was reset after
verification, and the demo page's console error log was empty.

## Targeted privacy scan

The new v3 JavaScript, CSS and live demo HTML were scanned for the known sandbox
and PROD workbook identifiers, Google Sheets workbook URLs, real owner names
visible in the supplied screenshots, customer organization names, inline bitmap
data URLs and screenshot filenames. **No matches were found.**

The v3 page references local code assets and inline vector UI elements, not raw
live captures. No new private reference captures were found under `assets/`.
Pre-existing marketplace images and the separate budget-demo image are outside
this v3 capture set and were not replaced by the private evidence.

This targeted scan is a scoped release check, not a claim that every historic
asset in the repository has undergone a comprehensive privacy audit.
