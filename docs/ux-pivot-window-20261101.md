# Formatted UX Pages workflow and the pivot window — November 1, 2026

Follow-up to the 2026-10-31 screenshot set. The owner asked for the site to feature the
Formatted UX Pages workflow more and to focus on the pivot window: moving dimension cards,
showing and hiding combinations of nested columns, and selecting hierarchy levels from a card.
The review that led to this change is kept with the owner
(`outputs/website-ux-pivot-review-2026-11-01/review.md`).

## What changed

Home page (`index.html`):

- New section **From an Anaplan UX page to a formatted Sheet** directly after the hero: four
  real captures in order — Browse UX Pages, Export selected grid (the prefilled pivot window),
  Create Pivot (the formatted sheet already on the site), and the sidebar card with Repivot,
  Link and refresh.
- New section **Shape the report before it reaches the sheet**: three real captures of the
  pivot window with copy in the product's own labels — dimension cards dragged between Rows,
  Columns and Pages (Time just moved into Rows), the Item Selector with Hierarchy Selectors and
  Only This applied, and the Show / Hide column combinations editor with its data preview.
- "Build the report you actually need" drops the HTML mock table; the nested-selections demo
  keeps its link in a text card, and the "Preview. Show or hide. Repivot." card now describes
  Row and Column combinations.
- The duplicate "Anaplan UX formatting" card in "Your complete Anaplan suite" became
  "Formatted UX Pages"; "Powerful pivot engine" names the cards, level selectors and Show / Hide;
  the "See it in action" pivot caption reads "The pivot window".

Guide (`guide.html`): step 5 is now **Create Your First Report** with three parts — Export a
Formatted UX Page (new, with the formatted-ux walkthrough embedded), Shape the pivot window
(three captures with captions), and the existing Build a pivot from a module view list.

Styles: `assets/pivot-window-v1.css` (new, linked from both pages); `assets/site-v1.css`
rebuilt with `npm run build:css`.

Tests: the guide now has eight demo embeds and links, so the three tests that pinned seven
were updated (`setup-guide-journey-v1`, `homepage-entry-v1`, `policy-ui-readiness-v1`).

## The captures

`assets/product/07` to `11`, 1280×800 JPG, captured 2026-11-01 in Chrome from the production
add-on on the FP&A test workbook, Formatted UX Pages → FY27 Budget Review → Expense Variance
page → Grid 1 → Export selected grid. No report was created; the pivot window was cancelled.

**Every name and figure is fictional.** The workbook title, dialog titles, the view name, the
dimension card names, the hierarchy level names, the Item Selector tree (real people's names
in the source), the app and page names, and all preview values were replaced in the image with
the same retouch tool as the October 31 set (fill, text, clone operations recorded per frame
in `outputs/website-captures-2026-11-01/f*-ops.json`, kept with the owner). The fictional
company is "Northstar"; the row hierarchy is All Departments › Division › Department › Cost
Center; preview values reuse the hero grid's fictional figures. Each served JPG was OCR-scanned
(Apple Vision) for a list of real organisation, person, model and account terms: 0 hits, and
"Northstar" / "Department" present as the positive control.

The pivot dialog renders live Anaplan names and values, so these frames needed heavy retouch.
A small fictional capture model is being built separately so future captures need none.

## Verification

- `npm test`: 214/214.
- Both pages rendered locally at 1280 px and 375 px; the new sections stack to single columns
  on phones with no horizontal scroll.
- `git diff --check` clean.

Rollback: revert the merge commit on `main`; the new images are additive.

## Addendum — recaptured from the fictional Northstar model (same day)

Frames `07`, `08`, `09` and `10` were recaptured from the production add-on on a fictional
Anaplan model built for this purpose ("Northstar Planning", Budget Owner Review board), so they
carry no retouched names or figures at all: Cost Center hierarchy (All Cost Centers › Level 1 ›
Level 2 › Cost Center, 28 items), Time and Line Items on columns, GAAP Basis and Versions as
page selectors. The only edits are cosmetic: on all four frames the workbook title, clipped by the 1.6 crop,
was rewritten and the title-bar icons shifted right of it; on `07` the unrelated app row above
the Northstar app was relabelled, the clipped sliver of the sidebar's account card at the right
edge was filled, and the mouse cursor was removed from the grid preview. OCR of the served JPGs: 0 real-term hits.

## Addendum 2 — hero and Show / Hide recaptured from Northstar (same day)

`01` (the hero) and `11` (Show / Hide) now come from the Northstar model as well, so no frame on
the home page or the guide carries a retouched Anaplan name or figure any more.

- `11`: the Show / Hide data preview loaded on a retry (the earlier 401 from the Extensions
  query cleared on its own once the workspace's SSO exception had propagated). The frame shows the
  Budget Review grid with Cost Center on rows, Time and Line Items nested on columns, two FY25
  occurrences hidden (MTD Variance % and QTD Actuals), 355 of 357 combinations shown. Same crop and
  title rewrite as `07`–`10`.
- `01`: captured in the same browser window, which could not be resized to a 1.6 frame, so the
  image is the window's left part (row headers, the Cost Center labels and columns C–H) joined to
  its right part (the grid scrollbar, the sidebar and the title-bar icons) with the empty band between
  them removed; nothing inside either part was moved. The signed-in card was relabelled with the
  fictional user (Jordan, jordan@northstar.example, avatar letter J), the only retouch on the frame.

OCR of both finals: 0 real-term hits, "Northstar" and "Jordan" present.
