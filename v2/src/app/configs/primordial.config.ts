import type { EventDashboardConfig } from '@shared/models/event-dashboard-config.model';

/**
 * Primordial Conflict — a 7-day, four-kingdom round-robin KvK (a "special" KvK
 * with no troop loss). After matchmaking, our kingdom fights each of the other
 * three 1v1 across three battle days (Dew at Alchemy Pools + Order Workshops),
 * the points leader picks the Day-6 showdown battlefield, all four converge on
 * 8 Essence Refineries, and Day 7 recovers losses.
 *
 * Reuses the 4-kingdom family widgets (kingdomBar persistent standings, scouting
 * grids, timeline, specTable/cardGrid/scheduleWindows). NO interactive node map
 * in 1.0 (the battlefield is a static illustration), so mapGeometry is omitted.
 * Content carried VERBATIM from dashboards/primordial_conflict_dashboard.html.
 *
 * Tabs mirror 1.0: Overview · Scouting · Points · PVE Guide.
 */
export const PRIMORDIAL_CONFIG: EventDashboardConfig = {
  slug: 'primordial',
  kvkTheme: 'primordial',
  titleKey: 'primordial.title',
  subtitleKey: 'primordial.subtitle',
  header: {
    backgroundAsset: 'assets/kvk-bg-primordial.jpg',
    timezone: 'UTC+0',
    calendarStub: true,
    vsAfterIndex: 1,
    buttons: [
      { glyph: '📜', titleKey: 'primordial.header.jumpObjectives', jumpToTab: 'overview', jumpToAnchor: 'daily-objectives' },
      { glyph: '❓', titleKey: 'primordial.header.whatIs', help: true },
    ],
    help: {
      titleKey: 'primordial.header.whatIs',
      body: 'Primordial Conflict is a 7-day, four-kingdom round-robin KvK. After a matchmaking day, your kingdom fights each of the other three 1v1 across three battle days (Days 2–4), earning Primordial Points by gathering Dew at Alchemy Pools and contesting Order Workshops. The kingdom leading on points then picks the showdown battlefield & time (Day 5), all four converge for a 4-way fight over 8 Essence Refineries (Day 6), and Day 7 recovers losses. This is a special KvK where no troop loss occurs — units wounded in PvP are recovered, so there is no lasting attrition. Contest every objective aggressively and PvP freely.',
    },
    // Order Workshop — our fixed 19:00–20:00 UTC window on each battle day.
    badge: {
      labelKey: 'primordial.header.workshop',
      liveLabelKey: 'primordial.header.workshopLive',
      glyph: '🔧',
      windows: [{ startMin: 1140, endMin: 1200 }],
      startDate: '2026-10-13',
      endDate: '2026-10-15',
      lockedBeforeKey: 'primordial.header.workshopBefore',
      lockedAfterKey: 'primordial.header.workshopAfter',
      jumpToTab: 'overview',
      jumpToAnchor: 'workshop-schedule',
    },
  },
  // Persistent kingdom standings bar (4 servers), same as the land-war KvKs.
  persistentBar: 'kingdomBar',
  dataSource: { kind: 'supabase', typeSlug: 'primordial' },
  tabs: [
    // ───────────────────────────── OVERVIEW ─────────────────────────────
    {
      id: 'overview',
      labelKey: 'primordial.tabs.overview',
      widgets: [
        {
          kind: 'timeline',
          bind: 'meta',
          titleKey: 'primordial.overview.timeline',
          options: {
            zones: [
              { id: 'mm', label: 'Matchmaking', bright: '#5b8def', dark: '#273349' },
              { id: 'battle', label: 'Battle Stage', bright: '#c4a7f0', dark: '#3a2e52' },
              { id: 'select', label: 'Selection', bright: '#bf5fff', dark: '#3a1f52' },
              { id: 'showdown', label: 'Showdown', bright: '#9b6dff', dark: '#2f2152' },
              { id: 'recovery', label: 'Recovery', bright: '#f7a8c8', dark: '#4a2f3c' },
            ],
            stages: [
              { dayLabel: 'Day 1', label: 'Matchmaking & scouting', zone: 'mm', dayOffset: 0 },
              { dayLabel: 'Day 2', label: 'Battle Day 1 (1v1)', zone: 'battle', dayOffset: 1 },
              { dayLabel: 'Day 3', label: 'Battle Day 2 (1v1)', zone: 'battle', dayOffset: 2 },
              { dayLabel: 'Day 4', label: 'Battle Day 3 (1v1)', zone: 'battle', dayOffset: 3 },
              { dayLabel: 'Day 5', label: 'Battlefield selection', zone: 'select', dayOffset: 4 },
              { dayLabel: 'Day 6', label: '4-way showdown', zone: 'showdown', dayOffset: 5 },
              { dayLabel: 'Day 7', label: 'Troop recovery', zone: 'recovery', dayOffset: 6 },
            ],
          },
        },
        {
          kind: 'richText',
          titleKey: 'primordial.overview.structure',
          options: { paragraphKeys: ['primordial.overview.structureP1', 'primordial.overview.coreLoop'] },
        },
        {
          kind: 'specTable',
          titleKey: 'primordial.overview.objectives',
          anchor: 'daily-objectives',
          options: {
            intro: 'Resets 00:00 UTC daily. Contest freely — no troop loss this cycle. Track your own progress toward each target.',
            columns: [{ header: 'Objective' }, { header: 'Daily Target', align: 'right', color: '#9b6dff' }, { header: 'Notes' }],
            rows: [
              ['Gather Primordial Dew', 'Unlimited', 'Alchemy Pools (Lv.1–4). 100 Dew → 10K points. Run 1 march on a Lv.4 pool + the rest on Lv.3.'],
              ['Lv.4 Pool Hyena Kills', 'Unlimited', 'Land the killing blow on a Corrupted Hyena for +10% gather speed at that pool (only 3 near the IC, refresh 12h).'],
              ['Order Workshop Caps', 'Unlimited', 'Capture workshops in our 19:00 event + the opponent’s. 600M on capture, +200M if held at end.'],
              ['Workshop Stationing', 'Unlimited', 'Stay inside a held workshop — +500 pts/sec per person. Every tier counts equally.'],
              ['Combat Eliminations', 'Unlimited', 'Score PvP within tier gap ≤ 2. No troop loss this cycle — fight freely.'],
              ['Primordial Essence', 'Unlimited', 'Day 6 only — garrison a refinery (50K+ units) for 1/sec, plus 1 per 500 combat pts (max 70K).'],
            ],
          },
        },
        {
          kind: 'scheduleWindows',
          titleKey: 'primordial.overview.workshop',
          anchor: 'workshop-schedule',
          options: {
            intro:
              'Two workshop events per battle day (3 workshops each): the opponent’s on their server at their voted time, ours on our server at 19:00 UTC. Our daily result is tracked in Points.',
            windows: [{ label: '19:00 – 20:00 UTC · ours', startMin: 1140, endMin: 1200 }],
            footnote:
              'The in-game vote display for the opponent’s time has been unreliable — confirm it in-client each day.',
            startDate: '2026-10-13',
            endDate: '2026-10-15',
            lockGlyph: '🔧',
            lockedBefore: 'The Order Workshop event opens on Battle Day 1 (Tue Oct 13, 19:00 UTC).',
            lockedAfter: 'The Battle Stage is complete — Order Workshops have closed.',
          },
        },
      ],
    },

    // ───────────────────────────── SCOUTING ─────────────────────────────
    {
      id: 'scouting',
      labelKey: 'primordial.tabs.scouting',
      widgets: [
        { kind: 'scoutingGrid', bind: 'research', titleKey: 'primordial.scouting.alliances', options: { show: 'alliances' } },
        { kind: 'scoutingGrid', bind: 'research', titleKey: 'primordial.scouting.players', options: { show: 'players' } },
      ],
    },

    // ───────────────────────────── POINTS ─────────────────────────────
    {
      id: 'points',
      labelKey: 'primordial.tabs.points',
      widgets: [
        {
          kind: 'richText',
          titleKey: 'primordial.points.gathering',
          options: { paragraphKeys: ['primordial.points.gatheringBody'] },
        },
        {
          kind: 'specTable',
          titleKey: 'primordial.points.objectives',
          options: {
            columns: [{ header: 'Objective' }, { header: 'Kingdom Points', align: 'right', color: '#9b6dff' }],
            rows: [
              ['Order Workshop — fully capture', '600M each'],
              ['Order Workshop — occupy at contest end', '+200M each'],
              ['Order Workshop — max per 3-workshop contest', '2.4B'],
              ['Essence Refinery — occupying (per second held)', '1M / sec'],
              ['Essence Refinery — last holder at contest end', '800M each'],
              ['Essence Refineries — 8 × 800M end-of-contest', '6.4B'],
            ],
          },
        },
        {
          kind: 'richText',
          titleKey: 'primordial.points.combat',
          options: { paragraphKeys: ['primordial.points.combatBody'] },
        },
      ],
    },

    // ─────────────────────────── PVE GUIDE ─────────────────────────────
    {
      id: 'guide',
      labelKey: 'primordial.tabs.guide',
      widgets: [
        {
          kind: 'cardGrid',
          titleKey: 'primordial.guide.title',
          options: {
            intro:
              'The three mechanics that win Primordial Conflict — Alchemy Pool / Essence gathering, Order Workshops (Battle Days 2–4), and the Day-6 Refinery showdown around the Imperial City. No troop loss this cycle, so contest everything.',
            columns: 1,
            cards: [
              {
                icon: '💧',
                title: 'Gathering — Dew & Essence',
                color: '#9b6dff',
                desc: 'Primordial Dew: gather at Alchemy Pools (Lv.1–4). 100 Dew → 10K points. Lv.4 pools sit near the IC (only 3), refresh every 12h — up to 40 gatherers, guarded by a Corrupted Hyena (land the killing blow for +10% gather speed). Min 50,000 units per march. Primordial Essence (Day 6 only): garrison a refinery (50K+ units) for 1/sec, plus 1 per 500 combat pts (max 70K) — premium currency, does NOT convert to points.',
              },
              {
                icon: '🔧',
                title: 'Order Workshop',
                color: '#9b6dff',
                badge: 'Battle Days 2–4',
                desc: '2 events/day — ours 19:00 UTC (fixed) + the opponent’s. 3 workshops each, 1-hour contest. No player cap — flood the zone; more bodies = faster capture. Capture = 600M, +200M if held at end, +500 pts/sec per person inside. Stay inside until fully capped. Target 2, not 3 — dominate two rather than spread thin. It’s a 1-hour PvP window — if your citadel is threatened, bubble up immediately.',
              },
              {
                icon: '🔥',
                title: 'Refineries around the IC',
                color: '#9b6dff',
                badge: 'Day 6 Showdown',
                desc: 'All 4 kingdoms converge on one IC; most Kingdom Points at end wins (carries from the Battle Stage). Hold a refinery: 1M pts/sec. Each pays 800M to its last holder at end — 8 × 800M = 6.4B. Refineries are rally-only (no solo marches, no war machines). Camps open −30m (top-6 tiered −30/−20/−10). At +2h refineries lock. Lock your home-corner cluster first, then push the flanks — aim for 3–4 refineries.',
              },
            ],
          },
        },
      ],
    },
  ],
};
