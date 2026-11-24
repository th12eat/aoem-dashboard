import type { EventDashboardConfig } from '@shared/models/event-dashboard-config.model';

/**
 * Behemoth Conquest — a two-server (1v1) cross-server war, sibling to TME. Two
 * servers each raise a Behemoth: a Beast-Taming phase (farm + donate Awaken
 * Runestones to grow yours) then an Attack-Defense phase (cross-server rallies
 * attack the enemy Behemoth while defending your own). Highest total score wins.
 *
 * Reuses the prep-war family widgets (prepTug for the score/purity races) and
 * the generic reference widgets (specTable/cardGrid/scheduleWindows). No
 * interactive node map — the battlefield is a fixed illustration, so mapGeometry
 * is omitted. Content carried VERBATIM from dashboards/behemoth_conquest.html.
 *
 * Tabs mirror 1.0: Overview · Scouting · Beast Taming · Attack-Defense.
 */
export const BEHEMOTH_CONFIG: EventDashboardConfig = {
  slug: 'behemoth',
  kvkTheme: 'behemoth',
  titleKey: 'behemoth.title',
  tagKey: 'behemoth.tag',
  subtitleKey: 'behemoth.subtitle',
  header: {
    backgroundAsset: 'assets/kvk-bg-behemoth.jpg',
    timezone: 'UTC+0',
    calendarStub: true,
    vsAfterIndex: 1,
    eyebrowKey: 'behemoth.header.eyebrow',
    buttons: [
      { glyph: '📜', titleKey: 'behemoth.header.jumpObjectives', jumpToTab: 'overview', jumpToAnchor: 'daily-objectives' },
      { glyph: '❓', titleKey: 'behemoth.header.whatIs', help: true },
    ],
    help: {
      titleKey: 'behemoth.header.whatIs',
      body: 'Two servers each raise a Behemoth. During Beast Taming you farm Awaken Runestones (Trial of Scion + Cultivation) and donate them to grow yours from Juvenile → Adult — donations also give 10 personal points each. Then in Attack-Defense, cross-server rallies attack the enemy Behemoth while defending your own. Highest total score wins. Milestones (stacks, the kill) dwarf chip damage — be online for the invasion windows.',
    },
    // Staged countdown: Matchmaking → Beast Taming → Attack-Defense → Ends.
    stages: [
      { id: 'taming', fromLabelKey: 'behemoth.stage.tamingStart', toLabelKey: 'behemoth.stage.atkDefStart', liveLabelKey: 'behemoth.stage.tamingLive', startDate: '2026-10-27', endDate: '2026-10-30' },
      { id: 'atkdef', fromLabelKey: 'behemoth.stage.atkDefStart', toLabelKey: 'behemoth.stage.ends', liveLabelKey: 'behemoth.stage.atkDefLive', startDate: '2026-10-30', endDate: '2026-11-01' },
    ],
    // Trial of Scion — four fixed 30-min windows during Beast Taming (Days 2–4).
    badge: {
      labelKey: 'behemoth.header.scion',
      liveLabelKey: 'behemoth.header.scionLive',
      glyph: '🦄',
      windows: [
        { startMin: 60, endMin: 90 },
        { startMin: 420, endMin: 450 },
        { startMin: 780, endMin: 810 },
        { startMin: 1140, endMin: 1170 },
      ],
      startDate: '2026-10-27',
      endDate: '2026-10-29',
      lockedBeforeKey: 'behemoth.header.scionBefore',
      lockedAfterKey: 'behemoth.header.scionAfter',
      jumpToTab: 'overview',
      jumpToAnchor: 'scion-schedule',
    },
  },
  // Persistent bar: the Behemoth Points score race (us vs opponent tug).
  persistentBar: 'prepTug',
  dataSource: { kind: 'supabase', typeSlug: 'behemoth' },
  tabs: [
    // ───────────────────────────── OVERVIEW ─────────────────────────────
    {
      id: 'overview',
      labelKey: 'behemoth.tabs.overview',
      widgets: [
        {
          kind: 'callouts',
          titleKey: 'behemoth.overview.bigPicture',
          options: {
            items: [{ bodyKey: 'behemoth.overview.bigPictureBody' }, { bodyKey: 'behemoth.overview.bigPictureCallout' }],
          },
        },
        {
          kind: 'timeline',
          bind: 'meta',
          titleKey: 'behemoth.overview.timeline',
          options: {
            zones: [
              { id: 'mm', label: 'Matchmaking', bright: '#94a3b8', dark: '#3a4256' },
              { id: 'tame', label: 'Beast Taming', bright: '#8a2d54', dark: '#4a1f30' },
              { id: 'atk', label: 'Attack-Defense', bright: '#2dd4bf', dark: '#134e4a' },
            ],
            stages: [
              { dayLabel: 'Day 1', label: 'Matchmaking', zone: 'mm', dayOffset: -1 },
              { dayLabel: 'Days 2–4', label: 'Beast Taming', zone: 'tame', dayOffset: 0 },
              { dayLabel: 'Days 5–6', label: 'Attack-Defense', zone: 'atk', dayOffset: 3 },
            ],
          },
        },
        {
          kind: 'specTable',
          titleKey: 'behemoth.overview.objectives',
          anchor: 'daily-objectives',
          options: {
            intro: 'Resets 00:00 UTC daily. Track your own progress toward each Awaken Runestone cap.',
            columns: [{ header: 'Source' }, { header: 'Daily cap', align: 'right', color: '#c47d9a' }, { header: 'When' }],
            rows: [
              ['Scion damage', '400', 'Days 2–4'],
              ['Scion eliminations (nearby)', '250', 'Days 2–4'],
              ['Cultivation Exploration', '162', '9×18 · Days 2–4'],
              ['Rally vs Tribes', '100', 'Days 2 & 4'],
              ['Alliance Rally vs Tribes', '200', 'Days 2 & 4'],
            ],
            footnote: 'Damage and eliminations are capped and mailed separately. Maxing everything across the 3 days = 3,036 runestones.',
          },
        },
        {
          kind: 'scheduleWindows',
          titleKey: 'behemoth.overview.scionSchedule',
          anchor: 'scion-schedule',
          options: {
            intro:
              'Four fixed 30-min windows daily (UTC+0). Blue = on #008 (ours), red = on the enemy server. Cross-border tiles open during our windows — zeroing risk. Runs during Beast Taming (Days 2–4).',
            windows: [
              { label: '01:00 – 01:30 UTC · ours', startMin: 60, endMin: 90 },
              { label: '07:00 – 07:30 UTC · enemy', startMin: 420, endMin: 450 },
              { label: '13:00 – 13:30 UTC · ours', startMin: 780, endMin: 810 },
              { label: '19:00 – 19:30 UTC · enemy', startMin: 1140, endMin: 1170 },
            ],
            footnote: 'Trial of Scion — tap the "Behemoth Scion" Elite, then Attack/Teleport. Farm Scions for runestones & eliminations.',
            startDate: '2026-10-27',
            endDate: '2026-10-29',
            lockGlyph: '🦄',
            lockedBefore: 'Trial of Scion opens with Beast Taming (Day 2).',
            lockedAfter: 'The Trial of Scion stage is over (ran Days 2–4).',
          },
        },
      ],
    },

    // ───────────────────────────── SCOUTING ─────────────────────────────
    {
      id: 'research',
      labelKey: 'behemoth.tabs.research',
      widgets: [
        { kind: 'scoutingGrid', bind: 'research', titleKey: 'behemoth.research.alliances', options: { show: 'alliances' } },
        { kind: 'scoutingGrid', bind: 'research', titleKey: 'behemoth.research.players', options: { show: 'players' } },
        { kind: 'tierTable', bind: 'serverTiers', titleKey: 'behemoth.research.tiers', halfWidth: true },
        { kind: 'depthTable', bind: 'serverDepth', titleKey: 'behemoth.research.depth', halfWidth: true, ownTitle: true },
      ],
    },

    // ─────────────────────────── BEAST TAMING ───────────────────────────
    {
      id: 'taming',
      labelKey: 'behemoth.tabs.taming',
      widgets: [
        {
          kind: 'callouts',
          titleKey: 'behemoth.taming.goal',
          options: {
            items: [
              { bodyKey: 'behemoth.taming.goal1' },
              { bodyKey: 'behemoth.taming.goal2' },
              { bodyKey: 'behemoth.taming.schedulePtr' },
            ],
          },
        },
        {
          kind: 'specTable',
          titleKey: 'behemoth.taming.blessings',
          options: {
            intro: 'Buffs unlocked (all unit types). Nodes unlock in a fixed order — you can’t jump to II early. Cost: 50,000 runestones per node for the first 3, then 60,000 (rising later). II values are cumulative.',
            columns: [
              { header: 'Blessing' },
              { header: 'Buff' },
              { header: 'Tier I', align: 'right', color: '#c47d9a' },
              { header: 'Tier II', align: 'right', color: '#c47d9a' },
            ],
            rows: [
              ['Undying Force', 'Revive at 0 HP', '3 stk', '—'],
              ['Wild Healing', 'Hospital cap & heal speed', '+700K / 50%', '—'],
              ['Wild Damage Increase', 'Damage dealt', '+2.5%', '+5%'],
              ['Wild Attack', 'Attack', '+5%', '+10%'],
              ['Wild Defense', 'Defense', '+5%', '+10%'],
              ['Wild Health', 'Health', '+2.5%', '+5%'],
              ['Rally Attack', 'Rally attack', '+5%', '—'],
              ['Rally Defense', 'Rally defense', '+5%', '—'],
              ['Wild Rally', 'Dmg reduction vs rallied', '+5%', '—'],
              ['Iron Hoof', 'Behemoth durability dmg', '+625', '+1,250'],
              ['Mobile Fortress', 'Behemoth health', '+250K', '+500K'],
              ["Behemoth's Blessing", 'Voluntary: 4,000 pts + 20 contrib / runestone', '∞', '—'],
            ],
          },
        },
        {
          kind: 'cardGrid',
          titleKey: 'behemoth.taming.doEachDay',
          options: {
            columns: 2,
            cards: [
              { icon: '🦄', title: 'Trial of Scion', color: '#c47d9a', desc: 'Farm Scions in the 30-min window for runestones & eliminations.' },
              { icon: '🔍', title: 'Cultivation Exploration', color: '#c47d9a', desc: '3 open at each of 04:00 / 12:00 / 20:00, 18 runestones each.' },
              { icon: '⚔️', title: 'Rally vs Tribes', color: '#c47d9a', desc: 'Join every called rally. Days 2 & 4 only.' },
              { icon: '🎁', title: 'Donate as you go', color: '#c47d9a', desc: "Don't hoard — donating tips Bloodline Purity our way and earns 10 personal points per runestone." },
            ],
          },
        },
      ],
    },

    // ───────────────────────── ATTACK-DEFENSE ───────────────────────────
    {
      id: 'atkdef',
      labelKey: 'behemoth.tabs.atkdef',
      widgets: [
        {
          kind: 'cardGrid',
          titleKey: 'behemoth.atkdef.whatHappens',
          options: {
            columns: 1,
            cards: [
              { icon: '🕐', title: 'Invasion time is locked by Day 3', desc: 'Our server admin locks the invasion time & location by Day 3, 12:00 UTC.' },
              { icon: '🐾', title: '90-minute invasions', desc: 'Each Behemoth invades the other server at the locked time & location. Each invasion lasts 90 minutes.' },
              { icon: '🏰', title: 'Ignores shields', desc: 'The invading Behemoth wrecks citadels and alliance buildings. Unlimited range, ignores shields — bubbling won’t protect your city.' },
              { icon: '🎯', title: 'Be online for the window', desc: 'This is where the bulk of the score (and personal points) is won.' },
            ],
          },
        },
        {
          kind: 'cardGrid',
          titleKey: 'behemoth.atkdef.attacking',
          options: {
            columns: 1,
            cards: [
              { icon: '⚔️', title: 'Only rallies damage it', desc: '1,000/sec each — per rally, not per march. More separate rallies = more damage; keep as many on it as possible.' },
              { icon: '⏳', title: 'Hold rallies long', desc: 'After 5 min, damage ramps +500 every 15s. Don’t let them disband.' },
              { icon: '📍', title: 'Relocate to the enemy server', desc: 'Relocate to the enemy server to join the offense.' },
            ],
          },
        },
        {
          kind: 'cardGrid',
          titleKey: 'behemoth.atkdef.stunCycle',
          options: {
            columns: 1,
            cards: [
              { icon: '💫', title: 'The stun cycle', desc: 'At 0 HP it burns 1 Undying Force stack, disbands all rallies, dazes for 30s (can’t attack), then revives full. Dies only when all stacks are gone.' },
              { icon: '🔁', title: '~4 zeroes to kill', desc: '3 stacks → ~4 zeroes to kill. Coordinate fresh waves to re-zero the moment it revives.' },
              { icon: '🛡️', title: 'Defenders: zero theirs', desc: 'Zeroing theirs scatters their rallies and stops their scoring.' },
            ],
          },
        },
        {
          kind: 'specTable',
          titleKey: 'behemoth.atkdef.scoring',
          options: {
            columns: [{ header: 'Action' }, { header: 'Points', align: 'right', color: '#2dd4bf' }],
            rows: [
              ['Our Behemoth: per 1K durability dmg to a citadel', '300,000'],
              ['Per 100 dmg to the enemy Behemoth', '80,000'],
              ['Deplete one enemy Undying Force stack', '1,000,000,000'],
              ['Completely defeat an enemy Behemoth', '5,000,000,000'],
              ["Invasion end: per 1K of our Behemoth's remaining HP", '2,000,000'],
            ],
            footnote:
              'Milestones dwarf chip damage: a stack (1B) and the kill (5B) are the big swings. Keeping ours alive pays 2M per 1K HP left — defense matters as much as offense.',
          },
        },
      ],
    },
  ],
};
