# AoEM Era8 Command Center

DKP tracker, TMG management tool, event dashboards, and coordination flyers for Age of Empires Mobile — Era8 server.

**Live site:** https://th12eat.github.io/aoem-dashboard/

## What's here

### Command Center (`/app`)
The DKP & TMG tracker with four views:

- **DKP Leaderboard** — All players ranked by DKP score. Filterable by alliance (WC1, Reunions, Mythic, AuroraCog). Searchable by name. Shows status tiers, event points, bonuses, and penalties.
- **TMG Board** — Current season slot assignments (announced vs. completed). Each series has a "Copy for Mail" button that generates a condensed list under 1000 characters for in-game messaging.
- **Incidents** — Log of breaker events, kicked players, punishments, and restitution.
- **History** — Previous TMG season results.

### Dashboards (`/dashboards`)
- **Primordial Conflict Dashboard** — Interactive KvK event coordination dashboard.

### Flyers (`/flyers`)
- **Day 6 Showdown Flyer** — Visual briefing for Day 6 stage of Primordial Conflict.
- **Order Workshop Flyer** — Event coordination flyer for Order Workshop.

## DKP System

DKP (Dragon Kill Points) is a metascore that determines TMG slot priority. Players earn points by:

| Event | Points |
|-------|--------|
| Wonders (attendance) | 50 per event |
| Battle of Dawns (attendance) | 50 per event |
| GEE (attendance/placement) | 50-100 |
| KvK (prep + participation) | 50-100 each |
| Deserts (placement) | 25-100 |
| Regularity bonus | 50 (6+ attendances) |

Penalties apply for absences, consecutive absences, and TMG medal gains (since winners already benefited).

### Status Tiers
ELITE > STRONG WARRIOR > TRY-HARD AMATEUR > WATER BOY > CANNON FODDER > OFFICIAL DOORMAT

## TMG (The Mightiest Governor)

A 7-day PvE event where top 50 finishers earn hero tokens. The DKP system coordinates who gets which slot to avoid internal competition:

- Slots 1-5: individual spend targets
- Slots 6-50: grouped into tiers with shared spend targets
- **Breakers** = players who push past their assigned rank, displacing someone above them
- Breakers are penalized; displaced players receive restitution

## Automated Event Processing

Screenshots of post-event results can be submitted via GitHub Issues to automatically update DKP data.

### How to submit

1. Create a new Issue in this repo
2. Add the `event-submission` label
3. Title must include the event type: `wonders`, `dawns`, `gee`, `kvk`, `deserts`, or `tmg`
4. Paste screenshot(s) of the results screen in the issue body

The workflow will:
- Extract player names and scores from the screenshots using Claude vision
- Update the relevant event JSON data
- For TMG: detect and flag breakers
- Comment back on the issue with a summary

If processing fails (API issues, rate limits), a retry workflow runs every 6 hours to pick up failed submissions.

### Setup (maintainers only)

1. Add `ANTHROPIC_API_KEY` as a repo secret (Settings > Secrets > Actions)
2. Create the `event-submission` label in the repo
3. Create the `processing-failed` label (used for retry tracking)

## Data Structure

All data lives in `/data` as JSON:

```
data/
├── players.json              # Full roster with DKP scores
├── incidents.json            # Breaker/kick log
├── events/
│   ├── wonders.json
│   ├── dawns.json
│   ├── gee.json
│   ├── kvk.json
│   └── deserts.json
└── tmg/
    ├── season6.json          # Historical TMG slots + results
    ├── season6_records.json  # End-of-season DKP snapshot
    └── season7.json          # Current season (announced + completed)
```

## Alliances

| Tag | Name | Color |
|-----|------|-------|
| WC1 | Worldclass | Gold |
| MyT | Mythic | Blue |
| REU | Reunions | Green |
| AGC | AuroraGodCourt | Orange |

## Contributing

This is a coordination tool for Era8 allied alliances. If you're an R4/R5 in one of the above alliances and want to submit event data, open an issue with the `event-submission` label and attach your screenshots.
