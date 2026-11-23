/**
 * Authentication models — mirrored from activity-tracker so the two apps stay
 * convergent (they share ONE Supabase project + the same `auth.users` /
 * `user_profiles` / `servers` / `invitation_tokens` tables).
 *
 * The dashboard deliberately offers NO admin signup (that would create a new
 * alliance/server). Account creation on the dashboard is member-only, via an
 * invitation token issued from the Activity Tracker admin side. Admins onboard
 * in AT; the dashboard is a second front door to the same accounts.
 */

/** Sign up as a member of an existing server, via an invitation token. */
export interface MemberSignUpRequest {
  username: string;
  password: string;
  displayName: string;
  invitationToken: string;
  recoveryQuestionId: number;
  recoveryAnswer: string;
}

/** Sign in with username + password (username → synthetic email internally). */
export interface SignInRequest {
  username: string;
  password: string;
}
