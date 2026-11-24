import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { EventService } from '@core/services/event.service';
import { MapStateStore } from '@core/services/map-state.store';
import { EventRegistryService } from '@core/services/event-registry.service';
import { ClockService } from '@core/services/clock.service';
import { ServerRosterService, type RosterAllianceEntry } from '@core/services/server-roster.service';
import { deriveMapView } from '@core/services/derive-map-view';
import { isSectionMissing, type DataSection } from '@core/services/event-data-status';
import { deriveEndDate, kingdomCount } from '@shared/utils/kvk-schedule';
import { CORNER_NAMES, cornerColor, fmtServer, ourServerNumber, serverNumber } from '@shared/utils/corners';
import { rankByDesc, relationNote } from '@shared/utils/derive-ranks';
import { buildTemplate, applyCsv } from '@shared/utils/event-csv';
import { reconcileStage } from '@shared/utils/stage-reconcile';
import type { AllianceHoldings } from '@shared/models/map.model';
import type { Kingdom } from '@shared/models/event-data.model';
import { EditableGridComponent, type GridColumn, type GridRow } from './sections/editable-grid.component';
import { MapEditorPage } from '../map-editor/map-editor.page';

interface SectionDef {
  id: DataSection | 'kingdomPoints' | 'map';
  label: string;
  missingKey?: DataSection;
}

type Doc = Record<string, unknown>;

/** 1v1 side colours (match the v1.0 TME tug + the dashboard tables). */
const US_BLUE = '#5b8def';
const OPP_RED = '#f87171';

/** A server as defined on the Event Setup page (the single source downstream
 * tabs derive from). */
interface SetupServer {
  num: number; // bare server number (8)
  corner: string; // North/East/South/West
  alliances: string[]; // tags
}

/**
 * Admin data-entry editor at /admin/:slug/data/:date. Most fields are DERIVED
 * (end date from the event type; colors from corner; ranks from points; server
 * names/tags from Event Setup) — only genuinely-entered values are editable.
 * The map editor is embedded inline. Saves the whole doc to event_data.
 */
@Component({
  selector: 'app-event-data-editor',
  imports: [RouterLink, EditableGridComponent, MapEditorPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="de-bar">
      <a routerLink="/admin" class="de-back">← Admin</a>
      <strong class="de-title">Edit data — {{ fmtServer(ourNum, 'full') }} · {{ slug() }} · {{ date() }}</strong>
      <span class="de-spacer"></span>
      <button type="button" class="de-ghost" (click)="downloadCsv()" [disabled]="!occId()" title="Download a CSV skeleton of the bulk data to fill in a spreadsheet">⬇ CSV template</button>
      <label class="de-ghost de-upload" title="Upload a filled CSV to populate the bulk sections">
        ⬆ Import CSV
        <input type="file" accept=".csv,text/csv" (change)="uploadCsv($event)" hidden />
      </label>
      <button type="button" class="de-save" (click)="save()" [disabled]="!occId() || saving()">
        {{ saving() ? 'Saving…' : '☁ Save' }}
      </button>
    </div>
    @if (saveMsg()) { <p class="de-msg" [class.err]="saveErr()">{{ saveMsg() }}</p> }
    @if (draftBanner()) {
      <div class="de-draft">
        <span>⚠ Unsaved draft found from a previous session. Restore your in-progress edits?</span>
        <span class="de-draft-actions">
          <button type="button" class="de-draft-restore" (click)="restoreDraft()">Restore</button>
          <button type="button" class="de-draft-discard" (click)="discardDraft()">Discard</button>
        </span>
      </div>
    }

    @if (!occId() && resolved()) {
      <p class="de-warn">No occurrence found for "{{ slug() }}" on {{ date() }}. Create it first on the Events page.</p>
    } @else {
      <div class="de-grid">
        <nav class="de-nav">
          @for (s of sections(); track s.id) {
            <button type="button" [class.on]="active() === s.id" (click)="active.set(s.id)">
              {{ s.label }}
              @if (s.missingKey && missing(s.missingKey)) { <span class="de-warn-dot" title="No data yet">⚠</span> }
            </button>
          }
        </nav>

        <section class="de-body" [class.de-body-map]="active() === 'map'">
          @switch (active()) {
            @case ('eventConfig') {
              <h3>Event setup</h3>
              <div class="de-form">
                <label><span>Matchmaking start date</span><input type="date" [value]="ec('eventStart')" (input)="setStart($any($event.target).value)" /></label>
                <label><span>End date (incl. recovery · derived)</span><input type="date" [value]="ec('eventEnd')" disabled /></label>
                <label><span>Fight time (default 19:00 UTC)</span><input [value]="ec('zeusTime')" (input)="setEc('zeusTime', $any($event.target).value)" placeholder="19:00 UTC" /></label>
              </div>
              <h4>Kingdoms ({{ kCount() }} servers)</h4>
              <p class="de-hint">Enter each server's number (e.g. <code>8</code>), its map corner, and that server's alliance tags (comma-separated). Colour is fixed by corner.</p>
              <app-editable-grid [columns]="SETUP_COLS" [rows]="setupRows()" [fixedRows]="kCount()" [hideMove]="true" (rowsChange)="setSetupRows($event)" />
            }
            @case ('map') {
              <app-map-editor [slug]="slug()" [eventId]="occId()" />
            }
            @case ('kingdomPoints') {
              @if (isPrep()) {
                <h3>Stage points</h3>
                <p class="de-hint">Per-stage prep totals (billions). Values are locked — use the reconciler below, which keeps them summing to the grand total. Toggle manual edit to override a cell.</p>

                <!-- reconcile calculator -->
                <div class="de-calc">
                  <div class="de-calc-row">
                    <label><span>Current stage</span>
                      <select [value]="calcStage()" (change)="calcStage.set(+$any($event.target).value)">
                        @for (st of prepStageList(); track $index; let i = $index) {
                          <option [value]="i">{{ i + 1 }} · {{ st.label }}</option>
                        }
                      </select>
                    </label>
                    <label><span>This stage — Us (B)</span><input type="number" step="0.001" [value]="calcOursStage()" (input)="calcOursStage.set($any($event.target).value)" /></label>
                    <label><span>Grand total — Us (B)</span><input type="number" step="0.001" [value]="calcOursTotal()" (input)="calcOursTotal.set($any($event.target).value)" /></label>
                    <label><span>This stage — Opp (B)</span><input type="number" step="0.001" [value]="calcOppStage()" (input)="calcOppStage.set($any($event.target).value)" /></label>
                    <label><span>Grand total — Opp (B)</span><input type="number" step="0.001" [value]="calcOppTotal()" (input)="calcOppTotal.set($any($event.target).value)" /></label>
                    <button type="button" class="de-calc-btn" (click)="reconcileStages()">↻ Reconcile</button>
                  </div>
                  @if (calcMsg()) { <p class="de-calc-msg" [class.warn]="calcWarn()">{{ calcMsg() }}</p> }
                  <label class="de-calc-manual"><input type="checkbox" [checked]="stageManual()" (change)="stageManual.set($any($event.target).checked)" /> Allow manual stage edits</label>
                </div>

                <app-editable-grid [columns]="stageCols()" [rows]="stageRows()" [fixedRows]="prepStageList().length" [hideMove]="true" (rowsChange)="setStages($event)" />
              } @else {
                <h3>Kingdom points &amp; scoreboard</h3>
                <p class="de-hint">Last updated {{ kpUpdated() || '—' }} (set automatically on Save). Rank is derived from points.</p>
                <app-editable-grid [columns]="SCOREBOARD_COLS" [rows]="scoreboardRows()" [fixedRows]="kCount()" [hideMove]="true" (rowsChange)="setScoreboard($event)" />
              }
            }
            @case ('alliancePoints') {
              <h3>Alliance points</h3>
              @if (isPrep()) {
                <p class="de-hint">Our alliances (blue) and the opponent's (red). Tags auto-populate from Event Setup; enter points only.</p>
              }
              <app-editable-grid [columns]="ALLIANCE_PTS_COLS" [rows]="alliancePtsRows()" [fixedRows]="alliancePtsRowCount()" [hideMove]="true" (rowsChange)="setAlliancePts($event)" />
            }
            @case ('diplomacy') {
              <h3>Diplomacy / Rules of Engagement</h3>
              <p class="de-hint">One row per opponent server (derived from Event Setup). Only the relation is editable.</p>
              <app-editable-grid [columns]="DIPLOMACY_COLS" [rows]="diplomacyRows()" [fixedRows]="oppCount()" [hideMove]="true" (rowsChange)="setDiplomacy($event)" />
            }
            @case ('scouting') {
              <div class="de-scout-head">
                <h3>Scouting</h3>
                <button type="button" class="de-import" (click)="showImport.set(!showImport())">⇕ Import data</button>
              </div>
              @if (showImport()) {
                <div class="de-import-box">
                  <p class="de-hint">Paste a block per grid below using its own paste box, or expand a section. (Per-grid import.)</p>
                </div>
              }
              @for (srv of scoutServers(); track srv.key) {
                <div class="de-scout">
                  <h4><span class="de-swatch" [style.background]="srv.color"></span> {{ srv.name }}</h4>
                  <h5>Alliances (top 4)</h5>
                  <app-editable-grid [columns]="SCOUT_ALLIANCE_COLS" [rows]="srv.alliances" [fixedRows]="4" [hideMove]="true" (rowsChange)="setScoutGrid(srv.key, 'alliances', $event)" />
                  <h5>Players (top 15)</h5>
                  <app-editable-grid [columns]="scoutPlayerCols(srv.tags)" [rows]="srv.players" [fixedRows]="15" [hideMove]="true" (rowsChange)="setScoutGrid(srv.key, 'players', $event)" />
                </div>
              }
            }
            @case ('serverTiers') {
              <h3>Server tiers</h3>
              <p class="de-hint">Labels are fixed. Server rows derive from Event Setup; enter a count per bracket. Import supported.</p>
              <app-editable-grid [columns]="tierCols()" [rows]="tierRows()" [fixedRows]="kCount()" [hideMove]="true" (rowsChange)="setTiers($event)" />
            }
            @case ('serverDepth') {
              <h3>Server depth</h3>
              <h4>Power</h4>
              <app-editable-grid [columns]="depthCols()" [rows]="depthRows('power')" [fixedRows]="kCount()" [hideMove]="true" (rowsChange)="setDepth('power', $event)" />
              <h4>Merit</h4>
              <app-editable-grid [columns]="depthCols()" [rows]="depthRows('merits')" [fixedRows]="kCount()" [hideMove]="true" (rowsChange)="setDepth('merits', $event)" />
            }
            @case ('placerGold') {
              <h3>Placer economy</h3>
              <p class="de-hint">Gates (by transition), Pillars and Gen /h are <strong>derived from the live map</strong> (read-only) — occupy nodes on the Map tab to change them. Pillars grant buffs/achievements but no placer gold. Only Flags and the peak columns are entered here.</p>
              <app-editable-grid [columns]="PLACER_COLS" [rows]="placerRows()" [fixedRows]="4" [hideMove]="true" (rowsChange)="setPlacer($event)" />
            }
          }
        </section>
      </div>
    }
  `,
  styleUrl: './event-data-editor.page.scss',
})
export class EventDataEditorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly events = inject(EventService);
  private readonly mapStore = inject(MapStateStore);
  private readonly registry = inject(EventRegistryService);
  private readonly clock = inject(ClockService);
  private readonly rosters = inject(ServerRosterService);

  /** Our server's canonical roster (tag+name) from the shared server_rosters
   * table — used to prefill Event Setup + scouting for a fresh occurrence. */
  private readonly ourRoster = signal<RosterAllianceEntry[]>([]);

  readonly slug = toSignal(this.route.paramMap.pipe(map(p => p.get('slug') ?? '')), { initialValue: '' });
  readonly date = toSignal(this.route.paramMap.pipe(map(p => p.get('date') ?? '')), { initialValue: '' });
  readonly fmtServer = fmtServer;
  readonly ourNum = ourServerNumber();

  readonly doc = signal<Doc>({});
  readonly occId = signal<string | null>(null);
  readonly resolved = signal(false);
  readonly active = signal<SectionDef['id']>('eventConfig');
  readonly saving = signal(false);
  readonly saveMsg = signal<string | null>(null);
  readonly saveErr = signal(false);
  readonly showImport = signal(false);

  /** A pending localStorage draft (newer than the DB doc) awaiting Restore/Discard. */
  private readonly pendingDraft = signal<Doc | null>(null);
  readonly draftBanner = computed(() => this.pendingDraft() !== null);
  /** Guards the persist effect from writing while we're still booting / restoring. */
  private draftReady = false;

  /** The occurrence's live-map holdings (keyed by alliance tag) — the source of
   * truth for derived placer gates/pillars/gen. Loaded from event_map_state and
   * recomputed whenever Event Setup (kingdoms/alliances) changes. */
  readonly mapHoldings = signal<Map<string, AllianceHoldings>>(new Map());

  readonly kCount = computed(() => kingdomCount(this.slug()));
  readonly oppCount = computed(() => this.kCount() - 1);

  /** The event's static config (for map/prep detection). */
  private readonly cfg = computed(() => this.registry.getConfig(this.slug()));
  /** Only show the Map section when the event actually has map geometry. */
  readonly hasMap = computed(() => !!this.cfg()?.mapGeometry);
  /** Prep-war events (TME-style): stage points instead of a kingdom scoreboard,
   * no diplomacy, both-sides alliance points. Detected via the prep-tug bar. */
  readonly isPrep = computed(() => this.cfg()?.persistentBar === 'prepTug');
  /** 1v1 events colour us blue / opponent red (vs. corner colours). */
  readonly isDuel = computed(() => this.kCount() === 2);

  /** Row swatch colour for a setup server: us=blue / opp=red in a 1v1, else the
   * map-corner colour. */
  private serverColor(s: SetupServer): string {
    if (this.isDuel()) return s.num === this.ourNum ? US_BLUE : OPP_RED;
    return cornerColor(s.corner).color;
  }

  // ── column defs ──────────────────────────────────────────────────────────
  readonly SETUP_COLS: GridColumn[] = [
    { key: 'num', label: 'Server #', width: '90px' },
    { key: 'corner', label: 'Corner', type: 'select', options: CORNER_NAMES, width: '110px' },
    { key: 'color', label: 'Colour', swatch: true, width: '70px' },
    { key: 'alliances', label: 'Alliances (comma-separated tags)' },
  ];
  readonly SCOREBOARD_COLS: GridColumn[] = [
    { key: 'rank', label: 'Rank', locked: true, width: '60px' },
    { key: 'color', label: '', swatch: true, width: '46px' },
    { key: 'server', label: 'Server', locked: true },
    { key: 'points', label: 'Points' },
  ];
  readonly ALLIANCE_PTS_COLS: GridColumn[] = [
    { key: 'color', label: '', swatch: true, width: '46px' },
    { key: 'tag', label: 'Tag', locked: true },
    { key: 'points', label: 'Points' },
  ];
  readonly DIPLOMACY_COLS: GridColumn[] = [
    { key: 'color', label: '', swatch: true, width: '46px' },
    { key: 'server', label: 'Server', locked: true },
    { key: 'alliances', label: 'Alliances', locked: true },
    { key: 'relation', label: 'Relation', type: 'select', options: ['ally', 'hostile', 'neutral'] },
  ];
  readonly SCOUT_ALLIANCE_COLS: GridColumn[] = [
    { key: 'rank', label: 'Rank', locked: true, width: '60px' },
    { key: 'tag', label: 'Tag' },
    { key: 'name', label: 'Name' },
    { key: 'power', label: 'Power' },
    { key: 'merits', label: 'Merits' },
  ];
  // Gates (by transition), Pillars and Gen/h are DERIVED from the live map
  // (read-only). Pillars give NO placer gold. Only flags + peaks are entered.
  readonly PLACER_COLS: GridColumn[] = [
    { key: 'tag', label: 'Tag', locked: true },
    { key: 'gatesZ1Z2', label: 'Z1→Z2', locked: true, width: '70px' },
    { key: 'gatesZ2Z2', label: 'Z2↔Z2', locked: true, width: '70px' },
    { key: 'gatesZ2Z3', label: 'Z2→Z3', locked: true, width: '70px' },
    { key: 'pillars', label: 'Pillars', locked: true, width: '70px' },
    { key: 'genPerHour', label: 'Gen /h', locked: true, width: '90px' },
    { key: 'flags', label: 'Flags' },
    { key: 'flagsPeak', label: 'Flags peak' },
    { key: 'pillarsPeak', label: 'Pillars peak' },
  ];

  readonly sections = computed<SectionDef[]>(() => {
    const prep = this.isPrep();
    const base: SectionDef[] = [{ id: 'eventConfig', label: 'Event setup', missingKey: 'eventConfig' }];
    // Map only when the event actually has geometry.
    if (this.hasMap()) base.push({ id: 'map', label: 'Map' });
    // Prep events show stage points; land-war events show the kingdom scoreboard.
    base.push({ id: 'kingdomPoints', label: prep ? 'Stage points' : 'Kingdom points', missingKey: 'kingdomScoreboard' });
    base.push({ id: 'alliancePoints', label: 'Alliance points', missingKey: 'alliancePoints' });
    // Diplomacy is land-war only (no diplomacy surface on a prep dashboard).
    if (!prep) base.push({ id: 'diplomacy', label: 'Diplomacy', missingKey: 'diplomacy' });
    base.push({ id: 'scouting', label: 'Scouting', missingKey: 'scouting' });
    base.push({ id: 'serverTiers', label: 'Server tiers', missingKey: 'serverTiers' });
    base.push({ id: 'serverDepth', label: 'Server depth', missingKey: 'serverDepth' });
    if (this.slug() === 'desolate') base.push({ id: 'placerGold', label: 'Placer economy', missingKey: 'placerGold' });
    return base;
  });

  /** Keep the active section valid when the section list changes per event
   * type (e.g. Map hidden for TME) — snap back to Event setup if it vanished. */
  private readonly activeGuard = effect(() => {
    const ids = this.sections().map(s => s.id);
    if (ids.length && !ids.includes(this.active())) this.active.set('eventConfig');
  });

  /** Per-occurrence draft key. Stable across reloads of the same event+date. */
  private draftKey(): string {
    return `aoem.draft.${this.slug()}.${this.date()}`;
  }

  constructor() {
    void this.boot();
    // Persist the working doc to localStorage on every change (reload-survival).
    // In-memory cross-tab update already works via the shared signal; this only
    // adds durability. Gated by draftReady so boot()/restore don't self-trigger.
    effect(() => {
      const d = this.doc();
      if (!this.draftReady || !this.occId()) return;
      try {
        localStorage.setItem(this.draftKey(), JSON.stringify(d));
      } catch {
        /* quota / unavailable — drafts are best-effort */
      }
    });
    // Refresh the live-map holdings whenever the Placer tab is open (DD only).
    // Reads the occurrence's saved live map + current Event Setup, so gate/pillar
    // counts reflect the map the moment the admin opens the tab.
    effect(() => {
      const id = this.occId();
      const isPlacer = this.active() === 'placerGold';
      // touch kingdoms so re-deriving picks up alliance/corner edits
      const kingdomsLen = (this.ecObj()['kingdoms'] as unknown[] | undefined)?.length ?? 0;
      void kingdomsLen;
      if (id && isPlacer) untracked(() => void this.refreshMapHoldings(id));
    });
  }

  /** Load the occurrence's saved LIVE map state and derive per-alliance holdings
   * (gates-by-transition, pillars, gen/h). Empty map → empty holdings. */
  private async refreshMapHoldings(eventId: string): Promise<void> {
    const cfg = this.registry.getConfig(this.slug());
    const geo = cfg?.mapGeometry;
    if (!geo) {
      this.mapHoldings.set(new Map());
      return;
    }
    const live = await this.mapStore.load(eventId, this.slug(), 'live');
    if (!live) {
      this.mapHoldings.set(new Map());
      return;
    }
    // Build the kingdoms + allianceServer maps deriveMapView needs from Setup.
    const setup = this.setup();
    const kingdoms: Kingdom[] = setup.map(s => {
      const cc = cornerColor(s.corner);
      return {
        server: fmtServer(s.num, 'spaced'),
        display: fmtServer(s.num, 'full'),
        corner: s.corner,
        color: cc.color,
        barColor: cc.barColor,
        rgb: cc.rgb,
        us: s.num === this.ourNum,
      };
    });
    const allianceServer: Record<string, string> = {};
    for (const s of setup) for (const tag of s.alliances) allianceServer[tag] = fmtServer(s.num, 'spaced');
    const startMs = Date.parse(this.ec('eventStart'));
    const view = deriveMapView(
      geo,
      live.state,
      live.routes,
      live.strongholds,
      kingdoms,
      allianceServer,
      startMs,
      this.clock.now(),
    );
    this.mapHoldings.set(new Map(view.holdings.map(h => [h.tag, h])));
  }

  private async boot(): Promise<void> {
    const occ = await this.events.resolveByDate(this.slug(), this.date());
    this.resolved.set(true);
    if (!occ) return;
    this.occId.set(occ.id);
    // Our server's canonical roster (shared across all event types) — prefills
    // Event Setup + scouting so our four tags/names aren't retyped per event.
    this.ourRoster.set(await this.rosters.forServer(this.ourNum));
    const dbDoc = await this.events.loadDoc(occ.id);
    if (dbDoc) {
      this.doc.set(dbDoc);
    } else {
      // Fresh occurrence: start EMPTY except for this occurrence's own dates and
      // OUR server pre-seeded (number + its roster tags) from server_rosters —
      // so the admin only enters opponent data + points. Opponent kingdoms stay
      // blank for the admin to fill. Static JSON is NOT inherited.
      const ourTags = this.ourRoster().map(a => a.tag);
      this.doc.set({
        schemaVersion: 2,
        eventConfig: {
          eventStart: occ.startDate,
          eventEnd: deriveEndDate(this.slug(), occ.startDate),
          ourServer: fmtServer(this.ourNum, 'spaced'),
          ourAlliances: ourTags,
          kingdoms: ourTags.length
            ? [{ server: fmtServer(this.ourNum, 'spaced'), display: fmtServer(this.ourNum, 'full'), us: true, alliances: ourTags }]
            : [],
        },
      });
    }
    // A reload-surviving draft? Offer to restore it (don't auto-apply, so the
    // admin can choose the DB truth). Draft becomes live only via Restore.
    this.pendingDraft.set(this.readDraft());
    // From here on, doc changes are the user's — safe to persist.
    this.draftReady = true;
  }

  private readDraft(): Doc | null {
    try {
      const raw = localStorage.getItem(this.draftKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Doc;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  restoreDraft(): void {
    const d = this.pendingDraft();
    if (d) this.doc.set(d);
    this.pendingDraft.set(null);
    this.saveErr.set(false);
    this.saveMsg.set('↩ Draft restored — review, then Save to persist.');
  }

  discardDraft(): void {
    try {
      localStorage.removeItem(this.draftKey());
    } catch {
      /* ignore */
    }
    this.pendingDraft.set(null);
  }

  missing(section: DataSection): boolean {
    return isSectionMissing(this.doc(), section);
  }

  // ── doc helpers ────────────────────────────────────────────────────────────
  private obj(v: unknown): Doc {
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Doc) : {};
  }
  private patch(key: string, value: unknown): void {
    this.doc.set({ ...this.doc(), [key]: value });
  }
  private ecObj(): Doc {
    return this.obj(this.doc()['eventConfig']);
  }
  ec(key: string): string {
    const v = this.ecObj()[key];
    return v == null ? '' : String(v);
  }
  setEc(key: string, value: string): void {
    this.patch('eventConfig', { ...this.ecObj(), [key]: value });
  }

  // ── Event Setup: the single source the other tabs derive from ───────────────
  /** The setup servers, in a stable order (ours first). */
  private setup(): SetupServer[] {
    const kingdoms = (this.ecObj()['kingdoms'] as Doc[] | undefined) ?? [];
    return kingdoms.map(k => ({
      num: serverNumber(String(k['server'] ?? k['num'] ?? '')),
      corner: String(k['corner'] ?? ''),
      alliances: Array.isArray(k['alliances'])
        ? (k['alliances'] as string[])
        : String(k['alliances'] ?? '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
    }));
  }
  private ours(): SetupServer | undefined {
    return this.setup().find(s => s.num === this.ourNum);
  }
  private opponents(): SetupServer[] {
    return this.setup().filter(s => s.num !== this.ourNum);
  }

  setStart(value: string): void {
    const ec = { ...this.ecObj(), eventStart: value, eventEnd: deriveEndDate(this.slug(), value) };
    this.patch('eventConfig', ec);
  }

  setupRows(): GridRow[] {
    const rows = this.setup().map(s => ({
      num: s.num ? String(s.num) : '',
      corner: s.corner,
      color: cornerColor(s.corner).color,
      alliances: s.alliances.join(', '),
    }));
    // seed to the fixed count (first row defaults to ours)
    while (rows.length < this.kCount()) {
      rows.push({ num: rows.length === 0 ? String(this.ourNum) : '', corner: '', color: '#8a90a5', alliances: '' });
    }
    return rows.slice(0, this.kCount());
  }
  setSetupRows(rows: GridRow[]): void {
    const kingdoms = rows.map(r => {
      const num = serverNumber(r['num']);
      const corner = r['corner'];
      const cc = cornerColor(corner);
      const alliances = (r['alliances'] ?? '').split(',').map(s => s.trim()).filter(Boolean);
      return {
        server: fmtServer(num, 'spaced'), // normalized "Era 8" for data compatibility
        display: fmtServer(num, 'full'),
        corner,
        color: cc.color,
        rgb: cc.rgb,
        barColor: cc.barColor,
        us: num === this.ourNum,
        alliances,
      };
    });
    // also keep servers[] + ourServer + ourAlliances in sync for the normalizer
    const ec: Doc = { ...this.ecObj(), kingdoms };
    ec['servers'] = kingdoms.map(k => k['server']);
    ec['ourServer'] = fmtServer(this.ourNum, 'spaced');
    ec['ourAlliances'] = (this.setup().find(s => s.num === this.ourNum)?.alliances) ?? (kingdoms.find(k => k['us'])?.alliances ?? []);
    // recompute ourAlliances from the edited rows
    const oursRow = kingdoms.find(k => k['us']);
    if (oursRow) ec['ourAlliances'] = oursRow['alliances'];
    this.patch('eventConfig', ec);
  }

  // ── Stage points (prep events: TME) + reconcile calculator ──────────────────
  /** Default prep stage labels when the doc has no prep block yet (fresh TME). */
  private static readonly TME_STAGES = ['Forging Gear', 'Enhancing Buildings', 'Enhancing Technologies', 'Unit Training', 'Power Boost'];

  /** The prep stages to render: the doc's own labels if present, else defaults. */
  prepStageList(): { label: string; ours: number; opp: number }[] {
    const prep = this.obj(this.doc()['prep']);
    const stages = (prep['stages'] as Doc[] | undefined) ?? [];
    if (stages.length) {
      return stages.map(s => ({ label: String(s['label'] ?? ''), ours: Number(s['ours']) || 0, opp: Number(s['opp']) || 0 }));
    }
    return EventDataEditorPage.TME_STAGES.map(label => ({ label, ours: 0, opp: 0 }));
  }

  // reconcile calculator inputs
  readonly calcStage = signal(0);
  readonly calcOursStage = signal('');
  readonly calcOursTotal = signal('');
  readonly calcOppStage = signal('');
  readonly calcOppTotal = signal('');
  readonly calcMsg = signal<string | null>(null);
  readonly calcWarn = signal(false);
  /** When off (default) the stage cells are locked; the reconciler writes them. */
  readonly stageManual = signal(false);

  readonly oppLabel = computed(() => this.opponents()[0]?.num ? fmtServer(this.opponents()[0].num, 'full') : 'Opponent');

  stageCols(): GridColumn[] {
    const locked = !this.stageManual();
    return [
      { key: 'stage', label: 'Stage', locked: true },
      { key: 'usColor', label: '', swatch: true, width: '34px' },
      { key: 'ours', label: `Us (B)`, locked },
      { key: 'oppColor', label: '', swatch: true, width: '34px' },
      { key: 'opp', label: `${this.oppLabel()} (B)`, locked },
    ];
  }
  stageRows(): GridRow[] {
    const stages = this.prepStageList();
    const rows: GridRow[] = stages.map((s, i) => ({
      stage: `${i + 1} · ${s.label}`,
      usColor: US_BLUE,
      ours: s.ours ? String(s.ours) : '',
      oppColor: OPP_RED,
      opp: s.opp ? String(s.opp) : '',
    }));
    return rows;
  }
  setStages(rows: GridRow[]): void {
    const labels = this.prepStageList().map(s => s.label);
    const stages = rows.map((r, i) => ({ label: labels[i] ?? '', ours: Number(r['ours']) || 0, opp: Number(r['opp']) || 0 }));
    this.writePrep(stages);
  }

  /** Persist the stage list + derived totals + kingdomScoreboard mirror. */
  private writePrep(stages: { label: string; ours: number; opp: number }[]): void {
    const totalOurs = round3(stages.reduce((a, s) => a + s.ours, 0));
    const totalOpp = round3(stages.reduce((a, s) => a + s.opp, 0));
    const prep = this.obj(this.doc()['prep']);
    const ourRankings = (prep['ourRankings'] as unknown) ?? [];
    const oppRankings = (prep['oppRankings'] as unknown) ?? [];
    this.patch('prep', {
      ...prep,
      stages,
      totalOurs,
      totalOpp,
      ourLabel: fmtServer(this.ourNum, 'full'),
      oppLabel: this.oppLabel(),
      ourRankings,
      oppRankings,
    });
    // Mirror the tug totals into the kingdom scoreboard the persistent bar reads
    // (us vs opponent, scaled to raw points — billions × 1e9).
    this.patch('kingdomScoreboard', [
      { server: fmtServer(this.ourNum, 'spaced'), points: totalOurs * 1e9 },
      { server: fmtServer(this.opponents()[0]?.num ?? 0, 'spaced'), points: totalOpp * 1e9 },
    ]);
  }

  /** Reconcile: set the current stage to the entered value, then true-up the
   * PRIOR stage so the stages sum to the grand total (missing points land on
   * yesterday). Stage 1 = grand total. Clamp negatives to 0 with a warning. */
  reconcileStages(): void {
    const stages = this.prepStageList().map(s => ({ ...s }));
    const idx = Math.max(0, Math.min(this.calcStage(), stages.length - 1));
    const num = (v: string) => (v.trim() === '' ? null : Number(v));
    let warned = false;
    const apply = (key: 'ours' | 'opp', stageVal: number | null, totalStr: string) => {
      const total = num(totalStr);
      if (total == null || !Number.isFinite(total)) return; // no grand total → skip this side
      const r = reconcileStage(stages.map(s => s[key]), idx, stageVal, total);
      r.values.forEach((v, i) => (stages[i][key] = v));
      if (r.clamped) warned = true;
    };
    apply('ours', num(this.calcOursStage()), this.calcOursTotal());
    apply('opp', num(this.calcOppStage()), this.calcOppTotal());
    this.writePrep(stages);
    this.calcWarn.set(warned);
    this.calcMsg.set(
      warned
        ? '⚠ Totals don’t reconcile — the prior stage would go negative (clamped to 0). Check your numbers.'
        : '✓ Stages reconciled to the grand total.',
    );
  }

  // ── Kingdom points / scoreboard ─────────────────────────────────────────────
  kpUpdated(): string {
    return String(this.obj(this.doc()['kingdomPoints'])['lastUpdated'] ?? '');
  }
  scoreboardRows(): GridRow[] {
    const existing = (this.doc()['kingdomScoreboard'] as Doc[] | undefined) ?? [];
    const pointsByServer = new Map(existing.map(r => [serverNumber(String(r['server'] ?? '')), String(r['points'] ?? '')]));
    const rows = this.setup().map(s => ({
      server: fmtServer(s.num, 'full'),
      color: cornerColor(s.corner).color,
      points: pointsByServer.get(s.num) ?? '',
      rank: '',
    }));
    const ranks = rankByDesc(rows, 'points');
    rows.forEach((r, i) => (r.rank = String(ranks[i])));
    return rows;
  }
  setScoreboard(rows: GridRow[]): void {
    const servers = this.setup();
    const out = rows.map((r, i) => ({ server: fmtServer(servers[i]?.num ?? 0, 'spaced'), points: r['points'] }));
    this.patch('kingdomScoreboard', out);
  }

  // ── Alliance points ─────────────────────────────────────────────────────────
  /** Rows = our 4 alliances (blue), plus the opponent's 4 (red) for prep events.
   * Tags auto-populate from Event Setup (locked); only points are editable;
   * colour is us-blue / opp-red; no rank (entry order is irrelevant). */
  private alliancePtsSides(): { tag: string; side: 'us' | 'opp' }[] {
    const sides: { tag: string; side: 'us' | 'opp' }[] = (this.ours()?.alliances ?? []).map(tag => ({ tag, side: 'us' }));
    if (this.isPrep()) {
      const opp = this.opponents()[0]?.alliances ?? [];
      for (const tag of opp.slice(0, 4)) sides.push({ tag, side: 'opp' });
    }
    return sides;
  }
  alliancePtsRowCount(): number {
    return this.isPrep() ? 8 : 4;
  }
  alliancePtsRows(): GridRow[] {
    const sides = this.alliancePtsSides();
    const existing = (this.doc()['alliancePoints'] as Doc[] | undefined) ?? [];
    const ptsByTag = new Map(existing.map(r => [String(r['tag'] ?? ''), String(r['points'] ?? '')]));
    const count = this.alliancePtsRowCount();
    return Array.from({ length: count }, (_, i) => {
      const s = sides[i];
      return {
        color: s ? (s.side === 'us' ? US_BLUE : OPP_RED) : '#8a90a5',
        tag: s?.tag ?? '',
        points: ptsByTag.get(s?.tag ?? '') ?? '',
      };
    });
  }
  setAlliancePts(rows: GridRow[]): void {
    const sides = this.alliancePtsSides();
    this.patch(
      'alliancePoints',
      rows.map((r, i) => ({ tag: sides[i]?.tag ?? '', points: r['points'], side: sides[i]?.side })),
    );
  }

  // ── Diplomacy ────────────────────────────────────────────────────────────────
  diplomacyRows(): GridRow[] {
    const opps = this.opponents();
    const existing = (this.doc()['diplomacy'] as Doc[] | undefined) ?? [];
    const relByServer = new Map(existing.map(r => [serverNumber(String(r['server'] ?? '')), String(r['relation'] ?? '')]));
    return opps.map(s => ({
      color: cornerColor(s.corner).color,
      server: fmtServer(s.num, 'full'),
      alliances: s.alliances.join(', '),
      relation: relByServer.get(s.num) ?? '',
    }));
  }
  setDiplomacy(rows: GridRow[]): void {
    const opps = this.opponents();
    this.patch(
      'diplomacy',
      rows.map((r, i) => ({
        id: i + 1,
        server: fmtServer(opps[i]?.num ?? 0, 'spaced'),
        alliance: (opps[i]?.alliances ?? []).join(', ') || 'TBD',
        relation: r['relation'],
        notes: relationNote(r['relation'] ?? ''),
      })),
    );
  }

  // ── Scouting ─────────────────────────────────────────────────────────────────
  scoutPlayerCols(tags: string[]): GridColumn[] {
    const opts = [...tags, 'Other', '-'];
    return [
      { key: 'rank', label: 'Rank', locked: true, width: '60px' },
      { key: 'name', label: 'Name' },
      { key: 'alliance', label: 'Alliance', type: 'select', options: opts },
      { key: 'power', label: 'Power' },
      { key: 'merits', label: 'Merits' },
    ];
  }
  scoutServers(): { key: string; name: string; color: string; tags: string[]; alliances: GridRow[]; players: GridRow[] }[] {
    const research = this.obj(this.doc()['research']);
    const rosterFor = (num: number): Doc => {
      if (num === this.ourNum) return this.obj(research['ours']);
      const opps = (research['opponents'] as Doc[] | undefined) ?? [];
      return this.obj(opps.find(o => serverNumber(String(o['server'] ?? '')) === num));
    };
    const ourNameByTag = new Map(this.ourRoster().map(a => [a.tag, a.name]));
    return this.setup().map(s => {
      const roster = rosterFor(s.num);
      const allianceRows = ((roster['alliances'] as Doc[] | undefined) ?? []).map(a => ({
        tag: String(a['tag'] ?? ''),
        name: String(a['name'] ?? ''),
        power: String(a['power'] ?? ''),
        merits: String(a['merits'] ?? ''),
        rank: '',
      }));
      // Prefill blank rows with this server's known tags from Event Setup (and
      // our server's canonical names) so the admin isn't typing tags twice.
      s.alliances.forEach((tag, i) => {
        const r = allianceRows[i];
        if (r && !r.tag) {
          r.tag = tag;
          if (!r.name) r.name = ourNameByTag.get(tag) ?? '';
        } else if (!r) {
          allianceRows.push({ tag, name: ourNameByTag.get(tag) ?? '', power: '', merits: '', rank: '' });
        }
      });
      while (allianceRows.length < 4) allianceRows.push({ tag: '', name: '', power: '', merits: '', rank: '' });
      const aRanks = rankByDesc(allianceRows, 'power');
      allianceRows.forEach((r, i) => (r['rank'] = String(aRanks[i])));

      const playerRows = ((roster['players'] as Doc[] | undefined) ?? []).map(p => ({
        name: String(p['name'] ?? ''),
        alliance: String(p['alliance'] ?? ''),
        power: String(p['power'] ?? ''),
        merits: String(p['merits'] ?? ''),
        rank: '',
      }));
      while (playerRows.length < 15) playerRows.push({ name: '', alliance: '', power: '', merits: '', rank: '' });
      const pRanks = rankByDesc(playerRows, 'power');
      playerRows.forEach((r, i) => (r['rank'] = String(pRanks[i])));

      return {
        key: s.num === this.ourNum ? 'ours' : `n${s.num}`,
        name: fmtServer(s.num, 'full'),
        color: cornerColor(s.corner).color,
        tags: s.alliances,
        alliances: allianceRows.slice(0, 4),
        players: playerRows.slice(0, 15),
      };
    });
  }
  setScoutGrid(key: string, which: 'alliances' | 'players', rows: GridRow[]): void {
    const research = { ...this.obj(this.doc()['research']) };
    const strip = (r: GridRow) => {
      const { rank, ...rest } = r; // rank is derived — don't persist
      void rank;
      return rest;
    };
    const payload = rows.map(strip);
    if (key === 'ours') {
      research['ours'] = { ...this.obj(research['ours']), [which]: payload };
    } else {
      const num = Number(key.replace('n', ''));
      const opps = Array.isArray(research['opponents']) ? [...(research['opponents'] as Doc[])] : [];
      let idx = opps.findIndex(o => serverNumber(String(o['server'] ?? '')) === num);
      if (idx < 0) {
        opps.push({ server: fmtServer(num, 'spaced') });
        idx = opps.length - 1;
      }
      opps[idx] = { ...this.obj(opps[idx]), server: fmtServer(num, 'spaced'), [which]: payload };
      research['opponents'] = opps;
    }
    this.patch('research', research);
  }

  // ── Server tiers (fixed labels) ──────────────────────────────────────────────
  private tierLabels(): string[] {
    const labels = this.obj(this.doc()['serverTiers'])['labels'] as string[] | undefined;
    return labels?.length ? labels : ['100M+', '200M+', '300M+', '400M+', '500M+'];
  }
  tierCols(): GridColumn[] {
    return [
      { key: 'color', label: '', swatch: true, width: '46px' },
      { key: 'server', label: 'Server', locked: true },
      ...this.tierLabels().map((l, i) => ({ key: `c${i}`, label: l })),
    ];
  }
  tierRows(): GridRow[] {
    const byServer = this.obj(this.obj(this.doc()['serverTiers'])['byServer']);
    return this.setup().map(s => {
      const counts = (byServer[fmtServer(s.num, 'spaced')] as number[] | undefined) ?? [];
      const row: GridRow = { color: this.serverColor(s), server: fmtServer(s.num, 'full') };
      this.tierLabels().forEach((_, i) => (row[`c${i}`] = counts[i] != null ? String(counts[i]) : ''));
      return row;
    });
  }
  setTiers(rows: GridRow[]): void {
    const servers = this.setup();
    const labels = this.tierLabels();
    const byServer: Doc = {};
    rows.forEach((r, i) => {
      const num = servers[i]?.num;
      if (!num) return;
      byServer[fmtServer(num, 'spaced')] = labels.map((_, j) => Number(r[`c${j}`]) || 0);
    });
    this.patch('serverTiers', { labels, byServer });
  }

  // ── Server depth (two grids: power, merits) ──────────────────────────────────
  private depthRanks(): number[] {
    const ranks = this.obj(this.doc()['serverDepth'])['ranks'] as number[] | undefined;
    return ranks?.length ? ranks : [1, 10, 50, 100, 200, 300];
  }
  depthCols(): GridColumn[] {
    return [
      { key: 'color', label: '', swatch: true, width: '46px' },
      { key: 'server', label: 'Server', locked: true },
      ...this.depthRanks().map((r, i) => ({ key: `r${i}`, label: `#${r}` })),
    ];
  }
  depthRows(metric: 'power' | 'merits'): GridRow[] {
    const byServer = this.obj(this.obj(this.doc()['serverDepth'])['byServer']);
    return this.setup().map(s => {
      const entry = this.obj(byServer[fmtServer(s.num, 'spaced')]);
      const vals = (entry[metric] as number[] | undefined) ?? [];
      const row: GridRow = { color: this.serverColor(s), server: fmtServer(s.num, 'full') };
      this.depthRanks().forEach((_, i) => (row[`r${i}`] = vals[i] != null ? String(vals[i]) : ''));
      return row;
    });
  }
  setDepth(metric: 'power' | 'merits', rows: GridRow[]): void {
    const servers = this.setup();
    const ranks = this.depthRanks();
    const cur = this.obj(this.doc()['serverDepth']);
    const byServer: Doc = { ...this.obj(cur['byServer']) };
    rows.forEach((r, i) => {
      const num = servers[i]?.num;
      if (!num) return;
      const name = fmtServer(num, 'spaced');
      const entry = this.obj(byServer[name]);
      entry[metric] = ranks.map((_, j) => Number(r[`r${j}`]) || 0);
      byServer[name] = entry;
    });
    this.patch('serverDepth', { ranks, byServer });
  }

  // ── Placer (DD) ──────────────────────────────────────────────────────────────
  placerRows(): GridRow[] {
    const tags = this.ours()?.alliances ?? [];
    const existing = ((this.obj(this.doc()['placerGold'])['alliances'] as Doc[] | undefined) ?? []);
    const byTag = new Map(existing.map(a => [String(a['tag'] ?? ''), a]));
    const holdings = this.mapHoldings();
    return Array.from({ length: 4 }, (_, i) => {
      const tag = tags[i] ?? '';
      const a = this.obj(byTag.get(tag));
      const h = holdings.get(tag);
      const r: GridRow = { tag };
      // editable: flags + peaks
      for (const k of ['flags', 'flagsPeak', 'pillarsPeak']) {
        r[k] = a[k] == null ? '' : String(a[k]);
      }
      // derived (read-only) from the live map — empty map ⇒ 0s
      r['gatesZ1Z2'] = String(h?.gatesZ1Z2 ?? 0);
      r['gatesZ2Z2'] = String(h?.gatesZ2Z2 ?? 0);
      r['gatesZ2Z3'] = String(h?.gatesZ2Z3 ?? 0);
      r['pillars'] = String(h?.pillars ?? 0);
      r['genPerHour'] = h ? `+${h.placerPerHour.toLocaleString()}` : '0';
      return r;
    });
  }
  setPlacer(rows: GridRow[]): void {
    const tags = this.ours()?.alliances ?? [];
    const p = this.obj(this.doc()['placerGold']);
    const holdings = this.mapHoldings();
    const alliances = rows.map((r, i) => {
      const tag = tags[i] ?? '';
      const h = holdings.get(tag);
      return {
        tag,
        flags: Number(r['flags']) || 0,
        flagsPeak: Number(r['flagsPeak']) || 0,
        pillarsPeak: Number(r['pillarsPeak']) || 0,
        // persist the map-derived counts so the dashboard has a fallback when
        // it loads the doc before the map holdings resolve.
        pillarCities: h?.pillars ?? 0,
        gates: h?.gates ?? 0,
        gatesZ1Z2: h?.gatesZ1Z2 ?? 0,
        gatesZ2Z2: h?.gatesZ2Z2 ?? 0,
        gatesZ2Z3: h?.gatesZ2Z3 ?? 0,
      };
    });
    this.patch('placerGold', { ...p, alliances });
  }

  // ── CSV template import/export ──────────────────────────────────────────────
  downloadCsv(): void {
    const text = buildTemplate(this.doc());
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.slug()}-${this.date()}-data.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  uploadCsv(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        this.doc.set(applyCsv(this.doc(), String(reader.result ?? '')));
        this.saveErr.set(false);
        this.saveMsg.set('✓ CSV imported into the form — review, then Save to persist.');
      } catch {
        this.saveErr.set(true);
        this.saveMsg.set('Could not parse that CSV.');
      }
    };
    reader.readAsText(file);
    input.value = ''; // allow re-uploading the same file
  }

  // ── save ─────────────────────────────────────────────────────────────────────
  async save(): Promise<void> {
    const id = this.occId();
    if (!id || this.saving()) return;
    this.saving.set(true);
    this.saveMsg.set(null);
    this.saveErr.set(false);
    // stamp the derived last-updated date on save
    const today = this.date() || new Date().toISOString().slice(0, 10);
    this.patch('kingdomPoints', { ...this.obj(this.doc()['kingdomPoints']), lastUpdated: today });
    const { error } = await this.events.saveDoc(id, this.doc());
    this.saving.set(false);
    if (error) {
      this.saveErr.set(true);
      this.saveMsg.set(`Save failed: ${error}`);
    } else {
      // Persisted to the DB → the local draft is now redundant; clear it.
      this.discardDraft();
      this.saveMsg.set('✓ Saved — live on the dashboard now.');
    }
  }
}

/** Round to 3 decimals (prep points are in billions, e.g. 1.472). */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
