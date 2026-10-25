# aPlan4Sheets website

Public marketing site, hosted on GitHub Pages from `main`. The connector and
Anaplan model-builder are separate repositories. Never put application secrets,
customer data, or private backend code here.

## Local review

Use Node 20.11+ for tests:

```sh
npm ci --ignore-scripts
npm run build:css
npm test
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/` for the site and `/demo.html` for the walkthrough
hub. These are illustrative HTML simulations, not recordings of live customer
models. Standalone demos start paused; Start walkthrough begins narration,
and Next step advances after the current step finishes. Auto-play steps enables
continuous playback. Embedded previews remain silent and automatic, except
when reduced motion is preferred.

Walkthroughs use `assets/demo-responsive-v2.css`, which preserves the original
layout checkpoint and fixes nested card/grid/dialog clipping in standalone and
embedded previews. See `docs/demo-layout-v2-review-20261007.md` for verification.

The flagship `/demo/budget-review.html` is a working, fictional
budget-review simulation. Choose exact columns/rows, execute the sample pivot,
build a chart, and change to Q4 Forecast with an explicit refresh. The sheet,
chart, and illustrative slide share one snapshot; no Google files are created.
See `docs/budget-review-v1-review-20261007.md` for scope and verification.

### Product-team realism refresh (October 15, 2026)

The reviewed `codex/demo-realism-v2` refresh preserves the original
Budget Review v1 assets. Budget Review now uses versioned v2
data, styling, and runtime assets; the other walkthroughs add the shared
`demo-realism-v3` spreadsheet shell.

- Budget Review has account-level detail, a proper parent/child owner picker,
  linked financial/commentary snapshots, and a focused presentation mode.
- UX discovery selects one combined grid with two module regions, matching the
  connector workflow; the guided tour shows this step before configuration.
- Pivot axes, exported counts, and schedule timing are internally consistent.
- AI Analyst uses a reconciled P&L and department fixture, source references,
  and a signed EBITDA bridge. Possible causes are explicitly unverified.
- Spreadsheet menus and toolbar chrome are illustrative and non-interactive.
  All figures are fictional. Retrieval delays are not performance benchmarks;
  chart/slide assembly is an illustrative reporting workflow, not an automatic
  connector capability. No live model or spreadsheet writes are performed.

The new `/demo/formatted-ux.html` is a self-paced, end-to-end UX walkthrough,
using versioned v4 interface assets and the audited v2 data fixture (v1–v3 are preserved). It provides a persistent directory,
source grid selection, actual hierarchy-level selection controls, automatically
linked Time/Executive Owner filters, create/Done, Repivot, refresh, and a
source-to-Sheet comparison. Owner, account and category rollups reconcile at
the displayed thousand-dollar precision. The financial grid follows the supplied
UX reference's QTD / prior-year / YTD groups, blue/orange headers, white cells,
bold section labels and subtotals, and red/green text-only conditional formatting.
All amounts, owner names and commentary are fictional; no reference screenshot
or customer financial values are included. Expense variance is actual less
forecast/budget, with negative expense variance favorable. QTD uses the selected
quarter and YTD sums through that quarter; ratios use aggregate denominators. The
original v4 walkthrough had no audio or remote data requests. The October 26
v6 release below adds static, optional narration.

The v4 interface keeps report rows compact, with full commentary available on
hover. All dimension chips can be dragged within or between axes, with an
accessible rearrange menu as an alternative. Chip placement is explicitly a
layout preview: Create Pivot restores the showcased Budget Review layout, while
the existing item and shared-filter selections continue to control its content.

The all-demo interaction review also removes unsupported Marketplace
popularity figures, honors the UX formatting opt-out, makes discovery search
and closing work, preserves manual nested selections, and clearly labels the
schedule editor as a read-only guided preview.

Run `npm test` for financial rollups, shared-filter staging and refresh,
configuration/output fidelity, and playback/cancellation regressions. Desktop
and 390px mobile browser review covers the flagship and AI Analyst layouts;
tables intentionally scroll horizontally on narrow screens. The October 15
release was approved for publication after local review. The final v4 candidate
passes all 130 automated tests; browser checks confirmed compact 24px report
rows, movable chips, the fixed sample output, and the narrow-screen controls.

Homepage/gallery styling is prebuilt into `assets/site-v1.css` from
`assets/site-tailwind-v1.css`. Run `npm run build:css` after changing their
utility classes. The existing guides/blogs still use their original styling.
The build pins Tailwind 4.3.3 and overrides its file watcher to the patched
2.6.0 release; do not remove the override without checking `npm audit`.

## Narration

Scripts and visible scene notes live in `assets/demo-narration.js` and the
budget-review data fixture. Current narration uses the same Microsoft
`en-US-AndrewMultilingualNeural` voice and -3% rate as Formatted UX. The 63 clips
for the other 11 walkthroughs live in `demo/audio/v4/`, with their public script
and voice settings in `assets/walkthrough-narration-v4.json`. Generate with
`tooling/build-walkthrough-narration-v4.py` in a Python environment containing
`edge-tts` and `imageio-ffmpeg`; existing files are preserved. Visitors download
static same-site MP3s, with no browser TTS or visitor text sent to a speech service.

Earlier Aria recordings in `demo/audio/v2/` and `v3/` remain available as
historical versions. All audio uses two-pass FFmpeg loudness normalization.

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

Budget-review narration has six separate clips in `demo/audio/v3/`, with text
in `assets/budget-review-data-v1.js`. Original v1/v2 tracks are preserved.

```sh
EDGE_TTS=/path/to/edge-tts FFMPEG=/path/to/ffmpeg node tooling/build-budget-narration-v1.mjs
FFMPEG=/path/to/ffmpeg node tooling/verify-budget-audio-v1.mjs
```

The new demo emits local `aplan:demo-event` CustomEvents for tour progress,
selections, sample execution, chart/slide steps, and demo-request clicks. No
external analytics collector, cookies, visitor IDs, or credentials are used.
This is instrumentation preparation, not a deployed analytics service.

## Release

### Consistent walkthrough voice and guidance — October 26, 2026

All eleven other walkthroughs now use `assets/demo-player-v2.js` and
`assets/walkthrough-guidance-v1.css`. Start walkthrough, Resume step, and Next
step get a gentle, pausable halo when they are the next action. Each standalone
step waits for its scene and narration to finish, then pauses for Next step.
Auto-play steps retains continuous playback; embedded previews remain silent.
Replay voice, mute, scene notes, and reduced-motion support are included.
Budget Review uses `assets/budget-review-v3.js` to keep controls in the active
dialog and guide manual exploration through export, configuration, execution,
chart, slide, and refresh. Old player/runtime versions and audio are preserved.
See `docs/walkthrough-guidance-v2-release-20261026.md` for verification.


### Formatted UX guidance and narration — October 26, 2026

The Formatted UX page uses v6 interface assets. Guidance
stays inside the active dialog, names the next action, and marks one control
with two gentle halo cycles followed by a static outline. Reduced-motion
preferences disable the animation. Guidance follows directory navigation,
selection, configuration, busy/Done states, and recovery from empty selections
or unmatched searches; the completed report has no animated prompt. The v4/v5
assets and HTML fixtures remain preserved. See the original review notes in
`docs/formatted-ux-v5-review-20261025.md`.

The v6 refinement gives the opening Start walkthrough button a larger target
and a continuous, pausable halo. It adds optional Andrew neural narration,
generated from the public script in `assets/formatted-ux-narration-v1.json`.
Static MP3 clips live under `demo/audio/formatted-ux-v1/`; no visitor text is
sent to a speech service. Playback starts only after a user action, switches
with the active step, and includes mute, replay and transcripts. The generated
manifest is `assets/formatted-ux-narration-v1.js`; the runtime is
`assets/formatted-ux-voice-v1.js`. The release passes all 143 automated tests.
The user approved publication on October 26 after reviewing the local preview.
See `docs/formatted-ux-v6-review-20261025.md` for behavior and verification.

Review the homepage, all demos, and the corrected privacy disclosures before
merging. A push to `main` publishes to the existing GitHub Pages site. No
connector, Apps Script, App Engine, or Marketplace deployment is involved.

The October 2026 refresh is published at https://aplan4sheets.com/ after draft review. See
`docs/website-refresh-review-20261007.md` for the changes and verification.
