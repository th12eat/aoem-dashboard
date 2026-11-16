# Era 8 Command Center — 2.0 (Angular)

A unified, **config-driven** rewrite of the AoEM event dashboards. The goal:
one dashboard engine where **adding an event = adding a config file**, not
copy-pasting a multi-thousand-line HTML file. Built to mirror the
[`activity-tracker`](../../activity-tracker) stack (Angular 22, zoneless,
standalone components, ngx-translate, Supabase) so the two can eventually merge
into one product sharing one Supabase project.

> **1.0 still runs.** This app lives in `v2/` and deploys to the
> `/aoem-dashboard/v2/` subpath. The original static dashboards at the repo root
> keep serving as the fallback until each one is cut over to 2.0.

## Requirements

- Node **24.15.0** (see `.nvmrc`; Angular 22.2 requires ≥22.22.3/≥24.15.0).
  `nvm use` picks it up.

## Develop

```bash
nvm use
npm install --legacy-peer-deps   # see "Install note" below
npm run serve:data               # terminal 1 — sidecar serving the 1.0 /data files on :4201
npm start                        # terminal 2 — ng serve on :4200, proxies /data -> :4201
```

Open http://localhost:4200/dashboards . The dev server proxies `/data/**` to the
sidecar so `StaticEventDataSource` reads the **real** 1.0 JSON (single source of
truth) without copying it.

### Install note

`npm install` may crash with `Cannot read properties of null (reading 'edgesOut')`
— a known npm@10 arborist bug tickled by the Angular/vitest peer graph. Use
`--legacy-peer-deps` (activity-tracker installs the same deps cleanly on newer npm).

## Build & verify the GitHub Pages subpath

```bash
npm run build:prod        # ng build --base-href /aoem-dashboard/v2/
npm run preview:pages      # emulate GH Pages at http://localhost:8899/aoem-dashboard/v2/
```

`preview:pages` runs `scripts/gh-pages-emulator.mjs`, which models a GitHub
**project** Pages site: it serves files under the base prefix and, on any miss,
returns the project's single root `404.html` with HTTP 404 — exactly like GH
Pages. This is how we verify the **SPA deep-link fallback** before any cutover:

- `/aoem-dashboard/v2/` → app shell (correct `<base href>`).
- `/aoem-dashboard/v2/dashboards/stormlands` refreshed → 404 → `404.html`
  stashes the URL and bounces to the app root → `index.html` replays it into the
  router via `history.replaceState`. (Two-step trick, same as activity-tracker.)
- A non-v2 missing path → plain 404, **no** SPA hijack of the 1.0 site.

## Architecture (the important parts)

| Concern | Where | Note |
|---|---|---|
| Routes | `src/app/app.routes.ts` | `/dashboards` hub + `/dashboards/:slug` — the one config-driven page |
| Event config model | `src/app/shared/models/event-dashboard-config.model.ts` | typed tab/widget tree (task #3) |
| Data seam | `src/app/core/services/event-dashboard.datasource.ts` | `StaticEventDataSource` now; `SupabaseEventDataSource` later, same interface |
| Widgets | `src/app/shared/components/**` + `widget-host` registry | `ngComponentOutlet` renders `kind` → component (task #4) |
| Design tokens | `src/styles/_kvk-tokens.scss` | ported verbatim from 1.0 `assets/kvk-theme.css`; accent via `[data-kvk]` |
| i18n | `src/assets/i18n/*.json` + `LanguageService` | ngx-translate; replaces the three divergent 1.0 i18n systems |
| Data base URL | `src/environments/environment*.ts` | `dataBaseUrl` — the ONLY place the dev/prod data path differs |

## Deploy

A composite GitHub Pages artifact (1.0 at root + this app at `/v2/` + a
path-aware root `404.html`) is published by `.github/workflows/deploy-pages.yml`
(task #6). Requires switching the repo's Pages source to **GitHub Actions** —
coordinated before the first deploy.
