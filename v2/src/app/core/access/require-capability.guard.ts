import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { ACCESS } from './access.service';
import { DashboardAuthService } from '@core/services/dashboard-auth.service';
import type { Capability } from './access.model';

/**
 * Functional route guard factory: allow activation only if the current access
 * level grants `capability`, else redirect to the login page (carrying a
 * returnUrl) so the user can sign in and come back. Deep-link safe.
 *
 * Waits for auth to finish initializing first — otherwise a signed-in
 * developer would be bounced during the async session/role fetch on a cold
 * load (mirrors activity-tracker's isLoading gate).
 *
 * Client-side gating is accident-prevention + UX; server-side RLS is what
 * actually secures the write path.
 */
export function requireCapability(capability: Capability): CanActivateFn {
  return async (_route, state) => {
    const access = inject(ACCESS);
    const auth = inject(DashboardAuthService);
    const router = inject(Router);

    // Wait out the initial auth resolution (bounded; isLoading flips in finally).
    while (auth.isLoading()) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (access.can(capability)) return true;
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  };
}
