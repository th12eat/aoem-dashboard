import { Injectable, InjectionToken, Signal, signal } from '@angular/core';
import { type Capability, type Role, parseRole, roleHas } from './access.model';

/**
 * The access seam. Components/guards depend ONLY on this interface and ask
 * `can(capability)` — they never learn HOW the role was resolved. Today the
 * concrete {@link DevAccessService} reads a dev source (?role= / localStorage);
 * when Supabase OAuth lands, a SupabaseAccessService reads the signed-in user's
 * role claim and is swapped in via the token with ZERO consumer changes
 * (mirrors the EVENT_DATA_SOURCE pattern).
 */
export interface AccessService {
  readonly role: Signal<Role>;
  can(capability: Capability): boolean;
}

export const ACCESS = new InjectionToken<AccessService>('ACCESS');

const STORAGE_KEY = 'aoem.admin.role';

/**
 * Preview-build access: role comes from `?role=developer` (also persisted to
 * localStorage so it survives navigation) or a previously stored value, else
 * `member`. This is ACCIDENT-PREVENTION + UX, NOT security — a determined user
 * can flip localStorage. True enforcement is Supabase Row-Level Security on the
 * write path (arrives with the DB). The default-member stance means the admin
 * tools are invisible to everyone until a role is explicitly granted.
 */
@Injectable({ providedIn: 'root' })
export class DevAccessService implements AccessService {
  private readonly _role = signal<Role>(this.resolve());
  readonly role = this._role.asReadonly();

  can(capability: Capability): boolean {
    return roleHas(this._role(), capability);
  }

  private resolve(): Role {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('role');
      if (fromUrl != null) {
        const role = parseRole(fromUrl);
        window.localStorage.setItem(STORAGE_KEY, role);
        return role;
      }
      return parseRole(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      return 'member';
    }
  }
}
