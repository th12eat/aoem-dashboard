import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationStart } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { LanguageService } from '@core/services/language.service';
import { PageTitleService } from '@core/services/page-title.service';
import { SiteHeaderComponent } from '@core/layout/site-header/site-header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeaderComponent],
  // [data-kvk] on the root makes the frozen top bar AND the page share the
  // active event's accent (yellow/gold only when off an event). See PageTitle.
  host: { '[attr.data-kvk]': 'theme()' },
  template: `
    <app-site-header />
    <router-outlet />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly language = inject(LanguageService);
  private readonly pageTitle = inject(PageTitleService);
  private readonly router = inject(Router);

  readonly theme = this.pageTitle.kvkTheme;

  constructor() {
    this.language.initialize();
    // Reset the shell breadcrumb + accent on every navigation START, so a page
    // that doesn't set them (History, login, admin, …) always lands back on the
    // neutral default instead of keeping the previous event's blue/theme. Pages
    // that DO set them (hub, event dashboard) run their effect after this, so
    // they still win for their own route.
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.pageTitle.set(null);
        this.pageTitle.setTheme('generic');
      });
  }
}
