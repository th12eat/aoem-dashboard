import { Type } from '@angular/core';
import type { WidgetKind } from '@shared/models/event-dashboard-config.model';
import { CountdownComponent } from '../countdown/countdown.component';
import { ScoreboardTableComponent } from '../scoreboard-table/scoreboard-table.component';
import { LeaderboardComponent } from '../leaderboard/leaderboard.component';
import { ScoutingGridComponent } from '../scouting-grid/scouting-grid.component';
import { DiplomacyTableComponent } from '../diplomacy-table/diplomacy-table.component';
import { RoeTableComponent } from '../roe-table/roe-table.component';
import { KvkMapComponent } from '../kvk-map/kvk-map.component';
import { TierTableComponent } from '../tier-table/tier-table.component';
import { DepthTableComponent } from '../depth-table/depth-table.component';
import { CalloutListComponent } from '../callout-list/callout-list.component';
import { RichTextComponent } from '../rich-text/rich-text.component';
import { TimelineComponent } from '../timeline/timeline.component';
import { KingdomBarComponent } from '../kingdom-bar/kingdom-bar.component';
import { SpecTableComponent } from '../spec-table/spec-table.component';
import { CardGridComponent } from '../card-grid/card-grid.component';
import { ScheduleWindowsComponent } from '../schedule-windows/schedule-windows.component';
import { AchievementsComponent } from '../achievements/achievements.component';

/**
 * The single source of truth mapping a WidgetKind to its component. Adding a
 * new widget kind is an additive change here + a new entry in WIDGET_KINDS.
 * WidgetHost looks components up by kind and renders them via ngComponentOutlet.
 *
 * (The event header is NOT a registry widget — it's a page-level component fed
 * the full config; see EventHeaderComponent.)
 */
export const WIDGET_REGISTRY: Record<WidgetKind, Type<unknown>> = {
  countdown: CountdownComponent,
  scoreboard: ScoreboardTableComponent,
  leaderboard: LeaderboardComponent,
  scoutingGrid: ScoutingGridComponent,
  diplomacy: DiplomacyTableComponent,
  roeTable: RoeTableComponent,
  map: KvkMapComponent,
  tierTable: TierTableComponent,
  depthTable: DepthTableComponent,
  callouts: CalloutListComponent,
  richText: RichTextComponent,
  timeline: TimelineComponent,
  kingdomBar: KingdomBarComponent,
  specTable: SpecTableComponent,
  cardGrid: CardGridComponent,
  scheduleWindows: ScheduleWindowsComponent,
  achievements: AchievementsComponent,
};
