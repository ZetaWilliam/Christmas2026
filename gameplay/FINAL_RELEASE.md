# Harbour Dash — completed illustrated release

Build: `2026.09.24-final.1`

## Delivered experience

- The complete game section follows the RSVP form. Both requested long introductory/development paragraphs are removed from built page content. A short recording-credit link remains below the game.
- Illustrated Auckland coast and character/obstacle sprites replace the earlier geometric rendering. The standing character uses one articulated paddle with both hands attached. Crouching and airborne poses are separate. Water has approaching perspective swells, broken highlights and a local paddle/canoe wake.
- Hazard collision boxes are inset from the visible character. Standing collision area is 1,544 logical square pixels versus the earlier 2,010, approximately 23% smaller. Reward pickup boxes retain their original dimensions. Hazard warnings remain maritime rather than Christmas-themed.
- Two credited instrumental recordings are selectable, with independent Music and SFX controls. Playback starts after the user starts a run; pausing freezes the recording. Switching tracks while paused stays silent.
- Jump, duck, flower, gold, combo, milestone, collision and successful score submission have event cues. The five result tiers now each have a distinct short melody, with an additional soft motif for a new personal best.
- Score tiers are Explorer (0), Cruiser (400), Skipper (900), Hero (1,800), Legend (3,200). The result card has a score tally, tier treatment, encouraging text, distance/bloom/gold/combo detail and replay. Saved scores have a clear success state; failures retain the result for retry.
- Current neutral Harbour Dash page labels, event information, existing QR/link target and the shared cloud leaderboard are retained.

## Verification performed for this release

Local Node checks on the actual source:
- 144/144 seeded physics simulations passed: 640/960 logical widths, 30/60/120 frame rates, 24 seeds, 150 simulated seconds per run.
- 45 permitted double-obstacle configurations passed, with minimum successful timing window 250 ms in the tested grid.
- 15 game API assertions passed using a stub database, including GET/POST statistic consistency and invalid input rejection.
- 18 sound/feedback assertions passed, including five distinct result melodies, personal-best cue, each event cue and SFX mute.
- 960 articulated rowing-rig poses passed, with one paddle per standing frame and both grip points attached.
- Build checks passed: the original RSVP form and non-game cloud-client code are unchanged, section order is correct, requested prose is absent, and artwork/music files are intact.

Chromium 144 / Playwright 1.57:
- 60 assertions passed across 390 and 1,280 CSS-pixel viewports.
- Checks covered artwork load, no horizontal overflow, proportional canvas, registration-before-game order, no autoplay, real MP3 decoding and nonzero music signal, keyboard/touch hop, held duck, pause/resume, both recordings, independent audio toggles, all five result tiers, score-save failure/retry and editable RSVP notes.
- No JavaScript page errors were recorded in these checks.

Browser tests used the actual built modules, artwork and recordings, with local data-URL assets and generated utility CSS because browser network navigation was unavailable. API responses were mocked. Touch input was emulated, not tested on physical phones. These results are not claims of live database-write or all-browser compatibility testing.

## Data and deployment boundaries

No production score, RSVP, team record, schema, credential or capacity limit was changed during this finishing pass. Neon schema access and live public read endpoints are checked separately. CI includes the feedback tests; production build must pass the tests before deploying.

Recording credits: `music/CREDITS.md`. Music is licensed instrumental material, not an unlicensed current commercial hit recording.
