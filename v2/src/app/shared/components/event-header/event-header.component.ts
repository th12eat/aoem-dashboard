import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ClockService } from '@core/services/clock.service';
import type { EventDashboardConfig } from '@shared/models/event-dashboard-config.model';
import type { EventMeta } from '@shared/models/event-data.model';
import { fmtServer, serverNumber } from '@shared/utils/corners';

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
  /** 1.0-styled eyebrow line above the title (TME "Command Center"). When set,
   * it replaces the generic grey subtitle treatment. */
  readonly eyebrowKey = computed(() => this.header().eyebrowKey);

  /** Dynamic ATTACKING/DEFENDING badge (prep-tug leader attacks; pre-start →
   * attacking). Null for events without an attackDefense config. */
  readonly attackDefense = computed(() => {
    const cfg = this.header().attackDefense;
    if (!cfg) return null;
    const m = this.data();
    const started = m?.prepStarted === true;
    // Behind on summed prep points → defending; leading/tied/pre-start → attacking.
    const defending = started && (m?.prepOursTotal ?? 0) < (m?.prepOppTotal ?? 0);
    return {
      defending,
      labelKey: defending ? cfg.defendLabelKey : cfg.attackLabelKey,
      glyph: defending ? cfg.defendGlyph : cfg.attackGlyph,
    };
  });
  /** Crests are data-driven: derived from meta.kingdoms (the per-event corner
   * identities/colours), falling back to any config-provided list. */
  readonly crests = computed(() => {
    const kingdoms = this.data()?.kingdoms;
    if (kingdoms && kingdoms.length) {
      // Normalise every crest to ONE house style ("Era 8" / "Era 24"), so a
      // mix of stored display formats (some padded "Era #008", some spaced
      // "Era 24" from different adapters) can't show two conventions side by
      // side. Fall back to the raw display if it has no parseable number.
      return kingdoms.map(k => {
        const n = serverNumber(k.display);
        const label = Number.isFinite(n) ? fmtServer(n, 'spaced') : k.display;
        return { label, color: k.color, rgb: k.rgb, us: k.us };
      });
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

  /** The multi-stage schedule, if the config supplies one (TME). */
  private readonly stages = computed(() => this.header().stages ?? []);

  /** The active stage index by wall-clock: the last stage whose start ≤ now.
   * -1 before the first stage starts; stages.length once all have ended. */
  private readonly activeStageIdx = computed(() => {
    const st = this.stages();
    if (!st.length) return -1;
    const t = this.now();
    let idx = -1;
    st.forEach((s, i) => {
      if (t >= Date.parse(`${s.startDate}T00:00:00Z`)) idx = i;
    });
    // all ended?
    const last = st[st.length - 1];
    if (t >= Date.parse(`${last.endDate}T00:00:00Z`)) return st.length;
    return idx;
  });

  /** Left/right date-cell labels + values. Stage-driven when a schedule exists,
   * else the plain Start/End of the whole event. */
  readonly startLabelKey = computed(() => {
    const st = this.stages();
    const i = this.activeStageIdx();
    if (st.length && i >= 0 && i < st.length) return st[i].fromLabelKey;
    return 'widget.countdown.start';
  });
  readonly endLabelKey = computed(() => {
    const st = this.stages();
    const i = this.activeStageIdx();
    if (st.length && i >= 0 && i < st.length) return st[i].toLabelKey;
    return 'widget.countdown.end';
  });
  readonly startLabel = computed(() => {
    const st = this.stages();
    const i = this.activeStageIdx();
    if (st.length && i >= 0 && i < st.length) return this.fmt(st[i].startDate);
    return this.fmt(this.data()?.eventStart);
  });
  readonly endLabel = computed(() => {
    const st = this.stages();
    const i = this.activeStageIdx();
    if (st.length && i >= 0 && i < st.length) return this.fmt(st[i].endDate);
    return this.fmt(this.data()?.eventEnd);
  });

  readonly phase = computed<'before' | 'live' | 'over'>(() => {
    const t = this.now();
    if (this.data()?.eventOver) return 'over';
    const st = this.stages();
    if (st.length) {
      const i = this.activeStageIdx();
      if (i < 0) return 'before';
      if (i >= st.length) return 'over';
      return 'live';
    }
    if (Number.isFinite(this.startMs()) && t < this.startMs()) return 'before';
    if (Number.isFinite(this.endMs()) && t >= this.endMs()) return 'over';
    return 'live';
  });

  /** i18n key for the in-progress status line. Stage-specific when a schedule
   * is set (e.g. "Prep Stage in Progress"), else the generic live label. */
  readonly liveLabelKey = computed(() => {
    const st = this.stages();
    const i = this.activeStageIdx();
    if (st.length && i >= 0 && i < st.length) return st[i].liveLabelKey;
    return 'widget.countdown.live';
  });

  readonly countdown = computed(() => {
    const st = this.stages();
    const i = this.activeStageIdx();
    // Count down to the end of the active stage (stage-driven), else to the
    // event start (before) / end (live) as before.
    let target: number;
    if (st.length && i >= 0 && i < st.length) {
      target = Date.parse(`${st[i].endDate}T00:00:00Z`);
    } else {
      target = this.phase() === 'before' ? this.startMs() : this.endMs();
    }
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
