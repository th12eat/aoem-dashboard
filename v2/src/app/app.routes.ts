import { Routes } from '@angular/router';
import { requireAuth } from '@core/access/require-auth.guard';
import { requireCapability } from '@core/access/require-capability.guard';

/**
 * Application routes. Lazy `loadComponent` throughout, mirroring
 * activity-tracker. The `/dashboards/:slug` route is the single config-driven
 * page that renders ANY event — "new event = new config", not a new route.
 *
 * AUTH WALL: everything except the auth pages (/login, /join, /recover)
 * requires a signed-in account via `requireAuth` — guests see nothing, not even
 * the dashboards. `/admin*` additionally requires the `edit-live-state`
 * capability (strategist+); finer gating (geometry editing) happens inside the
 * editor via the capability ladder.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboards' },
  {
    path: 'dashboards',
    canActivate: [requireAuth],
    loadComponent: () => import('@pages/dashboards-hub/dashboards-hub.page').then(m => m.DashboardsHubPage),
  },
  {
    path: 'dashboards/history',
    canActivate: [requireAuth],
    loadComponent: () => import('@pages/history/history.page').then(m => m.HistoryPage),
  },
  {
    path: 'dashboards/:slug',
    canActivate: [requireAuth],
    loadComponent: () => import('@pages/event-dashboard/event-dashboard.page').then(m => m.EventDashboardPage),
  },
  {
    // A specific past occurrence of a type (same page; reads the :date param).
    path: 'dashboards/:slug/history/:date',
    canActivate: [requireAuth],
    loadComponent: () => import('@pages/event-dashboard/event-dashboard.page').then(m => m.EventDashboardPage),
  },
  {
    path: 'login',
    loadComponent: () => import('@pages/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'join',
    loadComponent: () => import('@pages/join/join.page').then(m => m.JoinPage),
  },
  {
    path: 'recover',
    loadComponent: () => import('@pages/recover/recover.page').then(m => m.RecoverPage),
  },
  {
    path: 'profile',
    canActivate: [requireAuth],
    loadComponent: () => import('@pages/profile/profile.page').then(m => m.ProfilePage),
  },
  {
    path: 'admin',
    canActivate: [requireAuth, requireCapability('edit-live-state')],
    loadComponent: () => import('@pages/admin/admin-hub.page').then(m => m.AdminHubPage),
  },
  {
    path: 'admin/events',
    canActivate: [requireAuth, requireCapability('edit-live-state')],
    loadComponent: () => import('@pages/admin/events/admin-events.page').then(m => m.AdminEventsPage),
  },
  {
    path: 'admin/:slug/data/:date',
    canActivate: [requireAuth, requireCapability('edit-live-state')],
    loadComponent: () => import('@pages/admin/events/event-data-editor.page').then(m => m.EventDataEditorPage),
  },
  { path: '**', redirectTo: 'dashboards' },
];
