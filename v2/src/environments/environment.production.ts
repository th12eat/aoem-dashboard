/**
 * Production environment (used by `ng build` via fileReplacements).
 *
 * The v2 app is deployed to the GitHub Pages subpath `/aoem-dashboard/v2/`,
 * while the 1.0 static data files are published at the repo root
 * `/aoem-dashboard/data/`. `dataBaseUrl` therefore points one level above the
 * app's base-href. This keeps the 1.0 JSON as the single source of truth while
 * 2.0 renders it (the screenshot-intake pipeline keeps writing those files).
 */
export const environment = {
  production: true,
  appVersion: '0.1.0',
  enableDebug: false,

  dataBaseUrl: '/aoem-dashboard/data/',

  supabase: {
    url: 'https://yeczvyyxchssftvnobdn.supabase.co',
    anonKey: 'sb_publishable_Y2bl2DFMSzaCa5Vk2Vk4Bw_9rnEzkmp',
  },
};
