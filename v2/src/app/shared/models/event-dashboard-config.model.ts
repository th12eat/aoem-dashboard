/**
 * EventDashboardConfig — the declarative description of ONE event dashboard.
 *
 * This is the heart of 2.0: a dashboard is a typed tab/widget tree, not a
 * bespoke HTML file. "New event = new config" — add a `*.config.ts` (or, in a
 * later phase, a JSON / DB row) and the generic EventDashboardPage renders it.
 * Widgets never read the raw data file; they read a `bind`-resolved slice of
 * the normalized {@link EventData}, so the config stays declarative and the
 * data source is swappable (static JSON now, Supabase later).
 */

/** Widget kinds the registry knows how to render. Additive — a genuinely new
 * visual gets a new kind + component; everything else is config. */
export type WidgetKind =
  | 'countdown'
  | 'scoreboard'
  | 'leaderboard'
  | 'scoutingGrid'
  | 'diplomacy'
  | 'roeTable'
  | 'map'
  | 'tierTable'
  | 'depthTable'
  | 'callouts'
  | 'richText'
  | 'timeline'
  | 'kingdomBar'
  | 'specTable'
  | 'cardGrid'
  | 'scheduleWindows'
  | 'achievements'
  | 'nodeControl'
  | 'placerBalances'
  | 'prepTug'
  | 'stageTabs'
  | 'prepRankings';

/** Where a dashboard's data comes from. The DataSource seam branches on `kind`
 * so swapping static→Supabase is a config change, not a component change.
 *
 * `supabase` with `typeSlug` is the occurrence-aware source: it resolves the
 * current (or a dated) occurrence of that event type from the `events` table,
 * reads its `event_data` doc, and falls back to the committed static JSON when
 * no DB row exists yet. `date` (YYYY-MM-DD) targets a past occurrence. */
export type DataSourceRef =
  | { kind: 'static'; slug: string }
  | { kind: 'supabase'; typeSlug: string; date?: string };

/** A single widget instance within a tab. */
export interface WidgetConfig {
  kind: WidgetKind;
  /** Dot path into the normalized EventData, e.g. 'kingdomScoreboard' or
   * 'research.opponents'. Resolved with getPath(). Omit for self-contained
   * widgets (header/countdown read top-level event meta). */
  bind?: string;
  /** i18n key for an optional section heading above the widget. */
  titleKey?: string;
  /** Whether to wrap the widget in the standard card box (default true).
   * Set false for widgets that provide their own chrome (kingdomBar). */
  card?: boolean;
  /** Optional DOM id on the widget's card, so header buttons/badges can
   * scroll to it (jumpToTab + anchor). */
  anchor?: string;
  /** When true, the widget's card is collapsible (▾ chevron); `defaultOpen`
   * sets the initial state. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** When true, the widget takes half the content width and pairs side-by-side
   * with the adjacent half-width widget(s) on wide screens (stacks on narrow).
   * Consecutive half-width widgets form one responsive row. */
  halfWidth?: boolean;
  /** When true, the host keeps the card chrome but does NOT render the title
   * row and does NOT strip `titleKey` — the inner widget renders its own title
   * (so it can add an inline right-aligned control, e.g. the depth-table's
   * Power/Merits toggle, or a dynamic suffix). */
  ownTitle?: boolean;
  /** Widget-specific options (columns, map node schema, callout list, …).
   * Each widget narrows this to its own options interface. */
  options?: Record<string, unknown>;
}

/** A tab groups widgets under a labelled, selectable section. */
export interface TabConfig {
  /** Stable id used in the URL fragment and as the render key. */
  id: string;
  /** i18n key for the tab label. */
  labelKey: string;
  widgets: WidgetConfig[];
}

/** A server crest shown in the header (1.0 "server crests" row). */
export interface HeaderCrest {
  /** Display label, e.g. "Era #008". */
  label: string;
  /** Border/background accent colour. */
  color: string;
  /** rgb triplet (e.g. "154,109,212") for translucent bg/glow. */
  rgb: string;
  /** Marks our server (adds a glow). */
  us?: boolean;
}

/** A header "jump" button (📜 to a section/tab, ❓ for help, etc.). */
export interface HeaderButton {
  glyph: string;
  /** i18n key for the title/tooltip. */
  titleKey: string;
  /** Tab id to switch to when clicked (optional). */
  jumpToTab?: string;
  /** Widget anchor id to scroll to after switching tab (optional). */
  jumpToAnchor?: string;
  /** Opens the help modal instead of jumping (the ❓ button). */
  help?: boolean;
}

/** A live event badge in the header (e.g. Storm Incursion), lockable by date. */
export interface HeaderBadge {
  /** i18n key for the idle/upcoming label prefix. */
  labelKey: string;
  /** i18n key for the live label. */
  liveLabelKey: string;
  glyph: string;
  /** Daily windows (UTC minutes) that define "live". */
  windows: { startMin: number; endMin: number }[];
  /** Active date range (YYYY-MM-DD); outside this, the badge is locked. */
  startDate: string;
  endDate: string;
  /** i18n keys for the locked-before / locked-after tooltips. */
  lockedBeforeKey: string;
  lockedAfterKey: string;
  /** Tab to jump to when clicked. */
  jumpToTab?: string;
  /** Widget anchor id to scroll to after switching tab. */
  jumpToAnchor?: string;
}

/** A help modal shown by the ❓ header button. */
export interface HeaderHelp {
  /** i18n key for the modal title. */
  titleKey: string;
  /** Verbatim intro paragraph(s). */
  body: string;
  /** Optional image (relative to app base). */
  image?: string;
}

/** A stage in a multi-phase event's countdown (TME: Matchmaking → Prep →
 * Invasion → Recovery). The header's event-meta box cycles its labels through
 * these by wall-clock, instead of a flat Start/End. */
export interface CountdownStage {
  /** Stable id (e.g. 'prep'). */
  id: string;
  /** i18n key for the left-cell "from" label, e.g. "Prep Start". */
  fromLabelKey: string;
  /** i18n key for the right-cell "to" label, e.g. "Invasion Starts". */
  toLabelKey: string;
  /** i18n key for the in-progress status, e.g. "Prep Stage in Progress". */
  liveLabelKey: string;
  /** The ISO date this stage starts (YYYY-MM-DD); the first stage's start is
   * also the overall event start. */
  startDate: string;
  /** The ISO date this stage ends / the next begins (YYYY-MM-DD). */
  endDate: string;
}

/** A dynamic ATTACKING/DEFENDING badge driven by who leads the prep tug. The
 * leader attacks; before prep starts, defaults to attacking. Sits under the
 * title, right of the crest row (1.0 TME). */
export interface AttackDefenseBadge {
  attackLabelKey: string;
  defendLabelKey: string;
  attackGlyph: string;
  defendGlyph: string;
}

/** Header configuration — the rich event header (bg, meta, buttons, crests). */
export interface HeaderConfig {
  /** Background image (relative to app base), sets the header graphic. */
  backgroundAsset?: string;
  /** i18n key for the small eyebrow line ABOVE the title (1.0 "headerSub"). When
   * set it overrides the generic subtitle treatment with the 1.0 styling. */
  eyebrowKey?: string;
  /** Multi-stage countdown schedule. When present, the event-meta box cycles
   * its Start/End labels + live status through these stages by wall-clock. */
  stages?: CountdownStage[];
  /** Dynamic attack/defense badge (prep-tug leader attacks). */
  attackDefense?: AttackDefenseBadge;
  /** Timezone label shown in the meta box, e.g. "UTC+0". */
  timezone?: string;
  /** Verbatim "fight time" line value, e.g. "11:00 UTC" (Temple of Zeus). */
  fightTime?: string;
  /** i18n key for the fight-time label, e.g. "Temple of Zeus Fight:". */
  fightTimeLabelKey?: string;
  /** Server crests row. */
  crests?: HeaderCrest[];
  /** Index in `crests` after which to insert a "VS" divider (default 1). */
  vsAfterIndex?: number;
  /** Top-right jump buttons. */
  buttons?: HeaderButton[];
  /** Live event badge (lockable). */
  badge?: HeaderBadge;
  /** Show the (disabled) "Add to Calendar" pill. */
  calendarStub?: boolean;
  /** Help modal opened by a ❓ button. */
  help?: HeaderHelp;
}

/** The full config for one event dashboard. */
export interface EventDashboardConfig {
  /** URL slug + default static data slug. Matches the `:slug` route param. */
  slug: string;
  /** Drives the [data-kvk] accent (see _kvk-tokens.scss). */
  kvkTheme: string;
  /** i18n key for the event display title. */
  titleKey: string;
  /** i18n key for the small tag line above the title. */
  tagKey?: string;
  /** i18n key for the subtitle under the title. */
  subtitleKey?: string;
  /** Rich header configuration (bg, meta box, buttons, badge, crests). */
  header?: HeaderConfig;
  /** Static interactive-map geometry (per-event layout). When present, the page
   * derives the live MapView from it + the data's mapState/mapRoutes. */
  mapGeometry?: import('./map.model').MapGeometry;
  /** The persistent bar pinned above the tabs on every tab. Defaults to the
   * kingdom-standings bar (`kingdomBar` bound to kingdomScoreboard). TME's
   * prep-war uses `prepTug` (bound to the prep tug data). `none` hides it. */
  persistentBar?: 'kingdomBar' | 'prepTug' | 'none';
  dataSource: DataSourceRef;
  tabs: TabConfig[];
}

/** The set of widget kinds, used by validateConfig and the registry. */
export const WIDGET_KINDS: readonly WidgetKind[] = [
  'countdown',
  'scoreboard',
  'leaderboard',
  'scoutingGrid',
  'diplomacy',
  'roeTable',
  'map',
  'tierTable',
  'depthTable',
  'callouts',
  'richText',
  'timeline',
  'kingdomBar',
  'specTable',
  'cardGrid',
  'scheduleWindows',
  'achievements',
  'nodeControl',
  'placerBalances',
  'prepTug',
  'stageTabs',
  'prepRankings',
] as const;
