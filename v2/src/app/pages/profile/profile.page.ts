import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardAuthService } from '@core/services/dashboard-auth.service';
import { ACCESS } from '@core/access/access.service';

/**
 * Profile page — identity + roles + optional Discord link. The dashboard role
 * (capability ladder) is shown alongside the Activity Tracker role to make the
 * two-independent-roles model visible. Discord is an optional convenience link,
 * never a login method. Native inputs.
 */
@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth">
      <header class="kvk-header" data-kvk="generic">
        <div class="kvk-tag">Account</div>
        <h1 class="kvk-title">PROFILE</h1>
        <div class="kvk-subtitle">Your identity, roles, and linked accounts</div>
      </header>

      @if (auth.isAuthenticated()) {
        <div class="auth-card">
          <dl class="pf-dl">
            <dt>Display name</dt><dd>{{ auth.displayName() ?? '—' }}</dd>
            <dt>Username</dt><dd>{{ auth.userProfile()?.username ?? '—' }}</dd>
            <dt>Activity Tracker role</dt><dd>{{ auth.userProfile()?.role ?? '—' }}</dd>
            <dt>Dashboard role</dt><dd><strong>{{ dashboardRole() }}</strong></dd>
          </dl>
        </div>

        <div class="auth-card">
          <h3 class="pf-h3">Discord</h3>
          @if (discordName(); as name) {
            <p class="auth-note">Linked as <strong>{{ name }}</strong>.</p>
            <button type="button" class="auth-btn ghost" (click)="unlink()" [disabled]="busy()">
              {{ busy() ? 'Working…' : 'Unlink Discord' }}
            </button>
          } @else {
            <p class="auth-note">Link your Discord account for coordination features. This is optional and never used to sign in.</p>
            <button type="button" class="auth-btn" (click)="link()" [disabled]="busy()">
              {{ busy() ? 'Redirecting…' : '🎮 Link Discord' }}
            </button>
          }
          @if (msg()) { <p class="auth-err">{{ msg() }}</p> }
        </div>

        <a class="auth-back" routerLink="/dashboards">← Back to dashboards</a>
      } @else {
        <div class="auth-card">
          <p class="auth-note">You're not signed in.</p>
          <a class="auth-btn primary" routerLink="/login">Sign in</a>
        </div>
      }
    </main>
  `,
  styles: [
    `
      .pf-dl {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 6px 14px;
        margin: 0;
      }
      .pf-dl dt {
        color: var(--text-muted);
        text-transform: uppercase;
        font-size: var(--fs-micro);
        letter-spacing: 0.04em;
      }
      .pf-dl dd {
        margin: 0;
      }
      .pf-h3 {
        margin: 0 0 8px;
        color: var(--kvk-accent);
      }
    `,
  ],
  styleUrls: ['../login/auth.shared.scss'],
})
export class ProfilePage {
  protected readonly auth = inject(DashboardAuthService);
  private readonly access = inject(ACCESS);

  protected readonly dashboardRole = computed(() => this.access.role());
  protected readonly discordName = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly msg = signal<string | null>(null);

  constructor() {
    void this.refreshDiscord();
  }

  private async refreshDiscord(): Promise<void> {
    const d = await this.auth.getDiscordIdentity();
    this.discordName.set(d?.name ?? null);
  }

  protected async link(): Promise<void> {
    this.busy.set(true);
    this.msg.set(null);
    const { error } = await this.auth.linkDiscord(`${window.location.origin}/profile`);
    if (error) {
      this.msg.set(error);
      this.busy.set(false);
    }
    // on success the browser redirects to Discord; no further work here
  }

  protected async unlink(): Promise<void> {
    this.busy.set(true);
    this.msg.set(null);
    const { error } = await this.auth.unlinkDiscord();
    this.busy.set(false);
    if (error) {
      this.msg.set(error);
    } else {
      await this.refreshDiscord();
    }
  }
}
