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
- Maximum 6 active teams × 6 attendees = 36 escape room places; lounge-only attendees remain separate.
- Team creation, joining and organiser allocation are enforced atomically by PostgreSQL stored functions using an advisory transaction lock.
- Invite-code lookup reveals only team name and headcount, not member emails or dietary requirements.
- Organiser Access shows live shared statistics, team cards and assignment controls, and can export attendee and team-allocation CSV files.
- Existing RSVPs made before teams were introduced remain intact and await team allocation.

Database objects: `rsvps.team_id`, `escape_teams`, `register_gathering_rsvp`, and `organiser_assign_gathering_team`. The application code does not automatically migrate a fresh database.

## Operational note
This lightweight internal-event prototype does not verify ownership of an email address: anyone who enters an existing email could update its RSVP. Organisers should review unexpected changes before relying on allocations. For a wider public launch, add email verification or a secure edit link. Rotate the admin passcode and any database credential previously shared outside Vercel.
