import { InputSignal } from '@angular/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { EventData } from '@shared/models/event-data.model';

/**
 * Every widget component implements this input contract. WidgetHost sets both
 * inputs via ngComponentOutlet:
 *   - `config`: this widget's WidgetConfig (kind, bind, titleKey, options)
 *   - `data`:   the `bind`-resolved slice of EventData (or the whole EventData
 *               for self-contained widgets like header/countdown).
 *
 * Keeping the contract uniform is what lets the registry treat every widget
 * interchangeably and lets the config tree stay purely declarative.
 */
export interface WidgetComponent {
  config: InputSignal<WidgetConfig>;
  data: InputSignal<unknown>;
}

/** Convenience alias for widgets whose bound slice is the full EventData. */
export type FullEventWidgetData = EventData;
