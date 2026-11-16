import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from '@core/services/language.service';
import { SiteHeaderComponent } from '@core/layout/site-header/site-header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeaderComponent],
  template: `
    <app-site-header />
    <router-outlet />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly language = inject(LanguageService);

  constructor() {
    this.language.initialize();
  }
}
