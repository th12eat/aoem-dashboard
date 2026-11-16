import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { TabConfig } from '@shared/models/event-dashboard-config.model';

/**
 * Shared tab bar (ported `.tabs` look). Presentational: it takes the tab list
 * and the active id, and emits selection. The parent owns which tab is active
 * (so it can sync with the URL fragment).
 */
@Component({
  selector: 'app-tab-bar',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="tabs">
      @for (tab of tabs(); track tab.id) {
        <button type="button" class="tab" [class.active]="tab.id === activeId()" (click)="tabSelect.emit(tab.id)">
          {{ tab.labelKey | translate }}
        </button>
      }
    </nav>
  `,
})
export class TabBarComponent {
  readonly tabs = input.required<TabConfig[]>();
  readonly activeId = input.required<string>();
  readonly tabSelect = output<string>();
}
