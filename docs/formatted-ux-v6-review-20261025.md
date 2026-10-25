# Formatted UX v6 — opening action and professional narration

October 25, 2026 (Asia/Tokyo). Unpublished review candidate based on website
commit `b6ef3b6` and the local v5 guidance preview.

The first action is now a larger **Start walkthrough** button in a distinct
Start here panel. Its halo repeats on a three-second cycle until the visitor
begins. Pause animation stops it; reduced motion uses static styling. Subsequent
steps retain the restrained v5 cues. The v5 source and HTML fixture remain
preserved, alongside the v4 history.

## Narration

The user explicitly requested adding narration to Formatted UX. Thirteen short
clips use Microsoft's `en-US-AndrewMultilingualNeural` voice at -3% rate, with
the same static-audio approach used by existing website demos. Script text is
fictional and public. The sample introduces Northstar Planning and guides app,
category, discovery, grid selection, export, configuration, completion, and
error recovery. The visible UI labels it AI narration.

Audio is generated at authoring time with `edge-tts` 7.3.1 and normalized using
FFmpeg from `imageio-ffmpeg` 0.6.0. The generator preserves existing recordings.
The JSON script and JS manifest retain transcripts and clip paths. A visitor
downloads static MP3s from the same site; no live TTS service, credentials or
visitor text processing is required.

There is no page-load autoplay. Starting the walkthrough starts the voice.
Changing steps cancels the previous clip. Busy, Restart, closing the workflow,
and leaving the tab silence it. Voice on/off and Replay controls are present
inside both dialogs, with expandable transcripts. Muting survives Restart.
Audio errors leave the visual workflow usable and offer Replay.

## Verification

- **143/143 automated tests passed**, including new start/pause behavior,
  narration sequencing, mute/replay synchronization, error recovery and restart.
- `git diff --check` passed.
- In the browser, page load had no audio source and stayed paused. Start played
  `app.mp3` with readyState 4 and advancing time. Opening the app changed to
  `category.mp3`; mute cleared the source and paused it; Replay resumed the
  current clip. The larger first action was checked visually on desktop.
- All 13 MP3s decoded. Measured integrated loudness ranges from -18.26 to
  -16.23 LUFS; true peaks range from -1.94 to -1.90 dBTP. Clip lengths are about
  3.8–11.2 seconds. These are technical playback/level checks; the supplied
  sample allows the user to judge the voice and delivery.

The self-contained review HTML embeds CSS, JS and MP3 data. It is separate from
the deployable page, whose static assets remain separate for caching. No website
publication or connector/Anaplan/Google Sheet change was performed.

## Publication approval — October 26, 2026

The user approved publishing the reviewed v6 walkthrough with the pulsing
opening button and narration. The website repository was fetched again;
`origin/main` remained at `b6ef3b6`, with no open PRs or unmerged remote branches.
The release retains the reviewed behavior and static audio. Publication uses
the existing GitHub Pages deployment from `main` at
https://aplan4sheets.com/demo/formatted-ux.html. The earlier unpublished status
above records the local review stage.
