/**
 * Form validation helpers — the native-input equivalent of activity-tracker's
 * Signal Forms validators (v2 is Material/Signal-Forms-free). Each validator is
 * a pure function returning an i18n error key, or '' when valid. Pages hold
 * their own field signals and compute error keys from these.
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 128;
export const RECOVERY_ANSWER_MIN_LENGTH = 2;
export const TOKEN_MIN_LENGTH = 6;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

/** Username field error key (or '' when valid). Availability is checked
 * separately (async) — this covers presence/length/charset only. */
export function usernameError(value: string): string {
  const v = value.trim();
  if (!v) return 'auth.errors.required';
  if (v.length < USERNAME_MIN_LENGTH) return 'auth.errors.usernameTooShort';
  if (v.length > USERNAME_MAX_LENGTH) return 'auth.errors.usernameTooLong';
  if (!USERNAME_PATTERN.test(v)) return 'auth.errors.usernameInvalidChars';
  return '';
}

export function displayNameError(value: string): string {
  const v = value.trim();
  if (!v) return 'auth.errors.required';
  if (v.length < DISPLAY_NAME_MIN_LENGTH) return 'auth.errors.displayNameTooShort';
  if (v.length > DISPLAY_NAME_MAX_LENGTH) return 'auth.errors.displayNameTooLong';
  return '';
}

export function passwordError(value: string): string {
  if (!value) return 'auth.errors.required';
  if (value.length < PASSWORD_MIN_LENGTH) return 'auth.errors.passwordTooShort';
  if (value.length > PASSWORD_MAX_LENGTH) return 'auth.errors.passwordTooLong';
  if (!PASSWORD_PATTERN.test(value)) return 'auth.errors.passwordPattern';
  return '';
}

export function confirmPasswordError(password: string, confirm: string): string {
  if (!confirm) return 'auth.errors.required';
  if (password !== confirm) return 'auth.errors.passwordMismatch';
  return '';
}

export function requiredError(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'auth.errors.required';
  if (typeof value === 'string' && !value.trim()) return 'auth.errors.required';
  return '';
}

export function recoveryAnswerError(value: string): string {
  const v = value.trim();
  if (!v) return 'auth.errors.required';
  if (v.length < RECOVERY_ANSWER_MIN_LENGTH) return 'auth.errors.recoveryAnswerTooShort';
  return '';
}

export function tokenError(value: string): string {
  const v = value.trim();
  if (!v) return 'auth.errors.required';
  if (v.length < TOKEN_MIN_LENGTH) return 'auth.errors.invalidToken';
  return '';
}
