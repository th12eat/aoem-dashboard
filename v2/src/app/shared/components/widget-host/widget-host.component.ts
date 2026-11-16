import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { EventData } from '@shared/models/event-data.model';
import { getPath } from '@shared/utils/get-path';
import { WIDGET_REGISTRY } from './widget-registry';

/**
 * Renders a single widget from its config. Looks the component up in
 * WIDGET_REGISTRY by `kind`, resolves the widget's `bind` path against the
 * full EventData, and instantiates the component via ngComponentOutlet with the
 * uniform { config, data } inputs. An unknown kind renders a visible, non-fatal
 * diagnostic rather than throwing.
 *
 * When config.collapsible is set, the widget is wrapped in a card with a
 * clickable header + ▾ chevron (1.0 srcOpen/yieldOpen/costOpen sections). The
 * widget's own titleKey is used as the collapsible header label.
 */
@Component({
  selector: 'app-widget-host',
  imports: [NgComponentOutlet, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!component()) {
      <div class="widget-unknown">Unknown widget kind: "{{ config().kind }}"</div>
    } @else if (config().collapsible) {
      <div class="collapse-card">
        <button type="button" class="collapse-head" (click)="toggle()">
          <span>{{ config().titleKey ? (config().titleKey! | translate) : '' }}</span>
          <span class="collapse-caret" [class.open]="open()">▾</span>
        </button>
        @if (open()) {
          <div class="collapse-body">
            <ng-container *ngComponentOutlet="component()!; inputs: innerInputs()" />
          </div>
        }
      </div>
    } @else {
      <ng-container *ngComponentOutlet="component()!; inputs: inputs()" />
    }
  `,
  styles: [
    `
      :host {
        display: block;
        margin-bottom: 20px;
      }
      .widget-unknown {
        border: 1px dashed var(--accent-red);
        color: var(--accent-red);
        border-radius: 8px;
        padding: 10px 14px;
        font-family: var(--font-mono);
        font-size: var(--fs-label);
      }
      .collapse-card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 9px;
        overflow: hidden;
      }
      .collapse-head {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        background: none;
        border: none;
        cursor: pointer;
        font-family: var(--font-display);
        font-size: var(--fs-h3);
        letter-spacing: 1px;
        color: var(--text-primary);
      }
      .collapse-caret {
        color: var(--text-muted);
        transition: transform 0.15s;
      }
      .collapse-caret.open {
        transform: rotate(180deg);
      }
      .collapse-body {
        padding: 0 14px 14px;
      }
    `,
  ],
})
export class WidgetHostComponent {
  readonly config = input.required<WidgetConfig>();
  readonly eventData = input.required<EventData>();

  readonly component = computed(() => WIDGET_REGISTRY[this.config().kind] ?? null);

  private readonly userToggled = signal<boolean | null>(null);
  /** Collapsible open state: user choice if any, else config.defaultOpen. */
  readonly open = computed(() => this.userToggled() ?? this.config().defaultOpen === true);

  /** Inputs handed to the rendered widget. `data` is the bind-resolved slice
   * (or the whole EventData when no bind is given). */
  readonly inputs = computed<Record<string, unknown>>(() => ({
    config: this.config(),
    data: getPath(this.eventData(), this.config().bind),
  }));

  /** Inside a collapsible card the title is rendered by the card header, so
   * suppress the widget's own duplicate title. */
  readonly innerInputs = computed<Record<string, unknown>>(() => ({
    config: { ...this.config(), titleKey: undefined },
    data: getPath(this.eventData(), this.config().bind),
  }));

  toggle(): void {
    this.userToggled.set(!this.open());
  }
}
