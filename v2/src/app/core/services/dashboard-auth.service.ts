import { Injectable, computed, inject, signal } from '@angular/core';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import type { MemberSignUpRequest, SignInRequest } from '@shared/models/auth.model';
import type { UserProfile } from '@shared/models/user-profile.model';

type AuthResultError = AuthError | Error | null;

/**
 * Dashboard authentication — a focused port of activity-tracker's AuthService.
 * PRIMARY sign-in is username/password (the username becomes a synthetic email
 * `username@app.tracker`, exactly as AT does, so the SAME shared accounts work
 * in both apps). Discord is an OPTIONAL post-sign-in LINK (linkIdentity), never
 * credentials.
 *
 * The dashboard intentionally has NO admin signup — that would create a new
 * alliance/server. Account creation here is member-only via an invitation token
 * (issued from AT's admin side). The heavy org onboarding + the recovery RPCs
 * live in the shared Supabase project already; this service just calls them.
 */
@Injectable({ providedIn: 'root' })
export class DashboardAuthService {
  private readonly supabase = inject(SupabaseService);

  private readonly currentUserSig = signal<User | null>(null);
  private readonly userProfileSig = signal<UserProfile | null>(null);
  private readonly loadingSig = signal(true);

  readonly currentUser = this.currentUserSig.asReadonly();
  readonly userProfile = this.userProfileSig.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSig() !== null);
  readonly isLoading = this.loadingSig.asReadonly();
  /** Display name for the profile chip (profile first, else Discord metadata). */
  readonly displayName = computed<string | null>(() => {
    const p = this.userProfileSig();
    if (p?.display_name) return p.display_name;
    const m = this.currentUserSig()?.user_metadata ?? {};
    return (m['full_name'] as string) ?? (m['user_name'] as string) ?? null;
  });

  constructor() {
    void this.initializeAuth();
  }

  private generateEmailFromUsername(username: string): string {
    return `${username.toLowerCase()}@app.tracker`;
  }

  /** Resolve the initial session (also consumes any OAuth redirect fragment on
   * return from a Discord LINK), then keep the signals in sync. Mirrors AT. */
  private async initializeAuth(): Promise<void> {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') return;
      if (session?.user) {
        this.currentUserSig.set(session.user);
        await this.loadUserProfile(session.user.id);
      } else {
        this.currentUserSig.set(null);
        this.userProfileSig.set(null);
      }
    });

    try {
      const fallback = new Promise<{ data: { session: Session | null } }>(resolve =>
        setTimeout(() => resolve({ data: { session: null } }), 5000),
      );
      const {
        data: { session },
      } = await Promise.race([
        this.supabase.auth.getSession().catch(() => ({ data: { session: null } })),
        fallback,
      ]);
      if (session?.user) {
        this.currentUserSig.set(session.user);
        await this.loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      this.loadingSig.set(false);
    }
  }

  private async loadUserProfile(userId: string, retries = 3): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { data, error } = await this.supabase
          .from('user_profiles')
          .select('id, server_id, invitation_token_id, display_name, username, role, recovery_question_id, created_at, updated_at')
          .eq('id', userId)
          .single();
        if (error) throw error;
        this.userProfileSig.set(data as UserProfile);
        return;
      } catch (error) {
        console.error(`Error loading user profile (attempt ${attempt}/${retries}):`, error);
        if (attempt < retries) await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  /** Sign in with username + password. */
  async signIn(data: SignInRequest): Promise<{ error: AuthError | null }> {
    const email = this.generateEmailFromUsername(data.username);
    const { data: authData, error } = await this.supabase.auth.signInWithPassword({ email, password: data.password });
    if (!error && authData.user) {
      this.currentUserSig.set(authData.user);
      await this.loadUserProfile(authData.user.id);
    }
    return { error };
  }

  /** Member signup via invitation token — joins an existing server. No admin
   * signup on the dashboard (would create a new alliance). Mirrors AT. */
  async signUpMember(data: MemberSignUpRequest): Promise<{ error: AuthResultError }> {
    try {
      const { data: tokenData, error: tokenError } = await this.supabase
        .from('invitation_tokens')
        .select('*')
        .eq('token', data.invitationToken)
        .single();
      if (tokenError || !tokenData) return { error: new Error('Invalid or expired invitation token') };
      if (new Date(tokenData.expires_at) < new Date()) return { error: new Error('Invitation token has expired') };

      const email = this.generateEmailFromUsername(data.username);
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email,
        password: data.password,
        options: { data: { username: data.username, display_name: data.displayName } },
      });
      if (authError) return { error: authError };
      if (!authData.user) return { error: new Error('User creation failed') };

      const now = new Date().toISOString();
      const newProfile: UserProfile = {
        id: authData.user.id,
        server_id: tokenData.server_id,
        invitation_token_id: tokenData.id,
        display_name: data.displayName,
        username: data.username,
        role: 'member',
        created_at: now,
        updated_at: now,
      };
      const { error: profileError } = await this.supabase.from('user_profiles').insert({
        ...newProfile,
        recovery_question_id: data.recoveryQuestionId,
        recovery_answer_hash: data.recoveryAnswer,
      });
      if (profileError) return { error: profileError };

      this.currentUserSig.set(authData.user);
      this.userProfileSig.set({ ...newProfile, recovery_question_id: data.recoveryQuestionId });
      return { error: null };
    } catch (error) {
      console.error('Error during member signup:', error);
      return { error: error as Error };
    }
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this.currentUserSig.set(null);
    this.userProfileSig.set(null);
  }

  /** Username availability (rate-limited RPC accessible to anon). */
  async checkUsernameAvailable(username: string): Promise<boolean> {
    const { data } = await this.supabase.client.rpc('check_username_available', { p_username: username });
    return (data as boolean) ?? false;
  }

  // ── account recovery (secret question) ──────────────────────────────────────
  async getRecoveryQuestion(username: string): Promise<{ questionId: number | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase.client.rpc('get_recovery_question', { p_username: username });
      if (error || !data || data.error) return { questionId: null, error: 'recovery.errors.userNotFound' };
      return { questionId: data.question_id as number, error: null };
    } catch {
      return { questionId: null, error: 'recovery.errors.userNotFound' };
    }
  }

  async resetPasswordWithRecovery(
    username: string,
    answer: string,
    newPassword: string,
  ): Promise<{ error: string | null; remaining?: number; until?: string }> {
    try {
      const { data, error } = await this.supabase.client.rpc('reset_password_with_recovery', {
        p_username: username,
        p_answer: answer,
        p_new_password: newPassword,
      });
      if (error || !data) return { error: 'recovery.errors.userNotFound' };
      if (data.success) return { error: null };
      switch (data.error) {
        case 'wrong_answer':
          return { error: 'recovery.errors.wrongAnswer', remaining: data.remaining as number };
        case 'locked':
          return { error: 'recovery.errors.locked', until: data.until as string };
        case 'password_too_short':
          return { error: 'recovery.errors.passwordTooShort' };
        default:
          return { error: 'recovery.errors.userNotFound' };
      }
    } catch {
      return { error: 'recovery.errors.userNotFound' };
    }
  }

  // ── Discord linking (optional, post-sign-in) ────────────────────────────────
  // The dashboard reads the Discord identity straight from Supabase auth
  // (auth.identities) — it doesn't need AT's discord_links mirror table (that
  // exists for the bot-submission path, which the dashboard doesn't have).

  /** Attach a Discord identity to the signed-in account (not a login method). */
  async linkDiscord(redirectTo?: string): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.linkIdentity({
        provider: 'discord',
        options: { redirectTo: redirectTo ?? window.location.href },
      });
      return { error: error?.message ?? null };
    } catch (err) {
      return { error: (err as Error).message };
    }
  }

  /** The linked Discord display name, or null if no Discord identity is attached. */
  async getDiscordIdentity(): Promise<{ name: string | null } | null> {
    try {
      const { data } = await this.supabase.auth.getUserIdentities();
      const discord = data?.identities?.find(i => i.provider === 'discord');
      if (!discord) return null;
      const d = discord.identity_data ?? {};
      return { name: (d['full_name'] as string) ?? (d['name'] as string) ?? (d['user_name'] as string) ?? 'Discord' };
    } catch {
      return null;
    }
  }

  /** Detach the Discord identity (requires >1 identity to unlink). */
  async unlinkDiscord(): Promise<{ error: string | null }> {
    try {
      const { data } = await this.supabase.auth.getUserIdentities();
      const discord = data?.identities?.find(i => i.provider === 'discord');
      if (!discord) return { error: null };
      const { error } = await this.supabase.auth.unlinkIdentity(discord);
      return { error: error?.message ?? null };
    } catch (err) {
      return { error: (err as Error).message };
    }
  }

  getUserId(): string | null {
    return this.currentUserSig()?.id ?? null;
  }
}
