import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { DashboardAuthService } from '@core/services/dashboard-auth.service';

/**
 * Auth wall: every app route except the auth pages (/login, /join, /recover)
 * requires a signed-in account — guests can't view the dashboards at all. Not
 * signed in → redirect to /login carrying a returnUrl so sign-in bounces back
 * to where they were headed.
 *
 * Waits out the initial session restore first (isLoading), so a returning user
 * with a live session isn't briefly treated as a guest on cold load.
 */
export const requireAuth: CanActivateFn = async (_route, state) => {
  const auth = inject(DashboardAuthService);
  const router = inject(Router);

  while (auth.isLoading()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
