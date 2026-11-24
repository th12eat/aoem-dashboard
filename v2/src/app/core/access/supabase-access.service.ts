import { Injectable, Signal, computed, effect, inject, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase.service';
import { DashboardAuthService } from '@core/services/dashboard-auth.service';
import { type Capability, type Role, parseRole, roleHas } from './access.model';
import type { AccessService } from './access.service';

/**
 * Supabase-backed access: the signed-in user's role comes from the
 * `dashboard_access` table (keyed by auth.uid()), NOT activity-tracker's
 * `user_profiles.role` — the two apps' role taxonomies are deliberately
 * independent (a dashboard `developer` is unrelated to an AT `super_admin`),
 * and share only the auth identity. A guest (signed out, or no access row)
 * is `member`, so the admin tools stay invisible by default.
 *
 * Drop-in for the ACCESS token (same AccessService interface as the dev
 * service): guards/nav/editor gating are unchanged. Server-side RLS on the
 * write path is what actually enforces this — the client role is for UX.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseAccessService implements AccessService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(DashboardAuthService);

  private readonly roleSig = signal<Role>('member');
  readonly role: Signal<Role> = this.roleSig.asReadonly();

  /** The user id the current role was fetched for — so the effect (which re-runs
   * on every currentUser() emission during auth init) only hits the DB when the
   * identity actually changes, not on every signal churn. */
  private fetchedFor: string | null = null;

  constructor() {
    // Re-fetch the access row ONLY when the signed-in user id changes.
    effect(() => {
      const uid = this.auth.currentUser()?.id ?? null;
      if (uid === this.fetchedFor) return;
      this.fetchedFor = uid;
      if (!uid) {
        this.roleSig.set('member');
        return;
      }
      void this.fetchRole(uid);
    });
  }

  can(capability: Capability): boolean {
    return roleHas(this.roleSig(), capability);
  }

  private async fetchRole(userId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('dashboard_access')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      // No row (or any error) → least-privileged member. RLS limits this select
      // to the caller's own row, so a hit means THIS user's grant.
      this.roleSig.set(error || !data ? 'member' : parseRole(data.role as string));
    } catch {
      this.roleSig.set('member');
    }
  }
}

/** True while the first role fetch is still resolving — lets a guard wait for
 * auth before deciding (mirrors activity-tracker's isLoading gate). Exposed as
 * a helper so the guard doesn't need to inject the auth service directly. */
export function accessReady(auth: DashboardAuthService): Signal<boolean> {
  return computed(() => !auth.isLoading());
}
