# About and Security pages — October 29, 2026

Second step of the 2026-10-29 site review for the Anaplan partnership conversation
(after the P0 polish in PR 9 and the blog alignment in PR 10). Adds the two pages a
prospective partner's reviewers look for first and links them from every footer.

## Added

- `about.html`: what the product does and does not do, who builds and supports it,
  where it stands (Marketplace since 2025, autumn 2026 additions, Google-only
  infrastructure, fictional demo data), an independence and trademark statement, and a
  demo request. The developer bio sentence is the owner's to confirm.
- `security.html`: at-a-glance principles, an inline SVG architecture diagram
  (Sheets sidebar, connector service in Google Cloud us-central1, Anaplan APIs, AI
  providers), authentication paths, a storage table (what, where, how long), the
  Google permissions table with a reason per scope, scheduled refresh behaviour, AI
  processing, transport and hosting, user controls, and compliance. Facts were taken
  from the connector's `appsscript.json` (scopes, URL allow-list), the Cloud Run /
  App Engine service (Firestore collections for schedules, connections, leases, OAuth
  session state and per-domain usage; Cloud Storage for model graphs and dimension
  data; Vertex AI for the AI Analyst; Anthropic for the Claude handoff pilot) and the
  published Privacy Policy. Nothing on the page promises more than the policy does.
- Footer links to About and Security on the home, 404, guide, demos, policy and blog
  pages; sitemap entries; `@source` lines for the CSS build.

## Verification

- `npm test`: 214/214. `git diff --check` clean.
- Both pages rendered with headless Chrome at 1280 px from a local server and
  reviewed; the home footer wraps correctly with the two extra links.

## Owner review points

- Confirm the "Who builds it" paragraph and the autumn 2026 release list.
- The storage table's "no automatic expiry today" for operational records mirrors the
  Privacy Policy; if a retention period is adopted, update both.
