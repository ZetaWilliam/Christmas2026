# Neutral page wording and classic instrumental playback

Release: 2026.09.24-neutral-audio.1

## Page wording
- Activity remains End of Year Gathering.
- Authored game title, navigation and accessible label use Harbour Dash.
- Nickname example is Harbour Explorer; venue link is View Escapade Event Info.
- Audio controls say Instrumental 1 / Instrumental 2 rather than Christmas Bells / Christmas Bossa.
- Artwork, character sprites, water rendering, physics, collision boxes, score tiers, styling, RSVP form, team allocation and APIs are unchanged.
- Internal identifiers, historic filenames, source comments and existing URLs are not renamed. They do not appear as authored page prose. Existing links and QR codes remain valid.

## Music
Two Kevin MacLeod recordings of Jingle Bells replace synthesized background accompaniment. The bright piano/glockenspiel/celesta arrangement is the default; the wind ensemble arrangement is selectable. Recordings are hosted under the site's own origin. Full recording credits and hashes are in music/CREDITS.md and music/manifest.json; a compact attribution link is visible below the game.

Playback begins only after a start gesture. Pause fades and freezes the recording; resume continues it. Music and game effects remain separately switchable. Switching a track while paused stays silent.

## Verification
Local Node suite: 144/144 seeded physics runs, 45 paired-obstacle patterns, 15 stubbed API checks, and extended build checks passed.
Offline Chromium 144 tests at 390 and 1280 CSS pixels: no authored Christmas/Santa/Xmas labels, neutral accessible text, registration before game, no autoplay, MP3 decoding/playback, pause/resume, both tracks, and independent music/effects controls passed. No JavaScript page errors were recorded. Assets were loaded from local data URLs and network/API requests were stubbed because outbound browsing was unavailable. This is not a physical-phone or production write test. No test RSVP or score was submitted to the real database.
