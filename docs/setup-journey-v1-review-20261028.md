# Setup guide and walkthrough journey — October 28, 2026

## Scope

Static website release from the current main branch. No connector, Apps Script, App Engine, Marketplace, policy, or authentication behavior changes.

- Guide adds Create Pivot and result verification before Repivot.
- Every silent guide preview links to its narrated standalone walkthrough.
- Export Actions / Saved Views now has a matching six-scene walkthrough with destination review and Confirm/Cancel examples.
- DemoPlayer v3 adds completion navigation for Install → OAuth client → Connect → Add model → First report → Scheduled refresh → Guide.
- The focused model entry (`setup.html?focus=model`) starts from a prepared signed-in illustration, reuses the approved model narration, and independently resets.
- Completion navigation is outside the simulated product, appears only after playback finishes, uses the existing gentle pulse, and respects the motion preference. Embeds remain silent and omit it.
- Existing versioned playback and narration assets are preserved.

## Validation

- Full website suite: 190 passing tests.
- Targeted playback checks cover completion gating, restart, voice replay, silent loops, reduced motion, focused model prerequisites, and real journey destinations.
- Browser checks: guide pivot instructions; model completion and real navigation to the pivot demo; export selection and destination warning; responsive layouts including 355 × 568 pixels.
- Six new AndrewMultilingualNeural clips at rate −3% decode successfully: 44.1 kHz mono, −16.90 to −16.29 LUFS, maximum true peak −1.83 dBTP.
- Narration captions match the checked-in generation manifest. Playback was verified in the browser; no claim of a human listening review.

## Versioned assets

New `demo-player-v3.js`, `walkthrough-journey-v1.js/css`, and `exports-*-v1` assets. HTML entry points select these versions. Previous versions remain available for rollback.
