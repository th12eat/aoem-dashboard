import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LanguageService } from '@core/services/language.service';
import { PageTitleService } from '@core/services/page-title.service';
import { ACCESS } from '@core/access/access.service';
import { DashboardAuthService } from '@core/services/dashboard-auth.service';

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
          <span class="ehdr-name">{{ auth.displayName() ?? 'Guest' }}</span>
          <span class="ehdr-caret">▼</span>
        </button>
        <div class="ehdr-menu" [class.open]="menuOpen()">
          @if (canAdmin()) {
            <a class="ehdr-mi" routerLink="/admin">🛠️ <span>Admin Portal</span><span class="ehdr-badge">{{ roleLabel() }}</span></a>
          }
          @if (auth.isAuthenticated()) {
            <a class="ehdr-mi" routerLink="/profile">👤 <span>Profile</span></a>
            <button type="button" class="ehdr-mi" (click)="signOut()">🚪 <span>Sign out</span></button>
          } @else {
            <a class="ehdr-mi" routerLink="/login" [queryParams]="{ returnUrl: currentUrl() }">🔑 <span>Sign in</span></a>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './site-header.component.scss',
})
export class SiteHeaderComponent {
  protected readonly lang = inject(LanguageService);
  protected readonly pageTitle = inject(PageTitleService);
  protected readonly auth = inject(DashboardAuthService);
  private readonly access = inject(ACCESS);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);

  /** Current URL to return to after sign-in (so the chip's Sign in is contextual). */
  protected currentUrl(): string {
    return this.router.url && this.router.url !== '/login' ? this.router.url : '/dashboards';
  }

  async signOut(): Promise<void> {
    this.menuOpen.set(false);
    await this.auth.signOut();
    void this.router.navigateByUrl('/login');
  }

  /** Admin Portal link is visible only to strategist+ (edit-live-state). */
  protected canAdmin(): boolean {
    return this.access.can('edit-live-state');
  }
  /** Badge next to the link shows which tier is active. */
  protected roleLabel(): string {
    return this.access.role();
  }

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
