# Nested preview clipping — local candidate

The AI Analyst cards used three intrinsic-width grid tracks inside a narrower
message bubble. The original desktop reproduction needed 322px inside a 265px
strip. Page-level overflow checks did not catch this nested overflow.

`assets/demo-responsive-v2.css` preserves/imports the original layout stylesheet
and is now linked by all ten walkthroughs. It adds container-width-driven card
wrapping, shrinkable message bubbles, internally scrollable spreadsheet grids,
and responsive dialog columns. Standalone and embedded layouts share the same
narrow-screen behavior. Short embeds retain a non-zero grid and scroll the main
content instead of concealing the sidebar below the viewport.

The walkthrough hub uses a versioned preview query so its iframe does not reuse
an older cached walkthrough document after this update. Narration, playback,
data simulations, and public canonical URLs remain unchanged.

## Verification

- 21 automated tests pass, including five stylesheet/wiring contracts and the
  existing full playback, pause/resume, restart, narration, and selection tests.
- 80 browser layout checks pass: all ten walkthroughs, both standalone/embedded
  modes at 1280×800, 768×800, and 390×800, plus embedded mode at 390×300 and
  390×500. Each check records the actual viewport size, not just the requested
  override. No document overflow, shell extending beyond the viewport, or
  horizontal overflow in the checked nested UI containers was found.
- AI Analyst was also checked at 520px width. Chat/card content no longer
  exceeds its container width; the input remains inside its panel.
- The animated pivot dialog was checked at 1280px, 768px, and 390px. At 390px
  its dimension manager becomes one column, with 715px of content inside a
  620px scrollable modal body and no horizontal overflow.

The JSDOM tests do not have a layout engine; they verify stylesheet contracts
and functional behavior. The browser checks provide the geometry evidence.
Metrics and review screenshots are kept outside the public website repository.
This candidate is local and has not been published.
