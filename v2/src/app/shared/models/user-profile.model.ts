/**
 * User profile — the shared `user_profiles` row (same table activity-tracker
 * writes). The dashboard reads it to know who you are; its OWN role (dashboard
 * capability ladder) lives separately in `dashboard_access`, NOT in `role`
 * here. Keep this shape in sync with AT's user.model.ts.
 */
export interface UserProfile {
  id: string;
  server_id: string | null;
  invitation_token_id: string | null;
  display_name: string;
  username: string;
  /** Activity-tracker's role taxonomy — independent of the dashboard role. */
  role: 'super_admin' | 'admin' | 'member';
  recovery_question_id?: number;
  created_at: string;
  updated_at: string;
}
