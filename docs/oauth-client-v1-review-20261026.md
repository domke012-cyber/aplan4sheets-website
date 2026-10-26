# OAuth client creation walkthrough v1

New public route: `/demo/oauth-client.html`. This fills the administrator-side
gap before the existing `/demo/oauth-setup.html` connector wizard.

## Behavior

Eight steps cover prerequisites, Administration navigation, first-use OAuth
enablement, New/name, Authorization code grant, the allowed callback URL,
client credentials, and the return to aPlan4Sheets. Each standalone step
finishes its narration and pauses for a gently pulsing Next step. Start,
pause/resume, restart, mute, replay voice, optional autoplay, visible
transcripts, pause-animation, and reduced-motion behavior use the existing
shared player. Embedded previews stay silent and honor reduced motion.

The opening title clears after the first step to give the illustration more
room. Each new step brings its instructions back into view. Narrow screens
stack the lesson and example, while the playback controls remain visible.

Illustrated Anaplan controls are disabled; the actual progression controls
are outside the illustration. There is no live Anaplan connection, credential
entry, clipboard operation, client creation, or credential storage. The
callback is `https://connector.example.invalid/oauth/callback`, the client ID
is explicitly unusable, and the secret is masked. No customer screenshots or
tenant data are used. Client creation does not log the visitor in.

## Sources reviewed October 26, 2026

- [Anaplan: Create an OAuth 2.0 client](https://help.anaplan.com/create-an-oauth-20-client-0984a799-a667-4e70-8759-a134be32f48c): navigation, first-use prompt, form fields and creation flow.
- [Anaplan: Tenant security administrator](https://help.anaplan.com/tenant-security-administrator-865152e9-6368-477a-90b2-1424d6647771): required administrative role.
- [Anaplan: Manage OAuth 2.0 clients](https://help.anaplan.com/manage-oauth-20-clients-c24f32f2-b314-45be-9cdd-f537d1504bb0): new clients are enabled by default and details can be reopened.
- Connector source `setup.html`: loads the current Redirect URI from
  `getRedirectUri()` and provides Copy Redirect URI. `auth.js` constructs the
  browser authorization-code flow and chooses the callback according to the
  deployment. The demo intentionally directs the admin to the installed
  connector instead of publishing one hard-coded deployment callback.

Screen layout is illustrative, not an assertion that every tenant has an
identical interface. The sample name `Aplan4Sheets` is alphanumeric. Refresh
token lifetime and rotation are not prescribed; those are organization policy
choices outside this client-creation lesson.

## Narration and checks

Eight static MP3s use the approved `en-US-AndrewMultilingualNeural` voice at
`-3%`, with two-pass loudness normalization. The public manifest and visible
transcripts match. Audio decoding checks passed for all eight: 94.87 seconds
total, 44.1 kHz mono, integrated loudness −17.18 to −16.48 LUFS, maximum true
peak −1.88 dBTP. Browser playback of the first clip reached readyState 4 and
advanced currentTime after Start. These checks do not constitute a human
listening review.

The full automated suite passes 164 tests. Added coverage checks the complete
administrator sequence, read-only simulated controls, callback and grant
instructions, enabled completion, handoff URL, restart, step scrolling,
transcript/audio correspondence, reduced-motion embeds, and discovery links.
Existing shared-player tests cover manual Next, rapid double clicks,
pause/resume, audio fallback, cancellation, autoplay, and completion.

Browser review covers 1280×720 desktop and a 355px viewport, including the
form and the handoff. The GitHub Pages release changes only this website;
no connector, Apps Script, App Engine, or Marketplace deployment is involved.
