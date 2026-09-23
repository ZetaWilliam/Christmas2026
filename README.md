# Pharmacology End of Year Gathering 2026

RSVP website for the University of Auckland Department of Pharmacology and Clinical Pharmacology.
Wednesday 9 December 2026, 10:45am–2:00pm, Escapade NZ.

## Deployment
GitHub `main` automatically deploys the static `index.html` and Node.js serverless functions under `api/` to Vercel. Project root is the repository root.

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


## Santa Harbour Dash
- A 20-second summer-Christmas paddling mini-game is embedded on the event page.
- Desktop players alternate A / L; touch users use the left/right paddle buttons.
- The game leaderboard stores only a user-chosen public display name, optional team name, score, stroke count and duration. It does not use RSVP email addresses.
- `api/game.js` exposes a public read/write leaderboard with server-side validation and rate limiting. Only the best score for each display name is shown.
- The leaderboard is explicitly for fun and is separate from escape-room competition results and RSVP/team allocation.


### Open-source inspiration
The current Santa Harbour Dash gameplay is inspired by Chromium's open-source T-Rex Runner structure, as distributed in wayou/t-rex-runner (BSD-3-Clause): automatic forward motion, progressive speed, randomized obstacle gaps, collision game-over and instant replay. No T-Rex Runner sprites or other third-party game art are copied; the Auckland harbour scenery, Santa canoe, ferry, sailboat, buoy, gull and pōhutukawa artwork are custom for this event.


### Runner gameplay notes
- Speed progression is intentionally gradual: the run starts at 320 px/s, accelerates at 3.2 px/s², and caps at 560 px/s. Later difficulty comes mainly from denser, readable obstacle clusters rather than sudden speed spikes.
- Harbour hazards use amber/dark maritime styling plus an exclamation marker and contain no Christmas-themed obstacle art. Current hazards are buoys, ferry wakes, sailboats and low gulls.
- Rewards are visually separate glowing pōhutukawa blooms. Normal blooms build a 6-second combo; rare golden blooms award a larger bonus and have a gold halo/star treatment.
- The harbour cycles through day, sunset, night and dawn while landmarks continue to scroll.
- Milestone chimes are generated with the Web Audio API after a user gesture; players can mute them with the in-game Sound control.
- Leaderboard rows can include total blooms, golden blooms and max combo in addition to distance and score.
