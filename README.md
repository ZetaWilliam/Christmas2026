# Pharmacology End of Year Gathering 2026

RSVP website for the University of Auckland Department of Pharmacology and Clinical Pharmacology.
Wednesday 9 December 2026, 10:45am–2:00pm, Escapade NZ.

## Deployment and maintenance
GitHub `main` deploys through Vercel. `vercel.json` runs the Node regression tests followed by `scripts/build-site.js`, producing `public/`. Root `api/` files remain Node.js serverless functions.

The root `index.html` remains the event/RSVP template. The build removes only its marked legacy inline game block and loads the tested modules under `gameplay/`. Change gameplay in `gameplay/engine.js`, `gameplay/runner.js` and `gameplay/runner.css`, not in the historical inline runner block. RSVP and organiser source outside that block is retained. Run `npm test` and `npm run build`; serve `public/` to preview the built site.

Vercel Production environment requires **server-side Secret** variables:
- `DATABASE_URL`: Neon PostgreSQL connection string.
- `ADMIN_PASSCODE`: organiser-only dashboard passcode.

Never commit their values or expose them to client-side JavaScript.

## RSVP and teams
- One RSVP per email. Submitting the same email updates that RSVP, including its team choice.
- Escape room attendees can create a team, join by 10-character invite code or ask organisers to allocate them.
- Up to 12 provisional teams can be formed (maximum 6 participants per team), with 36 total escape-room places across six physical game rooms. Organisers may adjust or combine teams to balance numbers; lounge-only attendees remain separate.
- Team creation, joining and organiser allocation are enforced atomically by PostgreSQL stored functions using an advisory transaction lock.
- The public team directory shows only team names, headcounts and remaining places. Attendees can choose a listed team or use an invitation code. Public lookup never reveals member emails or dietary requirements.
- Organiser Access shows live shared statistics, team cards and assignment controls, and can export attendee and team-allocation CSV files.
- Existing RSVPs made before teams were introduced remain intact and await team allocation.

Database objects: `rsvps.team_id`, `escape_teams`, `register_gathering_rsvp`, and `organiser_assign_gathering_team`. The application code does not automatically migrate a fresh database.

## Operational note
This lightweight internal-event prototype does not verify ownership of an email address: anyone who enters an existing email could update its RSVP. Organisers should review unexpected changes before relying on allocations. For a wider public launch, add email verification or a secure edit link. Rotate the admin passcode and any database credential previously shared outside Vercel.

## Santa Harbour Dash — playtest edition
A casual automatically scrolling Auckland harbour runner, separate from RSVP and the escape-room competition. Players hop with Space/Up or the Hop button, hold Down/S or Duck to pass low gulls, and use P or Pause to suspend a run. Keyboard controls apply only to the focused game. Switching windows or leaving the game pauses simulation and combos.

### Tuning
- Fixed 120 Hz simulation; render frames may run at 30, 60 or 120 Hz without changing jump physics.
- Initial speed 300 logical px/s; first 12 active seconds remain steady, then +2 px/s² up to 480 px/s (1.60×).
- Jump velocity −620 px/s, gravity 1550 px/s², 120 ms pre-landing input buffer. Held duck is applied after landing.
- Low gull collision now intersects standing Santa but clears the crouched body. Paddle tips are not collision targets.
- Double hazards start after 30 active seconds. A physics-based clearance check rejects overly wide combinations. Cluster separation includes recovery and reaction time.
- Rewards are placed over a known jumpable group or in a ground-level gap, rather than spawned independently inside hazards.
- Gold becomes eligible after 18 active seconds and at least 12 seconds since the previous gold spawn. Eligible rewards have a 9% chance, with a gold spawn by the tenth eligible reward to limit long droughts.
- Consecutive collected blooms within six active seconds build a combo. Missing a bloom breaks the streak; pausing does not. Normal/gold base rewards are 100/300, with +20 per additional combo step capped at +100 per bloom.
- Maritime hazards have amber warning triangles and no Christmas-themed obstacle art. Rewards are filament-like red or gold pōhutukawa blooms with a + or star.
- A 48-second active-time day/night palette, landmark scenery, gold/collection/milestone sounds and optional mute are retained. Reduced-motion mode keeps a steady day palette.
- Mobile canvas dimensions remain proportional. Instructions and feedback are outside the playable area; touch buttons are at least 58 px tall.

### Leaderboard
`api/game.js` uses `runner_scores`. It stores a chosen public nickname, optional team label, score, distance, bloom count, gold count, max combo and active duration, not RSVP email. GET and POST use the same complete result projection. A failed client submission retains its immutable run result for retry. Existing scores are not deleted.

Checks are plausibility bounds and a per-name short submission cooldown, not cheat-proof authentication. Nicknames are not verified identities; this is an informal event game, not a prizes/security-grade competition.

### Verification performed
- 144 deterministic automated physics playthroughs: 24 seeds × two viewport models × 30/60/120 render rates, each 150 simulated seconds. All completed.
- 45 admitted double-hazard configurations checked with early/late jump timing; minimum observed passing window 240 ms in the tested grid.
- Real headless Chromium input runs on a local isolated game page using these exact modules, including desktop keyboard and mobile-emulated touch controls, pause/resume, collisions, restarts, gold collection and retry submission.
- Layout/control regression checks at widths 320, 375, 390, 430, 768, 1280 and 1440 px. Touch hold/release/cancel and duck-on-landing were exercised using Chromium touch dispatch.
- Fifteen API-handler assertions use a database stub; browser score-save tests use local HTTP response stubs. They do not insert fake scores into production.
- Built production HTML/assets and read-only live endpoints are checked separately. Local browser tests are not physical iOS/Android hardware tests or production POST roundtrips.

### Open-source inspiration
Gameplay is inspired by Chromium's open-source T-Rex Runner structure, as distributed in wayou/t-rex-runner (BSD-3-Clause): automatic forward motion, progressive speed, randomized obstacles, collision game-over and replay. No T-Rex sprites or third-party game art are copied; the Auckland harbour and Christmas artwork are custom.
