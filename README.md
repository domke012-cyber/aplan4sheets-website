# aPlan4Sheets website

Public marketing site, hosted on GitHub Pages from `main`. The connector and
Anaplan model-builder are separate repositories. Never put application secrets,
customer data, or private backend code here.

## Local review

Use Node 20.11+ for tests:

```sh
npm ci --ignore-scripts
npm test
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/` for the site and `/demo.html` for the walkthrough
hub. These are illustrative HTML simulations, not recordings of live customer
models. Standalone demos start paused; Play starts narration. Embedded previews
remain silent. Reduced-motion users are not automatically started.

## Narration

Scripts and visible scene notes live in `assets/demo-narration.js`. New audio
lives in `demo/audio/v2/`; original tracks remain unchanged. The v2 narration
uses the Microsoft Aria neural voice through `edge-tts`, with two-pass ffmpeg
loudness normalization. Keep provider usage terms in mind when regenerating.

`tooling/build-narration.mjs` generates a fresh set using explicit executable
paths. It does not need or store API credentials. Existing output is not
silently overwritten; use a new audio version for future changes.

```sh
EDGE_TTS=/path/to/edge-tts FFMPEG=/path/to/ffmpeg node tooling/build-narration.mjs
FFMPEG=/path/to/ffmpeg npm run verify:audio
```

The checks verify decoding, duration, loudness, peak headroom, and a consistent
sample rate/channel count. They do not replace a person's final listening
review of voice preference or pronunciation.

## Release

Review the homepage, all demos, and the corrected privacy disclosures before
merging. A push to `main` publishes to the existing GitHub Pages site. No
connector, Apps Script, App Engine, or Marketplace deployment is involved.

The October 2026 refresh is published at https://aplan4sheets.com/ after draft review. See
`docs/website-refresh-review-20261007.md` for the changes and verification.
