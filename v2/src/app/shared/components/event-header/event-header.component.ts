import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ClockService } from '@core/services/clock.service';
import type { EventDashboardConfig } from '@shared/models/event-dashboard-config.model';
import type { EventMeta } from '@shared/models/event-data.model';

/**
 * Rich event header — the 1:1 port of the 1.0 Stormlands header. Fed the full
 * EventDashboardConfig (+ live EventMeta), it renders, over a background image:
 *   • top-right jump buttons (📜 / ❓)                           (config.header.buttons)
 *   • a lockable live badge (Storm Incursion)                    (config.header.badge)
 *   • tag · title · server-crest row with a VS divider           (config.header.crests)
 *   • the event-meta box: Start | End | Timezone, a live
 *     days/hours/min/sec countdown, and a stage indicator that
 *     flips to "Event Complete" after the end date               (data: EventMeta)
 *   • the "<fight-time label> <value>" line + a stub calendar pill
 *
 * Self-contained & clock-driven (1s tick). Accent + background come from the
 * [data-kvk] host set by the page.
 */
@Component({
  selector: 'app-event-header',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-header.component.html',
  styleUrl: './event-header.component.scss',
})
export class EventHeaderComponent {
  readonly config = input.required<EventDashboardConfig>();
  readonly data = input<EventMeta | null>(null);
  /** Emits a jump target: switch to `tab` then scroll to `anchor` (if any). */
  readonly jump = output<{ tab?: string; anchor?: string }>();

  private readonly clock = inject(ClockService);
  private readonly now = this.clock.now;

  /** Help modal open state (❓ button). */
  readonly helpOpen = signal(false);
  readonly help = computed(() => this.header().help);

  readonly header = computed(() => this.config().header ?? {});
  readonly titleKey = computed(() => this.config().titleKey);
  readonly subtitleKey = computed(() => this.config().subtitleKey);
  /** Crests are data-driven: derived from meta.kingdoms (the per-event corner
   * identities/colours), falling back to any config-provided list. */
  readonly crests = computed(() => {
    const kingdoms = this.data()?.kingdoms;
    if (kingdoms && kingdoms.length) {
      return kingdoms.map(k => ({ label: k.display, color: k.color, rgb: k.rgb, us: k.us }));
    }
    return this.header().crests ?? [];
  });
  readonly vsAfter = computed(() => this.header().vsAfterIndex ?? 1);
  readonly buttons = computed(() => this.header().buttons ?? []);
  readonly timezone = computed(() => this.header().timezone ?? 'UTC+0');
  /** Fight time (e.g. Temple of Zeus) is data-driven from meta.zeusTime. */
  readonly fightTime = computed(() => this.data()?.zeusTime ?? this.header().fightTime);
  readonly fightTimeLabelKey = computed(() => this.header().fightTimeLabelKey);
  readonly calendarStub = computed(() => this.header().calendarStub === true);

  /** Background image CSS value for --kvk-bg. */
  readonly bgStyle = computed(() => {
    const bg = this.header().backgroundAsset;
    return bg ? `url('${bg}')` : 'none';
  });

  // ── event-meta box: dates + live countdown + stage ──────────────────────
  private readonly startMs = computed(() => Date.parse(this.data()?.eventStart ?? ''));
  private readonly endMs = computed(() => Date.parse(this.data()?.eventEnd ?? ''));

  readonly startLabel = computed(() => this.fmt(this.data()?.eventStart));
  readonly endLabel = computed(() => this.fmt(this.data()?.eventEnd));

  readonly phase = computed<'before' | 'live' | 'over'>(() => {
    const t = this.now();
    if (this.data()?.eventOver) return 'over';
    if (Number.isFinite(this.startMs()) && t < this.startMs()) return 'before';
    if (Number.isFinite(this.endMs()) && t >= this.endMs()) return 'over';
    return 'live';
  });

  readonly countdown = computed(() => {
    const target = this.phase() === 'before' ? this.startMs() : this.endMs();
    if (!Number.isFinite(target)) return null;
    const ms = Math.max(0, target - this.now());
    return {
      d: Math.floor(ms / 86400000),
      h: Math.floor((ms % 86400000) / 3600000),
      m: Math.floor((ms % 3600000) / 60000),
      s: Math.floor((ms % 60000) / 1000),
    };
  });

  // ── lockable live badge (Storm Incursion) ───────────────────────────────
  readonly badgeState = computed(() => {
    const badge = this.header().badge;
    if (!badge) return null;
    const d = new Date(this.now());
    const today = d.toISOString().slice(0, 10);
    const nowMin = d.getUTCHours() * 60 + d.getUTCMinutes();
    const inRange = today >= badge.startDate && today <= badge.endDate;

    let live = false;
    let nextStart: number | null = null;
    for (const w of badge.windows) {
      if (inRange && nowMin >= w.startMin && nowMin < w.endMin) live = true;
      if (nowMin < w.startMin && nextStart === null) nextStart = w.startMin;
    }
    const lockedKey = today < badge.startDate ? badge.lockedBeforeKey : today > badge.endDate ? badge.lockedAfterKey : null;
    const nextLabel = nextStart !== null ? this.minToHHMM(nextStart) : badge.windows[0] ? this.minToHHMM(badge.windows[0].startMin) : '';
    return { badge, live, locked: !inRange, lockedKey, nextLabel };
  });

  private fmt(iso?: string): string {
    const ms = Date.parse(iso ?? '');
    if (!Number.isFinite(ms)) return '—';
    return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  private minToHHMM(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  onButton(b: { jumpToTab?: string; jumpToAnchor?: string; help?: boolean }): void {
    if (b.help) {
      this.helpOpen.set(true);
      return;
    }
    if (b.jumpToTab || b.jumpToAnchor) this.jump.emit({ tab: b.jumpToTab, anchor: b.jumpToAnchor });
  }
  onBadge(): void {
    const s = this.badgeState();
    if (s && !s.locked && (s.badge.jumpToTab || s.badge.jumpToAnchor)) {
      this.jump.emit({ tab: s.badge.jumpToTab, anchor: s.badge.jumpToAnchor });
    }
  }
}
