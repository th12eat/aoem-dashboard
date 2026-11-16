/**
 * Development environment (default for `ng serve`).
 *
 * `dataBaseUrl` is the single source of truth for where the static 1.0 JSON
 * data lives. In dev the v2 app is served at the root (`/`) while the 1.0 data
 * files sit next to it, so we point at the repo-relative `/data/` path that the
 * dev server proxies (see proxy note in v2/README). Never relative-path a fetch
 * from a component — always derive URLs from this value so the dev vs prod
 * subpath difference lives in exactly one place.
 */
export const environment = {
  production: false,
  appVersion: '0.1.0-dev',
  enableDebug: true,

  // Where StaticEventDataSource reads event JSON from (see DataSource seam).
  dataBaseUrl: '/data/',

  // Shared Supabase project with activity-tracker (wired in Phase C).
  supabase: {
    url: 'https://yeczvyyxchssftvnobdn.supabase.co',
    anonKey: 'sb_publishable_Y2bl2DFMSzaCa5Vk2Vk4Bw_9rnEzkmp',
  },
};
