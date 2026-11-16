import { Routes } from '@angular/router';

/**
 * Application routes. Lazy `loadComponent` throughout, mirroring
 * activity-tracker. The `/dashboards/:slug` route is the single config-driven
 * page that renders ANY event — "new event = new config", not a new route.
 *
 * Phase C will add `/login` and a guarded `/admin` here.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboards' },
  {
    path: 'dashboards',
    loadComponent: () => import('@pages/dashboards-hub/dashboards-hub.page').then(m => m.DashboardsHubPage),
  },
  {
    path: 'dashboards/:slug',
    loadComponent: () => import('@pages/event-dashboard/event-dashboard.page').then(m => m.EventDashboardPage),
  },
  { path: '**', redirectTo: 'dashboards' },
];
