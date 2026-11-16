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
  | 'achievements';

/** Where a dashboard's data comes from. The DataSource seam branches on `kind`
 * so swapping static→Supabase is a config change, not a component change. */
export type DataSourceRef =
  | { kind: 'static'; slug: string }
  | { kind: 'supabase'; table: string; filter?: Record<string, string | number> };

/** A single widget instance within a tab. */
export interface WidgetConfig {
  kind: WidgetKind;
  /** Dot path into the normalized EventData, e.g. 'kingdomScoreboard' or
   * 'research.opponents'. Resolved with getPath(). Omit for self-contained
   * widgets (header/countdown read top-level event meta). */
  bind?: string;
  /** i18n key for an optional section heading above the widget. */
  titleKey?: string;
  /** When true, the widget is wrapped in a collapsible card (handled by
   * WidgetHost) with a ▾ chevron; `defaultOpen` sets the initial state. */
  collapsible?: boolean;
  defaultOpen?: boolean;
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
}

/** Header configuration — the rich event header (bg, meta, buttons, crests). */
export interface HeaderConfig {
  /** Background image (relative to app base), sets the header graphic. */
  backgroundAsset?: string;
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
] as const;
