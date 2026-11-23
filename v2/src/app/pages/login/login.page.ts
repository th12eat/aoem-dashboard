import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardAuthService } from '@core/services/dashboard-auth.service';
import { requiredError } from '@shared/utils/form-validation.utils';

/**
 * Sign-in page — username + password (the shared accounts from activity-tracker;
 * the username becomes a synthetic email internally). A guest can always browse
 * the outward dashboards; signing in only unlocks the admin tools (strategist+).
 * New members join via an invitation token (/join); no admin signup here.
 * Native inputs (v2 is Material-free).
 */
@Component({
  selector: 'app-login',
  imports: [RouterLink, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth">
      <header class="kvk-header" data-kvk="generic">
        <div class="kvk-tag">Era 8 Command</div>
        <h1 class="kvk-title">SIGN IN</h1>
        <div class="kvk-subtitle">Use your Era 8 account — admin tools need a signed-in Strategist or Developer</div>
      </header>

      @if (auth.isAuthenticated()) {
        <div class="auth-card">
          <p>Signed in as <strong>{{ auth.displayName() ?? auth.userProfile()?.username }}</strong>.</p>
          <div class="auth-actions">
            <button type="button" class="auth-btn primary" (click)="continue()">Continue →</button>
            <button type="button" class="auth-btn ghost" (click)="signOut()">Sign out</button>
          </div>
        </div>
      } @else {
        <form class="auth-card" (submit)="onSubmit($event)">
          <label class="auth-field">
            <span>Username</span>
            <input type="text" autocomplete="username" [value]="username()" (input)="username.set(val($event))" (blur)="touched.set(true)" />
          </label>
          <label class="auth-field">
            <span>Password</span>
            <input [type]="hidePassword() ? 'password' : 'text'" autocomplete="current-password" [value]="password()" (input)="password.set(val($event))" (blur)="touched.set(true)" />
            <button type="button" class="auth-reveal" (click)="hidePassword.set(!hidePassword())">{{ hidePassword() ? 'Show' : 'Hide' }}</button>
          </label>

          @if (touched() && formError()) {
            <p class="auth-err">{{ formError()! | translate }}</p>
          }
          @if (serverError()) {
            <p class="auth-err">{{ serverError()! | translate }}</p>
          }

          <button type="submit" class="auth-btn primary" [disabled]="isLoading()">
            {{ isLoading() ? 'Signing in…' : 'Sign in' }}
          </button>

          <div class="auth-links">
            <a routerLink="/join">Have an invite? Join a server</a>
            <a routerLink="/recover">Forgot password?</a>
          </div>
          <a class="auth-back" routerLink="/dashboards">← Back to dashboards</a>
        </form>
      }
    </main>
  `,
  styleUrl: './auth.shared.scss',
})
export class LoginPage {
  protected readonly auth = inject(DashboardAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly touched = signal(false);
  protected readonly hidePassword = signal(true);
  protected readonly isLoading = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly returnUrl = computed(() => this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboards');
  protected readonly formError = computed(() => requiredError(this.username()) || requiredError(this.password()));

  protected val(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.touched.set(true);
    if (this.formError() || this.isLoading()) return;

    this.isLoading.set(true);
    this.serverError.set(null);
    try {
      const { error } = await this.auth.signIn({ username: this.username(), password: this.password() });
      if (error) {
        const msg = error.message ?? '';
        this.serverError.set(
          msg.includes('Invalid') || msg.includes('credentials')
            ? 'auth.errors.invalidCredentials'
            : 'auth.errors.loginFailed',
        );
        return;
      }
      await this.router.navigateByUrl(this.returnUrl());
    } finally {
      this.isLoading.set(false);
    }
  }

  protected continue(): void {
    void this.router.navigateByUrl(this.returnUrl());
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
  }
}
