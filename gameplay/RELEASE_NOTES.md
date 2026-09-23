# Harbour Dash — Summer edition

Build: `2026.09.23-summer.2`

## Published changes

- The game is placed after the complete RSVP section. Both long introductory/development paragraphs requested for removal are absent from the built page. The original form, team choices, organiser code and all three cloud API files are unchanged.
- The existing generated event artwork atlas is decoded to a small WebP at build time. The renderer uses its illustrated Auckland panorama, upright/crouching Santa, boats, gull and red/golden flowers. White backgrounds are removed from sprite edges in the browser. Textured water scrolls at multiple perspective speeds with highlights, swells and a canoe wake; visual movement does not change collision physics.
- Hazard collision area is reduced: standing total area from 2010 to 1544 logical square pixels (about 23% smaller). Reward pickup retains its prior dimensions. Gradual speed, buffered jumps, pause/resume safety and fair obstacle generation remain intact.
- Two original generated instrumental arrangements, Harbour Pop and Summer Bossa, have melody, chords, bass and percussion. These are not recordings of commercial/popular songs. Music and SFX have independent switches; music starts on a game-start gesture and fades out on pause or result. Jump, duck, flowers, gold, milestones and results have cues.
- Five result tiers use 0/400/900/1800/3200 thresholds, with encouraging messages, animated score tally, distance/bloom/gold/combo detail and personal-best recognition. The existing shared cloud leaderboard is retained. Only personal best and audio preferences are local.

## Verification

The 144 seeded physics simulations (640/960 logical widths; 30/60/120 frame conditions; 150 simulated seconds each) passed. All 45 permitted double-obstacle test configurations retained at least 250 ms of successful input timing in the tested grid. Fifteen mock-database API assertions passed.

Chromium keyboard and emulated-touch checks at 1100 and 390 CSS pixels passed: artwork loading, RSVP-before-game order, hopping, pause/resume, independent music/effects controls, track switching, collision result and mocked score submission. No JavaScript page errors were recorded. Browser tests ran offline with the actual game modules, embedded artwork, a substitute utility stylesheet and mocked APIs; they are not physical phone or live database-write tests.

Build checks verify exact preservation of the original RSVP form and cloud-client code, source-template integrity, new module outputs, artwork signature and reduced hazard-only hitbox. Deployment and public read endpoints are checked separately. No test scores or attendee records are inserted into production.
