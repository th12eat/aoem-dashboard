#!/usr/bin/env node
/**
 * backfill-legacy.mjs — convert the harvested archive into one idempotent SQL
 * file that seeds every historical occurrence as a DB row.
 *
 * Reuses the IN-APP conversion seam: it esbuild-bundles `adopt-adapters.ts`
 * (resolving the `@shared` path alias) to a temp ESM module and imports its
 * `adaptLegacyDoc(slug, raw)` — so there's ONE source of truth for legacy→v2
 * conversion (no duplicated logic here). Then for each occurrence in
 * `data/archive/manifest.json` it:
 *   - reads the archive doc, strips the `_history` helper,
 *   - runs it through `adaptLegacyDoc`,
 *   - for index-only occurrences (no live data) synthesizes a minimal doc from
 *     the history roster so the dated dashboard still renders figures,
 *   - emits an INSERT … ON CONFLICT upsert into `events` (status `complete`) +
 *     `event_data` (the jsonb doc).
 *
 * Output: `supabase/07-backfill-events.sql` — paste + Run in the Supabase SQL
 * editor (same workflow as 01–06). Idempotent (re-running changes nothing).
 *
 * Run: `node scripts/backfill-legacy.mjs` (uses the local esbuild binary).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const V2 = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(V2, '..');

/** Bundle adopt-adapters.ts (+ its @shared deps) to a temp ESM file via the
 * local esbuild, then import it. Keeps conversion logic single-sourced. */
async function loadAdapters() {
  const out = resolve(tmpdir(), `adopt-adapters.${process.pid}.mjs`);
  execFileSync(
    resolve(V2, 'node_modules/.bin/esbuild'),
    [
      resolve(V2, 'src/app/core/services/adopt-adapters.ts'),
      '--bundle',
      '--format=esm',
      '--platform=node',
      `--alias:@shared=${resolve(V2, 'src/app/shared')}`,
      `--outfile=${out}`,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  return import(pathToFileURL(out).href);
}

/** Build a `research` block ({ours, opponents}) from a history.json entry's
 * rosters. Each row is a [tag, power, merits] tuple. Returns null when the
 * history entry carries no roster at all. The opponent server name comes from
 * the entry's `opp` for 1v1 (oppA), or the oppRosters keys for multi. */
function researchFromHistory(hist) {
  const toAlliance = r => ({ tag: String(r[0] ?? ''), name: String(r[0] ?? ''), power: r[1] ?? 0, merits: r[2] ?? 0 });
  const normServer = s => (String(s).replace(/\D/g, '') ? `Era ${String(s).replace(/\D/g, '')}` : String(s));
  const ours = hist.ours ?? hist.ourRoster ?? [];
  let opponents = [];
  if (hist.oppRosters) {
    opponents = Object.entries(hist.oppRosters).map(([server, rows]) => ({
      server: normServer(server),
      alliances: rows.map(toAlliance),
      players: [],
    }));
  } else if (hist.oppA) {
    // 1v1: the single opponent server comes from the entry's `opp` label.
    opponents = [{ server: hist.opp ? normServer(hist.opp) : 'Opponent', alliances: hist.oppA.map(toAlliance), players: [] }];
  }
  if (!ours.length && !opponents.length) return null;
  return { ours: { server: 'Era 8', alliances: ours.map(toAlliance), players: [] }, opponents };
}

/** Does a doc already carry a non-empty `research.ours`/opponents roster? */
function hasResearch(doc) {
  const r = doc && doc.research;
  if (!r) return false;
  const oursN = (r.ours && Array.isArray(r.ours.alliances) ? r.ours.alliances.length : 0);
  const oppN = Array.isArray(r.opponents) ? r.opponents.reduce((a, o) => a + (o.alliances?.length ?? 0), 0) : 0;
  return oursN > 0 || oppN > 0;
}

/** Minimal v2 doc from a history.json roster (index-only occurrences). */
function synthFromHistory(slug, hist) {
  return {
    schemaVersion: 2,
    _recovered: 'index-only',
    eventConfig: { eventStart: hist.date, ourServer: 'Era 8', kingdoms: [] },
    research: researchFromHistory(hist) ?? { ours: { server: 'Era 8', alliances: [], players: [] }, opponents: [] },
  };
}

/** SQL-escape a string literal. */
const q = s => `'${String(s).replace(/'/g, "''")}'`;
/** JSONB literal: a single-quoted JSON string, quotes doubled. */
const jsonb = obj => `${q(JSON.stringify(obj))}::jsonb`;

async function main() {
  const { adaptLegacyDoc } = await loadAdapters();

  const manifestPath = resolve(ROOT, 'data/archive/manifest.json');
  if (!existsSync(manifestPath)) {
    console.error('No manifest — run `node scripts/harvest-legacy.mjs` first.');
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const occ = manifest.occurrences ?? [];

  const rows = [];
  for (const m of occ) {
    const archivePath = resolve(ROOT, `data/archive/${m.slug}/${m.date}.json`);
    if (!existsSync(archivePath)) continue;
    const archive = JSON.parse(readFileSync(archivePath, 'utf8'));
    const { _history, ...raw } = archive;

    // Convert via the shared adapter, or synthesize from history if index-only.
    let doc;
    if (m.recovered === 'index-only' || Object.keys(raw).length === 0) {
      doc = synthFromHistory(m.slug, _history ?? { date: m.date });
    } else {
      doc = adaptLegacyDoc(m.slug, raw);
      doc._recovered = m.recovered;
    }
    // Some event JSONs (e.g. Behemoth) store only scalar scores — no rosters —
    // so the adapter leaves `research` empty. history.json DOES carry the top-4
    // rosters, so fold them in whenever the doc has none, so the dated dashboard
    // + History ledger show real figures.
    if (_history && !hasResearch(doc)) {
      const research = researchFromHistory(_history);
      if (research) doc.research = research;
    }
    // Stamp the recorded outcome (Win/Loss), placement + special-KvK flag from
    // history.json so completed events render correctly without a full scoreboard.
    const histResult = (_history && _history.result) || '';
    if (histResult && histResult !== 'Live' && histResult !== 'TBD') doc.result = histResult;
    if (_history && typeof _history.placement === 'number') doc.placement = _history.placement;
    if (_history && _history.star === true) doc.star = true;
    rows.push({ slug: m.slug, date: m.date, doc });
  }

  // ── emit SQL ─────────────────────────────────────────────────────────────
  const lines = [];
  lines.push('-- ============================================================================');
  lines.push('-- 07-backfill-events.sql — seed every historical occurrence as a DB row');
  lines.push('-- ============================================================================');
  lines.push('-- GENERATED by scripts/backfill-legacy.mjs from data/archive/ (git-harvested');
  lines.push('-- legacy data, converted via the in-app adopt-adapters). Do not hand-edit —');
  lines.push('-- re-run the script to regenerate. Idempotent: ON CONFLICT upserts, so running');
  lines.push('-- it twice changes nothing. Paste + Run in the Supabase SQL editor.');
  lines.push('--');
  lines.push(`-- ${rows.length} occurrences. Depends on 04-events.sql. created_by left NULL.`);
  lines.push('-- ============================================================================');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  for (const r of rows) {
    lines.push(`-- ${r.slug} · ${r.date}`);
    lines.push('WITH up AS (');
    lines.push("  INSERT INTO events (type_slug, start_date, status)");
    lines.push(`  VALUES (${q(r.slug)}, ${q(r.date)}, 'complete')`);
    lines.push('  ON CONFLICT (type_slug, start_date) DO UPDATE SET status = EXCLUDED.status');
    lines.push('  RETURNING id');
    lines.push(')');
    lines.push('INSERT INTO event_data (event_id, doc)');
    lines.push(`SELECT id, ${jsonb(r.doc)} FROM up`);
    lines.push('ON CONFLICT (event_id) DO UPDATE SET doc = EXCLUDED.doc;');
    lines.push('');
  }

  lines.push('COMMIT;');
  lines.push('');

  const outPath = resolve(V2, 'supabase/07-backfill-events.sql');
  writeFileSync(outPath, lines.join('\n'));
  console.log(`Wrote ${rows.length} occurrence upserts → supabase/07-backfill-events.sql`);
  for (const r of rows) {
    const kb = Math.round(JSON.stringify(r.doc).length / 102.4) / 10;
    console.log(`  ${r.slug.padEnd(11)} ${r.date}  (${kb} KB doc)`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
