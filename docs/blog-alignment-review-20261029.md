# Blog alignment with the corrected home page and setup guide — October 29, 2026

Context: the home page and setup guide were corrected earlier in October to drop
claims the connector does not make (no Anaplan write-back, approximate trigger
timing, the Claude handoff labelled a pilot, personal accounts unsupported by
the OAuth flow). The six articles under `blog/` still carried the older claims,
and the two comparison posts positioned against Anaplan XL Reporting (AXL,
formerly Fluence XL), which is Anaplan's own Excel add-in. This change aligns
every post to the published wording and reframes the comparisons as
"aPlan4Sheets complements Anaplan XL for Google Workspace teams". URLs are
unchanged. No connector, Apps Script, App Engine or Marketplace deployment is
involved.

For each changed claim, the right-hand side is the sentence on the home page
(`index.html`) or setup guide (`guide.html`) that the new copy now matches.

## `blog/anaplan-scheduled-refresh-google-sheets.html`

| Was | Now | Matches |
|---|---|---|
| "a persistent background trigger that checks your refresh schedule every hour" | "A schedule is saved with the workbook and runs through Google-managed triggers … Google-managed trigger timing is approximate" | Home: "Google-managed trigger timing is approximate; authentication and source-model availability still apply." |
| Frequency list "hourly, every few hours, daily, or weekly" | "hourly, daily, or weekly" | Home: "Schedule hourly, daily, or weekly refreshes." |
| Setup steps via a "Refresh tab" and a "Schedule" button | "Scheduled Refreshes" → "+ Add Schedule" → scope such as "All Configured Sheets" → "Save Schedule"; "Email Notification Settings" | Guide step 7: "open 'Scheduled Refreshes' and click '+ Add Schedule' … Choose the scope, such as 'All Configured Sheets', then click 'Save Schedule' … Use 'Email Notification Settings'". |
| "If a refresh fails … it automatically retries on the next cycle." | "If a run cannot complete, the sidebar shows its status and the error, so you can sign in again or update the sheets on demand with Refresh Sheets." | Home: "with status and error feedback when a refresh needs attention." Guide: "If you see an authentication error, simply log in again". |
| "Your authentication tokens are refreshed server-side, so the schedule survives even if your browser session expires." | "A scheduled run uses the authentication retained for the schedule, so it depends on that authentication still being valid and on the source model being available." | Home FAQ: "Schedules can retain separate authentication records in workbook-specific Apps Script storage and the Google-hosted execution service." |
| "Your sheets are always current." / "a real-time dashboard" | "The connected tabs refresh on the cadence you choose, and the sidebar shows whether each run completed." / "so the dashboard stays close to the model" | Home: "Refresh connected reports on a recurring cadence, with status and error feedback". |
| CTA "Set it and forget it"; description "always current … no stale data" | "Put your reports on a schedule"; description names the sidebar status and error feedback | Same home sentence. |

## `blog/connect-anaplan-to-google-sheets.html`

| Was | Now | Matches |
|---|---|---|
| "A Google Workspace account (Gmail works too)" | "A Google Workspace account on your organization's domain. The OAuth/SSO sign-in flow does not support Gmail or personal-domain accounts." | Guide step 3: "Gmail and personal-domain accounts are not supported by this flow." |
| "Click 'Login' and authenticate" | "The sidebar opens on a Sign-in method selector. Leave it set to OAuth/SSO and click Sign in with Anaplan SSO" | Guide step 3: "Leave Sign-in method set to OAuth/SSO. Click 'Sign in with Anaplan SSO'." |
| "the sidebar shows your available Anaplan tenants. Select a tenant, then choose a workspace and model." | "Click Add Model, select the tenant, choose an available workspace, select the model … and click Save Model." | Guide step 4: "Click the 'Add Model' button … Select the Tenant, then choose an available Workspace … Click 'Save Model'." |
| "Quick Export: Click any saved view or module to export" | Separate "Export Actions" ("Run Selected Exports", destination warning) and "Saved Views" ("Export View") | Guide step 6: "The sidebar has separate Export Actions and Saved Views cards … 'Run Selected Exports' … 'Export View' … Review the destination warning". |
| "Pivot Engine: Click the pivot icon to open the full pivot dialogue … execute" | "Pivot Views: Select a view and click Configure Pivot … click Create Pivot … Use Repivot later" | Guide step 5: "Select a view and click 'Configure Pivot' … Click 'Create Pivot' … Use the sidebar's 'Repivot' control". |
| "Go to the Refresh tab in the sidebar … Your sheets will always have the latest Anaplan data." | "Click Refresh Sheets … open Scheduled Refreshes, click + Add Schedule … Google-managed trigger timing is approximate" | Guide step 7 and the home sentence above. |
| "Data appears with Anaplan's formatting preserved." | "Supported UX grid widgets can also be connected, with their grid styles … brought into Sheets." | Home: "Bring supported UX grid styles into Sheets, including hierarchy emphasis, number formats, and conditional colors." |
| "AXL … or Fluence XL on Windows … those tools don't work" | "Anaplan XL Reporting (AXL, formerly Fluence XL) is Anaplan's own add-in. aPlan4Sheets covers the same need for teams whose reporting lives in Google Workspace" | Reframe requested for the Anaplan review; no claim about Anaplan XL beyond it being Anaplan's Excel add-in. |
| HowTo JSON-LD steps named "Authenticate … via OAuth or Basic Auth", "dropdown menus", "Pivot Engine" | Steps renamed to Sign in, Add a model, Export Actions / Saved Views / Pivot Views, Refresh Sheets / Scheduled Refreshes | Guide labels. |

## `blog/anaplan-google-sheets-vs-excel.html` (title changed, URL kept)

| Was | Now | Matches |
|---|---|---|
| Title/H1 "AXL Alternative for Mac & Chromebook" | "aPlan4Sheets Alongside Anaplan XL (AXL)" / "aPlan4Sheets alongside Anaplan XL for Mac and Chromebook teams" | Keeps "Anaplan Google Sheets vs Excel", "AXL", "Mac", "Chromebook". |
| Section "The problem with AXL and Fluence XL" with "Windows only", "No real-time collaboration", "AXL updates can break existing workbooks" | Removed. New section "Two spreadsheets, one Anaplan model": Anaplan XL is Anaplan's supported add-in for Excel; aPlan4Sheets serves the Google Workspace side. | Unverified claims about Anaplan's product dropped. |
| Three-column feature table with "Not available" cells for AXL | Two-column "Where each connector fits" table; Anaplan XL rows say only that it is Anaplan's own Excel add-in and the home for existing Excel workbooks | Same. |
| "Natural language queries: Gemini AI built-in" | "AI Analyst, with a review step: review the answer, then explicitly export a result to Sheets. The Claude handoff is a pilot that requires a configured Claude connector. It is not Anaplan write-back." | Home: "AI Analyst, with a review step … The Claude handoff is a pilot that requires a configured Claude connector … It is not unattended Anaplan write-back." |
| "Executive slide decks: AI-generated Google Slides" | "use connected data for Google Sheets charts and Google Slides reporting, and review AI-generated KPIs, findings, and narrative before sharing" | Home: "Use connected data for Google Sheets charts and Google Slides reporting. Review AI-generated KPIs, findings, and narrative before sharing." |
| "Real-time collaboration: Built-in" | "collaborators see the shared workbook; connected data updates when its configured refresh runs" | Home: "Collaborators see the shared workbook; connected data updates when its configured refresh runs." |
| "Scheduled refresh: Built-in (hourly/daily/weekly)" vs "Requires scripting" | "hourly, daily, or weekly schedules with status and error feedback. Google-managed trigger timing is approximate." | Home sentences above. |
| "UX board formatting: Automatic replication" | "brings supported UX grid styles into Sheets, including hierarchy emphasis, number formats, and conditional colors" | Home UX formatting sentence. |
| "Pivot engine: Server-side, multi-dim" | "rows, columns, page selectors, and line-item selections configured in the sidebar, saved for refresh and Repivot" | Home FAQ: "Configure rows, columns, page selectors, line-item selections". |
| "When to use AXL: Your entire team is on Windows with desktop Excel" | "Your team works in desktop Excel and Microsoft 365"; "You want Anaplan's own supported add-in for Excel"; new "Running both" section | Platform-fit guidance kept without the Windows-only claim. |

## `blog/fluence-xl-axl-alternative-google-sheets.html` (title changed, URL kept)

| Was | Now | Matches |
|---|---|---|
| Title/H1 "Fluence XL / AXL Alternative for Google Sheets" | "Fluence XL / AXL and Google Sheets: Where aPlan4Sheets Complements Anaplan XL" | Keeps "Fluence XL", "AXL", "Google Sheets"; the URL still carries the search term. |
| "instead of a desktop Excel-centered workflow" (og description) | "alongside Anaplan XL in Excel" | Reframe. |
| "When a Google Sheets alternative is worth evaluating" | "When a Google Sheets workflow is worth evaluating" | Reframe. |
| "Where aPlan4Sheets fits" ended with "A clean tool decision should reflect the platform your team actually uses" | Adds "Anaplan XL remains the right home for those reports. Many organizations run both" | Reframe. Evaluation checklist and evaluation path kept. |
| Checklist "Source data: Saved views, modules, exports, and pivots" | "Export actions, saved views, modules, pivots, and supported UX grid widgets" | Home FAQ: "Connect accessible Anaplan modules, saved views, exports, and supported UX grid widgets." |
| (no AI row) | "AI assistance: A review step before any AI result reaches a sheet" | Home: "Review results before exporting to Sheets". |
| Evaluation path step 5 "verify that the report remains current" | "Add a schedule, then check its status in the sidebar before the next reporting cycle." | Home: "Schedule recurring data refreshes and check their status." |

## `blog/anaplan-google-sheets-connector-mac-chromebook.html`

| Was | Now | Matches |
|---|---|---|
| "needs live Anaplan data but does not work from a Windows desktop" | "needs current Anaplan data but does not work in desktop Excel" | Drops the implied Windows-only claim about Anaplan XL. |
| "Collaborate in real time" | "Collaborate in a shared workbook … Connected data updates when its configured refresh runs." | Home collaboration sentence. |
| "Refresh connected reports: … manually or use scheduled refresh" | "on demand with Refresh Sheets, or add hourly, daily, or weekly schedules … and check their status in the sidebar" | Guide step 7; home refresh sentence. |
| Getting started: "Authenticate … using the supported login flow"; "Select a tenant, workspace, model, module, or saved view" | "Sign in to Anaplan with OAuth/SSO using your organization's account, or Basic Auth if your organization permits it"; "Add a model by selecting the tenant, workspace, and model, then choose an export action, saved view, or pivot view" | Guide steps 3 and 4. |
| Link text "Google Sheets alternative guide" | "where aPlan4Sheets complements Anaplan XL" | Reframe. |

## `blog/anaplan-reporting-automation-google-sheets.html`

| Was | Now | Matches |
|---|---|---|
| "For a deeper look at cadence, retry behavior, and setup steps" | "cadence, what to expect from Google-managed trigger timing, and setup steps" | No retry behaviour is promised anywhere on the site. |
| "the sheet can refresh on a cadence so the team does not have to remember a manual export" | adds "Google-managed trigger timing is approximate, and each run depends on valid authentication and the source model being available, so check the status before a deadline" | Home: "Google-managed trigger timing is approximate; authentication and source-model availability still apply." |
| "Review refresh timing before board meetings" | "Review refresh status and timing before board meetings" | Home: "check their status". |

## `blog/index.html` and the home-page resource cards

- Card copy and the ItemList JSON-LD names follow the two new comparison titles.
- The scheduled-refresh card no longer says "always current. No manual pulls
  needed"; it names the sidebar status and errors.
- On `index.html` only the two comparison cards changed: label "Alternative
  guide" → "Evaluation guide", title "Fluence XL / AXL alternative" →
  "Fluence XL / AXL and Google Sheets", and both descriptions now say where
  aPlan4Sheets fits alongside Anaplan XL. Nothing else on the home page moved.
- `article:modified_time` and JSON-LD `dateModified` are 2026-10-29 on all six
  posts.

## Verification

- `npm test`: 214/214 pass (no test changes needed).
- `git diff --check`: clean.
- `npm run build:css`: no change to `assets/site-v1.css` (no new utility classes).
- Every `<meta name="description">` on the blog pages is 134–160 characters;
  all JSON-LD blocks parse.
- Grep for the old wording ("Gmail works", "Login", "Quick Export", "Refresh
  tab", "pivot dialogue", "Gemini", "AI-generated Google Slides", "retries",
  "survives", "Windows only", "Not available", "problem with AXL", "always
  current", "every few hours", "persistent") returns nothing under `blog/`.

## Left for the owner

- `sitemap.xml` `lastmod` for the blog URLs still reads 2026-05-05 (outside
  the requested scope).
- The home-page `<meta name="keywords">` still lists "Fluence XL alternative,
  AXL alternative". Search engines ignore the tag; drop the two terms if the
  wording matters for the Anaplan reader.
- Beta wording, the product name and Basic Auth are unchanged by decision.
