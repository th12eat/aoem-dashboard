import { Injectable, signal } from '@angular/core';

/**
 * Shell context shared between the always-on app chrome (frozen top bar) and
 * the current page:
 *   • pageName — breadcrumb crumb (◆ Era 8 Command › <page>); null on the hub.
 *   • kvkTheme — the active event accent (drives [data-kvk] on the app root, so
 *     the frozen bar AND the page share the event's accent instead of the
 *     default gold). 'generic' off an event page.
 *
 * Kept as a tiny service so the shell can read it without route coupling.
 */
@Injectable({ providedIn: 'root' })
export class PageTitleService {
  readonly pageName = signal<string | null>(null);
  readonly kvkTheme = signal<string>('generic');

  set(name: string | null): void {
    this.pageName.set(name);
  }

  setTheme(theme: string): void {
    this.kvkTheme.set(theme);
  }
}
