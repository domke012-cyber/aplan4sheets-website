# Formatted UX walkthrough — local review candidate

Status: unpublished. The connector's GAS, App Engine and Marketplace releases
are unchanged. This website candidate must not be pushed to `main` without
publication approval; that branch publishes through GitHub Pages.

## Primary walkthrough

`/demo/formatted-ux.html` is a new self-paced interactive example. Existing
Budget Review v1/v2 assets and all narrated tours are retained.

1. Persistent app → category → page directory with functional search and
   expandable groups.
2. Page canvas with a selectable combined grid, two module regions, explicit
   selection/clear state, and Export selected grid.
3. Configure Pivot with Rows/Columns/Pages, hierarchy-level Select All /
   Deselect All / Only This, staged item choices, and automatically linked
   single-selection Time and Executive Owner page filters.
4. Explicit Create Pivot / Done, formatted Sheet output, source comparison,
   Repivot, cancel and refresh. Restart invalidates pending sample creation.

The financial fixture partitions company totals into owners and accounts at
$1,000 precision so leaf, parent, category and owner rollups reconcile. Parent
rows retain source aggregates rather than summing displayed parents and leaves.
Variance is budget less forecast; positive expense variance is favorable.

## Fidelity and privacy boundary

Navigation and selector labels are based on the connector implementation.
Header styles follow supported UX style semantics: blue/white headers,
gray fiscal-year and Open Forecast headers, orange selected-version labels,
and white data cells. Sample conditional-formatting rules apply only to
variance cells. Source preview and Sheet output share explicit formatting
metadata and the same fictional snapshot.

This is not a recording, live connection, performance benchmark, or an exact
customer-page reproduction. Organizations, people, accounts, commentary and
financials are fictional. There are no service calls or model/Sheet writes.
An exact visual match to the intended real UX page remains a reference-review
step; no private customer screenshots or values were included in site assets.

## All-demo review

All 11 preexisting demos were audited alongside the new walkthrough. The
refinement corrects ignored formatting choices, nonfunctional discovery
search/closing, autoplay overwriting manual nested selections, inconsistent
YoY baselines, and unsupported Marketplace popularity figures. Scripted setup
and schedule previews are explicitly differentiated from editable controls.
The OAuth help destination's personal-domain claim was corrected to the
connector's organizational-domain-only OAuth requirement.

## Verification

- Automated tests cover all narrated-tour lifecycles and local assets, plus
  financial rollups, shared filters, draft/commit/cancel behavior, source/Sheet
  value and style parity, invalid selections and keyboard dialog behavior.
- Browser: source selection → hierarchy levels → FY26 + a child owner →
  create/Done → source comparison → refresh → reopen with retained filters.
- Desktop source/Sheet headers, conditional styles and hierarchy indentation
  inspected visually. No browser warnings/errors observed in the new flow.
- 390 × 844 responsive check: picker fits; page does not overflow horizontally;
  wide financial grids scroll within their own containers. Viewport reset.
- Gallery link to the new walkthrough verified in the browser.

This is a product demonstration, not evidence of live-production data access.
