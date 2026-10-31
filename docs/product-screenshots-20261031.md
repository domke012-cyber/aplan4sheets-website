# Real product screenshots — October 31, 2026

Third step of the 2026-10-29 site review for the Anaplan partnership conversation.
Until now every visual on the site was a simulated UI; the Marketplace listing carried
QA screenshots. This change adds six real captures of the connector at 1280×800 and
uses three of them on the home page.

## How the set was made

- Captured in Chrome from the production add-on (sidebar v474 line) in a scratch
  workbook, with a formatted UX-page export created by the connector itself so the
  grid formatting, row groups and frozen headers are genuine.
- **Every figure and name is fictional.** Before capture, all cell values and row
  labels in the exported grid were overwritten in the sheet with a generated,
  internally consistent dataset (variance and year-over-year columns recomputed from
  the generated base figures), the page-selector labels were rewritten, and the sheet
  tab was renamed. The workbook title, the signed-in account name and address, the
  dialog titles, dimension chip names and the AI Analyst's model chip and context line
  were replaced in the image. The fictional company is "Northstar"; the signed-in user
  is "Jordan".
- Each final image was OCR-scanned (Apple Vision) for a list of real organisation,
  person, model and account terms before it was added to the repository; all six
  passed, and the scan also confirmed the fictional names are present (positive
  control).
- The AI Analyst dialog's empty-state sentence was changed in the image from the
  product's current "Aplan AI is best for" to "The AI Analyst is best for", matching
  the name used everywhere else. The product string itself should be updated in the
  connector (sidebar `AI Analyst` dialog) so the next capture needs no edit.

## Files

- `assets/product/01-formatted-grid.jpg` — formatted UX page export beside the sidebar
  (home hero and social image)
- `assets/product/02-sidebar-home.jpg` — sidebar home (card 1)
- `assets/product/03-pivot-dialog.jpg` — Repivot dialog with rows, columns and pages
  (card 2)
- `assets/product/04-schedule.jpg` — Schedule card with the add-schedule entry
- `assets/product/05-ai-analyst-card.jpg` — AI Analyst card in the sidebar
- `assets/product/06-ai-analyst-dialog.jpg` — AI Analyst dialog, ready state (card 3)
- `assets/marketplace/og-image-v2.png` — social preview rebuilt on the real grid;
  every page now references it and `og-image-v1.png` is removed.

The 1280×800 PNG originals for the Marketplace listing are kept outside this
repository with the owner (`outputs/product-screenshots-2026-10-31/`).

## Home page changes

- Hero preview shows the real export instead of the simulated workspace, captioned
  "Product screenshot · Fictional model and figures"; the demo link stays.
- "See it in action" cards show the sidebar, the Repivot dialog and the AI Analyst
  dialog instead of two text-only placeholders; each still opens its walkthrough.

## Verification

- `npm test`: 214/214; `git diff --check` clean.
- Home page rendered locally with headless Chrome and checked at 1280 px.
