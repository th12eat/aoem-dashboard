import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { EventData } from '@shared/models/event-data.model';
import { getPath } from '@shared/utils/get-path';
import { WIDGET_REGISTRY } from './widget-registry';

/** True when a bound data slice carries nothing to render: null/undefined, an
 * empty array, or an object with no own keys (or whose array fields are all
 * empty, e.g. {actual:[],planned:[]} or {ours,opponents} rosters). */
function isEmptyData(v: unknown): boolean {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') {
    const vals = Object.values(v as Record<string, unknown>);
    if (vals.length === 0) return true;
    // all-array object (routes, research) → empty iff every array is empty
    if (vals.every(x => Array.isArray(x))) return vals.every(x => (x as unknown[]).length === 0);
    return false;
  }
  return false;
}

/**
 * Renders a single widget from its config, wrapped in the standard section card
 * (the 1.0 S.card box: dark panel, border, Bebas accent title + underline) —
 * so every section is visually boxed without each widget re-implementing it.
 *
 * Layout decisions, all here (not in the widgets):
 *   • card === false  → render bare (e.g. kingdomBar, which has its own chrome)
 *   • collapsible      → card with a clickable title header + ▾ chevron
 *   • otherwise        → card with a static title header
 * The title always comes from config.titleKey and is rendered by the card, so
 * widgets never draw their own heading (WidgetHost passes titleKey: undefined
 * down to the inner component).
 *
 * An unknown kind renders a visible, non-fatal diagnostic rather than throwing.
 */
@Component({
  selector: 'app-widget-host',
  imports: [NgComponentOutlet, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!component()) {
      <div class="widget-unknown">Unknown widget kind: "{{ config().kind }}"</div>
    } @else if (config().card === false) {
      <ng-container *ngComponentOutlet="component()!; inputs: innerInputs()" />
    } @else {
      <section class="card" [id]="config().anchor || null">
        @if (title()) {
          @if (config().collapsible) {
            <button type="button" class="card-title card-toggle" (click)="toggle()">
              <span>{{ title()! | translate }}</span>
              <span class="card-caret" [class.open]="open()">▾</span>
            </button>
          } @else {
            <h3 class="card-title">{{ title()! | translate }}</h3>
          }
        }
        @if (!config().collapsible || open()) {
          <div class="card-body">
            @if (dataMissing()) {
              <p class="widget-missing">{{ 'common.missingData' | translate }}</p>
            } @else {
              <ng-container *ngComponentOutlet="component()!; inputs: innerInputs()" />
            }
          </div>
        }
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        margin-bottom: 16px;
      }
      .widget-unknown {
        border: 1px dashed var(--accent-red);
        color: var(--accent-red);
        border-radius: 8px;
        padding: 10px 14px;
        font-family: var(--font-mono);
        font-size: var(--fs-label);
      }
      .card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 16px;
      }
      .card-title {
        font-family: var(--font-display);
        font-size: var(--fs-h2);
        font-weight: 400;
        color: var(--kvk-accent);
        letter-spacing: 2px;
        padding: 0 0 6px;
        margin: 0 0 12px;
        border-bottom: 1px solid var(--border);
      }
      .card-toggle {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: none;
        border: none;
        border-bottom: 1px solid var(--border);
        cursor: pointer;
        text-align: left;
      }
      .card-caret {
        color: var(--text-muted);
        transition: transform 0.15s;
      }
      .card-caret.open {
        transform: rotate(180deg);
      }
      .widget-missing {
        color: var(--text-muted);
        font-size: var(--fs-label);
        font-style: italic;
        margin: 0;
        padding: 6px 2px;
      }
    `,
  ],
})
export class WidgetHostComponent {
  readonly config = input.required<WidgetConfig>();
  readonly eventData = input.required<EventData>();

  readonly component = computed(() => WIDGET_REGISTRY[this.config().kind] ?? null);
  readonly title = computed(() => this.config().titleKey);

  private readonly userToggled = signal<boolean | null>(null);
  /** Collapsible open state: user choice if any, else config.defaultOpen. */
  readonly open = computed(() => this.userToggled() ?? this.config().defaultOpen === true);

  /** The bind-resolved data slice for the inner widget. */
  private readonly boundData = computed(() => getPath(this.eventData(), this.config().bind));

  /** Inputs for the inner widget: the bind-resolved data slice, and a config
   * with titleKey stripped (the card owns the title). */
  readonly innerInputs = computed<Record<string, unknown>>(() => ({
    config: { ...this.config(), titleKey: undefined },
    data: this.boundData(),
  }));

  /** Show a "data not available" notice when a DATA-BOUND widget has an empty
   * slice (empty array / object / null). Widgets that render from `options`
   * (no bind — richText, cardGrid, specTable, scheduleWindows) are never
   * flagged. The map widget is exempt (it draws geometry even when empty). */
  readonly dataMissing = computed(() => {
    const cfg = this.config();
    if (!cfg.bind || cfg.kind === 'map') return false;
    return isEmptyData(this.boundData());
  });

  toggle(): void {
    this.userToggled.set(!this.open());
  }
}
