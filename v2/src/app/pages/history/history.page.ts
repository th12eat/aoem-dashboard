import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { HistoryService } from '@core/services/history.service';
import { fmtB, mpClass, mpPct, type HistoryEvent } from '@core/services/history.model';
import { TrendChartComponent } from '@shared/components/trend-chart/trend-chart.component';
import type { TrendSeries } from '@shared/components/trend-chart/trend-chart.geometry';

type Filter = 'all' | 'wins' | 'losses' | 'multi' | 'duo';

/**
 * KvK History 2.0 — the merged ledger (legacy history.json + DB occurrences)
 * with W/L chips, an expandable per-event table, and two trend charts. Rows for
 * completed DB occurrences deep-link to their full past dashboards. Behind the
 * auth wall via the route guard.
 */
@Component({
  selector: 'app-history',
  imports: [RouterLink, TranslateModule, TrendChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="kvk-header" data-kvk="generic">
      <div class="kvk-tag">{{ 'kvkHistory.tag' | translate }}</div>
      <h1 class="kvk-title">{{ 'kvkHistory.title' | translate }}</h1>
      <div class="kvk-subtitle">{{ 'kvkHistory.subtitle' | translate }}</div>
    </header>

    <main class="hx">
      <a routerLink="/dashboards" class="hx-back">{{ 'common.backToHub' | translate }}</a>

      @if (events().length === 0) {
        <p class="hx-empty">{{ 'kvkHistory.empty' | translate }}</p>
      } @else {
        <!-- W/L summary chips -->
        <div class="hx-chips">
          <div class="hx-chip" data-p="1"><span class="hx-big">{{ wl().p1 }}</span><span>1st / Won</span></div>
          <div class="hx-chip" data-p="2"><span class="hx-big">{{ wl().p2 }}</span><span>2nd</span></div>
          <div class="hx-chip" data-p="3"><span class="hx-big">{{ wl().p3 }}</span><span>3rd</span></div>
          <div class="hx-chip" data-p="4"><span class="hx-big">{{ wl().p4 }}</span><span>4th / Lost</span></div>
          <div class="hx-chip"><span class="hx-big">{{ wl().live }}</span><span>In progress</span></div>
          <div class="hx-chip"><span class="hx-big">{{ events().length }}</span><span>Events tracked</span></div>
        </div>

        <!-- filter tabs -->
        <div class="hx-tabs">
          @for (f of FILTERS; track f.id) {
            <button type="button" [class.on]="filter() === f.id" (click)="filter.set(f.id)">{{ f.label }}</button>
          }
        </div>

        <!-- ledger -->
        <div class="hx-ledger">
          <table>
            <thead>
              <tr>
                <th class="l">Event</th><th class="l">Date</th><th class="l">Opponent</th>
                <th class="grp-us">Us · Power</th><th class="grp-us">Merits</th><th class="grp-us">M:P</th>
                <th class="grp-opp">Opp · Power</th><th class="grp-opp">Merits</th><th class="grp-opp">M:P</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              @for (e of filtered(); track e.type + e.date) {
                <tr [attr.data-kvk]="e.kvkTheme" [class.hx-clickable]="e.multi" (click)="e.multi && toggle(e)">
                  <td class="l">
                    @if (e.multi) { <span class="hx-caret">{{ isOpen(e) ? '▾' : '▸' }}</span> }
                    {{ e.type }}@if (e.star) { <span class="hx-star" title="Special KvK — no troop loss">*</span> }
                  </td>
                  <td class="l num">{{ e.date }}</td>
                  <td class="l">{{ e.opp }}</td>
                  <td class="num">{{ b(e.ours.power) }}</td>
                  <td class="num">{{ b(e.ours.merits) }}</td>
                  <td class="num" [class]="mpCls(e.ours)">{{ mp(e.ours) }}</td>
                  <td class="num">{{ b(e.opp_.power) }}</td>
                  <td class="num">{{ b(e.opp_.merits) }}</td>
                  <td class="num" [class]="mpCls(e.opp_)">{{ mp(e.opp_) }}</td>
                  <td>
                    @if (e.occurrenceSlug) {
                      <a class="hx-link hx-res" [class]="resultClass(e)" [routerLink]="['/dashboards', e.occurrenceSlug, 'history', e.occurrenceDate]" (click)="$event.stopPropagation()">{{ resultLabel(e) }} ↗</a>
                    } @else {
                      <span class="hx-res" [class]="resultClass(e)">{{ resultLabel(e) }}</span>
                    }
                  </td>
                </tr>
                @if (e.multi && isOpen(e) && e.oppServers) {
                  @for (s of e.oppServers; track s.server) {
                    <tr class="hx-sub" [attr.data-kvk]="e.kvkTheme">
                      <td class="l"></td><td></td>
                      <td class="l">{{ s.server }}@if (s.rank) { <span class="hx-rank">#{{ s.rank }}</span> }</td>
                      <td></td><td></td><td></td>
                      <td class="num">{{ b(s.totals.power) }}</td>
                      <td class="num">{{ b(s.totals.merits) }}</td>
                      <td class="num" [class]="mpCls(s.totals)">{{ mp(s.totals) }}</td>
                      <td></td>
                    </tr>
                  }
                }
              }
            </tbody>
          </table>
          @if (anyStar()) {
            <p class="hx-foot">* Special KvK — no troop loss occurs (Primordial-style).</p>
          }
        </div>

        <!-- trend charts -->
        <div class="hx-charts">
          <section>
            <h3>Merit : Power over time</h3>
            <app-trend-chart [series]="mpSeries()" [fmtY]="pctFmt" />
          </section>
          <section>
            <div class="hx-chart-head">
              <h3>Our top-4 Power &amp; Merits</h3>
              <div class="hx-pm">
                <button type="button" [class.on]="pmMode() === 'abs'" (click)="pmMode.set('abs')">Absolute (B)</button>
                <button type="button" [class.on]="pmMode() === 'pct'" (click)="pmMode.set('pct')">% Growth</button>
              </div>
            </div>
            <app-trend-chart [series]="pmSeries()" [fmtY]="pmMode() === 'abs' ? bFmt : pctFmt" />
          </section>
        </div>
      }
    </main>
  `,
  styleUrl: './history.page.scss',
})
export class HistoryPage {
  private readonly history = inject(HistoryService);

  readonly events = signal<HistoryEvent[]>([]);
  readonly filter = signal<Filter>('all');
  readonly pmMode = signal<'abs' | 'pct'>('abs');
  private readonly open = signal<Set<string>>(new Set());

  readonly FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'wins', label: 'Wins' },
    { id: 'losses', label: 'Losses' },
    { id: 'duo', label: '2-kingdom' },
    { id: 'multi', label: '4-kingdom' },
  ];

  /** Kingdom count = us + opponent servers (1v1 ⇒ 2; a 4-kingdom KvK ⇒ 4). */
  private kingdomCount(e: HistoryEvent): number {
    return e.multi ? (e.oppServers?.length ?? 0) + 1 : 2;
  }

  // Charts store Power/Merits in BILLIONS already (e.power/1e9), so the y-axis
  // formatter just appends "B" — it must NOT divide again (that printed 0.00B).
  readonly bFmt = (n: number) => `${n.toFixed(1)}B`;
  readonly pctFmt = (n: number) => `${n.toFixed(0)}%`;

  constructor() {
    void this.history.load().then(e => this.events.set(e));
  }

  // ── derived ────────────────────────────────────────────────────────────────
  readonly wl = computed(() => {
    const c = { p1: 0, p2: 0, p3: 0, p4: 0, live: 0 };
    for (const e of this.events()) {
      if (e.result === 'Live' || e.result === 'TBD') {
        c.live++;
        continue;
      }
      // Multi-kingdom → bucket by placement; 1v1 → Win=1st bucket, Loss=4th.
      const multi = this.kingdomCount(e) >= 3;
      const bucket = multi && e.placement ? e.placement : e.result === 'Win' ? 1 : e.result === 'Loss' ? 4 : 0;
      if (bucket === 1) c.p1++;
      else if (bucket === 2) c.p2++;
      else if (bucket === 3) c.p3++;
      else if (bucket === 4) c.p4++;
    }
    return c;
  });
  readonly anyStar = computed(() => this.events().some(e => e.star));
  readonly filtered = computed(() => {
    const f = this.filter();
    return this.events().filter(e => {
      if (f === 'wins') return e.result === 'Win';
      if (f === 'losses') return e.result === 'Loss';
      if (f === 'multi') return this.kingdomCount(e) >= 3;
      if (f === 'duo') return this.kingdomCount(e) === 2;
      return true;
    });
  });

  /** Chart source: events with real figures, oldest→newest. */
  private readonly charted = computed(() =>
    this.events()
      .filter(e => e.ours.power > 0 && e.opp_.power > 0)
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
  );

  readonly mpSeries = computed<TrendSeries[]>(() => {
    const ev = this.charted();
    const pt = (e: HistoryEvent, y: number) => ({ label: e.date.slice(5), group: monthLabel(e.date), y });
    return [
      { label: 'Era #008', color: '#5b8bc4', fmt: this.pctFmt, points: ev.map(e => pt(e, round1(mpPct(e.ours)))) },
      { label: 'Opponent', color: '#c43d3d', fmt: this.pctFmt, points: ev.map(e => pt(e, round1(mpPct(e.opp_)))) },
    ];
  });

  readonly pmSeries = computed<TrendSeries[]>(() => {
    const ev = this.charted();
    const pt = (e: HistoryEvent, y: number) => ({ label: e.date.slice(5), group: monthLabel(e.date), y });
    if (this.pmMode() === 'abs') {
      // Absolute: Power/Merits in billions + M:P% as a secondary line. Each line
      // carries its OWN last-value formatter (B vs %) so the mixed units read
      // right even though they share the y-axis.
      return [
        { label: 'Power (B)', color: '#fbbf24', fmt: this.bFmt, points: ev.map(e => pt(e, round1(e.ours.power / 1e9))) },
        { label: 'Merits (B)', color: '#4ade80', fmt: this.bFmt, points: ev.map(e => pt(e, round1(e.ours.merits / 1e9))) },
        { label: 'M:P %', color: '#9a6dd4', fmt: this.pctFmt, points: ev.map(e => pt(e, round1(mpPct(e.ours)))) },
      ];
    }
    // % growth vs the first charted event — Power, Merits AND M:P ratio.
    const base = ev[0];
    const pct = (v: number, b: number) => (b > 0 ? ((v - b) / b) * 100 : 0);
    const baseMp = base ? mpPct(base.ours) : 0;
    return [
      { label: 'Power', color: '#fbbf24', fmt: this.pctFmt, points: ev.map(e => pt(e, round1(pct(e.ours.power, base?.ours.power ?? 0)))) },
      { label: 'Merits', color: '#4ade80', fmt: this.pctFmt, points: ev.map(e => pt(e, round1(pct(e.ours.merits, base?.ours.merits ?? 0)))) },
      { label: 'M:P', color: '#9a6dd4', fmt: this.pctFmt, points: ev.map(e => pt(e, round1(pct(mpPct(e.ours), baseMp)))) },
    ];
  });

  // ── row helpers ──────────────────────────────────────────────────────────────
  b(n: number): string {
    return n > 0 ? fmtB(n) : '—';
  }
  mp(t: { power: number; merits: number }): string {
    return t.power > 0 ? `${mpPct(t).toFixed(1)}%` : '—';
  }
  mpCls(t: { power: number; merits: number }): string {
    return t.power > 0 ? mpClass(mpPct(t)) : '';
  }
  resultLabel(e: HistoryEvent): string {
    if (e.result === 'Live') return 'Live';
    // 1v1 (2-kingdom) reads Win/Loss — NOT a rank. Only a true multi-kingdom
    // KvK (3+) shows an explicit ordinal placement. (v1.0 stored Loss as
    // placement=4 even for duels, which printed a bogus "4th".)
    if (this.kingdomCount(e) >= 3 && e.placement) {
      return e.placement === 1 ? '1st' : e.placement === 2 ? '2nd' : e.placement === 3 ? '3rd' : '4th';
    }
    if (e.result === 'Win' || e.result === 'Loss') return e.result;
    return e.result; // TBD / other
  }

  /** Stoplight class for the result cell, by OUTCOME not just placement:
   *   Win / 1st → green · 2nd → yellow · 3rd → orange · Loss / 4th → red ·
   *   Live → blue · else neutral. Works for both 1v1 and multi-kingdom. */
  resultClass(e: HistoryEvent): string {
    if (e.result === 'Live') return 'hx-res-live';
    const multi = this.kingdomCount(e) >= 3;
    if (multi && e.placement) return `hx-res-${e.placement}`;
    if (e.result === 'Win') return 'hx-res-1';
    if (e.result === 'Loss') return 'hx-res-4';
    return 'hx-res-0';
  }
  private keyOf(e: HistoryEvent): string {
    return `${e.type}|${e.date}`;
  }
  isOpen(e: HistoryEvent): boolean {
    return this.open().has(this.keyOf(e));
  }
  toggle(e: HistoryEvent): void {
    const next = new Set(this.open());
    const k = this.keyOf(e);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    this.open.set(next);
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-11-23" → "Nov" (adds "'YY" at January so year rollovers stay clear). */
function monthLabel(iso: string): string {
  const [y, m] = iso.split('-');
  const mi = Number(m) - 1;
  const name = MONTHS[mi] ?? m;
  return mi === 0 ? `${name} '${y.slice(2)}` : name;
}
