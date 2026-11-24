import type { EventDashboardConfig } from '@shared/models/event-dashboard-config.model';
import { DESOLATE_MAP } from './desolate.map';

/**
 * Desolate Desert — the SECOND dashboard on the 2.0 config model. It reuses
 * every widget Stormlands uses (header, kingdomBar, roeTable, map, nodeControl,
 * timeline, specTable, scheduleWindows, scoutingGrid, tierTable, depthTable,
 * cardGrid, achievements) — only the config + data differ. This is the proof
 * that a new KvK = new config + new JSON, no new component code (the sole new
 * widget, the interactive map, is shared infrastructure built separately).
 *
 * CONTENT POLICY (same as Stormlands): reference prose/tables carried VERBATIM
 * from dashboards/desolate_desert.html; only chrome lives in i18n keys; live
 * data (points, rosters, diplomacy, kingdoms) binds to the normalized EventData.
 *
 * Tabs mirror 1.0: Overview · Scouting · Points · PvE Guide.
 */
export const DESOLATE_CONFIG: EventDashboardConfig = {
  slug: 'desolate',
  kvkTheme: 'desolate',
  titleKey: 'desolate.title',
  subtitleKey: 'desolate.subtitle',
  header: {
    backgroundAsset: 'assets/kvk-bg-desolate.jpg',
    timezone: 'UTC+0',
    fightTimeLabelKey: 'desolate.header.aaru',
    calendarStub: true,
    vsAfterIndex: 1,
    buttons: [
      { glyph: '📜', titleKey: 'desolate.header.jumpObjectives', jumpToTab: 'overview', jumpToAnchor: 'daily-objectives' },
      { glyph: '❓', titleKey: 'desolate.header.whatIs', help: true },
    ],
    help: {
      titleKey: 'desolate.header.whatIs',
      image: 'assets/desolate-map.jpg',
      body: 'Desolate Desert is a four-kingdom land war on a shared desert map: four servers start in the corners and fight inward toward the central Aaru Palace. Alliances build a Stronghold and expand with connected flags, capturing Mountain Fort gates, Pillar Cities (buffs + Placer Gold), and Towers of Rotation. The map opens zone by zone (Waste Land → Forbidden Zone → Eternal Realm), climaxing in the Aaru Palace showdown. Most Desert Points wins — and PvE (gathering, tribes, explorations, Tower damage) matters as much as PvP.',
    },
    badge: {
      labelKey: 'desolate.header.tower',
      liveLabelKey: 'desolate.header.towerLive',
      glyph: '🗼',
      windows: [
        { startMin: 300, endMin: 420 },
        { startMin: 780, endMin: 900 },
        { startMin: 1260, endMin: 1380 },
      ],
      startDate: '2026-09-30',
      endDate: '2026-10-02',
      lockedBeforeKey: 'desolate.header.towerBefore',
      lockedAfterKey: 'desolate.header.towerAfter',
      jumpToTab: 'overview',
      jumpToAnchor: 'tower-schedule',
    },
  },
  mapGeometry: DESOLATE_MAP,
  dataSource: { kind: 'supabase', typeSlug: 'desolate' },
  tabs: [
    // ───────────────────────────── OVERVIEW ─────────────────────────────
    {
      id: 'overview',
      labelKey: 'desolate.tabs.overview',
      widgets: [
        {
          kind: 'roeTable',
          bind: 'diplomacy',
          titleKey: 'desolate.overview.roe',
          options: {
            columns: [
              { key: 'openField', label: 'Open Field' },
              { key: 'riverland', label: 'Peaceful Riverland' },
              { key: 'farms', label: 'Farms' },
              { key: 'citadels', label: 'Citadels' },
              { key: 'citiesGates', label: 'Cities / Gates' },
            ],
          },
        },
        {
          kind: 'map',
          bind: 'mapViews',
          titleKey: 'desolate.overview.map',
          options: { geometry: DESOLATE_MAP },
        },
        {
          kind: 'nodeControl',
          bind: 'mapView',
          titleKey: 'desolate.overview.nodeControl',
          collapsible: true,
          defaultOpen: false,
        },
        {
          kind: 'timeline',
          bind: 'meta',
          titleKey: 'desolate.overview.timeline',
          options: {
            zones: [
              { id: 'mm', label: 'MM', bright: '#94a3b8', dark: '#3a4256' },
              { id: 'z1', label: 'Z1', bright: '#d4a574', dark: '#5a4a30' },
              { id: 'z2', label: 'Z2', bright: '#7c3aed', dark: '#2f1d52' },
              { id: 'z3', label: 'Z3', bright: '#f59e0b', dark: '#5f3e0a' },
            ],
            // eventStart = the single MATCHMAKING day (Sunday, dayOffset 0);
            // competition opens Monday, so Day 1 (Strongholds) = +1.
            stages: [
              { dayLabel: 'Sun', label: 'Matchmaking', zone: 'mm', dayOffset: 0 },
              { dayLabel: 'Day 1', label: 'Strongholds in Z1', zone: 'z1', dayOffset: 1 },
              { dayLabel: 'Day 2', label: 'Z2 Gates Open & Pillar Cities', zone: 'z2', dayOffset: 2 },
              { dayLabel: 'Day 3–5', label: 'L/R Eye Gates Open & Tower of Rotation', zone: 'z2', dayOffset: 3 },
              { dayLabel: 'Day 6', label: 'Z3 Gates Open', zone: 'z3', dayOffset: 6 },
              { dayLabel: 'Day 7', label: 'Aaru Fight', zone: 'z3', dayOffset: 7 },
            ],
          },
        },
        {
          kind: 'specTable',
          titleKey: 'desolate.overview.objectives',
          anchor: 'daily-objectives',
          options: {
            intro: 'Resets 00:00 UTC daily. Track your own progress toward each target.',
            columns: [{ header: 'Objective' }, { header: 'Daily Target', align: 'right', color: '#f5731f' }, { header: 'Notes' }],
            rows: [
              ['Tower of Rotation', '0 / 5M', 'Damage Tower guardians (opens 00:00 UTC Day 3)'],
              ['Gather Resources', '0 / 500K', 'Gather within the DD map'],
              ['Tribal Eliminations', '0 / 200K', 'Kill Lv.31-35 tribes inside DD'],
              ['Exploration', '0 / 400K', 'Daily exploration quests'],
              ['Ancient Dunes', '0 / 6M', 'DD special explorations'],
              ['Pillar City', 'Unlimited', 'Scales with Pillar Cities your alliance controls that day'],
              ['Battle', 'Unlimited', 'Unlimited — scales with eliminations you achieve'],
            ],
          },
        },
        {
          kind: 'scheduleWindows',
          titleKey: 'desolate.overview.tower',
          anchor: 'tower-schedule',
          options: {
            intro:
              'The alliance holding a Tower of Rotation triggers it each window. Troops in range earn 200K pts/min; defeating a guardian = 100K pts. Each window is 40 slots (~3 min each); level ticks up per slot.',
            windows: [
              { label: '05:00 – 07:00 UTC', startMin: 300, endMin: 420 },
              { label: '13:00 – 15:00 UTC', startMin: 780, endMin: 900 },
              { label: '21:00 – 23:00 UTC', startMin: 1260, endMin: 1380 },
            ],
            footnote:
              'Runs Day 3–5 (Wed–Sat), 05:00 / 13:00 / 21:00 UTC, 2 hrs each. Spawns Silent Guardians (basic) and Echoing Phantoms (tougher). Chests drop up to 10/day; Gold Chests up to 5 every 10 levels.',
            startDate: '2026-09-30',
            endDate: '2026-10-02',
            lockGlyph: '🗼',
            lockedBefore: 'Tower of Rotation opens Day 3 (Sep 30)',
            lockedAfter: 'The Tower of Rotation stage is over (ran Day 3–5).',
          },
        },
      ],
    },

    // ───────────────────────────── SCOUTING ─────────────────────────────
    {
      id: 'research',
      labelKey: 'desolate.tabs.research',
      widgets: [
        { kind: 'scoutingGrid', bind: 'research', titleKey: 'desolate.research.alliances', options: { show: 'alliances' } },
        { kind: 'scoutingGrid', bind: 'research', titleKey: 'desolate.research.players', options: { show: 'players' } },
        { kind: 'tierTable', bind: 'serverTiers', titleKey: 'desolate.research.tiers' },
        { kind: 'depthTable', bind: 'serverDepth', titleKey: 'desolate.research.depth' },
      ],
    },

    // ───────────────────────────── POINTS ─────────────────────────────
    {
      id: 'points',
      labelKey: 'desolate.tabs.points',
      widgets: [
        {
          kind: 'specTable',
          titleKey: 'desolate.points.sources',
          collapsible: true,
          defaultOpen: false,
          options: {
            columns: [{ header: 'Activity' }, { header: 'Points Earned', align: 'right', color: '#f5731f' }],
            rows: [
              ['Gather 100 resources in DD', '15 pts'],
              ['Defeat Lv.31-35 tribe', '13.5K pts'],
              ['Complete exploration quest', '100K pts'],
              ['Complete Ancient Dunes quest', '200K / 500K / 1M pts'],
              ['Hold Lv.7 city (per ally per min)', '1K pts/min'],
              ['Troops in Tower of Rotation range', '200K pts/min'],
              ['Defeat a Tower Guardian', '100K pts'],
              ['Hold Aaru Palace (per ally per min)', '300K pts/min'],
              ['Damage Aaru Guardian (per 10K dmg)', '8K pts'],
              ['Win Aaru Palace showdown', '20B pts (kingdom)'],
              ['Gravely wound enemy unit', '1-36 pts (by level)'],
              ['Defeat enemy unit', '5x wound pts'],
            ],
          },
        },
        {
          kind: 'scoreboard',
          bind: 'alliancePoints',
          titleKey: 'desolate.points.alliances',
          options: { rowType: 'alliance' },
        },
        {
          kind: 'specTable',
          titleKey: 'desolate.points.nodeYields',
          collapsible: true,
          defaultOpen: false,
          options: {
            columns: [
              { header: 'Node' },
              { header: 'First-capture bonus', align: 'right', color: '#f5731f' },
              { header: 'Generation /h', align: 'right', color: '#3daa6d' },
            ],
            rows: [
              ['Gate / Dock — Z1→Z2', '100,000', '+3,000'],
              ['Gate / Dock — Left/Right Eye (Z2→Z2)', '150,000', '+4,000'],
              ['Gate / Dock — Z2→Z3', '400,000', '+8,000'],
              ['Pillar City', '300,000', '+8,000'],
              ['Aaru Palace', '—', '—'],
              ['Tower of Rotation', '—', '—'],
            ],
          },
        },
        {
          // Map-derived: gates/pillars/gen come from mapView.holdings; the
          // accrued balance + flags from tracked placer data.
          kind: 'placerBalances',
          titleKey: 'desolate.points.balances',
        },
        {
          kind: 'specTable',
          titleKey: 'desolate.points.flagCost',
          collapsible: true,
          defaultOpen: false,
          options: {
            intro: 'Placer Gold cost per flag, by how many an alliance has already built. Cost rises every 10 flags. Each cell = cost of the next flag while in that band.',
            columns: [
              { header: 'Flags built' },
              { header: 'Zone 1', align: 'right', color: '#d4a574' },
              { header: 'Zone 2', align: 'right', color: '#a78bfa' },
              { header: 'Zone 3', align: 'right', color: '#f59e0b' },
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
          // Progress derived from the fewest inputs: flags (placer), pillars/
          // stronghold (live map), points (alliancePoints). Only Tower Master +
          // Crowned in Aaru need manual `cur` (not knowable from the map).
          kind: 'achievements',
          titleKey: 'desolate.points.achievements',
          options: {
            columns: ['eRa', 'Myt', 'REU', 'FUN'],
            achievements: [
              { name: 'Desert Roots', req: 'Build alliance stronghold', target: 1, personal: '100K Desert Points', derive: 'stronghold' },
              { name: 'Pioneer the Frontier I', req: 'Build 5 alliance flags', target: 5, personal: '200K Desert Points', derive: 'flags' },
              { name: 'Pioneer the Frontier II', req: 'Build 10 alliance flags', target: 10, personal: '500K Desert Points', derive: 'flags' },
              { name: 'Pioneer the Frontier III', req: 'Build 15 alliance flags', target: 15, personal: '800K Desert Points', derive: 'flags' },
              { name: 'Pioneer the Frontier IV', req: 'Build 20 alliance flags', target: 20, personal: '1.2M Desert Points', derive: 'flags' },
              { name: 'Siege and Plunder I', req: 'Occupy 1 Lv.7 city (Pillar City)', target: 1, personal: '500K Desert Points', derive: 'pillars' },
              { name: 'Desert Treasure I', req: 'Alliance Desert Points', target: 160000000, personal: '5M Desert Points', derive: 'points' },
              { name: 'Desert Treasure II', req: 'Alliance Desert Points', target: 320000000, personal: '10M Desert Points', derive: 'points' },
              { name: 'Desert Treasure III', req: 'Alliance Desert Points', target: 640000000, personal: '20M Desert Points', derive: 'points' },
              { name: 'Tower Master I', req: 'Occupy Tower + Peaceful Riverland pts', target: 4000000, personal: '10M Desert Points', cur: { eRa: 4000000, FUN: 0, Myt: 0, REU: 4000000 } },
              { name: 'Crowned in Aaru', req: 'Occupy Aaru Palace + occupation pts', target: 8000000, personal: '20M Desert Points', cur: { eRa: 0, FUN: 0, Myt: 0, REU: 0 } },
            ],
          },
        },
      ],
    },

    // ───────────────────────────── PVE GUIDE ─────────────────────────────
    {
      id: 'pve',
      labelKey: 'desolate.tabs.pve',
      widgets: [
        {
          kind: 'cardGrid',
          titleKey: 'desolate.pve.help',
          options: {
            intro:
              'PvE players are incredibly valuable to the kingdom’s success. You don’t need to fight other players to make a big impact. As long as you’re doing the following, you are being productive for the server:',
            columns: 1,
            cards: [
              { icon: '🚩', title: 'Reinforce Flags & Strongholds', color: '#22c55e', desc: 'Reinforcing a flag or stronghold being built reduces construction time significantly. This is critical for rapid expansion.' },
              { icon: '🗺️', title: 'Complete Daily Explorations (6/6)', color: '#22c55e', desc: 'Do all 6 daily DD exploration quests. Each one grants 100K Desert Points.' },
              { icon: '⚔️', title: 'Burn Stamina on DD Tribes', color: '#22c55e', desc: 'Kill Lv.31-35 tribes within the Desolate Desert map (not home map). 13.5K Desert Points per tribe.' },
              { icon: '⛏️', title: 'Gather Within DD Map', color: '#22c55e', desc: 'Every 100 units gathered in DD = 15 Desert Points. Use the Desert Gathering Center for speed boost + attack immunity.' },
              { icon: '🗼', title: '5M Damage in Tower of Rotation', color: '#22c55e', desc: 'Hit your daily 5M damage target on Tower guardians. Troops in Tower range earn 200K pts/min. Defeating a guardian = 100K pts.' },
            ],
          },
        },
        {
          kind: 'cardGrid',
          titleKey: 'desolate.pve.zones',
          options: {
            columns: 1,
            cards: [
              { title: 'Waste Land', color: '#d4a574', badge: 'Unlocks Day 1', desc: 'Starting zone. Build stronghold adjacent to Mountain Fort, then push into Z2.' },
              { title: 'Forbidden Zone', color: '#7c3aed', badge: 'Unlocks Day 2', desc: 'Access via Mountain Forts/Docks. Pillar Cities here. Tower of Rotation. Flags cost more but higher durability.' },
              { title: 'Eternal Realm', color: '#f59e0b', badge: 'Unlocks Day 6', desc: 'Final zone. Access via Forbidden Zone Mountain Forts. Aaru Palace located here.' },
            ],
          },
        },
        {
          kind: 'cardGrid',
          titleKey: 'desolate.pve.mechanics',
          options: {
            columns: 2,
            cards: [
              { icon: '💰', title: 'Placer Gold', color: '#f59e0b', desc: 'Earned from holding Pillar Cities + lump sum from first capture of gates and Pillar Cities. Spent on building flags and structures in higher zones. Key resource for expansion.' },
              { icon: '🎯', title: 'Desert Points', color: '#f59e0b', desc: 'Victory currency. Earned from holding nodes, PvE events, Aaru Palace. Kingdom with more points wins + picks Aaru time.' },
              { icon: '🗺️', title: 'Territory Control', color: '#f59e0b', desc: 'Flags must maintain an active connection back to a Stronghold or Substronghold. Disconnected flags become inactive. Higher zone flags cost more Placer Gold but are more durable.' },
            ],
          },
        },
        {
          kind: 'cardGrid',
          titleKey: 'desolate.pve.tower',
          options: {
            columns: 1,
            cards: [
              { icon: '🕐', title: 'When', desc: 'Wed–Sat from Day 3 · 05:00 / 13:00 / 21:00 UTC · 2 hrs each' },
              { icon: '📶', title: 'Levels', desc: 'Each window = 40 slots (~3 min). Level ticks up per slot; leftover NPCs reset.' },
              { icon: '👹', title: 'Enemies', desc: 'Silent Guardians (basic) and Echoing Phantoms (tougher, higher rewards).' },
              { icon: '🛡️', title: 'Hold it', desc: 'Need alliance land adjacent. Occupier gets buffs. Tower Master = 4M pts held.' },
              { icon: '🎁', title: 'Chests', desc: 'Drops from enemies — up to 10/day. Gold Chests are best; up to 5 every 10 levels.' },
            ],
          },
        },
        {
          kind: 'cardGrid',
          titleKey: 'desolate.pve.buildings',
          options: {
            columns: 3,
            cards: [
              { icon: '🏰', title: 'Desert Stronghold', desc: 'Foundation of alliance lands. Built in Waste Land. All flags must connect back to a Stronghold or Substronghold to remain active.' },
              { icon: '🏯', title: 'Desert Substronghold', desc: 'Built in the Forbidden Zone. Must be connected to main Stronghold to start construction, but once started does not need to remain connected.' },
              { icon: '🚩', title: 'Desert Flag', desc: 'Built on tiles adjacent to active connections (a Stronghold, Substronghold, or line of flags connecting back to one). Max = alliance tech limit. Higher cost in Z2/Z3 but more durable.' },
              { icon: '⛏️', title: 'Desert Gathering Center', desc: 'Reduces gathering time. Grants attack immunity while gathering. Max 1 per alliance. Must connect back to alliance stronghold.' },
              { icon: '📦', title: 'Desert Supply Depot', desc: 'Troops spawn here. Can relocate once. Max 1 per alliance. Damage increases as more are built in higher zones.' },
            ],
          },
        },
      ],
    },
  ],
};
