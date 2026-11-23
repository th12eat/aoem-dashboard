import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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

  readonly theme = this.pageTitle.kvkTheme;

  constructor() {
    this.language.initialize();
  }
}
