import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { EventRegistryService } from '@core/services/event-registry.service';
import { EventService, type EventOccurrence, type OccurrenceStatus } from '@core/services/event.service';
import { ACCESS } from '@core/access/access.service';
import { withPlacements } from '@shared/utils/placement';

/**
 * Admin "Create Events" page (strategist+). Input one or more event occurrences
 * (type + start date), then manage their lifecycle: Publish (awaiting→published
 * reveals the full dashboard), Mark complete, View, and — developer only —
 * Delete. The actual per-section data-entry editor is the NEXT chunk; here the
 * "Edit data" link is a disabled stub. Native inputs, mirrors admin-hub/map-editor.
 */
@Component({
  selector: 'app-admin-events',
  imports: [RouterLink, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="kvk-header" data-kvk="generic">
      <div class="kvk-tag">Admin · Events</div>
      <h1 class="kvk-title">EVENT LIFECYCLE</h1>
      <div class="kvk-subtitle">Create occurrences · publish when matchmaking's done · archive when over</div>
    </header>

    <main class="ae">
      <a routerLink="/admin" class="ae-back">← Admin</a>

      <!-- create -->
      <section class="ae-card">
        <h3>New occurrence</h3>
        <div class="ae-form">
          <label><span>Event type</span>
            <select [value]="newType()" (change)="newType.set($any($event.target).value)">
              @for (t of types; track t.slug) {
                <option [value]="t.slug">{{ t.titleKey | translate }}</option>
              }
            </select>
          </label>
          <label><span>Start date</span>
            <input type="date" [value]="newDate()" (change)="newDate.set($any($event.target).value)" />
          </label>
          <button type="button" class="ae-btn primary" (click)="create()" [disabled]="busy() || !newDate()">
            {{ busy() ? 'Working…' : '+ Create' }}
          </button>
        </div>
        @if (msg()) { <p class="ae-msg" [class.err]="err()">{{ msg() }}</p> }
      </section>

      <!-- existing -->
      <section class="ae-card">
        <h3>Occurrences</h3>
        @if (occurrences().length === 0) {
          <p class="ae-empty">No occurrences yet. Create one above.</p>
        } @else {
          <table class="ae-table">
            <thead>
              <tr><th>Type</th><th>Start</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              @for (o of occurrences(); track o.id) {
                <tr>
                  <td>{{ titleFor(o.typeSlug) }}</td>
                  <td>{{ o.startDate }}</td>
                  <td><span class="ae-pill" [attr.data-s]="o.status">{{ o.status }}</span></td>
                  <td class="ae-actions">
                    @if (o.status === 'awaiting') {
                      <button type="button" (click)="setStatus(o, 'published')">Publish</button>
                    } @else if (o.status === 'published') {
                      <button type="button" (click)="setStatus(o, 'awaiting')">Unpublish</button>
                      <button type="button" (click)="setStatus(o, 'complete')">Mark complete</button>
                    } @else {
                      <button type="button" (click)="setStatus(o, 'published')">Reopen</button>
                    }
                    <a [routerLink]="viewLink(o)">View</a>
                    <a [routerLink]="['/admin', o.typeSlug, 'data', o.startDate]">Edit data</a>
                    @if (canDelete()) {
                      <button type="button" class="danger" (click)="remove(o)">Delete</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .ae {
        max-width: var(--w-content);
        margin: 0 auto;
        padding: 16px 20px 48px;
      }
      .ae-back {
        color: var(--text-muted);
        text-decoration: none;
        font-size: var(--fs-label);
      }
      .ae-card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        margin-top: 14px;
      }
      .ae-card h3 {
        margin: 0 0 12px;
        color: var(--kvk-accent);
      }
      .ae-form {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 12px;
      }
      .ae-form label {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .ae-form span {
        font-size: var(--fs-micro);
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .ae-form select,
      .ae-form input {
        background: var(--bg-card2);
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text-primary);
        padding: 7px 9px;
        font: inherit;
      }
      .ae-btn {
        border: 1px solid var(--border);
        border-radius: 6px;
        background: var(--bg-card2);
        color: var(--text-secondary);
        padding: 8px 14px;
        font-weight: 700;
        cursor: pointer;
      }
      .ae-btn.primary {
        background: var(--kvk-accent);
        color: #0a0c14;
        border-color: var(--kvk-accent);
      }
      .ae-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .ae-msg {
        margin: 10px 0 0;
        font-size: var(--fs-label);
        color: #22c55e;
      }
      .ae-msg.err {
        color: var(--accent-red);
      }
      .ae-empty {
        color: var(--text-muted);
      }
      .ae-table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--fs-label);
      }
      .ae-table th,
      .ae-table td {
        text-align: left;
        padding: 8px 10px;
        border-bottom: 1px solid var(--border);
      }
      .ae-table th {
        color: var(--text-muted);
        text-transform: uppercase;
        font-size: var(--fs-micro);
      }
      .ae-pill {
        padding: 2px 8px;
        border-radius: 999px;
        font-size: var(--fs-micro);
        text-transform: uppercase;
        border: 1px solid var(--border);
      }
      .ae-pill[data-s='awaiting'] {
        color: #f5b942;
        border-color: #f5b942;
      }
      .ae-pill[data-s='published'] {
        color: #22c55e;
        border-color: #22c55e;
      }
      .ae-pill[data-s='complete'] {
        color: var(--text-muted);
      }
      .ae-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .ae-actions button,
      .ae-actions a {
        background: var(--bg-card2);
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text-secondary);
        padding: 4px 10px;
        font: inherit;
        cursor: pointer;
        text-decoration: none;
      }
      .ae-actions button.danger {
        color: var(--accent-red);
        border-color: var(--accent-red);
      }
      .ae-stub {
        color: var(--text-muted);
        opacity: 0.5;
        padding: 4px 10px;
        border: 1px dashed var(--border);
        border-radius: 6px;
        cursor: not-allowed;
      }
    `,
  ],
})
export class AdminEventsPage {
  private readonly registry = inject(EventRegistryService);
  private readonly events = inject(EventService);
  private readonly access = inject(ACCESS);

  /** Known event types for the create dropdown (from the registry). */
  readonly types = this.registry.list().map(c => ({ slug: c.slug, titleKey: c.titleKey }));

  readonly newType = signal<string>(this.types[0]?.slug ?? '');
  readonly newDate = signal<string>('');
  readonly busy = signal(false);
  readonly msg = signal<string | null>(null);
  readonly err = signal(false);
  readonly occurrences = signal<EventOccurrence[]>([]);

  readonly canDelete = computed(() => this.access.can('edit-geometry'));

  constructor() {
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    this.occurrences.set(await this.events.listAll());
  }

  titleFor(slug: string): string {
    return this.types.find(t => t.slug === slug)?.slug ?? slug;
  }

  viewLink(o: EventOccurrence): unknown[] {
    // The latest/current occurrence shows at /dashboards/:slug; any specific
    // one is reachable by its date. Point every row at its dated URL for clarity.
    return ['/dashboards', o.typeSlug, 'history', o.startDate];
  }

  async create(): Promise<void> {
    if (this.busy() || !this.newDate()) return;
    this.busy.set(true);
    this.msg.set(null);
    this.err.set(false);
    const { error } = await this.events.createOccurrence(this.newType(), this.newDate());
    this.busy.set(false);
    if (error) {
      this.err.set(true);
      this.msg.set(error.includes('duplicate') ? 'That type already has an occurrence on that date.' : `Create failed: ${error}`);
      return;
    }
    this.msg.set('✓ Occurrence created (awaiting).');
    this.newDate.set('');
    await this.refresh();
  }

  async setStatus(o: EventOccurrence, status: OccurrenceStatus): Promise<void> {
    const { error } = await this.events.setStatus(o.id, status);
    if (error) {
      this.err.set(true);
      this.msg.set(`Update failed: ${error}`);
      return;
    }
    // On completion, compute + persist each server's final placement from the
    // kingdom scoreboard points (the history page + dashboard read it).
    if (status === 'complete') {
      const doc = await this.events.loadDoc(o.id);
      if (doc) {
        const stamped = withPlacements(doc);
        if (stamped !== doc) {
          const res = await this.events.saveDoc(o.id, stamped);
          if (res.error) {
            this.err.set(true);
            this.msg.set(`Marked complete, but placement save failed: ${res.error}`);
          } else {
            this.msg.set('✓ Marked complete — placements computed from kingdom points.');
          }
        }
      }
    }
    await this.refresh();
  }

  async remove(o: EventOccurrence): Promise<void> {
    if (!window.confirm(`Delete the ${o.typeSlug} occurrence on ${o.startDate}? This cannot be undone.`)) return;
    const { error } = await this.events.deleteOccurrence(o.id);
    if (error) {
      this.err.set(true);
      this.msg.set(`Delete failed: ${error}`);
      return;
    }
    await this.refresh();
  }
}
