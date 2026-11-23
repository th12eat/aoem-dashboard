import { ApplicationConfig, provideZonelessChangeDetection, isDevMode } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { EVENT_DATA_SOURCE } from '@core/services/event-dashboard.datasource';
import { SupabaseEventDataSource } from '@core/services/supabase-event.datasource';
import { ACCESS } from '@core/access/access.service';
import { SupabaseAccessService } from '@core/access/supabase-access.service';

/**
 * Root application providers. Mirrors activity-tracker's app.config.ts so the
 * two apps stay convergent (zoneless change detection, lazy router,
 * ngx-translate with HTTP-loaded locale JSON, service worker). Supabase/auth
 * providers are intentionally deferred to Phase C.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideAnimationsAsync(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    provideHttpClient(withFetch()),
    provideTranslateService({
      fallbackLang: 'en',
    }),
    provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json',
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // The data seam — occurrence-aware Supabase source (DB-first, static-JSON
    // fallback). Delegates to StaticEventDataSource for the fallback path.
    // Components depend only on the EVENT_DATA_SOURCE token.
    { provide: EVENT_DATA_SOURCE, useExisting: SupabaseEventDataSource },
    // The access seam — now backed by Supabase (reads the signed-in user's
    // dashboard_access role). Guards/components depend only on ACCESS, so this
    // swap from DevAccessService needed no consumer changes. DevAccessService
    // is still available (?role= override) for local work without signing in.
    { provide: ACCESS, useExisting: SupabaseAccessService },
  ],
};
