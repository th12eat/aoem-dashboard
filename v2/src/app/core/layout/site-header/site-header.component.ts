import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '@core/services/language.service';
import { PageTitleService } from '@core/services/page-title.service';

/**
 * Frozen top bar — the Angular port of 1.0 assets/site-header.js (.ehdr).
 * Sticky, full-bleed, blurred bar present on every page:
 *   left  → ◆ Era 8 Command (→ hub) + CSS-border chevron + current page name
 *   right → language dropdown + profile chip (preview stub until Phase C auth)
 *
 * Page name comes from PageTitleService (set by the event page from its config);
 * null on the hub (no crumb), matching 1.0.
 */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ehdr">
      <div class="ehdr-crumbs">
        <a class="ehdr-brand" routerLink="/dashboards">
          <span class="ehdr-mark">◆</span><span>Era 8 Command</span>
        </a>
        @if (pageTitle.pageName()) {
          <span class="ehdr-chevron" aria-hidden="true"></span>
          <span class="ehdr-page">{{ pageTitle.pageName() }}</span>
        }
      </div>
      <div class="ehdr-right">
        <div class="ehdr-lang on">
          <span class="ehdr-globe" aria-hidden="true">🌐</span>
          <select aria-label="Language" [value]="lang.currentLanguage()" (change)="onLang($event)">
            @for (l of lang.availableLanguages; track l.code) {
              <option [value]="l.code">{{ l.name }}</option>
            }
          </select>
          <span class="ehdr-caret">▼</span>
        </div>
        <button type="button" class="ehdr-chip" (click)="toggleMenu($event)">
          <span class="ehdr-av">👤</span>
          <span class="ehdr-name">Guest</span>
          <span class="ehdr-caret">▼</span>
        </button>
        <div class="ehdr-menu" [class.open]="menuOpen()">
          <div class="ehdr-mi">🛠️ <span>Admin Portal</span><span class="ehdr-badge">preview</span></div>
          <div class="ehdr-mi">👤 <span>Profile</span></div>
          <div class="ehdr-sep"></div>
          <div class="ehdr-mi">🔑 <span>Sign in</span></div>
          <div class="ehdr-note">Preview build — editing & sign-in activate when hosted.</div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './site-header.component.scss',
})
export class SiteHeaderComponent {
  protected readonly lang = inject(LanguageService);
  protected readonly pageTitle = inject(PageTitleService);
  protected readonly menuOpen = signal(false);

  toggleMenu(e: Event): void {
    e.stopPropagation();
    this.menuOpen.update(v => !v);
  }

  /** Close the profile menu on any outside click (mirrors 1.0). */
  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.menuOpen()) this.menuOpen.set(false);
  }

  onLang(e: Event): void {
    this.lang.setLanguage((e.target as HTMLSelectElement).value);
  }
}
