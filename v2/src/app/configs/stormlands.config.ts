import type { EventDashboardConfig } from '@shared/models/event-dashboard-config.model';
import { STORMLANDS_MAP } from './stormlands.map';

/**
 * Stormlands — first dashboard on the 2.0 config model and the reference for
 * every other event.
 *
 * CONTENT POLICY: all event reference prose/tables (PvE guide, glossary,
 * weapons, point sources, battle tiers, debuff scaling, timeline/schedule
 * labels) is carried VERBATIM from the 1.0 dashboard
 * (dashboards/stormlands.html) — do not reword it. Only UI chrome (tab labels,
 * table/column headers, section titles) lives in i18n keys. Live data (kingdom
 * points, scouting rosters, alliance points, tiers, depth) binds to paths in
 * the normalized EventData.
 *
 * Tabs mirror 1.0: Overview · Scouting · Points · PvE Guide.
 */

export const STORMLANDS_CONFIG: EventDashboardConfig = {
  slug: 'stormlands',
  kvkTheme: 'stormlands',
  titleKey: 'stormlands.title',
  // Single grey line ABOVE the title (1.0). No separate tag line.
  subtitleKey: 'stormlands.subtitle',
  header: {
    // Template-level header chrome only. Instance data — the server crests and
    // the Zeus fight time — is derived from the data file (meta.kingdoms /
    // meta.zeusTime) by EventHeaderComponent, not listed here.
    backgroundAsset: 'assets/kvk-bg-stormlands.jpg',
    timezone: 'UTC+0',
    fightTimeLabelKey: 'stormlands.header.zeus',
    calendarStub: true,
    vsAfterIndex: 1,
    buttons: [
      { glyph: '📜', titleKey: 'stormlands.header.jumpObjectives', jumpToTab: 'overview', jumpToAnchor: 'daily-objectives' },
      { glyph: '❓', titleKey: 'stormlands.header.whatIs', help: true },
    ],
    help: {
      titleKey: 'stormlands.header.whatIs',
      image: 'assets/stormlands-map.png',
      body: 'Stormlands is a 7-day, four-kingdom land grab on a shared desert map. Alliances build a Stronghold and expand outward with connected flags, capturing gates/docks and Energy Cities for Storm Energy and Storm Points. The map opens zone by zone (Eroded Wasteland → Eroded Forbidden Zone → Eternal Realm), climaxing in the Temple of Zeus fight on Day 7. Most points wins — and PvE contribution (gathering, tribes, explorations, Altar damage) matters as much as PvP. This is the final event of the season.',
    },
    badge: {
      labelKey: 'stormlands.header.incursion',
      liveLabelKey: 'stormlands.header.incursionLive',
      glyph: '🐉',
      windows: [
        { startMin: 300, endMin: 360 },
        { startMin: 780, endMin: 840 },
        { startMin: 1260, endMin: 1320 },
      ],
      startDate: '2026-11-05',
      endDate: '2026-11-09',
      lockedBeforeKey: 'stormlands.header.incursionBefore',
      lockedAfterKey: 'stormlands.header.incursionAfter',
      jumpToTab: 'overview',
      jumpToAnchor: 'incursion-schedule',
    },
  },
  mapGeometry: STORMLANDS_MAP,
  dataSource: { kind: 'supabase', typeSlug: 'stormlands' },
  tabs: [
    // ───────────────────────────── OVERVIEW ─────────────────────────────
    {
      id: 'overview',
      labelKey: 'stormlands.tabs.overview',
      widgets: [
        // Rules of Engagement first (matches 1.0 Overview order). The persistent
        // kingdom-standings bar lives above the tabs (see EventDashboardPage),
        // so there's no separate kingdom scoreboard here.
        {
          // Rows come from the data file's `diplomacy` (per-occurrence). Only
          // the front columns — the same every Stormlands — live here.
          kind: 'roeTable',
          bind: 'diplomacy',
          titleKey: 'stormlands.overview.roe',
          options: {
            columns: [
              { key: 'openField', label: 'Open Field' },
              { key: 'riverland', label: 'Storm Erosion' },
              { key: 'farms', label: 'Farms' },
              { key: 'citadels', label: 'Citadels' },
              { key: 'citiesGates', label: 'Cities / Gates' },
            ],
          },
        },
        {
          kind: 'map',
          bind: 'mapViews',
          titleKey: 'stormlands.overview.map',
          options: { geometry: STORMLANDS_MAP },
        },
        {
          // Buffs (Attack/Defense) derived from the map's energy-city ownership.
          kind: 'nodeControl',
          bind: 'mapView',
          titleKey: 'stormlands.overview.nodeControl',
          collapsible: true,
          defaultOpen: false,
        },
        {
          // Bound to meta: stage dates are computed from meta.eventStart +
          // each stage's dayOffset, so a new occurrence needs no config change.
          kind: 'timeline',
          bind: 'meta',
          titleKey: 'stormlands.overview.timeline',
          options: {
            zones: [
              { id: 'z1', label: 'Zone 1', bright: '#c9a878', dark: '#5a4a30' },
              { id: 'z2', label: 'Zone 2', bright: '#5b9bd8', dark: '#273f5a' },
              { id: 'z3', label: 'Zone 3', bright: '#ef9f6b', dark: '#5f3e26' },
              { id: 'z4', label: 'Zone 4', bright: '#b06bd0', dark: '#432854' },
              { id: 'temple', label: 'Temple', bright: '#8fc4f0', dark: '#2a3f54' },
            ],
            stages: [
              { dayLabel: 'Day 1', label: 'Eroded Wasteland', zone: 'z1', dayOffset: 0 },
              { dayLabel: 'Day 2–5', label: 'Zone 2 — Forts & Cities', zone: 'z2', dayOffset: 1 },
              { dayLabel: 'Day 6–8', label: 'Zone 3 — Storm Eye', zone: 'z3', dayOffset: 5 },
              { dayLabel: 'Day 9–11', label: 'Zone 4 — Oblivion', zone: 'z4', dayOffset: 8 },
              { dayLabel: 'Day 12', label: 'Zeus Battle I', zone: 'temple', dayOffset: 11 },
              { dayLabel: 'Day 13–14', label: 'Zeus Battle II', zone: 'temple', dayOffset: 12 },
            ],
          },
        },
        {
          kind: 'specTable',
          titleKey: 'stormlands.overview.objectives',
          anchor: 'daily-objectives',
          options: {
            intro: 'Resets 00:00 UTC daily. Track your own progress toward each target.',
            columns: [{ header: 'Objective' }, { header: 'Daily Target', align: 'right', color: '#ef9f6b' }, { header: 'Notes' }],
            rows: [
              ['Monster Elimination', '0 / 2M', 'Defeat Storm Wolves & world monsters inside Stormlands'],
              ['Gathering', '0 / 6M', 'Gather within the Stormlands map (20 pts / 100 resources)'],
              ['Storm Erosion', '0 / 15M', 'Damage Erosion Beasts & Giants during Storm Erosion (1:1 pts per dmg)'],
              ['Storm Weapons', 'Unlimited', 'Upgrade bonus scales with weapon level (Lv1 +1M, +500k each level)'],
              ['Altar Offerings', 'Unlimited', 'Storm offering (100 offer) earns 80K pts each'],
              ['Ancient Storm Monument', 'Unlimited', 'Daily exploration quests'],
              ['Battle', 'Unlimited', 'Unlimited — scales with eliminations you achieve'],
            ],
          },
        },
        {
          kind: 'scheduleWindows',
          titleKey: 'stormlands.overview.erosion',
          anchor: 'erosion-schedule',
          options: {
            intro:
              'The alliance holding a Storm Altar triggers Storm Erosion daily. Our server default window is 19:00 UTC — be online to burst the waves. Damage pays 1:1 in Storm Points (15M daily cap) and drops Storm Fragments.',
            windows: [{ label: '19:00 – 20:00 UTC', startMin: 1140, endMin: 1200 }],
            footnote:
              'Default 19:00 UTC (the Altar controller can change the slot). Opens Day 3; triggerable once every 2 days per Altar.',
            startDate: '2026-11-04',
            endDate: '2026-11-15',
            lockGlyph: '⚡',
            lockedBefore: 'Storm Erosion opens Day 3 (Nov 4)',
            lockedAfter: 'The contest stage is over.',
          },
        },
        {
          kind: 'scheduleWindows',
          titleKey: 'stormlands.overview.incursion',
          anchor: 'incursion-schedule',
          options: {
            intro:
              'Three 1-hour Hydra windows daily. Z2 gates open during each — march freely. Only the FINAL HIT scores: 200M Storm Points to the alliance + server that lands it.',
            windows: [
              { label: '05:00 – 06:00 UTC', startMin: 300, endMin: 360 },
              { label: '13:00 – 14:00 UTC', startMin: 780, endMin: 840 },
              { label: '21:00 – 22:00 UTC', startMin: 1260, endMin: 1320 },
            ],
            footnote:
              'Runs Day 4–8 (Nov 5–9), 05:00 / 13:00 / 21:00 UTC. Enemies use the open gates to disrupt — steal last hits and linger after to hit gatherers.',
            startDate: '2026-11-05',
            endDate: '2026-11-09',
            lockGlyph: '🐉',
            lockedBefore: 'Storm Incursion begins Day 4 (Nov 5)',
            lockedAfter: 'Storm Incursion has ended (ran Day 4–8)',
          },
        },
      ],
    },

    // ───────────────────────────── SCOUTING ─────────────────────────────
    {
      id: 'research',
      labelKey: 'stormlands.tabs.research',
      widgets: [
        { kind: 'scoutingGrid', bind: 'research', titleKey: 'stormlands.research.alliances', options: { show: 'alliances' } },
        { kind: 'scoutingGrid', bind: 'research', titleKey: 'stormlands.research.players', options: { show: 'players' } },
        { kind: 'tierTable', bind: 'serverTiers', titleKey: 'stormlands.research.tiers' },
        {
          // Single table with an in-widget Power|Merits toggle (1.0 parity).
          kind: 'depthTable',
          bind: 'serverDepth',
          titleKey: 'stormlands.research.depth',
        },
      ],
    },

    // ───────────────────────────── POINTS ─────────────────────────────
    {
      id: 'points',
      labelKey: 'stormlands.tabs.points',
      widgets: [
        {
          kind: 'specTable',
          titleKey: 'stormlands.points.sources',
          collapsible: true,
          defaultOpen: false,
          options: {
            columns: [{ header: 'Activity' }, { header: 'Points Earned', align: 'right', color: '#ef9f6b' }],
            rows: [
              ['Gather 100 resources in Stormlands', '20 pts'],
              ['Defeat Storm Wolf Lv.31–35', '13.5K pts'],
              ['Defeat Storm Wolf Lv.36–40', '15K pts'],
              ['Defeat Storm Wolf Lv.41–45', '16.5K pts'],
              ['Damage Erosion Beast/Giant (Storm Erosion)', '1 pt / dmg (1:1)'],
              ['Storm Altar offering (100 offer)', '80K pts'],
              ['Storm Weapon upgrade (per level)', '+1M at Lv1, +500K each level'],
              ['Ancient Storm Monument (exploration)', 'daily exploration pts'],
              ['Storm Incursion — damage the Storm Hydra (Day 4–8)', 'rewards + Storm Points; bonus for final blow'],
              ['Hold Temple of Zeus / core', 'TBD'],
              ['Gravely wound enemy unit', '1–36 pts (by tier, see table)'],
              ['Defeat enemy unit', '5–180 pts (by tier, see table)'],
              ['Lose your own unit', '2–72 pts (by tier, see table)'],
            ],
          },
        },
        {
          kind: 'specTable',
          titleKey: 'stormlands.points.caps',
          options: {
            intro:
              'Per player, reset 00:00 UTC. Capped objectives stop earning once the cap is hit; uncapped ones keep scaling.',
            columns: [{ header: 'Objective' }, { header: 'Daily Cap', align: 'right', color: '#ef9f6b' }, { header: 'Notes' }],
            rows: [
              ['Monster Elimination', '2M', 'Storm Wolves & world monsters inside Stormlands'],
              ['Gathering', '6M', '20 pts / 100 resources gathered in Stormlands'],
              ['Storm Erosion', '15M', '1:1 pts per point of damage to Erosion Beasts/Giants'],
              ['Storm Weapons', 'Uncapped', 'Upgrade bonus scales with level'],
              ['Altar Offerings', 'Uncapped', '100 offer = 80K pts'],
              ['Ancient Storm Monument', 'Uncapped', 'Daily exploration quests'],
              ['Battle (PvP)', 'Uncapped', 'Scales with eliminations / wounds / losses'],
            ],
          },
        },
        {
          kind: 'specTable',
          titleKey: 'stormlands.points.battle',
          options: {
            intro:
              'Battle (PvP) is uncapped. You score three ways in a fight — eliminating enemy units, gravely wounding them, and even losing your own troops.',
            columns: [
              { header: 'Tier' },
              { header: 'Eliminate', align: 'right', color: '#ef9f6b' },
              { header: 'Gravely Wound', align: 'right' },
              { header: 'Own Loss', align: 'right', color: '#8fc4f0' },
            ],
            rows: [
              ['T1', '5', '1', '2'],
              ['T2', '10', '2', '4'],
              ['T3', '15', '3', '6'],
              ['T4', '20', '4', '8'],
              ['T5', '30', '6', '12'],
              ['T6', '45', '9', '18'],
              ['T7', '75', '15', '30'],
              ['T8', '120', '24', '48'],
              ['T9', '180', '36', '72'],
            ],
          },
        },
        {
          kind: 'cardGrid',
          titleKey: 'stormlands.points.weapons',
          options: {
            intro:
              'Four weapons that share one level — upgrading any one upgrades all (max Lv20). All four share the same three scaling stats; each weapon’s only difference is a unique flat buff. Only one weapon can be active at a time, so pick the flat buff that fits the fight.',
            columns: 2,
            cards: [
              { icon: '🔨', title: 'Storm Hammer', color: '#ef9f6b', desc: 'Flat buff: Durability Damage Increase +20%' },
              { icon: '🛡️', title: 'Storm Buckler', color: '#ef9f6b', desc: 'Flat buff: Reduces Storm-Power damage to citadels & troops −20%' },
              { icon: '🪖', title: 'Storm Shield', color: '#ef9f6b', desc: 'Flat buff: Reduces durability damage taken from Storm Machines −20%' },
              { icon: '🗡️', title: 'Storm Dagger', color: '#ef9f6b', desc: 'Flat buff: +30% damage when your Storm Power exceeds the monster’s' },
            ],
          },
        },
        {
          kind: 'specTable',
          titleKey: 'stormlands.points.weaponScaling',
          options: {
            columns: [
              { header: 'Level' },
              { header: 'Storm Power', align: 'right', color: '#ef9f6b' },
              { header: 'All-Unit Atk / Def', align: 'right' },
              { header: 'Daily Pts', align: 'right' },
              { header: 'Cost', align: 'right' },
              { header: 'Currency', align: 'right', color: '#8fc4f0' },
            ],
            rows: [
              ['Locked', '—', '—', '—', '1,000', 'Fragments'],
              ['Lv1', '+100', '+10%', '+1M', '500', 'Fragments'],
              ['Lv2', '+200', '+11%', '+1.5M', '~1,000', 'Fragments'],
              ['Lv3', '+300', '+12%', '+2M', '~1,000', 'Fragments'],
              ['Lv5', '+500', '+14%', '+3M', '~1,000', 'Fragments'],
              ['Lv7', '+700', '+16%', '+4M', '~1,000', 'Fragments'],
              ['Lv10', '+1,000', '+19%', '+5.5M', '~1,000', 'Fragments'],
              ['Lv11', '+1,100', '+20%', '+6M', 'TBD', 'Crystals'],
              ['Lv15', '+1,500', '+24%', '+8M', 'TBD', 'Crystals'],
              ['Lv20', '+2,000', '+29%', '+10.5M', 'TBD', 'Crystals'],
            ],
            footnote:
              'Levels 1–10 cost Storm Fragments, levels 11–20 cost Storm Crystals. Known: unlock 1,000 Fragments, Lv1 = 500, Lv2+ ≈ 1,000 each; Lv11+ Crystal amounts TBD. Daily Storm Weapon points: +1M at Lv1, then +500K per level (Lv7 = +3.5M).',
          },
        },
        {
          kind: 'scoreboard',
          bind: 'alliancePoints',
          titleKey: 'stormlands.points.alliances',
          options: { rowType: 'alliance' },
        },
        {
          kind: 'specTable',
          titleKey: 'stormlands.points.flagCost',
          collapsible: true,
          defaultOpen: false,
          options: {
            intro:
              'Storm Energy cost per flag, by how many an alliance has already built. Cost rises every 10 flags. Each cell = cost of the next flag while in that band.',
            columns: [
              { header: 'Flags built' },
              { header: 'Zone 1', align: 'right', color: '#c9a878' },
              { header: 'Zone 2', align: 'right', color: '#2dd4bf' },
              { header: 'Zone 3', align: 'right', color: '#8fc4f0' },
            ],
            rows: [
              ['1 – 9', '5k', '50k', '100k'],
              ['10 – 19', '10k', '100k', '100k'],
              ['20 – 29', '20k', '150k', '200k'],
              ['30 – 39', '30k', '200k', '300k'],
              ['40 – 49', '40k', '250k', '400k'],
            ],
          },
        },
        {
          kind: 'achievements',
          titleKey: 'stormlands.points.achievements',
          options: {
            columns: ['eRa', 'REU', 'Myt', 'AuR'],
            achievements: [
              { name: 'Pioneer The Frontier I', req: 'Build 5 Storm Beacons', target: 5, personal: '20M Storm Points', derive: 'flags', cur: { eRa: 30, REU: 20, Myt: 20 } },
              { name: 'Pioneer The Frontier II', req: 'Build 10 Storm Beacons', target: 10, personal: '40M Storm Points', derive: 'flags', cur: { eRa: 30, REU: 20, Myt: 20 } },
              { name: 'Pioneer The Frontier III', req: 'Build 20 Storm Beacons', target: 20, personal: '60M Storm Points', derive: 'flags', cur: { eRa: 30, REU: 20, Myt: 20 } },
              { name: 'Pioneer The Frontier IV', req: 'Build 30 Storm Beacons', target: 30, personal: '100M Storm Points', derive: 'flags', cur: { eRa: 30, REU: 20, Myt: 20 } },
              { name: 'Pioneer The Frontier V', req: 'Build 50 Storm Beacons', target: 50, personal: '150M Storm Points', derive: 'flags', cur: { eRa: 30, REU: 20, Myt: 20 } },
              { name: 'Siege And Plunder I', req: 'Occupy a city or altar (1)', target: 1, personal: '20M Storm Points', derive: 'pillars', cur: { eRa: 5, REU: 5, Myt: 5 } },
              { name: 'Siege And Plunder II', req: 'Occupy a city or altar (2)', target: 2, personal: '30M Storm Points', derive: 'pillars', cur: { eRa: 5, REU: 5, Myt: 5 } },
              { name: 'Siege And Plunder III', req: 'Occupy a city or altar (3)', target: 3, personal: '50M Storm Points', derive: 'pillars', cur: { eRa: 5, REU: 5, Myt: 5 } },
              { name: 'Siege And Plunder IV', req: 'Occupy a city or altar (4)', target: 4, personal: '70M Storm Points', derive: 'pillars', cur: { eRa: 5, REU: 5, Myt: 5 } },
              { name: 'Siege And Plunder V', req: 'Occupy a city or altar (5)', target: 5, personal: '100M Storm Points', derive: 'pillars', cur: { eRa: 5, REU: 5, Myt: 5 } },
              { name: 'Windrider I', req: 'Alliance Storm Points', target: 4500000000, personal: '100M Storm Points', derive: 'points' },
              { name: 'Windrider II', req: 'Alliance Storm Points', target: 9000000000, personal: '120M Storm Points', derive: 'points' },
              { name: 'Windrider III', req: 'Alliance Storm Points', target: 18000000000, personal: '150M Storm Points', derive: 'points' },
              { name: 'Resist The Erosion I', req: 'Finish Storm Erosion within 20 min', bool: true, personal: '80M Storm Points', cur: { eRa: true, REU: true, Myt: true } },
              { name: 'Resist The Erosion II', req: 'Finish Storm Erosion within 12 min', bool: true, personal: '100M Storm Points', cur: { eRa: true, REU: true, Myt: true } },
              { name: 'Piety I', req: 'Upgrade Storm Altar to Lv2', bool: true, personal: '15M Storm Points', cur: { eRa: true, REU: true, Myt: true } },
              { name: 'Piety II', req: 'Upgrade Storm Altar to Lv4', bool: true, personal: '30M Storm Points', cur: { eRa: true, REU: true, Myt: true } },
              { name: 'Piety III', req: 'Upgrade Storm Altar to Lv6', bool: true, personal: '60M Storm Points', cur: { eRa: true, REU: true, Myt: true } },
              { name: 'Piety IV', req: 'Upgrade Storm Altar to Lv8', bool: true, personal: '100M Storm Points', cur: { eRa: true, REU: true, Myt: true } },
            ],
          },
        },
      ],
    },

    // ───────────────────────────── PVE GUIDE ─────────────────────────────
    {
      id: 'pve',
      labelKey: 'stormlands.tabs.pve',
      widgets: [
        {
          kind: 'cardGrid',
          titleKey: 'stormlands.pve.help',
          options: {
            intro:
              'PvE players are incredibly valuable to the kingdom’s success. You don’t need to fight other players to make a big impact. As long as you’re doing the following, you are being productive for the server:',
            columns: 1,
            cards: [
              { icon: '🚩', title: 'Reinforce Beacons & Strongholds', color: '#22c55e', desc: 'Reinforcing a Storm Beacon or Stronghold being built reduces construction time significantly. This is critical for rapid expansion.' },
              { icon: '🐺', title: 'Hunt Storm Wolves', color: '#22c55e', desc: 'Killing Storm Wolves inside Stormlands yields Storm Energy (up to 2K/day) for your weapon, Storm Fragments (Lv1–10 upgrades), and points: Lv31–35 = 13.5K, Lv36–40 = 15K, Lv41–45 = 16.5K (counts toward the 2M/day Monster Elimination cap).' },
              { icon: '⚡', title: 'Fight in Storm Erosion', color: '#22c55e', desc: 'Damage Erosion Beasts & Giants during the daily Storm Erosion event — 1:1 Storm Points per point of damage, up to the 15M daily cap. Also drops Storm Fragments.' },
              { icon: '⛏️', title: 'Gather Within the Map', color: '#22c55e', desc: 'Every 100 resources gathered in Stormlands = 20 Storm Points (up to 6M/day). Use the Storm Gathering Center for a speed boost + attack immunity.' },
              { icon: '🗺️', title: 'Ancient Storm Monument & Offerings', color: '#22c55e', desc: 'Clear the daily Ancient Storm Monument explorations, and offer at Basic Storm Altars (100 offer = 80K points).' },
              { icon: '🦏', title: 'Rally Storm Rhinos', color: '#22c55e', desc: 'Rallying Storm Rhinos earns Storm Crystals (up to 200/day) for Storm Weapon rank-ups.' },
            ],
          },
        },
        {
          kind: 'cardGrid',
          titleKey: 'stormlands.pve.zones',
          options: {
            columns: 1,
            cards: [
              { title: 'Eroded Wasteland', color: '#c9a878', badge: 'Unlocks Day 1', desc: 'Starting zone. Build your Stronghold and expand with Storm Beacons, then push into Zone 2 through the Wasteland Forts.' },
              { title: 'Eroded Forbidden Zone', color: '#5b9bd8', badge: 'Unlocks Day 2', desc: 'Energy Cities (Storm Energy), Basic Artisan Cities (Storm Machines) and Basic Storm Altars (Storm Erosion). Access via Wasteland Forts.' },
              { title: 'Eternal Storm Eye', color: '#ef9f6b', badge: 'Unlocks Day 6', desc: 'Storm Eye Forts and Advanced Artisan Cities. Regional Storm Power rises — keep your Controlled Storm Power up or take damage.' },
              { title: 'Oblivion Realm', color: '#b06bd0', badge: 'Unlocks Day 9', desc: 'Innermost zone around the Temple. Oblivion Forts, Advanced Energy Storage Cities and the Core Storm Sacred Tower.' },
            ],
          },
        },
        {
          kind: 'cardGrid',
          titleKey: 'stormlands.pve.currencies',
          options: {
            columns: 2,
            cards: [
              { title: 'Storm Energy', color: '#ef9f6b', desc: 'Build & path currency (Desolate Desert’s Placer Gold). From holding Energy Cities + first-capture bonuses, plus up to 2K/day from defeating Storm Wolves. Spent on Storm Beacons and structures. Advanced Energy Storage Cities raise your alliance’s storage cap. (The in-game rules also show a 3K figure — MrSneakyy flagged it as a likely typo; treat 2K/day as the wolf cap.)' },
              { title: 'Storm Points', color: '#f59e0b', desc: 'Victory currency. From PvE, gathering, Storm Erosion, battle and holding nodes. Wolf kills give points too (capped ~2M/day via Monster Elimination). Kingdom with the most wins + picks the Zeus battle time. Over 200K personal = Kingdom ranking rewards at the end.' },
              { title: 'Storm Fragments', color: '#8fc4f0', desc: 'From defeating Storm Wolves + the Storm Erosion event. Upgrade Storm Weapon levels 1–10. You need these AND Crystals or you bottleneck at the Lv10 threshold.' },
              { title: 'Storm Crystals', color: '#5b9bd8', desc: 'Up to 200/day from rallying Storm Rhinos. Upgrade Storm Weapon levels 11–20. Rally rhinos daily or you can’t push weapons past Lv10.' },
              { title: 'Offer', color: '#c9a878', desc: 'Earned at Basic Storm Altars. Offer it back to an Altar to raise its level (more bonuses). 100 offer = 80K Storm Points.' },
              { title: 'Controlled Storm Power', color: '#b06bd0', desc: 'Built via Storm Weapons (+100/level). Each zone has a required value — Zone 2 = 300, Zone 3 = 1,200 — check it before you move up. Below the zone/monster’s Storm Power you take continuous citadel/troop damage and fight PvE worse (see the scaling table below). A node’s dot turns white once you clear the local requirement, red if under. Standing on alliance land (even an unfinished flag) blocks the damage.' },
            ],
          },
        },
        {
          kind: 'specTable',
          titleKey: 'stormlands.pve.debuff',
          options: {
            intro:
              'When your Controlled Storm Power is more than 100 below a zone/region’s (or a monster’s) Storm Power, you suffer the penalties below. They scale additively per 100 of difference — each extra +100 adds another full step. Alliance lands block the Citadel & Troop damage.',
            columns: [
              { header: 'Storm Power Deficit' },
              { header: 'Citadel Damage', align: 'right', color: '#ef9f6b' },
              { header: 'PvE Dmg Taken', align: 'right', color: '#f87171' },
              { header: 'PvE Dmg Dealt', align: 'right', color: '#f87171' },
              { header: 'Troop Damage', align: 'right', color: '#8fc4f0' },
            ],
            rows: [
              ['> 100', '1,000', '+100%', '−50%', '500'],
              ['> 200', '2,000', '+200%', '−60%', '1,000'],
              ['> 300', '3,000', '+300%', '−70%', '1,500'],
              ['> 400', '4,000', '+400%', '−80%', '2,000'],
              ['> 500+', '5,000', '+500%', '−90%', '2,500'],
            ],
            footnote:
              'Example (from in-game): a Storm Power of 100 behind shows Citadel Damage 1000, PvE Damage Taken +100%, PvE Damage Reduction −50%, Troop Damage 500. ‘PvE Dmg Dealt’ is a reduction — more negative is worse.',
          },
        },
        {
          kind: 'cardGrid',
          titleKey: 'stormlands.pve.machines',
          options: {
            intro:
              'Alliances that occupy an Artisan City can build Storm Machines — siege engines deployed on the map to swing PvP fights. Each type has a role: push an enemy position, break their buildings, or anchor a defensive line. Hold the Artisan City to keep building and replacing them.',
            columns: 3,
            cards: [
              { icon: '💥', title: 'Storm Cannons', color: '#ef9f6b', desc: 'Deal area damage to enemy troops on the map. Use them to soften a stack before a rally or to punish massed defenders.' },
              { icon: '🪓', title: 'Storm Trebuchets', color: '#f59e0b', desc: 'Wear down building durability. The siege option for cracking enemy Beacons, Strongholds and contested structures faster.' },
              { icon: '🛡️', title: 'Storm Towers', color: '#5b9bd8', desc: 'Deal heavy damage to anything in range — a stationary defensive anchor to hold alliance land and protect your gates/gatherers.' },
            ],
          },
        },
        {
          kind: 'cardGrid',
          titleKey: 'stormlands.pve.buildings',
          options: {
            columns: 3,
            cards: [
              { icon: '🏰', title: 'Alliance Stronghold', desc: 'Foundation of alliance lands. Built in the Eroded Wasteland. All Storm Beacons must connect back to a Stronghold or Storm Stronghold to stay active.' },
              { icon: '🏯', title: 'Storm Stronghold', desc: 'Forward sub-stronghold (opens Day 5–9). Activate it to build Storm Beacons — and note attacks can only be launched from cities connected to an activated Storm Stronghold.' },
              { icon: '🚩', title: 'Storm Beacon', desc: 'Alliance flag. Built on tiles adjacent to an active connection (Stronghold, Storm Stronghold, or a line of beacons back to one). Costs more Storm Energy in higher zones but more durable.' },
              { icon: '💥', title: 'Storm Cannon', desc: 'Storm Machine from an Artisan City — deals area damage directly to enemy troops on the world map.' },
              { icon: '🪨', title: 'Storm Trebuchet', desc: 'Storm Machine from an Artisan City — steadily wears down building durability.' },
              { icon: '🗼', title: 'Storm Tower', desc: 'Storm Machine from an Artisan City — deals heavy damage to enemies within range to help defend your alliance land.' },
              { icon: '🏥', title: 'Bandage Camp', desc: 'Troops replenish here. With Auto-housing on, retreating troops return to the Bandage Camp instead of the Citadel.' },
              { icon: '⛏️', title: 'Storm Gathering Center', desc: 'One per map. Speeds up gathering, immune to attacks.' },
              { icon: '📦', title: 'Storm Supply Depot', desc: 'Claim Supplies Bounty rewards.' },
              { icon: '🛩️', title: 'Wonder Airdock', desc: 'Fast travel between airdocks across the map.' },
            ],
          },
        },
      ],
    },
  ],
};
