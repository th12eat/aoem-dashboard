#!/usr/bin/env node
/**
 * harvest-legacy.mjs — recover each historical KvK occurrence's richest snapshot
 * from git, into committed archive files.
 *
 * The problem: v1.0 reused ONE `data/live/<type>.json` per event TYPE, overwriting
 * it each matchup. So the only record of a past occurrence's live data is in the
 * git history of that file. This script walks those commits and, for each of the
 * 22 occurrences in `data/history.json`, picks the best snapshot:
 *   - the LATEST commit of `data/live/<slug>.json` dated within this occurrence's
 *     window [occDate, nextSameTypeOccDate) — i.e. the most complete state of that
 *     matchup before the file was reset for the next one.
 *   - merged with the history.json roster (always present) as a floor.
 *
 * Output (committed as a permanent record; gaps get fixed later in the editor):
 *   data/archive/<slug>/<date>.json   — raw recovered 1.0 shape + `_history` roster
 *   data/archive/manifest.json        — the 22-row index with a `recovered` quality
 *                                        flag (full | partial | index-only)
 *
 * Read-only (git show / git log only). Run from anywhere: `node scripts/harvest-legacy.mjs`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// repo root = two levels up from v2/scripts
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** Event display name → v2 slug (mirrors history.model typeInfo). */
function slugFor(name) {
  const n = name.toLowerCase();
  if (n.includes('storm')) return 'stormlands';
  if (n.includes('desolate')) return 'desolate';
  if (n.includes('primordial')) return 'primordial';
  if (n.includes('behemoth')) return 'behemoth';
  if (n === 'tme' || n.includes('mightiest empire')) return 'tme';
  return '';
}

/** All committed versions of a path, newest→oldest: [{hash, date 'YYYY-MM-DD'}]. */
function versionsOf(path) {
  let out;
  try {
    out = git('log', '--format=%H %cI', '--', path);
  } catch {
    return [];
  }
  return out
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [hash, iso] = line.split(' ');
      return { hash, date: (iso || '').slice(0, 10) };
    });
}

/** The file blob at a commit, parsed as JSON (null on any failure). */
function blobJson(hash, path) {
  try {
    return JSON.parse(git('show', `${hash}:${path}`));
  } catch {
    return null;
  }
}

/** Opponent server numbers named in a history entry's `opp` string, e.g.
 * "Era #068 / #066 / #028" → Set {68,66,28}. */
function oppNumbers(oppStr) {
  return new Set([...String(oppStr ?? '').matchAll(/#?0*(\d+)/g)].map(m => Number(m[1])));
}

/** Every server number a live-JSON snapshot references (across the shapes the
 * five event types use), minus our own server 8. Used to confirm a snapshot is
 * THIS matchup and not a later one that reset the file. */
function snapshotNumbers(live) {
  const nums = new Set();
  const add = s => {
    for (const m of String(s ?? '').matchAll(/#?0*(\d+)/g)) {
      const n = Number(m[1]);
      if (n !== 8) nums.add(n);
    }
  };
  if (!live || typeof live !== 'object') return nums;
  add(live.oppServer); // TME
  add(live.opponent); // Behemoth
  const ec = live.eventConfig ?? {};
  for (const k of ec.kingdoms ?? []) add(k.server);
  for (const s of live.servers ?? []) add(s.code ?? s.name ?? s.label ?? s);
  for (const k of Object.keys(live.research ?? {})) add(k); // Primordial server-keyed
  return nums;
}

/** Dashboard HTML path per slug — the pre-`data/live` fallback (data was inline
 * in a `DEFAULT_CONFIG` object literal there). */
const DASHBOARD_HTML = {
  tme: 'dashboards/tme_command_center.html',
  behemoth: 'dashboards/behemoth_conquest.html',
  primordial: 'dashboards/primordial_conflict_dashboard.html',
  desolate: 'dashboards/desolate_desert.html',
  stormlands: 'dashboards/stormlands.html',
};

/** Extract the `DEFAULT_CONFIG = { … };` object literal from a dashboard HTML
 * string and evaluate it in a sandbox (it's a plain literal — no I/O). Returns
 * the object, or null if absent/unparseable. */
function extractDefaultConfig(html) {
  const start = html.indexOf('DEFAULT_CONFIG');
  if (start < 0) return null;
  const brace = html.indexOf('{', start);
  if (brace < 0) return null;
  // Walk braces (respecting strings) to find the matching close.
  let depth = 0;
  let inStr = null;
  let end = -1;
  for (let i = brace; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === inStr) inStr = null;
    } else if (c === '"' || c === "'" || c === '`') {
      inStr = c;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      if (--depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  try {
    return vm.runInNewContext(`(${html.slice(brace, end + 1)})`, Object.create(null), { timeout: 1000 });
  } catch {
    return null;
  }
}

/** The dashboard HTML's DEFAULT_CONFIG at a commit (null on any failure). */
function dashboardConfig(hash, slug) {
  const path = DASHBOARD_HTML[slug];
  if (!path) return null;
  try {
    return extractDefaultConfig(git('show', `${hash}:${path}`));
  } catch {
    return null;
  }
}

function main() {
  const historyPath = 'data/history.json';
  const history = JSON.parse(readFileSync(resolve(ROOT, historyPath), 'utf8'));
  const events = Array.isArray(history) ? history : history.events;

  // Index occurrences with slug + date, sorted; compute each one's "next same-type
  // date" so we can window the git commits to that matchup.
  const occ = events
    .map(e => ({ slug: slugFor(e.event), name: e.event, date: e.date, raw: e }))
    .filter(o => o.slug && o.date)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const nextByType = new Map();
  for (let i = occ.length - 1; i >= 0; i--) {
    const o = occ[i];
    o.nextDate = nextByType.get(o.slug) ?? null; // next occurrence of same type, or null
    nextByType.set(o.slug, o.date);
  }

  const versionsCache = new Map();
  const manifest = [];
  let full = 0;
  let partial = 0;
  let indexOnly = 0;

  for (const o of occ) {
    const livePath = `data/live/${o.slug}.json`;
    if (!versionsCache.has(o.slug)) versionsCache.set(o.slug, versionsOf(livePath));
    const versions = versionsCache.get(o.slug);

    // Candidate commits in [occDate, nextDate), newest first. The freshest is the
    // most complete state of that matchup — BUT the file was sometimes edited to
    // the NEXT matchup a day early, so verify the snapshot's opponent actually
    // matches this occurrence's history `opp`. Walk candidates newest→oldest and
    // take the first that matches (or, if none match — thin/early data — the
    // newest in-window as a best effort).
    const inWindow = versions.filter(v => v.date >= o.date && (!o.nextDate || v.date < o.nextDate));
    const wantedOpp = oppNumbers(o.raw.opp);
    let chosen = null;
    let live = null;
    let fallback = null;
    for (const v of inWindow) {
      const blob = blobJson(v.hash, livePath);
      if (!blob) continue;
      if (!fallback) {
        fallback = v;
      }
      const have = snapshotNumbers(blob);
      const matches = wantedOpp.size === 0 || [...wantedOpp].some(n => have.has(n));
      if (matches) {
        chosen = v;
        live = blob;
        break;
      }
    }
    // No opponent-matched live-JSON snapshot. Before giving up, try the pre-
    // `data/live` fallback: the dashboard HTML's inline DEFAULT_CONFIG at a
    // commit in this window whose opponent matches (oldest events lived there).
    let fromHtml = false;
    if (!live) {
      const htmlPath = DASHBOARD_HTML[o.slug];
      const htmlVersions = htmlPath ? versionsOf(htmlPath).filter(v => v.date >= o.date && (!o.nextDate || v.date < o.nextDate)) : [];
      for (const v of htmlVersions) {
        const cfg = dashboardConfig(v.hash, o.slug);
        if (!cfg) continue;
        const have = snapshotNumbers(cfg);
        if (wantedOpp.size === 0 || [...wantedOpp].some(n => have.has(n))) {
          chosen = v;
          live = cfg;
          fromHtml = true;
          break;
        }
      }
    }

    // Still nothing opponent-matched → the file/HTML only held the next matchup.
    // Fall back to the newest in-window live blob but flag it (wrong matchup).
    let oppMismatch = false;
    if (!live && fallback) {
      chosen = fallback;
      live = blobJson(fallback.hash, livePath);
      oppMismatch = true;
    }

    // The history.json entry is always our floor (top-4 rosters + result).
    const historyRoster = o.raw;

    // A mismatched snapshot belongs to a DIFFERENT matchup — don't carry its
    // (wrong) live data; keep only the history roster. Index-only otherwise.
    const useLive = live && !oppMismatch;
    let recovered;
    if (useLive) {
      recovered = Object.keys(live).length > 4 ? 'full' : 'partial';
      if (recovered === 'full') full++;
      else partial++;
    } else {
      recovered = 'index-only';
      indexOnly++;
    }

    const doc = { ...(useLive ? live : {}), _history: historyRoster };
    const dir = resolve(ROOT, 'data', 'archive', o.slug);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, `${o.date}.json`), JSON.stringify(doc, null, 2) + '\n');

    manifest.push({
      slug: o.slug,
      name: o.name,
      date: o.date,
      opp: o.raw.opp ?? '',
      result: o.raw.result ?? '',
      recovered,
      source: useLive
        ? `${fromHtml ? DASHBOARD_HTML[o.slug] : livePath}@${chosen.hash.slice(0, 9)} (${chosen.date})`
        : 'history.json only',
    });
  }

  const manifestPath = resolve(ROOT, 'data', 'archive', 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify({ generatedFrom: historyPath, occurrences: manifest }, null, 2) + '\n');

  // ── coverage summary ───────────────────────────────────────────────────────
  console.log(`Harvested ${manifest.length} occurrences → data/archive/`);
  console.log(`  full (live snapshot):  ${full}`);
  console.log(`  partial (thin live):   ${partial}`);
  console.log(`  index-only (history):  ${indexOnly}`);
  console.log(`\nmanifest: data/archive/manifest.json`);
  for (const m of manifest) {
    console.log(`  ${m.recovered.padEnd(11)} ${m.slug.padEnd(11)} ${m.date}  ${m.source}`);
  }
}

main();
