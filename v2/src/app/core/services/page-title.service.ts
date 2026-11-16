import { Injectable, signal } from '@angular/core';

/**
 * Holds the current page name shown in the frozen top bar's breadcrumb
 * (◆ Era 8 Command › <page>). The hub clears it (null → no crumb); the event
 * page sets it from its config title. Kept as a tiny service so the always-on
 * SiteHeaderComponent can read it without route coupling.
 */
@Injectable({ providedIn: 'root' })
export class PageTitleService {
  readonly pageName = signal<string | null>(null);

  set(name: string | null): void {
    this.pageName.set(name);
  }
}
