import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardAuthService } from '@core/services/dashboard-auth.service';
import { SupabaseService } from '@core/services/supabase.service';
import { RECOVERY_QUESTIONS } from '@shared/constants/recovery-questions.constants';
import {
  confirmPasswordError,
  displayNameError,
  passwordError,
  recoveryAnswerError,
  requiredError,
  tokenError,
  usernameError,
} from '@shared/utils/form-validation.utils';

/**
 * Join an existing server via an invitation token — the ONLY account-creation
 * path on the dashboard (no admin signup; that would create a new alliance).
 * The token is issued from the Activity Tracker admin side. Mirrors AT's join
 * flow (same shared tables + RPCs), rebuilt in native inputs.
 */
@Component({
  selector: 'app-join',
  imports: [RouterLink, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth">
      <header class="kvk-header" data-kvk="generic">
        <div class="kvk-tag">Era 8 Command</div>
        <h1 class="kvk-title">JOIN</h1>
        <div class="kvk-subtitle">Create your account with an invitation token</div>
      </header>

      <form class="auth-card" (submit)="onSubmit($event)">
        <label class="auth-field">
          <span>Invitation token</span>
          <input type="text" [value]="token()" (input)="onTokenInput($event)" (blur)="touch('token')" />
        </label>
        @if (serverName()) {
          <div class="auth-server">✓ Joining <strong>{{ serverName() }}</strong></div>
        } @else if (isValidatingToken()) {
          <div class="auth-note">Checking token…</div>
        }
        @if (shownError('token'); as e) { <p class="auth-field-err">{{ e | translate }}</p> }

        <label class="auth-field">
          <span>Username</span>
          <input type="text" autocomplete="username" [value]="username()" (input)="username.set(val($event))" (blur)="touch('username')" />
        </label>
        @if (shownError('username'); as e) { <p class="auth-field-err">{{ e | translate }}</p> }

        <label class="auth-field">
          <span>Display name</span>
          <input type="text" [value]="displayName()" (input)="displayName.set(val($event))" (blur)="touch('displayName')" />
        </label>
        @if (shownError('displayName'); as e) { <p class="auth-field-err">{{ e | translate }}</p> }

        <label class="auth-field">
          <span>Password</span>
          <input [type]="hidePassword() ? 'password' : 'text'" autocomplete="new-password" [value]="password()" (input)="password.set(val($event))" (blur)="touch('password')" />
          <button type="button" class="auth-reveal" (click)="hidePassword.set(!hidePassword())">{{ hidePassword() ? 'Show' : 'Hide' }}</button>
        </label>
        @if (shownError('password'); as e) { <p class="auth-field-err">{{ e | translate }}</p> }

        <label class="auth-field">
          <span>Confirm password</span>
          <input [type]="hidePassword() ? 'password' : 'text'" autocomplete="new-password" [value]="confirmPassword()" (input)="confirmPassword.set(val($event))" (blur)="touch('confirmPassword')" />
        </label>
        @if (shownError('confirmPassword'); as e) { <p class="auth-field-err">{{ e | translate }}</p> }

        <label class="auth-field">
          <span>Recovery question</span>
          <select [value]="recoveryQuestionId() ?? ''" (change)="onQuestion($event)" (blur)="touch('recoveryQuestionId')">
            <option value="">— choose —</option>
            @for (q of recoveryQuestions; track q.id) {
              <option [value]="q.id">{{ q.key | translate }}</option>
            }
          </select>
        </label>
        @if (shownError('recoveryQuestionId'); as e) { <p class="auth-field-err">{{ e | translate }}</p> }

        <label class="auth-field">
          <span>Recovery answer</span>
          <input type="text" [value]="recoveryAnswer()" (input)="recoveryAnswer.set(val($event))" (blur)="touch('recoveryAnswer')" />
        </label>
        @if (shownError('recoveryAnswer'); as e) { <p class="auth-field-err">{{ e | translate }}</p> }

        @if (serverError()) { <p class="auth-err">{{ serverError()! | translate }}</p> }

        <button type="submit" class="auth-btn primary" [disabled]="isLoading()">
          {{ isLoading() ? 'Creating account…' : 'Create account' }}
        </button>
        <div class="auth-links">
          <a routerLink="/login">Already have an account? Sign in</a>
        </div>
        <a class="auth-back" routerLink="/dashboards">← Back to dashboards</a>
      </form>
    </main>
  `,
  styleUrl: '../login/auth.shared.scss',
})
export class JoinPage implements OnInit {
  private readonly auth = inject(DashboardAuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly recoveryQuestions = RECOVERY_QUESTIONS;
  protected readonly hidePassword = signal(true);
  protected readonly isLoading = signal(false);
  protected readonly isValidatingToken = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly serverName = signal<string | null>(null);

  protected readonly token = signal('');
  protected readonly username = signal('');
  protected readonly displayName = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly recoveryQuestionId = signal<number | null>(null);
  protected readonly recoveryAnswer = signal('');

  private readonly touched = signal<Record<string, boolean>>({});

  private readonly errors = computed<Record<string, string>>(() => ({
    token: tokenError(this.token()),
    username: usernameError(this.username()),
    displayName: displayNameError(this.displayName()),
    password: passwordError(this.password()),
    confirmPassword: confirmPasswordError(this.password(), this.confirmPassword()),
    recoveryQuestionId: requiredError(this.recoveryQuestionId()),
    recoveryAnswer: recoveryAnswerError(this.recoveryAnswer()),
  }));
  private readonly hasErrors = computed(() => Object.values(this.errors()).some(Boolean));

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('token');
    if (t) {
      this.token.set(t);
      void this.validateToken(t);
    }
  }

  protected val(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }
  protected touch(field: string): void {
    this.touched.update(t => ({ ...t, [field]: true }));
  }
  protected shownError(field: string): string {
    return this.touched()[field] ? this.errors()[field] : '';
  }
  protected onQuestion(e: Event): void {
    const v = this.val(e);
    this.recoveryQuestionId.set(v ? Number(v) : null);
  }
  protected onTokenInput(e: Event): void {
    const v = this.val(e);
    this.token.set(v);
    void this.validateToken(v);
  }

  /** Resolve the token → server name via the shared RPC (same as AT). */
  protected async validateToken(token: string): Promise<void> {
    if (!token || token.length < 6) {
      this.serverName.set(null);
      return;
    }
    this.isValidatingToken.set(true);
    this.serverError.set(null);
    try {
      const { data, error } = await this.supabase.client.rpc('validate_invitation_token', { p_token: token });
      if (error || !data?.valid) {
        this.serverName.set(null);
        this.serverError.set(data?.error ?? 'auth.errors.invalidToken');
      } else {
        this.serverName.set(data.server_name as string);
        this.serverError.set(null);
      }
    } catch {
      this.serverName.set(null);
      this.serverError.set('auth.errors.invalidToken');
    } finally {
      this.isValidatingToken.set(false);
    }
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.touched.set({
      token: true,
      username: true,
      displayName: true,
      password: true,
      confirmPassword: true,
      recoveryQuestionId: true,
      recoveryAnswer: true,
    });
    if (this.hasErrors() || this.isLoading()) return;

    this.isLoading.set(true);
    this.serverError.set(null);
    try {
      const { error } = await this.auth.signUpMember({
        username: this.username(),
        password: this.password(),
        displayName: this.displayName(),
        invitationToken: this.token(),
        recoveryQuestionId: this.recoveryQuestionId() as number,
        recoveryAnswer: this.recoveryAnswer(),
      });
      if (error) {
        const msg = error.message ?? '';
        this.serverError.set(
          msg.includes('already exists') || msg.includes('duplicate')
            ? 'auth.errors.usernameExists'
            : msg.includes('token') || msg.includes('invitation')
              ? 'auth.errors.invalidToken'
              : 'auth.errors.joinFailed',
        );
        return;
      }
      await this.router.navigateByUrl('/dashboards');
    } finally {
      this.isLoading.set(false);
    }
  }
}
