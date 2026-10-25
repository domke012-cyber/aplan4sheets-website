# Formatted UX next-step guidance — review candidate

Reviewed October 25, 2026 (Asia/Tokyo). Website baseline: `b6ef3b6`.

## Review findings

The live page's guidance remained behind the UX browser and Configure Pivot
windows. The UX browser initially focused Search despite the available app row;
the pivot dialog initially focused Close. App/category rows had no strong
forward cue, and selecting a grid did not visually lead visitors to Export.

## Proposed behavior

- Each active window carries its own short Next instruction and major-step count.
- Exactly one actionable control receives a blue outline and a soft halo.
  Labels and backgrounds do not flash. Two 2.4-second cycles then settle to
  the outline. Hover/keyboard focus stops the pulse; reduced motion disables it.
- Guidance follows app, category, discovery, grid selection and export.
- Row and hierarchy exploration remain optional; Create Pivot still works with
  default selections. Creating pauses guidance; completion highlights Done.
- The final report clearly says Complete and has no next-action pulse.
- Search misses, collapsed branches, empty selections, validation errors,
  cancellation and Restart point back to usable controls, not hidden or
  disabled buttons. Opening each dialog focuses the suggested first action.
- Existing data, financial calculations, output layout and other walkthroughs
  retain their previous behavior. The v4 assets and page fixture are preserved.

## Verification

Browser review followed the live baseline, then the local candidate from
Browse through Done, inspecting the desktop directory and the narrow-screen
export, configuration, hierarchy, Create, and Done states. The screenshot
captures the actual preview. This is a browser layout and interaction check,
not user research or a measured conversion improvement.

Five new interaction tests exercise complete guidance progression, optional
configuration and completion, search/collapse recovery, invalid input recovery,
and cancellation of pending work on Restart. The prior v4 suite now runs
against its preserved HTML fixture. A layout test's asset-version expectation
was updated to v5 after the initial full run reported that mismatch.

Final verification: **135/135 tests passed**, `git diff --check` passed, and
the self-contained review HTML was checked for inline assets and working
first-step guidance. Reduced-motion behavior is specified in CSS; an operating
system reduced-motion setting was not toggled during this review.

## Status

Local review candidate only. No remote branch, GitHub Pages publication,
connector deployment, or live Anaplan/Google Sheet changes were made.
