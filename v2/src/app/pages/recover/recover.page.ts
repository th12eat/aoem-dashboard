import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardAuthService } from '@core/services/dashboard-auth.service';
import { RECOVERY_QUESTIONS, type RecoveryQuestion } from '@shared/constants/recovery-questions.constants';
import { confirmPasswordError, passwordError, recoveryAnswerError, requiredError } from '@shared/utils/form-validation.utils';

type Step = 1 | 2 | 3;

/**
 * Account recovery via secret question — mirrors AT's 3-step flow against the
 * same shared RPCs (get_recovery_question, reset_password_with_recovery).
 * Step 1: username → look up question. Step 2: answer + new password. Step 3:
 * done. Native inputs.
 */
@Component({
  selector: 'app-recover',
  imports: [RouterLink, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth">
      <header class="kvk-header" data-kvk="generic">
        <div class="kvk-tag">Era 8 Command</div>
        <h1 class="kvk-title">RECOVER</h1>
        <div class="kvk-subtitle">Reset your password with your secret question</div>
      </header>

      @if (step() === 1) {
        <form class="auth-card" (submit)="onStep1($event)">
          <label class="auth-field">
            <span>Username</span>
            <input type="text" autocomplete="username" [value]="username()" (input)="username.set(val($event))" (blur)="touched1.set(true)" />
          </label>
          @if (touched1() && requiredError(username()); as e) { <p class="auth-field-err">{{ e | translate }}</p> }
          @if (serverError()) { <p class="auth-err">{{ serverError()! | translate }}</p> }
          <button type="submit" class="auth-btn primary" [disabled]="isLoading()">{{ isLoading() ? 'Checking…' : 'Next' }}</button>
          <a class="auth-back" routerLink="/login">← Back to sign in</a>
        </form>
      } @else if (step() === 2) {
        <form class="auth-card" (submit)="onStep2($event)">
          @if (currentQuestion(); as q) {
            <p class="auth-note">Your question: <strong>{{ q.key | translate }}</strong></p>
          }
          <label class="auth-field">
            <span>Answer</span>
            <input [type]="hideAnswer() ? 'password' : 'text'" [value]="answer()" (input)="answer.set(val($event))" (blur)="touch2('answer')" />
            <button type="button" class="auth-reveal" (click)="hideAnswer.set(!hideAnswer())">{{ hideAnswer() ? 'Show' : 'Hide' }}</button>
          </label>
          @if (shown2('answer'); as e) { <p class="auth-field-err">{{ e | translate }}</p> }

          <label class="auth-field">
            <span>New password</span>
            <input [type]="hidePassword() ? 'password' : 'text'" autocomplete="new-password" [value]="password()" (input)="password.set(val($event))" (blur)="touch2('password')" />
            <button type="button" class="auth-reveal" (click)="hidePassword.set(!hidePassword())">{{ hidePassword() ? 'Show' : 'Hide' }}</button>
          </label>
          @if (shown2('password'); as e) { <p class="auth-field-err">{{ e | translate }}</p> }

          <label class="auth-field">
            <span>Confirm new password</span>
            <input [type]="hidePassword() ? 'password' : 'text'" autocomplete="new-password" [value]="confirmPassword()" (input)="confirmPassword.set(val($event))" (blur)="touch2('confirmPassword')" />
          </label>
          @if (shown2('confirmPassword'); as e) { <p class="auth-field-err">{{ e | translate }}</p> }

          @if (serverError()) {
            <p class="auth-err">
              {{ serverError()! | translate }}
              @if (remainingAttempts() !== null) { ({{ remainingAttempts() }} left) }
            </p>
          }
          <button type="submit" class="auth-btn primary" [disabled]="isLoading()">{{ isLoading() ? 'Resetting…' : 'Reset password' }}</button>
          <a class="auth-back" routerLink="/login">← Back to sign in</a>
        </form>
      } @else {
        <div class="auth-card">
          <p class="auth-ok">✓ Password reset. You can sign in now.</p>
          <a class="auth-btn primary" routerLink="/login">Go to sign in</a>
        </div>
      }
    </main>
  `,
  styleUrl: '../login/auth.shared.scss',
})
export class RecoverPage {
  private readonly auth = inject(DashboardAuthService);

  protected readonly step = signal<Step>(1);
  protected readonly isLoading = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly questionId = signal<number | null>(null);
  protected readonly remainingAttempts = signal<number | null>(null);
  protected readonly recoveryQuestions = RECOVERY_QUESTIONS;
  protected readonly requiredError = requiredError;

  protected readonly username = signal('');
  protected readonly touched1 = signal(false);

  protected readonly answer = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly hideAnswer = signal(true);
  protected readonly hidePassword = signal(true);
  private readonly touched2 = signal<Record<string, boolean>>({});

  protected readonly currentQuestion = computed<RecoveryQuestion | null>(() => {
    const id = this.questionId();
    return id === null ? null : (RECOVERY_QUESTIONS.find(q => q.id === id) ?? null);
  });

  private readonly errors2 = computed<Record<string, string>>(() => ({
    answer: recoveryAnswerError(this.answer()),
    password: passwordError(this.password()),
    confirmPassword: confirmPasswordError(this.password(), this.confirmPassword()),
  }));

  protected val(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }
  protected touch2(field: string): void {
    this.touched2.update(t => ({ ...t, [field]: true }));
  }
  protected shown2(field: string): string {
    return this.touched2()[field] ? this.errors2()[field] : '';
  }

  protected async onStep1(event: Event): Promise<void> {
    event.preventDefault();
    this.touched1.set(true);
    if (requiredError(this.username()) || this.isLoading()) return;
    this.isLoading.set(true);
    this.serverError.set(null);
    const { questionId, error } = await this.auth.getRecoveryQuestion(this.username());
    if (error || questionId === null) {
      this.serverError.set(error ?? 'recovery.errors.userNotFound');
    } else {
      this.questionId.set(questionId);
      this.step.set(2);
    }
    this.isLoading.set(false);
  }

  protected async onStep2(event: Event): Promise<void> {
    event.preventDefault();
    this.touched2.set({ answer: true, password: true, confirmPassword: true });
    if (Object.values(this.errors2()).some(Boolean) || this.isLoading()) return;
    this.isLoading.set(true);
    this.serverError.set(null);
    this.remainingAttempts.set(null);
    const { error, remaining } = await this.auth.resetPasswordWithRecovery(this.username(), this.answer(), this.password());
    if (!error) {
      this.step.set(3);
    } else if (error === 'recovery.errors.wrongAnswer' && remaining === 0) {
      this.serverError.set('recovery.errors.locked');
    } else if (error === 'recovery.errors.wrongAnswer') {
      this.serverError.set(error);
      this.remainingAttempts.set(remaining ?? null);
    } else {
      this.serverError.set(error);
    }
    this.isLoading.set(false);
  }
}
