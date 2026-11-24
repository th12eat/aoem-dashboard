import type { EventDashboardConfig } from '@shared/models/event-dashboard-config.model';

/**
 * The Mightiest Empire (TME) — a cross-server war in two phases: a six-day
 * Preparation week (five daily scoring stages) followed by an Invasion Sunday
 * on a shared battlefield. Unlike the land-war KvKs it has NO interactive zone
 * map — the battlefield is a fixed diamond (IC centre, four gates, four towers),
 * so this config carries its positions/rules as verbatim reference widgets
 * rather than the deriveMapView engine (mapGeometry is intentionally omitted).
 *
 * CONTENT POLICY (same as Stormlands/Desolate): reference prose + tables are
 * carried VERBATIM from dashboards/tme_command_center.html; only chrome lives in
 * i18n keys; live data (rosters, prep points, tiers, depth) binds to the
 * normalized EventData and is entered per-occurrence by an admin.
 *
 * Tabs mirror the 1.0 rendered set: Overview · Scouting · Battlefield.
 */
export const TME_CONFIG: EventDashboardConfig = {
  slug: 'tme',
  kvkTheme: 'tme',
  titleKey: 'tme.title',
  tagKey: 'tme.tag',
  subtitleKey: 'tme.subtitle',
  header: {
    backgroundAsset: 'assets/kvk-bg-tme.jpg',
    timezone: 'UTC+0',
    calendarStub: true,
    vsAfterIndex: 1,
    // 1.0 TME header: blue "Command Center" eyebrow over a light title.
    eyebrowKey: 'tme.header.eyebrow',
    // Dynamic ATTACKING/DEFENDING badge: the prep-tug leader attacks.
    attackDefense: {
      attackLabelKey: 'tme.header.attacking',
      defendLabelKey: 'tme.header.defending',
      attackGlyph: '⚔️',
      defendGlyph: '🛡️',
    },
    // Stage-aware countdown: cycles Prep → Invasion → Recovery labels. Dates are
    // the occurrence's own; these defaults mirror the committed static TME.
    stages: [
      { id: 'prep', fromLabelKey: 'tme.stage.prepStart', toLabelKey: 'tme.stage.invasionStarts', liveLabelKey: 'tme.stage.prepLive', startDate: '2026-11-23', endDate: '2026-11-29' },
      { id: 'invasion', fromLabelKey: 'tme.stage.invasionStarts', toLabelKey: 'tme.stage.recoveryEnds', liveLabelKey: 'tme.stage.invasionLive', startDate: '2026-11-29', endDate: '2026-11-30' },
    ],
    buttons: [
      { glyph: '📜', titleKey: 'tme.header.jumpDaily', jumpToTab: 'overview', jumpToAnchor: 'daily-plan' },
      { glyph: '❓', titleKey: 'tme.header.whatIs', help: true },
    ],
    help: {
      titleKey: 'tme.header.whatIs',
      body: 'The Mightiest Empire (TME) is a cross-server war between two kingdoms, run in two phases. Preparation (Mon–Sat): five daily scoring stages — Forging Gear, Enhancing Buildings, Enhancing Technologies, Unit Training, Power Boost. Each server earns points completing that day’s activities; out-score the enemy server day by day to win prep. Invasion (Sunday): the two servers fight on a shared battlefield — alliances teleport in and rally objectives. Each server’s top 3 alliances by prep points teleport in early (30 / 20 / 10 min before start) to seize position. Holding objectives scores the points that decide the war.',
    },
    badge: {
      labelKey: 'tme.header.invasion',
      liveLabelKey: 'tme.header.invasionLive',
      glyph: '⚔️',
      // Invasion is a single same-day window; model it as a wide daytime window
      // on the invasion date (the badge only gates by the start/end date range).
      windows: [{ startMin: 0, endMin: 1439 }],
      startDate: '2026-08-09',
      endDate: '2026-08-09',
      lockedBeforeKey: 'tme.header.invasionBefore',
      lockedAfterKey: 'tme.header.invasionAfter',
      jumpToTab: 'battlefield',
      jumpToAnchor: 'tme-map',
    },
  },
  // The persistent bar above the tabs is TME's prep tug (current stage + total,
  // expandable) — not the kingdom-standings bar.
  persistentBar: 'prepTug',
  dataSource: { kind: 'supabase', typeSlug: 'tme' },
  tabs: [
    // ───────────────────────────── OVERVIEW ─────────────────────────────
    {
      id: 'overview',
      labelKey: 'tme.tabs.overview',
      widgets: [
        {
          kind: 'timeline',
          bind: 'meta',
          titleKey: 'tme.overview.timeline',
          options: {
            zones: [
              { id: 'mm', label: 'Matchmaking', bright: '#94a3b8', dark: '#3a4256' },
              { id: 'prep', label: 'Preparation', bright: '#3b82f6', dark: '#1e3355' },
              { id: 'inv', label: 'Invasion', bright: '#ef4444', dark: '#5a2626' },
            ],
            stages: [
              { dayLabel: 'Sat & Sun', label: 'Matchmaking', zone: 'mm', dayOffset: -2 },
              { dayLabel: 'Mon', label: 'Stage 1 — Forging Gear', zone: 'prep', dayOffset: 0 },
              { dayLabel: 'Tue', label: 'Stage 2 — Enhancing Buildings', zone: 'prep', dayOffset: 1 },
              { dayLabel: 'Wed', label: 'Stage 3 — Enhancing Technologies', zone: 'prep', dayOffset: 2 },
              { dayLabel: 'Thu', label: 'Stage 4 — Unit Training', zone: 'prep', dayOffset: 3 },
              { dayLabel: 'Fri & Sat', label: 'Stage 5 — Power Boost', zone: 'prep', dayOffset: 4 },
              { dayLabel: 'Sun', label: 'Invasion', zone: 'inv', dayOffset: 6 },
            ],
          },
        },
        {
          // Stage-tabbed plan aligned to the timeline: pick a stage, see its
          // buff schedule + do-list + prep-ahead blurb. Defaults to today.
          kind: 'stageTabs',
          bind: 'meta',
          titleKey: 'tme.overview.plan',
          anchor: 'daily-plan',
          options: {
            tabs: [
              {
                label: 'Matchmaking',
                title: 'Matchmaking — Prep Ahead',
                macro: 'Matchmaking',
                dayOffset: -2,
                blurb: 'No scoring yet — use today to prepare for Stage 1.',
                nextPrep: 'Farm Iron Meteorite and save Stamina for Stage 1.',
              },
              {
                label: 'Stage 1',
                title: 'Stage 1 — Forging Gear',
                macro: 'Preparation Week',
                dayOffset: 0,
                doList: [
                  'Craft gear — rare +10,000 · epic +30,000 · legendary +200,000 (per piece)',
                  'Defeat tribes, scaling by level: Lv.1-4 +4,000 → Lv.25-28 +20,800 → Lv.29-30 +24,000 (per kill)',
                ],
                nextPrep: 'Farm RSS & sign up for Chief Priest (Building) for Stage 2.',
              },
              {
                label: 'Stage 2',
                title: 'Stage 2 — Enhancing Buildings',
                macro: 'Preparation Week',
                dayOffset: 1,
                buff: 'King applies the Building King’s Rights buff from 04:00 UTC today.',
                doList: [
                  'Consume 1h of building speed-ups → +18,000',
                  'Increase building power by 1 → +30',
                  'Gather 100 resources (except armories) → +10',
                ],
                nextPrep: 'Sign up for Court Sage (Research) for Stage 3.',
              },
              {
                label: 'Stage 3',
                title: 'Stage 3 — Enhancing Technologies',
                macro: 'Preparation Week',
                dayOffset: 2,
                buff: 'King applies the Research King’s Rights buff from 04:00 UTC today.',
                doList: [
                  'Participate in Starfall Vein 1 time → +3,000,000',
                  'Consume 1h of research speed-ups → +18,000',
                  'Increase technology power (including Research, Facility, and Animal Research) by 1 → +60',
                ],
                nextPrep: 'Sign up for Tactical Master (Unit Training) for Stage 4.',
              },
              {
                label: 'Stage 4',
                title: 'Stage 4 — Unit Training',
                macro: 'Preparation Week',
                dayOffset: 3,
                buff: 'King applies the Unit Training King’s Rights buff from 04:00 UTC today.',
                doList: [
                  'Initiate 1 legendary merchant ship trade → +1,000,000',
                  'Train units — points scale by tier: Lv.1 +30, Lv.2 +50, Lv.3 +70, Lv.4 +100, Lv.5 +160, Lv.6 +280',
                ],
                nextPrep:
                  'Farm RSS and/or Iron Meteorite. Optionally sign up for Chief Priest, Court Sage, or Tactical Master for Stage 5.',
              },
              {
                label: 'Stage 5',
                title: 'Stage 5 — Power Boost',
                macro: 'Preparation Week',
                dayOffset: 4,
                buff: 'King applies the Gathering King’s Rights buff from 04:00 UTC today.',
                doList: [
                  'Catch-all day — most of the prior stages’ methods score again:',
                  'Initiate 1 legendary merchant ship trade → +1,000,000',
                  'Craft gear — rare +10,000 · epic +30,000 · legendary +200,000',
                  'Defeat tribes: Lv.1-4 +4,000 → Lv.29-30 +24,000 (per kill)',
                  'Gather 100 resources (except armories) → +10',
                  'Increase building power +1 → +30 · technology power (including Research, Facility, and Animal Research) +1 → +60',
                  'Train or promote units to increase power +1 → +30',
                ],
              },
              {
                label: 'Invasion',
                title: 'Invasion Day',
                macro: 'Invasion',
                dayOffset: 6,
                blurb:
                  'Prep is over — today is the battle. Teleport in at your alliance’s window, group up, and rally objectives. Each server’s top 3 alliances (by prep points) may enter early.',
              },
            ],
          },
        },
        {
          // Merged us+enemy alliance rankings (sorted by prep points), colour-
          // coded with each alliance's projected teleport offset.
          kind: 'prepRankings',
          bind: 'prep',
          titleKey: 'tme.overview.rankings',
        },
      ],
    },

    // ───────────────────────────── SCOUTING ─────────────────────────────
    {
      id: 'research',
      labelKey: 'tme.tabs.research',
      widgets: [
        { kind: 'scoutingGrid', bind: 'research', titleKey: 'tme.research.alliances', options: { show: 'alliances' } },
        { kind: 'scoutingGrid', bind: 'research', titleKey: 'tme.research.players', options: { show: 'players' } },
        { kind: 'tierTable', bind: 'serverTiers', titleKey: 'tme.research.tiers', halfWidth: true },
        { kind: 'depthTable', bind: 'serverDepth', titleKey: 'tme.research.depth', halfWidth: true, ownTitle: true },
      ],
    },

    // ─────────────────────────── BATTLEFIELD ───────────────────────────
    {
      id: 'battlefield',
      labelKey: 'tme.tabs.battlefield',
      widgets: [
        {
          kind: 'cardGrid',
          titleKey: 'tme.battlefield.layout',
          anchor: 'tme-map',
          options: {
            intro:
              'Invasion is fought on a fixed diamond battlefield — the Imperial City (IC) at the centre, four gates on the diagonals, and four towers at the compass points. Each alliance has a designated teleport zone; group up there, then push gates → IC.',
            columns: 2,
            cards: [
              { icon: '🏰', title: 'Imperial City (IC)', color: '#fbbf24', desc: 'The centre objective. After the gates fall, a 4-hour IC contest window begins — holding it decides the war.' },
              { icon: '🚪', title: 'Gates', color: '#60a5fa', desc: 'Four gates ring the IC. Break them with siege first; they are the path from the rally staging into the IC zone.' },
              { icon: '🗼', title: 'Towers', color: '#60a5fa', desc: 'Four towers at the compass points — Sword (N), Arrow (E), Cavalry (S), Pike (W). Assigned per alliance.' },
              { icon: '📍', title: 'Rally zones', color: '#3daa6d', desc: 'Each alliance teleports into its colored zone — rally leaders stage in the outer ring, siege leaders push the inner ring toward the gates.' },
            ],
          },
        },
        {
          kind: 'specTable',
          titleKey: 'tme.battlefield.towers',
          options: {
            intro: 'Tower assignments per alliance (N Sword · E Arrow · S Cavalry · W Pike).',
            columns: [{ header: 'Tower' }, { header: 'Compass' }, { header: 'Priority' }],
            rows: [
              ['Sword', 'North', 'Primary'],
              ['Arrow', 'East', 'Low — contest only on opportunity'],
              ['Cavalry', 'South', 'Primary'],
              ['Pike', 'West', 'Likely conceded on defense; WC1 if Sword secured'],
            ],
          },
        },
        {
          kind: 'specTable',
          titleKey: 'tme.battlefield.siege',
          options: {
            intro:
              'War machines per alliance. Trebuchets & rams hit gates first; after gates fall, remaining siege hunts enemy Krakens (whale citadels). Escalades spread as jump points between gate and IC.',
            columns: [
              { header: 'Trebuchets', align: 'right' },
              { header: 'Rams', align: 'right' },
              { header: 'Escalades', align: 'right' },
            ],
            rows: [['12', '3', '3']],
            footnote:
              'Rams: ~500 dmg/2s (infinite) · Trebs: ~2,500 dmg/3s (50 shots) · Citadel HP ~1.25M. 4-hour build time — once spent, gone. Siege is a DEFENSE tool.',
          },
        },
        {
          kind: 'callouts',
          titleKey: 'tme.battlefield.icRules',
          options: {
            items: [
              { bodyKey: 'tme.battlefield.icRule1' },
              { bodyKey: 'tme.battlefield.icRule2' },
              { bodyKey: 'tme.battlefield.icRule3' },
            ],
          },
        },
      ],
    },
  ],
};
