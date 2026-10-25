# Consistent narration and next-step guidance

October 26, 2026 (Asia/Tokyo). Based on website release `4ebd6d4`.

The user requested the professional voice and pulsing next-step buttons from
Formatted UX across the other walkthroughs. Eleven pages now use the new
versioned shared player: Budget Review, Setup, Pivot, Multi-module, Scheduled
Refresh, Discovery, UX Formatting, AI Analyst, OAuth Setup, Marketplace Install,
and Nested Selections. Formatted UX retains its reviewed v6 implementation.

## Behavior

- Start walkthrough has a gentle three-second halo. Each standalone scene
  finishes its animation and narration, then pauses with one pulsing Next step
  button. Next occupies the same place as Start. Rapid clicks cannot skip steps.
- Auto-play steps retains continuous playback. Embedded previews stay silent
  and automatic; reduced-motion embeds do not start automatically.
- Pause/resume, Restart, Replay voice, mute, and readable scene notes remain
  available. Pulse animation can be paused and is disabled for reduced motion.
- Budget Review also exposes tour controls inside its native dialogs. Manual
  exploration highlights the actionable export, apply, execute, chart, slide,
  or refresh control and handles empty selections and retrieval states.
- A stopped interactive tour directs visitors to Restart instead of pulsing a
  disabled Play button. Simulated read-only OAuth buttons do not pulse.
- Audio failures retain readable notes and allow retry. Leaving a tab pauses
  playback. No sign-in, credentials, or live customer data are involved.

## Narration and preserved history

The 63 new static clips use `en-US-AndrewMultilingualNeural` at -3%, matching
Formatted UX. Scripts and settings are in `assets/walkthrough-narration-v4.json`;
audio is in `demo/audio/v4/`. The generator uses edge-tts and two-pass FFmpeg
normalization and preserves existing files. Visitors fetch same-site audio;
there are no browser speech-synthesis calls or visitor TTS requests.

The original shared player, Budget Review v2 runtime, data fixtures, and earlier
audio remain unchanged. Entry pages select `demo-player-v2.js`,
`walkthrough-guidance-v1.css`, and (for Budget Review) `budget-review-v3.js`.

## Verification

- **158/158 tests pass.** This includes all prior regression coverage in the
  explicit Auto-play mode, complete manual step progression across all eleven
  demos, dialogue controls, double-click protection, mute/replay, restart,
  audio-error recovery, and manual Budget Review guidance.
- JavaScript syntax checks and `git diff --check` pass.
- All 63 MP3s decode as 44.1 kHz mono. Durations are 4.6–23.14 seconds;
  measured integrated loudness is -17.78 to -16.34 LUFS and maximum true peak
  is -1.73 dBTP. These are technical checks, not a new human listening review.
- Browser checks verified OAuth's new audio playing with advancing time,
  waiting at step boundaries, and a computed three-second Next-step pulse.
  The narrow viewport kept the step controls accessible. Desktop Budget Review
  checks verified manual export/apply guidance and the pulsing Next step inside
  Configure Pivot after narration completed.

## OAuth demo scope

`/demo/oauth-setup.html` already demonstrates the connector's setup wizard,
sample client credentials, verification, and first sign-in. Its brief written
instructions mention creating an Anaplan OAuth client and using the connector's
actual callback URL. It does not demonstrate the Anaplan Administration client
registration screens themselves. The example callback and credentials remain
clearly fictional and read-only.

Publication uses the existing GitHub Pages site from `main`; no connector,
Apps Script, App Engine, Anaplan, or Google Sheet deployment is involved.
