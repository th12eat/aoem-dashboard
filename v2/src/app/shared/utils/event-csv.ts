import { fmtServer, serverNumber } from './corners';

type Doc = Record<string, unknown>;

/**
 * A simple, human-fillable CSV template for an event's bulk data. The file is a
 * sequence of labelled blocks:
 *
 *   # kingdomScoreboard
 *   server,points
 *   8,
 *   39,
 *
 *   # alliancePoints
 *   tag,points
 *   eRa,
 *
 *   # scouting.<server#>.alliances / .players
 *   ...
 *
 * `buildTemplate(doc)` emits a skeleton pre-seeded with the servers/tags the
 * editor already knows (from Event Setup); the admin fills the blanks in a
 * spreadsheet and re-uploads. `applyCsv(doc, text)` parses the blocks back and
 * merges them into a COPY of the doc (only the sections present are replaced).
 *
 * Deliberately scoped to the bulk tabular sections — Event Setup + relations
 * stay in the structured form (they're derivation-driven, not paste-friendly).
 */

const NL = '\n';

function obj(v: unknown): Doc {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Doc) : {};
}
function arr(v: unknown): Doc[] {
  return Array.isArray(v) ? (v as Doc[]) : [];
}
/** Quote a CSV cell when it contains a comma/quote/newline. */
function csv(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Our-server-first list of setup servers (bare numbers) + their alliances. */
function setupServers(doc: Doc): { num: number; alliances: string[] }[] {
  const ec = obj(doc['eventConfig']);
  return arr(ec['kingdoms']).map(k => ({
    num: serverNumber(String(k['server'] ?? '')),
    alliances: Array.isArray(k['alliances']) ? (k['alliances'] as string[]) : [],
  }));
}

export function buildTemplate(doc: Doc): string {
  const servers = setupServers(doc);
  const out: string[] = [];

  out.push('# kingdomScoreboard', 'server,points');
  for (const s of servers) out.push(`${s.num},`);
  out.push('');

  out.push('# alliancePoints', 'tag,points');
  const ours = servers[0]?.alliances ?? [];
  for (const t of ours) out.push(`${csv(t)},`);
  out.push('');

  for (const s of servers) {
    out.push(`# scouting.${s.num}.alliances`, 'tag,name,power,merits');
    for (let i = 0; i < 4; i++) out.push(',,,');
    out.push('');
    out.push(`# scouting.${s.num}.players`, 'name,alliance,power,merits');
    for (let i = 0; i < 15; i++) out.push(',,,');
    out.push('');
  }

  return out.join(NL);
}

interface Block {
  section: string;
  header: string[];
  rows: string[][];
}

/** Split CSV text into labelled blocks (very small CSV parser; handles quotes). */
function parseBlocks(text: string): Block[] {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let cur: Block | null = null;
  let expectHeader = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('#')) {
      cur = { section: line.slice(1).trim(), header: [], rows: [] };
      blocks.push(cur);
      expectHeader = true;
      continue;
    }
    if (!cur || line.trim() === '') continue;
    const cells = splitCsvLine(line);
    if (expectHeader) {
      cur.header = cells.map(c => c.trim());
      expectHeader = false;
    } else {
      cur.rows.push(cells);
    }
  }
  return blocks;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map(c => c.trim());
}

/** A row is "empty" when every cell is blank — skip those placeholders. */
function nonEmpty(rows: string[][]): string[][] {
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

/** Merge parsed CSV blocks into a COPY of the doc. Only present sections change. */
export function applyCsv(doc: Doc, text: string): Doc {
  const next: Doc = { ...doc };
  const research = { ...obj(next['research']) };
  const opponents = [...arr(research['opponents'])];
  const ours = obj(doc['eventConfig'])
    ? setupServers(doc)[0]?.num
    : undefined;

  for (const b of parseBlocks(text)) {
    const rows = nonEmpty(b.rows);
    const toObjs = (keys: string[]) => rows.map(r => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ''])));

    if (b.section === 'kingdomScoreboard') {
      next['kingdomScoreboard'] = rows.map(r => ({ server: fmtServer(serverNumber(r[0]), 'spaced'), points: r[1] ?? '' }));
    } else if (b.section === 'alliancePoints') {
      next['alliancePoints'] = toObjs(['tag', 'points']);
    } else if (b.section.startsWith('scouting.')) {
      const [, numStr, which] = b.section.split('.');
      const num = serverNumber(numStr);
      const payload = which === 'players' ? toObjs(['name', 'alliance', 'power', 'merits']) : toObjs(['tag', 'name', 'power', 'merits']);
      if (num === ours) {
        research['ours'] = { ...obj(research['ours']), [which]: payload };
      } else {
        let idx = opponents.findIndex(o => serverNumber(String(o['server'] ?? '')) === num);
        if (idx < 0) {
          opponents.push({ server: fmtServer(num, 'spaced') });
          idx = opponents.length - 1;
        }
        opponents[idx] = { ...obj(opponents[idx]), server: fmtServer(num, 'spaced'), [which]: payload };
      }
    }
  }
  research['opponents'] = opponents;
  next['research'] = research;
  return next;
}
