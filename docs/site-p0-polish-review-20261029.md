# Site polish for the Anaplan review — October 29, 2026

Context: the owner is preparing aplan4sheets.com for an Anaplan partnership or
acquisition conversation. A full review of the published site is in the owner's
session outputs (`website-review-2026-10-29.md`); this change applies the
mechanical P0 items from it. No connector, Apps Script, App Engine or Marketplace
deployment is involved.

## Changed

- **HTTPS enforced** on the GitHub Pages site (repository setting, not a file
  change). `http://aplan4sheets.com/` now answers 301 to HTTPS; before it served
  the page in clear text with no HSTS.
- **Social preview image.** New `assets/marketplace/og-image-v1.png` (1200×630)
  replaces the 128×128 icon in every page's `og:image` / `twitter:image` and in
  the JSON-LD `image` fields. The home page also declares width, height and alt.
  New PNG icons in `assets/icons/` (180, 192, 512) back `site.webmanifest`, the
  JSON-LD organisation logo and a new `apple-touch-icon` link on every page.
- **One product name.** "aPlan4S" (heading, beta copy, keywords, JSON-LD
  alternate names), "Aplan4Sheets" (mailto subjects, OAuth client sample name)
  and "Aplan AI" (feature card, narration note) are now "aPlan4Sheets" and
  "AI Analyst". The policies say "formerly listed as Anaplan Connector for
  Sheets™" instead of "also known as", and the setup guide's transitional
  sentence is now conditional ("If the Extensions menu still shows the earlier
  name … it is the same add-on").
- **Marketplace links** use the renamed listing slug
  `marketplace/app/aplan4sheets/751768451107` everywhere (pages, JSON-LD, tests).
  The old slug still redirects.
- **One logo.** The green "a4" placeholder marks on the demo gallery and every
  demo page are replaced by the four-square grid mark used on the home page.
- **Tailwind build for every page.** The setup guide, privacy, terms and all six
  blog posts no longer load the Tailwind Play CDN (production warning, runtime
  compile, unstyled flash). They link the prebuilt `assets/site-v1.css`, whose
  source now lists them as `@source` entries and carries the v3 default border
  colour so unlabelled borders keep their grey. `flex-shrink-0` (removed in v4)
  became `shrink-0`.
- **Custom 404 page** (`404.html`) with the home navigation and footer.
- **Search snippets.** Home title 90 → 50 characters; home description 346 → 155;
  the blog index and the Sheets-vs-Excel post descriptions trimmed under 160.

## Verification

- `npm test`: 214/214 pass (four tests updated for the new slug, policy wording
  and guide sentence; one for the OAuth sample client name).
- Pixel comparison of the published site against this working tree at 1280 px,
  rendered with headless Chrome: demo pages, demo gallery, privacy and terms
  differ by at most 0.06 % (the logo swap). The home page differs only below
  the "Why aPlan4Sheets" heading rename. The setup guide and blog posts differ
  by 2–11 %, entirely vertical shifts: the Play CDN (Tailwind v3) let a
  responsive text size such as `md:text-5xl` override `leading-tight`, while the
  v4 build applies the `leading-*` class as written. Headings and lead
  paragraphs on those pages are therefore slightly airier at desktop widths;
  phone widths are unchanged. Computed styles were confirmed identical through
  the DevTools protocol at the narrow width.
- The narration audio for the AI Analyst and OAuth-client walkthroughs still
  says "Aplan AI" / "Aplan4Sheets"; only the on-screen text changed. Regenerate
  those two tracks when the voice set is next rebuilt.

## Not changed (owner decisions from the review)

Beta wording, the product name itself, Basic Auth, legal entity, Marketplace
trader status, DMARC (DNS), real product screenshots, the Security page, the
home-page cut and the comparison-article rewrites.
