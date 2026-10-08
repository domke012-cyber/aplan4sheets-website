# Website refresh review — October 7, 2026

Status: published following the user's review and explicit approval of the draft,
including the narration and revised privacy disclosures. Release commit:
`9b9730ccacbaa7c22e9c71b901e8aa070a0b43e4`, based on website `main` at `bba7af5`.
GitHub Pages publishes from `main`. The release changes only the public website.
No connector or Anaplan environment was changed.

## Updated

- Homepage: exact nested selections, linked reports, workbook cloning, and
  reviewed AI results; Claude handoff explicitly labeled a configured pilot.
- New interactive nested-selection walkthrough: two/three dimensions, exact
  tuples, merged adjacent outer headers, and a sample budget review.
- Product-demo landing page: current feature walkthrough hub instead of the
  duplicated legacy player. The legacy source is recoverable from Git history.
- Ten demos now share a player with paused start, synchronized narration,
  pausable animations, restart cancellation, visible notes, and completion.
- 57 narration tracks regenerated into `demo/audio/v2/`; originals unchanged.
- Unsupported general Anaplan write-back, password-storage, server-processing,
  and refresh-timing claims corrected. Removed unverified rating metadata.
- Privacy disclosures updated for AI processing and first-party operational
  usage records, included in the approved draft.

## Verification

- `npm test`: 16/16 passed. All ten scenes sequences complete, including
  pause/resume, restart, audio failure fallback, long narration, silent embeds,
  nested selection semantics, and HTML/asset/structured-data checks.
- Audio verification: 57/57 tracks decode successfully, mono 44.1 kHz.
  Measured integrated loudness: −17.36 to −16.29 LUFS. Maximum measured true
  peak: −1.51 dBTP. Normalized with two-pass ffmpeg processing.
- Real Chrome checks: all ten initial demo layouts at 390×844 and 1280×720
  have no document-level horizontal overflow or reported media errors.
- Homepage and demo gallery checked at 390px; new table and gallery header
  overflow corrected. Laptop nested dimension/merge controls verified.
- Real narrated Pivot playback reached completion and wrote its sample grid.
- `git diff --check` passed; npm install/audit reported no vulnerabilities.

Audio metrics and browser playback checks do not substitute for a person's
voice/pronunciation review. The user approved publication after draft review.

Screenshot: [homepage draft](review/homepage-draft.jpg).

## Publication verification

- GitHub Pages build/deployment run `37709168958` succeeded. The Pages build API
  reports the release commit as `built`, updated `2026-10-08T00:43:13Z`
  (October 7 in America/New_York).
- Public HTTPS checks without cache-busting: all 75 checked resources returned
  HTTP 200 and matched their local release SHA-256 hashes. These comprise 15
  HTML pages, three shared CSS/JavaScript assets, and all 57 v2 narration tracks.
- Chrome shows the new homepage section and walkthrough hub on the public domain.
  The nested-selection demo starts paused; Play loaded and advanced the live
  narration with no media error, progressed to the third scene, and Pause
  returned the control to Play successfully.
- Screenshot: [published homepage](review/homepage-published.jpg).
- Existing hosting, domain, and security settings were preserved. No connector,
  Apps Script, App Engine, Marketplace, or Anaplan deployment was performed.
